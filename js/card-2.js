// card-2.js — Content / Production Panel (Card 2)
// 3C Content Record Centre · 3C Thread To Success™
//
// The actual created content: words, slide notes, Canva Create video
// references, Suno music notes, etc. Free-writing area — content here
// can run longer than the card, so the body scrolls.

import { icon } from './icons.js?v=13';
import { formatCardHeaderForPlatform } from './numbering.js?v=13';

export function renderCard2(draft, viewingPlatform) {
  const headerId = draft.id ? formatCardHeaderForPlatform(draft, viewingPlatform) : 'NEW RECORD';
  draft.content = draft.content || { notes: '', references: '' };

  return `
    <div class="record-card__header">
      <div class="record-card__id">${esc(headerId)}</div>
    </div>
    <div class="record-card__body" style="padding:0;">
      <div class="record-card__body--writing">
        <h2>Content Panel</h2>

        <div class="field-block">
          <label>Production Notes</label>
          <textarea data-field="notes" rows="12"
            placeholder="Slide 1: ...&#10;Slide 2: ...&#10;Slide 3: ...">${esc(draft.content.notes)}</textarea>
        </div>

        <hr />

        <div class="field-block">
          <label>References (assets used)</label>
          <textarea data-field="references" rows="3"
            placeholder="Canva Create video, Suno music, voiceover notes...">${esc(draft.content.references)}</textarea>
        </div>
      </div>
    </div>
    <p class="record-card__purpose-note">
      All production notes &amp; references should be added to this section for record keeping.
    </p>
    <div class="record-card__footer">
      <button class="icon-btn" data-action="back" title="Back">${icon('back')}</button>
      <button class="icon-btn" data-action="next" title="Next">${icon('next')}</button>
    </div>`;
}

export function bindCard2Events(container, draft, { onNext, onBack }) {
  container.querySelectorAll('[data-field]').forEach(field => {
    field.addEventListener('input', () => {
      draft.content[field.dataset.field] = field.value;
    });
  });

  container.querySelector('[data-action="back"]')?.addEventListener('click', () => onBack(draft));
  container.querySelector('[data-action="next"]')?.addEventListener('click', () => onNext(draft));
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
