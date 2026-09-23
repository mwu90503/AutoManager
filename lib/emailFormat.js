function zeroPointLines(roster) {
  return [
    ...(roster.emptyStarterSlots || []).map((s) => `Your ${s.slot} slot is empty.`),
    ...(roster.criticalStatusStarters || []).map(
      (rec) => `${rec.player.full_name} (${rec.player.team}) is ${rec.player.injury_status} in your ${rec.player.slot} slot.`
    ),
    ...(roster.byeAlerts || []).map(
      (alert) =>
        `${alert.player.full_name} (${alert.player.team}) is on bye in Week ${alert.byeWeek}${
          alert.byeWeek === alert.currentWeek ? ' (this week)' : ' (next week)'
        }.`
    ),
  ];
}

function riskyLines(roster) {
  return (roster.riskyStatusStarters || []).map(
    (rec) => `${rec.player.full_name} (${rec.player.team}) is ${rec.player.injury_status}.`
  );
}

function swapLines(roster) {
  return (roster.lineupSwapRecommendations || []).map(
    (rec) =>
      `${rec.bench.full_name} (${rec.benchPoints.toFixed(1)} pts) is projected higher than ${rec.starter.full_name} (${rec.starterPoints.toFixed(1)} pts) in your ${rec.starter.slot} slot.`
  );
}

function housekeepingLines(roster) {
  return [
    ...(roster.openBenchSlots > 0
      ? [`${roster.openBenchSlots} open bench slot${roster.openBenchSlots > 1 ? 's' : ''} - room for a pickup.`]
      : []),
    ...(roster.irRecommendations || []).map(
      (rec) => `${rec.player.full_name} (${rec.player.injury_status}) on your bench could move to IR.`
    ),
    ...(roster.healthyOnIr || []).map((rec) => `${rec.player.full_name} is on IR but no longer marked injured.`),
  ];
}

function taxiLines(roster) {
  return (roster.taxiRecommendations || []).map(
    (rec) => `${rec.player.full_name} is taxi-eligible and still on your bench.`
  );
}

// variant: 'lineup' (zero-point + risky), 'housekeeping' (roster + taxi),
// or 'critical' (zero-point only - the daily "fix this" nag).
const VARIANT_SECTIONS = {
  lineup: [
    ['GUARANTEED ZERO POINTS', zeroPointLines],
    ['VERIFY BEFORE KICKOFF', riskyLines],
    ['PROJECTED POINTS', swapLines],
  ],
  housekeeping: [
    ['ROSTER', housekeepingLines],
    ['TAXI', taxiLines],
  ],
  critical: [['GUARANTEED ZERO POINTS', zeroPointLines]],
  all: [
    ['GUARANTEED ZERO POINTS', zeroPointLines],
    ['VERIFY BEFORE KICKOFF', riskyLines],
    ['PROJECTED POINTS', swapLines],
    ['ROSTER', housekeepingLines],
    ['TAXI', taxiLines],
  ],
};

// Whether a league would have anything to say for a given variant -
// used by the daily critical check to decide whether to send at all.
export function hasContentForVariant(roster, variant) {
  return VARIANT_SECTIONS[variant].some(([, build]) => build(roster).length > 0);
}

// Formats one combined email covering several leagues (usually just
// one) for the given variant. `leagueResults` is an array of the
// { league, roster } shape analyzeLeagueRoster returns.
export function formatDigestEmail(leagueResults, variant, subject) {
  const leagueBlocks = leagueResults
    .map(({ league, roster }) => {
      const sections = VARIANT_SECTIONS[variant]
        .map(([title, build]) => [title, build(roster)])
        .filter(([, lines]) => lines.length);

      if (!sections.length) return null;

      const body = sections.map(([title, lines]) => `${title}\n${lines.map((l) => `- ${l}`).join('\n')}`).join('\n\n');
      return `${league.name}\n${'='.repeat(league.name.length)}\n${body}`;
    })
    .filter(Boolean);

  const text = leagueBlocks.length ? leagueBlocks.join('\n\n') + '\n' : 'Nothing to report - your rosters look set.\n';

  return { subject, text };
}
