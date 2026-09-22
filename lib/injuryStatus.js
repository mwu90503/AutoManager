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
