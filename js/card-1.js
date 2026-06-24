// card-1.js — Front / Label Card (Card 1)
// 3C Content Record Centre · 3C Thread To Success™
//
// Standard fields always present, whether filled in or not:
// Category, Title, Persona, Date, Format, Platform, Playlist, Index.
// This card also becomes the condensed label bar sent to the
// Content Schedule Planner (category + day + timestamp + platform).
//
// Platform is multi-select, additive only: chips show every platform
// this record is currently filed under; removing one or adding another
// only ever touches the platforms list itself — Card 3's distribution
// data for platforms already on the record is never overwritten.

import { icon } from './icons.js?v=5';
import { formatCardHeader } from './numbering.js?v=5';

const ALL_PLATFORMS = ['Telegram', 'YouTube', 'TikTok', 'Pinterest'];

const FIELD_ORDER = [
  { key: 'category', label: 'Category' },
  { key: 'title',     label: 'Title' },
  { key: 'persona',   label: 'Persona' },
  { key: 'date',      label: 'Date',     pairWith: 'time', pairLabel: 'Time' },
  { key: 'format',    label: 'Format' },
  { key: 'playlist',  label: 'Playlist' },
  { key: 'index',     label: 'Index' },
];

/**
 * Renders Card 1's full markup (header, body, footer) into a string.
 * `draft` is the in-memory working copy of the record being viewed/edited.
 */
export function renderCard1(draft) {
  const headerId = draft.id ? formatCardHeader(draft.id) : 'NEW RECORD';
  const year = draft.date ? draft.date.slice(0, 4) : new Date().getFullYear();
  draft.platforms = draft.platforms || [];

  const platformFieldHtml = `
    <div class="record-card__field">
      <div class="record-card__field-label">Platform</div>
      ${renderPlatformChips(draft.platforms)}
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
            style="background:none;border:none;color:#fff;flex:1;padding:0;font-size:0.92rem;" />
        </div>`;
    }
    return `
      <div class="record-card__field">
        <div class="record-card__field-label">${f.label}</div>
        <input type="text" data-field="${f.key}" value="${esc(draft[f.key] || '')}"
          style="background:none;border:none;color:#fff;flex:1;padding:0;font-size:0.92rem;overflow-wrap:break-word;word-break:break-word;" />
      </div>`;
  };

  // Platform sits right after Title, matching the original field order:
  // Category, Title, Persona, Date+Time, Format, Platform, Playlist, Index.
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

function renderPlatformChips(platforms) {
  const chips = platforms.map(p => `
    <span class="platform-chip" data-chip="${p}">
      ${esc(p)}
      <button type="button" data-remove-platform="${p}" title="Remove ${esc(p)}">${icon('close')}</button>
    </span>`).join('');

  const remaining = ALL_PLATFORMS.filter(p => !platforms.includes(p));
  const addControl = remaining.length
    ? `<select class="platform-chip-add" data-add-platform>
         <option value="">+ Add platform</option>
         ${remaining.map(p => `<option value="${p}">${p}</option>`).join('')}
       </select>`
    : '';

  return `<div class="platform-chips">${chips}${addControl}</div>`;
}

/**
 * Wires up Card 1's interactive elements. Call after inserting the
 * markup from renderCard1() into the DOM.
 *
 * onChange is called whenever the platform list itself changes (add or
 * remove), so the caller can re-render this card in place to reflect
 * the updated chip list.
 */
export function bindCard1Events(container, draft, { onNext, onClose, onChange }) {
  container.querySelectorAll('[data-field]').forEach(input => {
    input.addEventListener('input', () => {
      draft[input.dataset.field] = input.value;
    });
  });

  container.querySelectorAll('[data-remove-platform]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = btn.dataset.removePlatform;
      if (draft.platforms.length <= 1) return; // never leave a record with zero platforms
      draft.platforms = draft.platforms.filter(x => x !== p);
      onChange?.();
    });
  });

  container.querySelector('[data-add-platform]')?.addEventListener('change', (e) => {
    const p = e.target.value;
    if (!p || draft.platforms.includes(p)) return;
    draft.platforms = [...draft.platforms, p]; // additive — never touches existing platforms' data
    onChange?.();
  });

  container.querySelector('[data-action="close"]')?.addEventListener('click', () => onClose(draft));
  container.querySelector('[data-action="next"]')?.addEventListener('click', () => onNext(draft));
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
