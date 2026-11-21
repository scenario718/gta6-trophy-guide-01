import { hidesAsSpoiler } from './classify.js';

export function matchesFilters(trophy, query, earned) {
  if (query.grade !== 'all' && trophy.grade !== query.grade) return false;
  if (query.kind === 'story' && trophy.category !== 'story') return false;
  if (query.kind === 'collectibles' && trophy.category !== 'collectibles') return false;
  if (query.kind === 'activities' && trophy.category !== 'activities') return false;
  if (query.kind === 'missable' && !trophy.missable.flagged) return false;
  const q = query.q.trim().toLowerCase();
  if (!q) return true;
  const hidden = query.spoilers && hidesAsSpoiler(trophy, earned);
  const parts = hidden
    ? [trophy.category, trophy.grade, 'story']
    : [trophy.name, trophy.description, trophy.guide, trophy.source, trophy.category, trophy.missable.reason];
  return parts.join(' ').toLowerCase().includes(q);
}
