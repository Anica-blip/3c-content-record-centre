// index-list.js — Dashboard + Index List + Card flow orchestration
// 3C Content Record Centre · 3C Thread To Success™

import { getRecords, createRecord, updateRecord, deleteRecord } from './api.js?v=3';
import { icon } from './icons.js?v=3';
import {
  buildCanonicalId, nextSequence, formatIndexTail,
  PLATFORM_ABBR, FORMAT_ABBR,
} from './numbering.js?v=3';
import { renderCard1, bindCard1Events } from './card-1.js?v=3';
import { renderCard2, bindCard2Events } from './card-2.js?v=3';
import { renderCard3, bindCard3Events } from './card-3.js?v=3';
import { exportRecordPDF } from './pdf-export.js?v=3';

const PLATFORMS = ['Telegram', 'YouTube', 'TikTok', 'Pinterest'];
const FORMATS   = ['short video', 'long video', 'post card'];

let allRecords     = [];
let activePlatform  = PLATFORMS[0];
let activeFormat    = null;
let searchQuery     = '';
let currentDraft     = null;
let currentStep      = 1;

const PLATFORM_BANNER = {
  Telegram:  'assets/banners/TG-banner.png',
  YouTube:   'assets/banners/YT-banner.png',
  TikTok:    'assets/banners/TK-banner.png',
  Pinterest: 'assets/banners/PI-banner.png',
};

const FORMAT_BUTTON = {
  'short video': 'assets/buttons/SV-button.png',
  'long video':  'assets/buttons/LV-button.png',
  'post card':   'assets/buttons/PC-button.png',
};

export async function initIndexList() {
  allRecords = await getRecords().catch(() => []);
  renderDashboard();
}

// ── Dashboard view ────────────────────────────────────────
function renderDashboard() {
  document.getElementById('list-view').classList.add('hidden');
  document.getElementById('dashboard-view').classList.remove('hidden');

  const rail = document.getElementById('platform-rail');
  rail.innerHTML = PLATFORMS.map(p => `
    <div class="platform-banner ${p === activePlatform ? 'active' : ''}" data-platform="${p}">
      <img src="${PLATFORM_BANNER[p]}" alt="${p}" />
    </div>`).join('');

  rail.querySelectorAll('[data-platform]').forEach(el => {
    el.addEventListener('click', () => {
      activePlatform = el.dataset.platform;
      renderDashboard();
    });
  });

  const grid = document.getElementById('format-grid');
  grid.innerHTML = FORMATS.map(f => `
    <button class="format-button" data-format="${f}">
      <img src="${FORMAT_BUTTON[f]}" alt="${f}" />
      <span class="index-badge">${icon('indexList')}</span>
    </button>`).join('');

  grid.querySelectorAll('[data-format]').forEach(el => {
    el.addEventListener('click', () => openListView(activePlatform, el.dataset.format));
  });
}

// ── List view ─────────────────────────────────────────────
function openListView(platform, format) {
  activePlatform = platform;
  activeFormat = format;
  searchQuery = '';
  document.getElementById('dashboard-view').classList.add('hidden');
  document.getElementById('list-view').classList.remove('hidden');
  renderListView();
}

function filteredRecords() {
  const pAbbr = PLATFORM_ABBR[activePlatform];
  const fAbbr = FORMAT_ABBR[activeFormat];
  let results = allRecords.filter(r =>
    r.platforms?.includes(activePlatform) && r.format === activeFormat
  );
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    results = results.filter(r => [
      r.category, r.persona, r.title, r.index, r.id,
      ...(r.platforms || []),
    ].join(' ').toLowerCase().includes(q));
  }
  return results;
}

function renderListView() {
  document.getElementById('list-banner').src = PLATFORM_BANNER[activePlatform];
  document.getElementById('list-format-badge').src = FORMAT_BUTTON[activeFormat];

  const results = filteredRecords();
  document.getElementById('pagination-label').textContent = `${results.length} record${results.length === 1 ? '' : 's'}`;

  const rowsEl = document.getElementById('index-rows');
  if (!results.length) {
    rowsEl.innerHTML = `<p style="padding:24px 6px; color:var(--text-muted);">No records yet for this platform and format. Use "+ New Record" to create the first one.</p>`;
    return;
  }

  rowsEl.innerHTML = results.map(r => renderRow(r)).join('');

  rowsEl.querySelectorAll('[data-view]').forEach(btn =>
    btn.addEventListener('click', () => openCardFlow(findRecord(btn.dataset.view))));
  rowsEl.querySelectorAll('[data-edit]').forEach(btn =>
    btn.addEventListener('click', () => openCardFlow(findRecord(btn.dataset.edit))));
  rowsEl.querySelectorAll('[data-copy]').forEach(btn =>
    btn.addEventListener('click', () => duplicateRecord(findRecord(btn.dataset.copy))));
  rowsEl.querySelectorAll('[data-download]').forEach(btn =>
    btn.addEventListener('click', () => exportRecordPDF(findRecord(btn.dataset.download))));
  rowsEl.querySelectorAll('[data-delete]').forEach(btn =>
    btn.addEventListener('click', () => handleDelete(btn.dataset.delete)));
}

