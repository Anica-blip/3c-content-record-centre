// index-list.js — Dashboard + Index List + Card flow orchestration
// 3C Content Record Centre · 3C Thread To Success™

import { getRecords, createRecord, updateRecord, deleteRecord } from './api.js?v=12';
import { icon } from './icons.js?v=12';
import {
  buildCanonicalId, nextSequence, formatIndexTailForPlatform,
  PLATFORM_ABBR, ALL_PLATFORMS,
} from './numbering.js?v=12';
import { renderCard1, bindCard1Events } from './card-1.js?v=12';
import { renderCard2, bindCard2Events } from './card-2.js?v=12';
import { renderCard3, bindCard3Events } from './card-3.js?v=12';
import { exportRecordPDF } from './pdf-export.js?v=12';

const PLATFORMS = ALL_PLATFORMS;
const FORMATS   = ['short video', 'long video', 'post card'];
const PAGE_SIZE = 10;

let allRecords        = [];
let activePlatform     = PLATFORMS[0];
let activeFormat       = null;
let searchQuery        = '';
let currentPage         = 1;
let currentDraft        = null;
let currentStep         = 1;
let viewingPlatform     = null; // which platform's number/tab a card was opened from

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
  await refreshRecords();
  renderDashboard();
}

/**
 * Re-fetches the live list from storage. Called on every tab open, not
 * just once at page load — so the index list always reflects what's
 * actually in storage right now, not a snapshot from whenever the page
 * happened to load. If the fetch genuinely fails, that's surfaced as a
 * visible error instead of silently showing an empty list that looks
 * identical to "there's nothing here."
 */
async function refreshRecords() {
  try {
    allRecords = await getRecords();
    sortNewestFirst();
  } catch (err) {
    window.showToast?.(`Could not load records: ${err.message}`, 'error');
  }
}

function sortNewestFirst() {
  allRecords.sort((a, b) => (b.created || '').localeCompare(a.created || ''));
}

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
async function openListView(platform, format) {
  activePlatform = platform;
  activeFormat = format;
  searchQuery = '';
  currentPage = 1;
  document.getElementById('dashboard-view').classList.add('hidden');
  document.getElementById('list-view').classList.remove('hidden');
  setTopbarVisible(false);
  await refreshRecords();
  renderListView();
}

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
    btn.addEventListener('click', () => openCardFlow(findRecord(btn.dataset.view), activePlatform)));
  rowsEl.querySelectorAll('[data-edit]').forEach(btn =>
    btn.addEventListener('click', () => openCardFlow(findRecord(btn.dataset.edit), activePlatform)));
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
  const tail = formatIndexTailForPlatform(r, activePlatform);
  const [monthYear, seq] = splitTailForDisplay(tail);
  const [leadingZeros, significant] = splitLeadingZeros(seq);

  const lettersHtml = ALL_PLATFORMS.map(p => {
    const isActive = r.platforms.includes(p);
    return `<span class="${isActive ? 'active' : 'inactive'}">${PLATFORM_ABBR[p]}</span>`;
  }).join('/');

  return `
    <div class="index-row">
      <button class="icon-btn" data-view="${r.id}" title="View">${icon('view')}</button>
      <div class="index-row__title">
        ${esc(r.category)} -
        <span class="index-row__truncate index-row__truncate--persona">${esc(r.persona)}</span> -
        <span class="index-row__truncate index-row__truncate--title">${esc(r.title)}</span> -
        ${esc(r.index)} -
        <span class="index-row__platforms">${lettersHtml}</span> -
        ${monthYear}<span class="index-row__seq-zeros">${leadingZeros}</span><span class="index-row__seq">${significant}</span>
      </div>
      <div class="index-row__actions">
        <button class="icon-btn" data-edit="${r.id}" title="Edit">${icon('edit')}</button>
        <button class="icon-btn" data-copy="${r.id}" title="Duplicate as new record">${icon('copy')}</button>
        <button class="icon-btn" data-schedule="${r.id}" title="Send to Content Schedule Planner">${icon('schedule')}</button>
        <button class="icon-btn" data-download="${r.id}" title="Download PDF">${icon('download')}</button>
        <button class="icon-btn icon-btn--danger" data-delete="${r.id}" title="Delete">${icon('delete')}</button>
      </div>
    </div>`;
}

/** Splits "06.2026.001" into ["06.2026.", "001"] so the sequence
 * number alone can be styled in pastel orange. */
function splitTailForDisplay(tail) {
  const lastDot = tail.lastIndexOf('.');
  return [tail.slice(0, lastDot + 1), tail.slice(lastDot + 1)];
}

/** Splits "001" into ["00", "1"] — leading padding zeros stay grey,
 * the actual significant digit(s) get the orange highlight. */
