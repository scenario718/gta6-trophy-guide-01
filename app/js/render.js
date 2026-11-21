import { categoryLabel, hidesAsSpoiler } from './classify.js';
import { matchesFilters } from './filter.js';
import { completionStats, formatTarget, gradeWord, nextOnRoadmap } from './stats.js';

const KINDS = [
  ['all', 'All'],
  ['story', 'Story'],
  ['missable', 'Missable'],
  ['collectibles', 'Collectibles'],
  ['activities', 'Activities'],
];

function el(tag, attrs, ...kids) {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (value == null || value === false) continue;
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else node.setAttribute(key, value === true ? '' : String(value));
    }
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    node.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return node;
}

function ring(percent) {
  return el('div', { class: 'ring', style: `--p:${percent}`, role: 'img', 'aria-label': `${percent} percent` },
    el('span', null, `${percent}%`));
}

export function renderStats(root, trophies, earned, roadmap, spoilers) {
  const stats = completionStats(trophies, earned);
  const next = nextOnRoadmap(roadmap, trophies, earned);
  const nextName = next && spoilers && hidesAsSpoiler(next.trophy, earned) ? '???' : next?.trophy.name;
  const grades = ['platinum', 'gold', 'silver', 'bronze'].map((grade) => {
    const bucket = stats.byGrade[grade];
    return el('span', { class: `gcount g-${grade}` }, `${gradeWord(grade)} ${bucket.earned}/${bucket.total}`);
  });
  const nextLine = next
    ? el('p', { class: 'next' }, 'Next ', el('strong', null, nextName))
    : el('p', { class: 'next' }, 'Every trophy on the ledger is checked.');
  root.replaceChildren(
    ring(stats.percent),
    el('div', { class: 'stat-copy' },
      el('p', { class: 'earned-line' }, el('strong', null, String(stats.earned)), ` of ${stats.total} earned`),
      el('div', { class: 'gcounts' }, grades),
      nextLine),
  );
  return stats;
}

function kindPills(active) {
  return KINDS.map(([id, label]) => el('button', {
    type: 'button',
    class: id === active ? 'pill on' : 'pill',
    'data-kind': id,
    'aria-pressed': id === active ? 'true' : 'false',
  }, label));
}

export function renderKindPills(root, active) {
  root.replaceChildren(...kindPills(active));
}

function row(trophy, state, onToggle, onOpen) {
  const masked = state.spoilers && hidesAsSpoiler(trophy, state.earned);
  const checked = state.earned.has(trophy.name);
  const box = el('input', { type: 'checkbox', 'aria-label': masked ? 'Mark hidden story trophy earned' : `Earned: ${trophy.name}` });
  box.checked = checked;
  box.addEventListener('click', (event) => event.stopPropagation());
  box.addEventListener('change', () => onToggle(trophy, box.checked));
  const flag = trophy.missable.flagged
    ? el('span', { class: trophy.missable.tone === 'risk' ? 'flag risk' : 'flag watch' }, trophy.missable.tone === 'risk' ? 'Missable' : 'Watch')
    : null;
  const body = el('div', { class: 'row-main', tabindex: '0' },
    el('span', { class: `pip pip-${trophy.grade}` }, gradeWord(trophy.grade)),
    el('span', { class: 'tname' }, masked ? '???' : trophy.name),
    el('span', { class: masked ? 'tdesc blurred' : 'tdesc' }, masked ? trophy.description : trophy.description),
    el('span', { class: 'tags' },
      el('span', { class: 'tag' }, categoryLabel(trophy.category)),
      flag));
  if (masked) body.querySelector('.tdesc').setAttribute('aria-hidden', 'true');
  const article = el('article', { class: trophy.id === state.openId ? 'row selected' : 'row', 'data-id': String(trophy.id) },
    el('label', { class: 'tick' }, box),
    body);
  const open = () => onOpen(trophy.id);
  body.addEventListener('click', open);
  body.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      open();
    }
  });
  return article;
}

export function renderChecklist(root, trophies, state, handlers) {
  const visible = trophies.filter((trophy) => matchesFilters(trophy, state, state.earned));
  const banner = state.kind === 'missable'
    ? el('div', { class: 'callout' },
      el('p', { class: 'callout-title' }, 'Missable flags, from the official descriptions'),
      el('p', null, 'Four trophies are flagged. One collectible says “every spot”, and a Chapter 1 session may close. One silver needs 8 strands, and a timed strand can expire. Two hidden lines are a second chance and a run of choices. The reason is on each trophy. Story chapters themselves are not flagged: their descriptions are required missions.'))
    : null;
  const kids = [];
  if (banner) kids.push(banner);
  kids.push(visible.length === 0
    ? el('p', { class: 'empty' }, 'Nothing matches. Clear the search or choose All.')
    : null);
  if (visible.length > 0) kids.push(...visible.map((trophy) => row(trophy, state, handlers.onToggle, handlers.onOpen)));
  root.replaceChildren(...kids.filter(Boolean));
  return visible;
}

