import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { positionRank } from '@/lib/positionOrder';
import { byeWeekFor } from '@/lib/byeWeeks';
import { isReserveEligible } from '@/lib/injuryStatus';
import { getNflState } from '@/lib/sleeperClient';

export async function GET(_request, { params }) {
  const { id } = await params;

  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('*')
    .eq('id', id)
    .single();

  if (leagueError) {
    return NextResponse.json({ error: leagueError.message }, { status: 404 });
  }

  const { data: roster, error: rosterError } = await supabase
    .from('rosters')
    .select('*')
    .eq('league_id', id)
    .eq('is_own_team', true)
    .single();

  if (rosterError) {
    return NextResponse.json({ error: rosterError.message }, { status: 404 });
  }

  const allIds = Array.from(
    new Set([...(roster.players || []), ...(roster.reserve || []), ...(roster.taxi || [])])
  );

  const { data: players, error: playersError } = await supabase
    .from('sleeper_players')
    .select('player_id, full_name, position, team, injury_status, years_exp')
    .in('player_id', allIds.length ? allIds : ['']);

  if (playersError) {
    return NextResponse.json({ error: playersError.message }, { status: 500 });
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
    const { data: leagueRosters } = await supabase.from('rosters').select('players, reserve, taxi').eq('league_id', id);

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

  // Starters whose team's bye is this week or next — enough notice to
  // swap them out before kickoff. Only starters matter here; a bye for
  // someone already on the bench doesn't cost you anything.
  const nflState = await getNflState().catch(() => null);
  const byeAlerts = [];
  if (nflState?.season_type === 'regular') {
    for (const p of starters) {
      const byeWeek = byeWeekFor(p.team, league.season);
      if (byeWeek == null) continue;
      const weeksOut = byeWeek - nflState.week;
      if (weeksOut < 0 || weeksOut > 1) continue;

      const benchOptions = bench.filter(
        (b) => b.position === p.position && byeWeekFor(b.team, league.season) !== nflState.week
      );
      byeAlerts.push({ player: p, byeWeek, currentWeek: nflState.week, benchOptions });
    }
  }

  // Active roster (starters + bench, not IR/taxi) has room for a
  // free-agent pickup with no drop needed.
  const activeSlotsTotal = (league.roster_positions || []).filter((p) => p !== 'IR' && p !== 'TAXI').length;
  const activeSlotsUsed = starters.length + bench.length;
  const openBenchSlots = Math.max(activeSlotsTotal - activeSlotsUsed, 0);

  // Bench players still young enough for taxi (Sleeper's taxi_years
  // setting) that aren't parked there yet - wasting a bench spot on a
  // stash that doesn't need one.
  const taxiYears = league.settings?.taxi_years;
  const taxiSlotsTotal = league.settings?.taxi_slots ?? 0;
  const taxiSlotsOpen = Math.max(taxiSlotsTotal - taxiIds.length, 0);
  const taxiRecommendations =
    taxiSlotsTotal > 0 && taxiYears != null
      ? bench.filter((p) => p.years_exp != null && p.years_exp <= taxiYears).map((p) => ({ player: p, taxiSlotsOpen }))
      : [];

  const emptyStarterSlots = starters.filter((s) => s.isEmpty);

  // Players sitting on IR whose injury_status has cleared - they're
  // occupying a reserve slot for no reason and could come back to the
  // active roster.
  const healthyOnIr = ir
    .filter((p) => !p.injury_status)
    .map((p) => ({ player: p, hasBenchRoom: openBenchSlots > 0 }));

  return NextResponse.json({
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
      openBenchSlots,
      taxiRecommendations,
      emptyStarterSlots,
      healthyOnIr,
    },
  });
}
