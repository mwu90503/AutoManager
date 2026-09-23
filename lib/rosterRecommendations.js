import { supabase } from '@/lib/supabaseClient';
import { positionRank } from '@/lib/positionOrder';
import { byeWeekFor } from '@/lib/byeWeeks';
import { isReserveEligible } from '@/lib/injuryStatus';
import { eligiblePositionsForSlot } from '@/lib/flexEligibility';
import { getNflState } from '@/lib/sleeperClient';

// Doubtful means "almost certainly won't play" in practice, so it's
// treated as a hard swap alongside Out/IR/PUP, not a soft warning.
const SIT_STATUSES = ['Out', 'IR', 'PUP', 'Doubtful'];

// Everything the Recommendations UI (and the email digests) show for a
// single league's own roster. Shared so the interactive page and the
// scheduled email crons compute identical results.
export async function analyzeLeagueRoster(league) {
  const { data: roster, error: rosterError } = await supabase
    .from('rosters')
    .select('*')
    .eq('league_id', league.id)
    .eq('is_own_team', true)
    .single();

  if (rosterError) {
    throw new Error(rosterError.message);
  }

  const allIds = Array.from(
    new Set([...(roster.players || []), ...(roster.reserve || []), ...(roster.taxi || [])])
  );

  const { data: players, error: playersError } = await supabase
    .from('sleeper_players')
    .select('player_id, full_name, position, team, injury_status, years_exp')
    .in('player_id', allIds.length ? allIds : ['']);

  if (playersError) {
    throw new Error(playersError.message);
  }

  const playerById = new Map(players.map((p) => [p.player_id, p]));
  const resolve = (pid) =>
    playerById.get(pid) || {
      player_id: pid,
      full_name: pid,
      position: null,
      team: null,
      injury_status: null,
      years_exp: null,
    };

  const starterIds = roster.starters || [];
  const reserveIds = roster.reserve || [];
  const taxiIds = roster.taxi || [];
  const starterSet = new Set(starterIds);
  const reserveSet = new Set(reserveIds);
  const taxiSet = new Set(taxiIds);

  // Sleeper's `starters` array lines up index-for-index with the
  // non-bench/IR slots in the league's roster_positions, in the same
  // order Sleeper's own UI shows them (QB, RB, RB, WR, ...).
  const startingSlots = (league.roster_positions || []).filter(
    (p) => p !== 'BN' && p !== 'IR' && p !== 'TAXI'
  );
  // Sleeper represents an unfilled starting slot as "0"/empty rather than
  // omitting it - worth flagging since it's guaranteed zero points, not
  // just risky ones.
  const starters = starterIds.map((pid, i) => {
    const slot = startingSlots[i] || 'FLEX';
    if (!pid || pid === '0') {
      return { slot, player_id: `empty-${i}`, full_name: null, position: null, team: null, isEmpty: true };
    }
    return { slot, ...resolve(pid) };
  });

  const byPosition = (a, b) => positionRank(a.position) - positionRank(b.position);

  const bench = (roster.players || [])
    .filter((pid) => !starterSet.has(pid) && !reserveSet.has(pid) && !taxiSet.has(pid))
    .map(resolve)
    .sort(byPosition);

  const ir = reserveIds.map(resolve).sort(byPosition);
  const taxi = taxiIds.map(resolve).sort(byPosition);

  // Bench players eligible for a reserve/IR slot (IR/PUP always qualify;
  // other statuses like Out only count if the league's settings allow it)
  // that aren't actually on IR yet — the "you forgot to move this guy"
  // case. IR slot count lives in league.settings.reserve_slots, not
  // roster_positions (same as taxi_slots - neither is listed there).
  const irSlotsTotal = league.settings?.reserve_slots ?? 0;
  const irSlotsOpen = Math.max(irSlotsTotal - reserveIds.length, 0);
  const irRecommendations = bench
    .filter((p) => isReserveEligible(p.injury_status, league.settings))
    .map((p) => ({ player: p, irSlotsOpen }));

  // For each position with a recommendation, surface who else in the
  // league is unrostered at that spot. This is NOT a ranked "best
  // pickup" list (no projections data source is wired up) — just who's
  // actually available, alphabetically, so there's somewhere to start.
  const availableByPosition = {};
  if (irRecommendations.length) {
    const { data: leagueRosters } = await supabase
      .from('rosters')
      .select('players, reserve, taxi')
      .eq('league_id', league.id);

    const rosteredIds = new Set(
      (leagueRosters || []).flatMap((r) => [...(r.players || []), ...(r.reserve || []), ...(r.taxi || [])])
    );

    const positions = [...new Set(irRecommendations.map((r) => r.player.position).filter(Boolean))];
    for (const position of positions) {
      const { data: candidates } = await supabase
        .from('sleeper_players')
        .select('player_id, full_name, position, team, injury_status')
        .eq('position', position)
        .order('full_name');

      availableByPosition[position] = (candidates || [])
        .filter((c) => !rosteredIds.has(c.player_id) && !c.injury_status)
        .slice(0, 15);
    }
  }

  const nflState = await getNflState().catch(() => null);
  const isRegularSeason = nflState?.season_type === 'regular';

  // Bench candidates for a compromised starter: eligible for that exact
  // slot (accounting for FLEX/SUPER_FLEX accepting multiple positions,
  // not just an exact position match) and not themselves sit-worthy or
  // on bye that week.
  function findBenchReplacements(starter) {
    const eligible = eligiblePositionsForSlot(starter.slot);
    return bench.filter((b) => {
      if (!eligible.includes(b.position)) return false;
      if (SIT_STATUSES.includes(b.injury_status)) return false;
      if (isRegularSeason && byeWeekFor(b.team, league.season) === nflState.week) return false;
      return true;
    });
  }

  // Starters guaranteed (or near-guaranteed) to score zero this week: on
  // bye (this week or next, for advance notice), or ruled Out/IR/PUP/
  // Doubtful right now. Bye weeks only exist in the regular season, but
  // an injury status matters just as much in preseason/playoffs, so only
  // the bye check is gated on season type.
  const byeAlerts = [];
  const criticalStatusStarters = [];
  for (const p of starters) {
    if (p.isEmpty) continue;

    if (isRegularSeason) {
      const byeWeek = byeWeekFor(p.team, league.season);
      const weeksOut = byeWeek == null ? null : byeWeek - nflState.week;
      if (weeksOut != null && weeksOut >= 0 && weeksOut <= 1) {
        byeAlerts.push({ player: p, byeWeek, currentWeek: nflState.week, benchOptions: findBenchReplacements(p) });
        continue;
      }
    }

    if (SIT_STATUSES.includes(p.injury_status)) {
      criticalStatusStarters.push({ player: p, benchOptions: findBenchReplacements(p) });
    }
  }

  // Starters at real but non-guaranteed risk — a heads-up to double
  // check before kickoff, not a hard "swap them out" like the above.
  const riskyStatusStarters = starters
    .filter((p) => !p.isEmpty && p.injury_status === 'Questionable')
    .map((p) => ({ player: p, benchOptions: findBenchReplacements(p) }));

  // Active roster (starters + bench, not IR/taxi) has room for a
  // free-agent pickup with no drop needed. Empty starter slots don't
  // count as "used" - they're already flagged separately and are just
  // as much open capacity as an empty bench spot.
  const activeSlotsTotal = (league.roster_positions || []).filter((p) => p !== 'IR' && p !== 'TAXI').length;
  const filledStarters = starters.filter((s) => !s.isEmpty).length;
  const activeSlotsUsed = filledStarters + bench.length;
  const openBenchSlots = Math.max(activeSlotsTotal - activeSlotsUsed, 0);

  // Bench players still young enough for taxi (Sleeper's taxi_years
  // setting) that aren't parked there yet - wasting a bench spot on a
  // stash that doesn't need one. Excludes anyone with an injury status:
  // taxi is for healthy unproven players, not an alternative to IR - a
  // hurt rookie should go on IR (or stay put), not taxi.
  const taxiYears = league.settings?.taxi_years;
  const taxiSlotsTotal = league.settings?.taxi_slots ?? 0;
  const taxiSlotsOpen = Math.max(taxiSlotsTotal - taxiIds.length, 0);
  const taxiRecommendations =
    taxiSlotsTotal > 0 && taxiYears != null
      ? bench
          .filter((p) => p.years_exp != null && p.years_exp <= taxiYears && !p.injury_status)
          .map((p) => ({ player: p, taxiSlotsOpen }))
      : [];

  const emptyStarterSlots = starters
    .filter((s) => s.isEmpty)
    .map((s) => ({ ...s, benchOptions: findBenchReplacements(s) }));

  // Players sitting on IR whose injury_status has cleared - they're
  // occupying a reserve slot for no reason and could come back to the
  // active roster.
  const healthyOnIr = ir
    .filter((p) => !p.injury_status)
    .map((p) => ({ player: p, hasBenchRoom: openBenchSlots > 0 }));

  return {
    league,
    roster: {
      ...roster,
      starters,
      bench,
      ir,
      taxi,
      irRecommendations,
      availableByPosition,
      byeAlerts,
      criticalStatusStarters,
      riskyStatusStarters,
      openBenchSlots,
      taxiRecommendations,
      emptyStarterSlots,
      healthyOnIr,
    },
  };
}

// Analyzes every imported league, skipping ones with no real roster
// (e.g. an inactive league that was never actually drafted) so they
// don't spam empty-slot alerts for a league nobody's playing.
export async function getActiveLeagueAnalyses() {
  const { data: leagues, error } = await supabase.from('leagues').select('*');
  if (error) {
    throw new Error(error.message);
  }

  const results = [];
  for (const league of leagues) {
    try {
      const result = await analyzeLeagueRoster(league);
      if ((result.roster.players || []).length > 0) {
        results.push(result);
      }
    } catch {
      // No roster row yet, or a transient fetch error - skip it rather
      // than failing the whole batch.
    }
  }
  return results;
}
