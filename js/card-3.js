// card-3.js — Distribution Panel (Card 3)
// 3C Content Record Centre · 3C Thread To Success™
//
// Delivery details. Not all platforms are equal, so each platform gets
// its own set of fields (title, description, keywords, hashtags, cta).
// A tab strip lets Chef switch between platforms when content is filed
// across more than one.

import { icon } from './icons.js';
import { formatCardHeader } from './numbering.js';

// Approximate public character guidance per platform — a helpful
// reference while writing, not an enforced hard rule.
const CHAR_LIMITS = {
  YT: { description: 5000 },
  TG: { description: 1024 },
  TK: { description: 2200 },
  PI: { description: 500 },
};

const DIST_FIELDS = [
  { key: 'title',       label: 'Title',       type: 'input' },
  { key: 'description', label: 'Description', type: 'textarea', rows: 6 },
  { key: 'hashtags',    label: 'Hashtags',     type: 'textarea', rows: 2 },
  { key: 'tags',        label: 'Tags',         type: 'textarea', rows: 2 },
  { key: 'cta',         label: 'CTA',          type: 'input' },
  { key: 'keywords',    label: 'Keywords',     type: 'input' },
];

let activePlatform = null;

export function renderCard3(draft) {
  const headerId = draft.id ? formatCardHeader(draft.id) : 'NEW RECORD';
  draft.distribution = draft.distribution || {};
  draft.platforms.forEach(p => {
    draft.distribution[p] = draft.distribution[p] || {};
  });

  if (!activePlatform || !draft.platforms.includes(activePlatform)) {
    activePlatform = draft.platforms[0];
  }

  const tabs = draft.platforms.map(p => `
    <button class="btn ${p === activePlatform ? 'btn--primary' : 'btn--ghost'}"
      data-platform-tab="${p}" style="padding:6px 14px; font-size:0.78rem;">${p}</button>
  `).join('');

  const current = draft.distribution[activePlatform];
  const limit = CHAR_LIMITS[activePlatform]?.description;

  const fields = DIST_FIELDS.map(f => {
    const val = esc(current[f.key] || '');
    const counter = f.key === 'description' && limit
      ? `<div class="char-counter" data-counter="${f.key}">${(current[f.key] || '').length} / ${limit}</div>`
      : '';
    const input = f.type === 'textarea'
      ? `<textarea data-dist-field="${f.key}" rows="${f.rows}">${val}</textarea>`
      : `<input type="text" data-dist-field="${f.key}" value="${val}" />`;
    return `<div class="field-block"><label>${f.label}</label>${input}${counter}</div>`;
  }).join('');

  return `
    <div class="record-card__header">
      <div class="record-card__id">${esc(headerId)}</div>
    </div>
    <div class="record-card__body" style="padding:0;">
      <div class="record-card__body--writing">
        <h2>Distribution Panel</h2>
        <div style="display:flex; gap:8px; margin-bottom:18px; flex-wrap:wrap;">${tabs}</div>
        <div data-dist-fields>${fields}</div>
      </div>
    </div>
    <p class="record-card__purpose-note">
      Keep a record of the public communication for the specific platform content.
    </p>
    <div class="record-card__footer">
      <button class="icon-btn" data-action="back" title="Back">${icon('back')}</button>
      <button class="icon-btn" data-action="save" title="Save">${icon('save')}</button>
    </div>`;
}

export function bindCard3Events(container, draft, { onBack, onSave, rerender }) {
  container.querySelectorAll('[data-platform-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      activePlatform = tab.dataset.platformTab;
      rerender(draft);
    });
  });

  container.querySelectorAll('[data-dist-field]').forEach(field => {
    field.addEventListener('input', () => {
      const key = field.dataset.distField;
      draft.distribution[activePlatform][key] = field.value;

      const counter = container.querySelector(`[data-counter="${key}"]`);
      const limit = CHAR_LIMITS[activePlatform]?.description;
      if (counter && limit) {
        counter.textContent = `${field.value.length} / ${limit}`;
        counter.classList.toggle('over-limit', field.value.length > limit);
      }
    });
  });

  container.querySelector('[data-action="back"]')?.addEventListener('click', () => onBack(draft));
  container.querySelector('[data-action="save"]')?.addEventListener('click', () => onSave(draft));
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
