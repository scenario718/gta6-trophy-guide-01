import { prepareAll } from './classify.js';
import { matchesFilters } from './filter.js';
import { renderChecklist, renderDetail, renderKindPills, renderRoadmap, renderShown, renderStats, scrollOpenRow } from './render.js';
import { exportPayload, loadState, parseImport, saveState } from './store.js';

const $ = (id) => document.getElementById(id);
const toast = $('toast');
let toastTimer = 0;

function say(message) {
  toast.hidden = false;
  toast.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 3200);
}

function readShot(params) {
  const shot = params.get('shot');
  if (!shot) return null;
  const open = params.get('open');
  if (shot === 'roadmap') return { view: 'roadmap', kind: 'all', openId: open ? Number(open) : 2 };
  if (shot === 'missables' || shot === 'missable') return { view: 'checklist', kind: 'missable', openId: open ? Number(open) : 28 };
  if (shot === 'progress') return { view: 'checklist', kind: 'all', spoilers: true, openId: open ? Number(open) : 8 };
  if (shot === 'checklist') return { view: 'checklist', kind: params.get('kind') || 'all', openId: open ? Number(open) : 28 };
  return null;
}

const doc = prepareAll(await (await fetch('data/trophies.json')).json());
const saved = loadState();
const known = new Set(doc.trophies.map((trophy) => trophy.name));
const shot = readShot(new URLSearchParams(location.search));

const state = {
  earned: new Set(saved.earned.filter((name) => known.has(name))),
  spoilers: shot?.spoilers ?? saved.spoilers,
  view: shot?.view ?? 'checklist',
  kind: shot?.kind ?? 'all',
  grade: 'all',
  q: '',
  openId: shot?.openId ?? doc.trophies[0].id,
};

function persist() {
  saveState({ earned: [...state.earned], spoilers: state.spoilers });
}

function currentTrophy() {
  return doc.trophies.find((trophy) => trophy.id === state.openId) ?? null;
}

function paint() {
  const list = $('list');
  const scroll = list.scrollTop;
  const stats = renderStats($('stats'), doc.trophies, state.earned, doc.roadmap, state.spoilers);
  $('makeup').textContent = `${stats.total} trophies · 1 platinum · 2 gold · 6 silver · 46 bronze`;
  $('view-checklist').classList.toggle('on', state.view === 'checklist');
  $('view-roadmap').classList.toggle('on', state.view === 'roadmap');
  $('view-checklist').setAttribute('aria-pressed', state.view === 'checklist' ? 'true' : 'false');
  $('view-roadmap').setAttribute('aria-pressed', state.view === 'roadmap' ? 'true' : 'false');
  $('spoilers').checked = state.spoilers;
  renderKindPills($('kinds'), state.kind);
  const query = { kind: state.kind, grade: state.grade, q: state.q, spoilers: state.spoilers };
  let visibleCount = doc.trophies.length;
  if (state.view === 'checklist') {
    const visible = renderChecklist($('list'), doc.trophies, { ...state, ...query }, {
      onToggle(trophy, checked) {
        if (checked) state.earned.add(trophy.name);
        else state.earned.delete(trophy.name);
        persist();
        paint();
      },
      onOpen(id) {
        state.openId = id;
        paint();
      },
    });
    visibleCount = visible.length;
  } else {
    renderRoadmap($('list'), doc, state, (id) => {
      state.openId = id;
      paint();
    });
  }
  renderShown($('shown'), visibleCount, doc.trophies.length, state.view === 'roadmap' ? 'all' : state.kind);
  if (state.view === 'roadmap') $('shown').textContent = `Roadmap · ${doc.roadmap.length} stages · ${doc.trophies.length} trophies`;
  renderDetail($('detail'), currentTrophy(), state);
  bindPills();
  if (scroll > 0) list.scrollTop = scroll;
}

function bindPills() {
  for (const button of $('kinds').querySelectorAll('[data-kind]')) {
    button.addEventListener('click', () => {
      state.kind = button.getAttribute('data-kind');
      state.view = 'checklist';
      const still = doc.trophies.find((trophy) => trophy.id === state.openId && matchesFilters(trophy, state, state.earned));
      if (!still) {
        const first = doc.trophies.find((trophy) => matchesFilters(trophy, state, state.earned));
        if (first) state.openId = first.id;
      }
      paint();
    });
  }
}

$('view-checklist').addEventListener('click', () => { state.view = 'checklist'; paint(); });
$('view-roadmap').addEventListener('click', () => { state.view = 'roadmap'; paint(); });
$('q').addEventListener('input', () => { state.q = $('q').value; state.view = 'checklist'; paint(); });
$('grade').addEventListener('change', () => { state.grade = $('grade').value; state.view = 'checklist'; paint(); });
$('spoilers').addEventListener('change', () => { state.spoilers = $('spoilers').checked; persist(); paint(); });

$('export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(exportPayload(state.earned), null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'leonida-night-ledger.json';
  link.click();
  URL.revokeObjectURL(link.href);
  say(`Exported ${state.earned.size} earned trophies.`);
});

$('import').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  try {
    const incoming = parseImport(await file.text());
    const accepted = incoming.earned.filter((name) => known.has(name));
    state.earned = new Set(accepted);
    if (incoming.spoilers) state.spoilers = true;
    persist();
    paint();
    const skipped = incoming.earned.length - accepted.length;
    say(skipped > 0
      ? `Imported ${accepted.length} trophies. ${skipped} names were not on the list.`
      : `Imported ${accepted.length} earned trophies.`);
  } catch {
    say('That file is not a progress export this ledger can read.');
  }
});

paint();
if (shot?.openId) scrollOpenRow(shot.openId);
