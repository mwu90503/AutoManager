// NFL/Sleeper seasons are labeled by the year they start in (e.g. games from
// Sep 2026 through Feb 2027 are the "2026" season). Jan/Feb still belong to
// the prior season's playoffs.
export function currentSleeperSeason() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return String(month >= 3 ? year : year - 1);
}

// Rosters/waivers churn from preseason cuts through the playoffs (Aug-Jan);
// nothing meaningful changes the rest of the year.
export function isInSeason(date = new Date()) {
  const month = date.getMonth() + 1;
  return month >= 8 || month <= 1;
}
