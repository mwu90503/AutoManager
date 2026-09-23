// NFL regular-season bye weeks by team, fixed once each season's schedule
// is released (usually mid-spring). Update this table — and add a new
// BYE_WEEKS_<year> entry below — at the start of each new season.
export const BYE_WEEKS_2026 = {
  KC: 5,
  CAR: 5,
  MIA: 6,
  CIN: 6,
  DET: 6,
  MIN: 6,
  BUF: 7,
  LAC: 7,
  WAS: 7,
  JAX: 7,
  NYG: 8,
  NO: 8,
  SF: 8,
  HOU: 8,
  TEN: 9,
  PIT: 9,
  DEN: 10,
  PHI: 10,
  CHI: 10,
  TB: 10,
  NE: 11,
  CLE: 11,
  SEA: 11,
  GB: 11,
  ATL: 11,
  LAR: 11,
  IND: 13,
  NYJ: 13,
  LV: 13,
  BAL: 13,
  DAL: 14,
  ARI: 14,
};

const BYE_WEEKS_BY_SEASON = {
  2026: BYE_WEEKS_2026,
};

export function byeWeekFor(team, season) {
  const table = BYE_WEEKS_BY_SEASON[String(season)];
  return table?.[team] ?? null;
}
