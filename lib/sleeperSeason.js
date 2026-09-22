// NFL/Sleeper seasons are labeled by the year they start in (e.g. games from
// Sep 2026 through Feb 2027 are the "2026" season). Jan/Feb still belong to
// the prior season's playoffs.
export function currentSleeperSeason() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return String(month >= 3 ? year : year - 1);
}
