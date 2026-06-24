// index-list.js — Dashboard + Index List + Card flow orchestration
// 3C Content Record Centre · 3C Thread To Success™

import { getRecords, createRecord, updateRecord, deleteRecord } from './api.js?v=5';
import { icon } from './icons.js?v=5';
import {
  buildCanonicalId, nextSequence, formatIndexTail,
  PLATFORM_ABBR, FORMAT_ABBR,
} from './numbering.js?v=5';
import { renderCard1, bindCard1Events } from './card-1.js?v=5';
import { renderCard2, bindCard2Events } from './card-2.js?v=5';
import { renderCard3, bindCard3Events } from './card-3.js?v=5';
import { exportRecordPDF } from './pdf-export.js?v=5';

const PLATFORMS = ['Telegram', 'YouTube', 'TikTok', 'Pinterest'];
const FORMATS   = ['short video', 'long video', 'post card'];
const PAGE_SIZE = 10;

let allRecords      = [];
let activePlatform   = PLATFORMS[0];
let activeFormat     = null;
let searchQuery      = '';
let currentPage      = 1;
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
  sortNewestFirst();
  renderDashboard();
}

function sortNewestFirst() {
  allRecords.sort((a, b) => (b.created || '').localeCompare(a.created || ''));
}

// ── Topbar visibility — dashboard only, hidden on list view ─
function setTopbarVisible(visible) {
  document.getElementById('topbar')?.classList.toggle('hidden', !visible);
}

// ── Dashboard view ────────────────────────────────────────
function renderDashboard() {
  document.getElementById('list-view').classList.add('hidden');
  document.getElementById('dashboard-view').classList.remove('hidden');
  setTopbarVisible(true);

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
  currentPage = 1;
  document.getElementById('dashboard-view').classList.add('hidden');
  document.getElementById('list-view').classList.remove('hidden');
  setTopbarVisible(false);
  renderListView();
}

/**
 * Accepts either a plain search term or a pasted record URL
 * (e.g. https://recordmanagement.threadcommand.center/api/records/YT-SV-FL-06-2026-0001)
 * and reduces it to the bit worth matching against — the record ID itself.
 */
function normaliseSearchQuery(raw) {
  const trimmed = raw.trim();
  const urlMatch = trimmed.match(/\/api\/records\/([^/?#]+)/i);
  if (urlMatch) return decodeURIComponent(urlMatch[1]);
  return trimmed;
}

function filteredRecords() {
  let results = allRecords.filter(r =>
    r.platforms?.includes(activePlatform) && r.format === activeFormat
  );
  if (searchQuery.trim()) {
    const q = normaliseSearchQuery(searchQuery).toLowerCase();
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

  const results   = filteredRecords();
  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  currentPage = Math.min(currentPage, totalPages);

  document.getElementById('pagination-label').textContent =
    `${results.length} record${results.length === 1 ? '' : 's'}`;
  document.getElementById('page-indicator').textContent =
    `Page ${currentPage} of ${totalPages}`;
  document.getElementById('prev-page-btn').disabled = currentPage <= 1;
  document.getElementById('next-page-btn').disabled = currentPage >= totalPages;

  const pageResults = results.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const rowsEl = document.getElementById('index-rows');
  if (!pageResults.length) {
    rowsEl.innerHTML = `<p style="padding:24px 6px; color:var(--text-muted);">No records yet for this platform and format. Use "+ New Record" to create the first one.</p>`;
    return;
  }

  rowsEl.innerHTML = pageResults.map(r => renderRow(r)).join('');

  rowsEl.querySelectorAll('[data-view]').forEach(btn =>
    btn.addEventListener('click', () => openCardFlow(findRecord(btn.dataset.view))));
  rowsEl.querySelectorAll('[data-edit]').forEach(btn =>
    btn.addEventListener('click', () => openCardFlow(findRecord(btn.dataset.edit))));
  rowsEl.querySelectorAll('[data-copy]').forEach(btn =>
    btn.addEventListener('click', () => duplicateRecord(findRecord(btn.dataset.copy))));
  rowsEl.querySelectorAll('[data-download]').forEach(btn =>
    btn.addEventListener('click', () => exportRecordPDF(findRecord(btn.dataset.download))));
  rowsEl.querySelectorAll('[data-schedule]').forEach(btn =>
    btn.addEventListener('click', () => handleSchedule(findRecord(btn.dataset.schedule))));
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
        <button class="icon-btn" data-schedule="${r.id}" title="Send to Content Schedule Planner">${icon('schedule')}</button>
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
    currentPage = 1;
    bar.classList.toggle('has-value', !!input.value);
    renderListView();
  });
  bar.querySelector('.clear-icon')?.addEventListener('click', () => {
    input.value = '';
    searchQuery = '';
    currentPage = 1;
    bar.classList.remove('has-value');
    renderListView();
  });
}

export function bindPagination() {
  document.getElementById('prev-page-btn').addEventListener('click', () => {
    if (currentPage > 1) { currentPage--; renderListView(); }
  });
  document.getElementById('next-page-btn').addEventListener('click', () => {
    currentPage++; renderListView();
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

function handleSchedule(record) {
  // Placeholder until the Content Schedule Planner integration (Phase 2)
  // is wired up — forwarding Card 1's label data there is the intent.
  window.showToast?.(
    `Scheduling for "${record.title}" will connect once the Content Schedule Planner integration is ready.`,
    'error'
  );
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
      onChange: () => renderCurrentStep(),
    });
  } else if (currentStep === 2) {
    mount.innerHTML = renderCard2(currentDraft);
    bindCard2Events(mount, currentDraft, {
      onNext: async (draft) => { await persistDraft(draft); currentStep = 3; renderCurrentStep(); },
      onBack: async (draft) => { await persistDraft(draft); currentStep = 1; renderCurrentStep(); },
    });
  } else {
    renderStep3();
  }
}

function renderStep3() {
  const mount = document.getElementById('card-mount');
  mount.innerHTML = renderCard3(currentDraft);
  bindCard3Events(mount, currentDraft, {
    onBack: async (draft) => { await persistDraft(draft); currentStep = 2; renderCurrentStep(); },
    onSave: async (draft) => { await persistDraft(draft); finishCardFlow(); },
    rerender: () => renderStep3(),
  });
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
  sortNewestFirst();
}

function finishCardFlow() {
  closeCardFlow();
  currentPage = 1;
  renderListView();
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
