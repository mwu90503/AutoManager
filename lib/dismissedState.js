export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

// Taxi and lineup-swap dismissals mean "I've made my call, stop
// suggesting it" - permanent, same as taxi (e.g. a projected-points gap
// you've decided not to act on for a reason the numbers don't capture).
// Everything else means "seen it today" - if it's still true tomorrow
// (not actually fixed), it should reappear rather than staying silently
// hidden forever.
export function isPermanentDismiss(cardId) {
  return cardId.startsWith('taxi-') || cardId.startsWith('swap-');
}

export function loadDismissedState(leagueId) {
  const empty = { day: todayKey(), daily: [], permanent: [] };
  try {
    const raw = localStorage.getItem(`automanager:dismissed:${leagueId}`);
    if (!raw) return empty;
    const parsed = JSON.parse(raw);

    // Migrate the old plain-array format (everything permanent) into
    // the new shape, sorting into daily/permanent by id.
    if (Array.isArray(parsed)) {
      return {
        day: todayKey(),
        daily: parsed.filter((cardId) => !isPermanentDismiss(cardId)),
        permanent: parsed.filter(isPermanentDismiss),
      };
    }

    if (parsed.day !== todayKey()) {
      return { ...parsed, day: todayKey(), daily: [] };
    }
    return parsed;
  } catch {
    return empty;
  }
}

export function saveDismissedState(leagueId, state) {
  try {
    localStorage.setItem(`automanager:dismissed:${leagueId}`, JSON.stringify(state));
  } catch {
    // Ignore - dismissal is a convenience, not critical state.
  }
}
