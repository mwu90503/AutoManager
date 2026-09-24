// ESPN's fantasy API uses its own numeric ids for everything - none of
// this is officially documented, but these mappings are stable and
// well-established across community ESPN API tools.

export const PRO_TEAM_ABBR = {
  1: 'ATL', 2: 'BUF', 3: 'CHI', 4: 'CIN', 5: 'CLE', 6: 'DAL', 7: 'DEN',
  8: 'DET', 9: 'GB', 10: 'TEN', 11: 'IND', 12: 'KC', 13: 'LV', 14: 'LAR',
  15: 'MIA', 16: 'MIN', 17: 'NE', 18: 'NO', 19: 'NYG', 20: 'NYJ', 21: 'PHI',
  22: 'ARI', 23: 'PIT', 24: 'LAC', 25: 'SF', 26: 'SEA', 27: 'TB', 28: 'WAS',
  29: 'CAR', 30: 'JAX', 33: 'BAL', 34: 'HOU',
};

export const POSITION_ABBR = {
  1: 'QB', 2: 'RB', 3: 'WR', 4: 'TE', 5: 'K', 16: 'DEF',
};

// lineupSlotId -> our internal slot name (matches what the rest of the
// app already expects from Sleeper's roster_positions vocabulary).
export const LINEUP_SLOT = {
  0: 'QB', 2: 'RB', 3: 'RB', 4: 'WR', 5: 'WR', 6: 'TE', 7: 'SUPER_FLEX',
  16: 'DEF', 17: 'K', 20: 'BN', 21: 'IR', 23: 'FLEX',
};

// ESPN's own injuryStatus vocabulary -> ours (Out/Doubtful/Questionable/
// IR/PUP - the statuses the rest of the app already knows how to weigh).
export const INJURY_STATUS = {
  ACTIVE: null,
  NORMAL: null,
  QUESTIONABLE: 'Questionable',
  DOUBTFUL: 'Doubtful',
  OUT: 'Out',
  INJURY_RESERVE: 'IR',
  PHYSICALLY_UNABLE_TO_PERFORM: 'PUP',
  SUSPENSION: 'Sus',
};
