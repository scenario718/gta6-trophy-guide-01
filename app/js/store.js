// Progress lives in localStorage. Export and import speak JSON of official trophy names.
const KEY = 'leonida-night-ledger-v1';
const LEGACY = 'gta6-trophy-checklist';

function emptyState() {
  return { earned: [], spoilers: false };
}

function namesFrom(value) {
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (typeof item === 'string') return [item];
      if (item && typeof item.name === 'string') return [item.name];
      return [];
    });
  }
  if (value && Array.isArray(value.earned)) return namesFrom(value.earned);
  return null;
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const earned = namesFrom(parsed) ?? [];
      return { earned, spoilers: parsed?.spoilers === true };
    }
    const legacy = localStorage.getItem(LEGACY);
    if (legacy) return { earned: namesFrom(JSON.parse(legacy)) ?? [], spoilers: false };
  } catch {
    return emptyState();
  }
  return emptyState();
}

export function saveState(state) {
  localStorage.setItem(KEY, JSON.stringify({ earned: state.earned, spoilers: state.spoilers === true }));
}

export function exportPayload(earnedNames) {
  return {
    app: 'leonida-night-ledger',
    game: 'Grand Theft Auto VI',
    platform: 'PlayStation 5',
    earned: [...earnedNames],
  };
}

export function parseImport(text) {
  const parsed = JSON.parse(text);
  const earned = namesFrom(parsed);
  if (!earned) throw new Error('expected a list of trophy names');
  const spoilers = parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.spoilers === true;
  return { earned, spoilers };
}
