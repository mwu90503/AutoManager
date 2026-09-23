// Which real positions can fill a given starting slot. A flex slot
// accepts several positions, so matching a bye/injured starter's exact
// position (e.g. "RB") misses valid bench replacements when the starter
// is actually sitting in a FLEX/SUPER_FLEX slot.
const FLEX_ELIGIBLE = {
  FLEX: ['RB', 'WR', 'TE'],
  SUPER_FLEX: ['QB', 'RB', 'WR', 'TE'],
  WRRB_FLEX: ['RB', 'WR'],
  REC_FLEX: ['WR', 'TE'],
};

export function eligiblePositionsForSlot(slot) {
  return FLEX_ELIGIBLE[slot] || [slot];
}