function stepRow(trophy, state, onOpen) {
  const masked = state.spoilers && hidesAsSpoiler(trophy, state.earned);
  const done = state.earned.has(trophy.name);
  return el('button', {
    type: 'button',
    class: trophy.id === state.openId ? 'step selected' : 'step',
  },
    el('span', { class: done ? 'dot done' : 'dot' }, done ? '✓' : ''),
    el('span', { class: `pip pip-${trophy.grade}` }, gradeWord(trophy.grade)),
    el('span', { class: 'step-name' }, masked ? '???' : trophy.name),
    trophy.missable.flagged ? el('span', { class: trophy.missable.tone === 'risk' ? 'flag risk' : 'flag watch' }, 'Missable') : null);
}

export function renderRoadmap(root, doc, state, onOpen) {
  const byId = new Map(doc.trophies.map((trophy) => [trophy.id, trophy]));
  const earnedCount = doc.trophies.filter((trophy) => state.earned.has(trophy.name)).length;
  const intro = el('header', { class: 'road-intro' },
    el('p', { class: 'eyebrow' }, `Road to the platinum · ${earnedCount} of ${doc.trophies.length}`),
    el('h2', null, 'One path through Leonida'),
    el('p', null, 'Order follows the official descriptions: chapters, then the mission each line names, then stranger strands, then counters you can finish after the credits. Where a description is only a riddle, the step says so in the trophy. Missable marks are called from the wording, and each one explains why.'));
  const stages = doc.roadmap.map((stage) => {
    const steps = stage.steps.map((id) => byId.get(id)).filter(Boolean);
    const done = steps.filter((trophy) => state.earned.has(trophy.name)).length;
    const list = el('div', { class: 'steps' });
    for (const trophy of steps) {
      const button = stepRow(trophy, state, onOpen);
      button.addEventListener('click', () => onOpen(trophy.id));
      list.append(button);
    }
    return el('section', { class: 'stage', id: `stage-${stage.id}` },
      el('div', { class: 'stage-head' },
        el('p', { class: 'kicker' }, stage.kicker),
        el('h3', null, stage.title),
        el('p', { class: 'stage-count' }, `${done}/${steps.length}`)),
      el('p', { class: 'stage-note' }, stage.note),
      list);
  });
  root.replaceChildren(intro, ...stages);
}

export function renderDetail(root, trophy, state) {
  if (!trophy) {
    root.replaceChildren(el('div', { class: 'detail empty-detail' },
      el('p', { class: 'eyebrow' }, 'Select a trophy'),
      el('h2', null, 'The guide opens here'),
      el('p', null, 'Click any row for the official description, a short guide, the missable call, and the citation.')));
    return;
  }
  const masked = state.spoilers && hidesAsSpoiler(trophy, state.earned);
  if (masked) {
    root.replaceChildren(el('div', { class: 'detail' },
      el('p', { class: 'eyebrow' }, 'Story · hidden'),
      el('h2', { class: 'dname' }, '???'),
      el('p', { class: 'dgrade' }, el('span', { class: `pip pip-${trophy.grade}` }, gradeWord(trophy.grade))),
      el('p', { class: 'spoiler-note' }, 'This is a story trophy. The name, description, and guide stay covered until you earn it or turn spoilers off. The checkbox still saves your progress.')));
    return;
  }
  const target = formatTarget(trophy);
  const flagClass = trophy.missable.flagged ? (trophy.missable.tone === 'risk' ? 'reason risk' : 'reason watch') : 'reason clear';
  const flagTitle = trophy.missable.flagged
    ? (trophy.missable.tone === 'risk' ? 'Missable' : 'Missable · watch')
    : 'Not missable';
  root.replaceChildren(el('div', { class: 'detail' },
    el('p', { class: 'eyebrow' }, `${categoryLabel(trophy.category)} · ${trophy.stageKicker}`),
    el('h2', { class: 'dname' }, trophy.name),
    el('p', { class: 'dgrade' },
      el('span', { class: `pip pip-${trophy.grade}` }, gradeWord(trophy.grade)),
      trophy.hidden ? el('span', { class: 'tag ghost' }, 'Hidden on PlayStation') : null,
      trophy.missable.flagged ? el('span', { class: trophy.missable.tone === 'risk' ? 'flag risk' : 'flag watch' }, flagTitle) : null),
    el('p', { class: 'official-label' }, 'Official description'),
    el('p', { class: 'official' }, trophy.description),
    el('p', { class: 'guide' }, trophy.guide),
    target ? el('p', { class: 'target' }, target) : null,
    el('p', { class: 'source' }, trophy.source),
    el('div', { class: flagClass },
      el('p', { class: 'reason-label' }, flagTitle),
      el('p', null, trophy.missable.reason))));
}

export function renderShown(root, visibleCount, total, kind) {
  const label = KINDS.find(([id]) => id === kind)?.[1] ?? 'All';
  root.textContent = kind === 'all' && visibleCount === total
    ? `Showing all ${total}`
    : `Showing ${visibleCount} of ${total} · ${label}`;
}

export function scrollOpenRow(openId) {
  const node = document.querySelector(`[data-id="${openId}"]`);
  if (node) node.scrollIntoView({ block: 'center' });
}
