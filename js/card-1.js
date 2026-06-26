// card-1.js — Front / Label Card (Card 1)
// 3C Content Record Centre · 3C Thread To Success™
//
// Standard fields always present, whether filled in or not:
// Category, Title, Persona, Date, Format, Platform, Playlist, Index.
//
// Platform row is fixed: all four letters always shown. Active
// platforms (already filed under) are orange; inactive ones are grey.
// Clicking an inactive letter adds that platform to the record with
// its own freshly assigned sequence number — never touching another
// platform's number or data. Clicking an already-active letter does
// not remove it; removal lives in the index list's delete flow, where
// "remove from this platform only" vs "delete the whole record" is an
// explicit choice, not an accidental tap.

import { icon } from './icons.js?v=13';
import {
  ALL_PLATFORMS, PLATFORM_ABBR, formatCardHeaderForPlatform, parseDateParts,
} from './numbering.js?v=13';

const FIELD_ORDER = [
  { key: 'category', label: 'Category' },
  { key: 'title',     label: 'Title',    wrap: true },
  { key: 'persona',   label: 'Persona' },
  { key: 'date',      label: 'Date',     pairWith: 'time', pairLabel: 'Time' },
  { key: 'format',    label: 'Format' },
  { key: 'playlist',  label: 'Playlist' },
  { key: 'index',     label: 'Index',    wrap: true },
];

/**
 * Renders Card 1's full markup. `viewingPlatform` decides which
 * platform's sequence number shows in the header — the tab the record
 * was opened from.
 */
export function renderCard1(draft, viewingPlatform) {
  draft.platforms = draft.platforms || [];
  draft.sequences = draft.sequences || {};
  const headerId = draft.id ? formatCardHeaderForPlatform(draft, viewingPlatform) : 'NEW RECORD';
  const { year } = parseDateParts(draft.date);

  const platformFieldHtml = `
    <div class="record-card__field">
      <div class="record-card__field-label">Platform</div>
      ${renderPlatformRow(draft.platforms)}
    </div>`;

  const fieldHtml = (f) => {
    if (f.pairWith) {
      return `
        <div class="record-card__field">
          <div class="record-card__field-label">${f.label}</div>
          <input type="text" data-field="${f.key}" value="${esc(draft[f.key] || '')}"
            style="background:none;border:none;color:#fff;flex:1;padding:0;font-size:0.92rem;" />
          <div class="record-card__field-label" style="margin-left:10px;">${f.pairLabel}</div>
          <input type="text" data-field="${f.pairWith}" value="${esc(draft[f.pairWith] || '')}"
            placeholder="HH:MM (24h)" maxlength="5"
            style="background:none;border:none;border-bottom:1px dashed var(--border-strong);color:#fff;flex:1;padding:0 0 2px;font-size:0.92rem;" />
        </div>`;
    }
    if (f.wrap) {
      return `
        <div class="record-card__field">
          <div class="record-card__field-label">${f.label}</div>
          <textarea data-field="${f.key}" rows="2"
            style="background:none;border:none;color:#fff;flex:1;padding:0;font-size:0.92rem;resize:none;overflow-wrap:break-word;word-break:break-word;font-family:inherit;line-height:1.4;">${esc(draft[f.key] || '')}</textarea>
        </div>`;
    }
    return `
      <div class="record-card__field">
        <div class="record-card__field-label">${f.label}</div>
        <input type="text" data-field="${f.key}" value="${esc(draft[f.key] || '')}"
          style="background:none;border:none;color:#fff;flex:1;padding:0;font-size:0.92rem;overflow-wrap:break-word;word-break:break-word;" />
      </div>`;
  };

  // Platform sits right after Format, matching the original field order.
  const fields = FIELD_ORDER
    .map(f => f.key === 'format' ? fieldHtml(f) + platformFieldHtml : fieldHtml(f))
    .join('');

  return `
    <div class="record-card__header">
      <div class="record-card__id">${esc(headerId)}</div>
    </div>
    <div class="record-card__body">
      <div class="record-card__year">${esc(String(year))}</div>
      ${fields}
    </div>
    <div class="record-card__footer">
      <button class="icon-btn" data-action="close" title="Close">${icon('close')}</button>
      <button class="icon-btn" data-action="next" title="Next">${icon('next')}</button>
    </div>`;
}

function renderPlatformRow(activePlatforms) {
  const letters = ALL_PLATFORMS.map(p => {
    const isActive = activePlatforms.includes(p);
    return `<button type="button" class="platform-letter ${isActive ? 'active' : ''}"
      data-platform-letter="${p}">${PLATFORM_ABBR[p]}</button>`;
  }).join('');
  return `<div class="platform-letter-row">${letters}</div>`;
}

/**
 * Wires up Card 1's interactive elements.
 * onChange fires whenever a platform is added, so the caller can
 * re-render in place and recalculate that platform's new sequence.
 */
export function bindCard1Events(container, draft, { onNext, onClose, onChange, onAddPlatform }) {
  container.querySelectorAll('[data-field]').forEach(input => {
    input.addEventListener('input', () => {
      draft[input.dataset.field] = input.value;
    });
  });

  container.querySelectorAll('[data-platform-letter]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = btn.dataset.platformLetter;
      if (draft.platforms.includes(p)) {
        window.showToast?.(`To remove ${p}, use the delete option in the index list.`, 'error');
        return;
      }
      onAddPlatform?.(p);
      onChange?.();
    });
  });

  container.querySelector('[data-action="close"]')?.addEventListener('click', () => onClose(draft));
  container.querySelector('[data-action="next"]')?.addEventListener('click', () => onNext(draft));
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
