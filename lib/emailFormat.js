// Plain-text digest of a roster's Recommendations, in the same tier
// order as the UI: guaranteed zero, risky, open bench slot, IR
// housekeeping, taxi.
export function formatRecommendationsEmail(league, roster) {
  const zeroPointLines = [
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

  const riskyLines = (roster.riskyStatusStarters || []).map(
    (rec) => `${rec.player.full_name} (${rec.player.team}) is ${rec.player.injury_status}.`
  );

  const rosterLines = [
    ...(roster.openBenchSlots > 0
      ? [`${roster.openBenchSlots} open bench slot${roster.openBenchSlots > 1 ? 's' : ''} - room for a pickup.`]
      : []),
    ...(roster.irRecommendations || []).map(
      (rec) => `${rec.player.full_name} (${rec.player.injury_status}) on your bench could move to IR.`
    ),
    ...(roster.healthyOnIr || []).map((rec) => `${rec.player.full_name} is on IR but no longer marked injured.`),
  ];

  const taxiLines = (roster.taxiRecommendations || []).map(
    (rec) => `${rec.player.full_name} is taxi-eligible and still on your bench.`
  );

  const sections = [
    ['GUARANTEED ZERO POINTS', zeroPointLines],
    ['VERIFY BEFORE KICKOFF', riskyLines],
    ['ROSTER', rosterLines],
    ['TAXI', taxiLines],
  ].filter(([, lines]) => lines.length);

  const text = sections.length
    ? sections.map(([title, lines]) => `${title}\n${lines.map((l) => `- ${l}`).join('\n')}`).join('\n\n') + '\n'
    : 'No open recommendations right now - your roster looks set.\n';

  return {
    subject: `AutoManager: ${league.name} recommendations`,
    text,
  };
}
