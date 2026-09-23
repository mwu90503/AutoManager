const ABBREVIATIONS = {
  Questionable: 'Q',
  Doubtful: 'D',
  Out: 'O',
  IR: 'IR',
  PUP: 'PUP',
  Suspended: 'SUS',
  NA: 'NA',
};

export function injuryAbbreviation(status) {
  if (!status) return null;
  return ABBREVIATIONS[status] || status;
}

// IR/PUP are always reserve-eligible; everything else is gated by the
// league's own reserve_allow_* settings (e.g. reserve_allow_out).
const RESERVE_ALLOW_FLAGS = {
  Out: 'reserve_allow_out',
  Doubtful: 'reserve_allow_doubtful',
  Suspended: 'reserve_allow_sus',
  COV: 'reserve_allow_cov',
  NA: 'reserve_allow_na',
  DNR: 'reserve_allow_dnr',
};

export function isReserveEligible(status, settings) {
  if (!status) return false;
  if (status === 'IR' || status === 'PUP') return true;
  const flag = RESERVE_ALLOW_FLAGS[status];
  return flag ? !!settings?.[flag] : false;
}