function splitLeadingZeros(seqStr) {
  const match = seqStr.match(/^(0*)(\d+)$/);
  return match ? [match[1], match[2]] : ['', seqStr];
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
      sequences: {},
      playlist: '',
      index: '',
      content: { notes: '', references: '' },
      distribution: {},
    };
    openCardFlow(blank, activePlatform);
  });
}

function duplicateRecord(record) {
  const copy = JSON.parse(JSON.stringify(record));
  copy.id = null;
  copy.platforms = [activePlatform];   // a duplicate starts as its own clean record
  copy.sequences = {};                  // gets its own fresh number on save
  copy.created = null;
  openCardFlow(copy, activePlatform);
}

/**
 * Delete is platform-aware. If a record is filed under more than one
 * platform, removing it from the current platform's view should not,
 * by default, destroy the other platforms' work — that's a deliberate
 * second choice ("delete all"), never the default.
 */
async function handleDelete(id) {
  const record = findRecord(id);
  if (!record) return;

  if (record.platforms.length <= 1) {
    if (!confirm('Delete this record permanently?')) return;
    await deleteRecord(id);
    allRecords = allRecords.filter(r => r.id !== id);
    renderListView();
    return;
  }

  const removeOnly = confirm(
    `Remove ${activePlatform} from this record? The other platform(s) — ${record.platforms.filter(p => p !== activePlatform).join(', ')} — will be kept.\n\nPress Cancel to choose deleting the entire record instead.`
  );

  if (removeOnly) {
    record.platforms = record.platforms.filter(p => p !== activePlatform);
    delete record.sequences[activePlatform];
    delete record.distribution?.[activePlatform];
    const saved = await updateRecord(record.id, record);
    const idx = allRecords.findIndex(r => r.id === saved.id);
    if (idx >= 0) allRecords[idx] = saved;
    renderListView();
    return;
  }

  if (confirm('Delete the ENTIRE record — every platform it is filed under — permanently?')) {
    await deleteRecord(id);
    allRecords = allRecords.filter(r => r.id !== id);
    renderListView();
  }
}

function handleSchedule(record) {
  window.showToast?.(
    `Scheduling for "${record.title}" will connect once the Content Schedule Planner integration is ready.`,
    'error'
  );
}

// ── Card flow (overlay) ───────────────────────────────────
function openCardFlow(record, openedFromPlatform) {
  currentDraft = record;
  viewingPlatform = openedFromPlatform || record.platforms[0];
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
    mount.innerHTML = renderCard1(currentDraft, viewingPlatform);
    bindCard1Events(mount, currentDraft, {
      onNext: (draft) => { currentStep = 2; renderCurrentStep(); },
      onClose: async (draft) => { await persistDraft(draft); finishCardFlow(); },
      onChange: () => renderCurrentStep(),
      onAddPlatform: (platform) => {
        if (!currentDraft.platforms.includes(platform)) {
          currentDraft.platforms = [...currentDraft.platforms, platform];
        }
      },
    });
  } else if (currentStep === 2) {
    mount.innerHTML = renderCard2(currentDraft, viewingPlatform);
    bindCard2Events(mount, currentDraft, {
      onNext: (draft) => { currentStep = 3; renderCurrentStep(); },
      onBack: (draft) => { currentStep = 1; renderCurrentStep(); },
    });
  } else {
    renderStep3();
  }
}

function renderStep3() {
  const mount = document.getElementById('card-mount');
  mount.innerHTML = renderCard3(currentDraft);
  bindCard3Events(mount, currentDraft, {
    onBack: (draft) => { currentStep = 2; renderCurrentStep(); },
    onSave: async (draft) => { await persistDraft(draft); finishCardFlow(); },
    rerender: () => renderStep3(),
  });
}

/**
 * The only place a record actually gets written to storage — Card 1's
 * Close, or Card 3's Save. Assigns a fresh sequence number to any
 * platform that doesn't have one yet, without ever recalculating or
 * touching a platform that already has one.
 */
async function persistDraft(draft) {
  draft.sequences = draft.sequences || {};
  draft.platforms.forEach(p => {
    if (draft.sequences[p] == null) {
      draft.sequences[p] = nextSequence(allRecords, p, draft.format);
    }
  });

  if (!draft.id) {
    const homePlatform = draft.platforms[0];
    draft.id = buildCanonicalId({
      platform: homePlatform,
      format: draft.format,
      persona: draft.persona,
      month: draft.date.slice(5, 7),
      year: draft.date.slice(0, 4),
      sequence: draft.sequences[homePlatform],
    });
    draft.created = new Date().toISOString();
  }
  draft.updated = new Date().toISOString();

  const saved = allRecords.some(r => r.id === draft.id)
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
