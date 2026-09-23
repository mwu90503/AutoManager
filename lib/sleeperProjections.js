// Sleeper's own site uses this endpoint but it isn't part of their
// documented public API - same domain/trust tier as everything else
// we call, just unofficial, so it could change or disappear without
// notice.
async function fetchProjectionsForPosition(season, week, position) {
  const url = `https://api.sleeper.app/projections/nfl/${season}/${week}?season_type=regular&position[]=${encodeURIComponent(position)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  return res.json();
}

export async function getWeeklyProjections(season, week, positions) {
  const lists = await Promise.all(
    positions.map((position) => fetchProjectionsForPosition(season, week, position).catch(() => []))
  );

  const byPlayerId = new Map();
  for (const list of lists) {
    for (const entry of list || []) {
      if (entry?.player_id) byPlayerId.set(entry.player_id, entry);
    }
  }
  return byPlayerId;
}

// Recomputes projected points from the raw per-category stat
// projections using the league's actual scoring settings, rather than
// assuming standard/half/full PPR - covers custom scoring (TE premium,
// bonus categories, etc.) for free since it's just a weighted sum.
export function projectedPoints(entry, scoringSettings) {
  if (!entry?.stats) return null;
  if (scoringSettings) {
    return Object.entries(entry.stats).reduce(
      (sum, [key, value]) => sum + (scoringSettings[key] || 0) * (value || 0),
      0
    );
  }
  return entry.stats.pts_ppr ?? entry.stats.pts_half_ppr ?? entry.stats.pts_std ?? null;
}