function findRecord(id) {
  return allRecords.find(r => r.id === id);
}

function renderRow(r) {
  const tail = formatIndexTail(r.id);
  const platformsHtml = r.platforms.map(p => {
    const abbr = PLATFORM_ABBR[p] || p;
    return `<span class="${p === activePlatform ? '' : 'inactive'}">${abbr}</span>`;
  }).join('/');

  return `
    <div class="index-row">
      <button class="icon-btn" data-view="${r.id}" title="View">${icon('view')}</button>
      <div class="index-row__title">
        ${esc(r.category)} - ${esc(r.persona)} - ${esc(r.title)} - ${esc(r.index)} -
        <span class="index-row__platforms">${platformsHtml}</span> - ${tail}
      </div>
      <div class="index-row__actions">
        <button class="icon-btn" data-edit="${r.id}" title="Edit">${icon('edit')}</button>
        <button class="icon-btn" data-copy="${r.id}" title="Duplicate">${icon('copy')}</button>
        <button class="icon-btn" data-download="${r.id}" title="Download PDF">${icon('download')}</button>
        <button class="icon-btn icon-btn--danger" data-delete="${r.id}" title="Delete">${icon('delete')}</button>
      </div>
    </div>`;
}

export function returnToMenu() {
  renderDashboard();
}

export function bindSearch() {
  const input = document.getElementById('search-input');
  const bar = input.closest('.search-bar');
  input.addEventListener('input', () => {
    searchQuery = input.value;
    bar.classList.toggle('has-value', !!input.value);
    renderListView();
  });
  bar.querySelector('.clear-icon')?.addEventListener('click', () => {
    input.value = '';
    searchQuery = '';
    bar.classList.remove('has-value');
    renderListView();
  });
}

export function bindNewRecord() {
  document.getElementById('new-record-btn')?.addEventListener('click', () => {
    const blank = {
      id: null,
      category: 'Campaign',
      title: '',
      persona: 'Falcon',
      date: new Date().toISOString().slice(0, 10),
      time: '',
      format: activeFormat,
      platforms: [activePlatform],
      playlist: '',
      index: '',
      content: { notes: '', references: '' },
      distribution: {},
    };
    openCardFlow(blank);
  });
}

function duplicateRecord(record) {
  const copy = JSON.parse(JSON.stringify(record));
  copy.id = null;
  openCardFlow(copy);
}

async function handleDelete(id) {
  if (!confirm('Delete this record permanently?')) return;
  await deleteRecord(id);
  allRecords = allRecords.filter(r => r.id !== id);
  renderListView();
}

// ── Card flow (overlay) ───────────────────────────────────
function openCardFlow(record) {
  currentDraft = record;
  currentStep = 1;
  document.getElementById('card-overlay').classList.add('active');
  renderCurrentStep();
}

function closeCardFlow() {
  document.getElementById('card-overlay').classList.remove('active');
  currentDraft = null;
}

function renderCurrentStep() {
  const mount = document.getElementById('card-mount');
  if (currentStep === 1) {
    mount.innerHTML = renderCard1(currentDraft);
    bindCard1Events(mount, currentDraft, {
      onNext: async (draft) => { await persistDraft(draft); currentStep = 2; renderCurrentStep(); },
      onClose: async (draft) => { await persistDraft(draft); finishCardFlow(); },
    });
  } else if (currentStep === 2) {
    mount.innerHTML = renderCard2(currentDraft);
    bindCard2Events(mount, currentDraft, {
      onNext: async (draft) => { await persistDraft(draft); currentStep = 3; renderCurrentStep(); },
      onBack: async (draft) => { await persistDraft(draft); currentStep = 1; renderCurrentStep(); },
    });
  } else {
    mount.innerHTML = renderCard3(currentDraft);
    bindCard3Events(mount, currentDraft, {
      onBack: async (draft) => { await persistDraft(draft); currentStep = 2; renderCurrentStep(); },
      onSave: async (draft) => { await persistDraft(draft); finishCardFlow(); },
      rerender: () => { mount.innerHTML = renderCard3(currentDraft); bindCard3Events(mount, currentDraft, arguments[2]); },
    });
  }
}

async function persistDraft(draft) {
  if (!draft.id) {
    const sequence = nextSequence(allRecords, draft.platforms[0], draft.format);
    draft.id = buildCanonicalId({
      platform: draft.platforms[0],
      format: draft.format,
      persona: draft.persona,
      month: draft.date.slice(5, 7),
      year: draft.date.slice(0, 4),
      sequence,
    });
    draft.created = new Date().toISOString();
  }
  draft.updated = new Date().toISOString();

  const saved = draft.created && allRecords.some(r => r.id === draft.id)
    ? await updateRecord(draft.id, draft)
    : await createRecord(draft);

  const idx = allRecords.findIndex(r => r.id === saved.id);
  if (idx >= 0) allRecords[idx] = saved; else allRecords.push(saved);
}

function finishCardFlow() {
  closeCardFlow();
  renderListView();
}

document.getElementById('card-close-overlay')?.addEventListener?.('click', closeCardFlow);

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
