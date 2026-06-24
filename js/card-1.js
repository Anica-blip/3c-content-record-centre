// card-1.js — Front / Label Card (Card 1)
// 3C Content Record Centre · 3C Thread To Success™
//
// Standard fields always present, whether filled in or not:
// Category, Title, Persona, Date, Format, Platform, Playlist, Index.
// This card also becomes the condensed label bar sent to the
// Content Schedule Planner (category + day + timestamp + platform).

import { icon } from './icons.js?v=3';
import { formatCardHeader } from './numbering.js?v=3';

const FIELD_ORDER = [
  { key: 'category', label: 'Category' },
  { key: 'title',     label: 'Title' },
  { key: 'persona',   label: 'Persona' },
  { key: 'date',      label: 'Date',     pairWith: 'time', pairLabel: 'Time' },
  { key: 'format',    label: 'Format' },
  { key: 'platform',  label: 'Platform' },
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

  const fields = FIELD_ORDER.map(f => {
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
  }).join('');

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

/**
 * Wires up Card 1's interactive elements. Call after inserting the
 * markup from renderCard1() into the DOM.
 */
export function bindCard1Events(container, draft, { onNext, onClose }) {
  container.querySelectorAll('[data-field]').forEach(input => {
    input.addEventListener('input', () => {
      draft[input.dataset.field] = input.value;
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
