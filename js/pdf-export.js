// pdf-export.js — PDF export for a complete content record
// 3C Content Record Centre · 3C Thread To Success™
//
// Produces one PDF per record: page 1 = Card 1 (label), page 2 = Card 2
// (production notes), page 3+ = Card 3 (one page per platform filed).
// Uses jsPDF loaded on demand from CDN — no build step needed, matching
// the rest of this repo's plain static-file approach.

import { formatCardHeader } from './numbering.js?v=3';

const JSPDF_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';

function loadJsPDF() {
  return new Promise((resolve, reject) => {
    if (window.jspdf?.jsPDF) return resolve(window.jspdf.jsPDF);
    const script = document.createElement('script');
    script.src = JSPDF_CDN;
    script.onload = () => resolve(window.jspdf.jsPDF);
    script.onerror = () => reject(new Error('Could not load PDF library'));
    document.head.appendChild(script);
  });
}

const FORMAT_COLOUR = { SV: [94, 23, 235], LV: [255, 188, 102], PC: [3, 228, 147] };

export async function exportRecordPDF(draft) {
  const JsPDF = await loadJsPDF();
  const doc = new JsPDF({ unit: 'pt', format: 'a4' });
  const headerId = draft.id ? formatCardHeader(draft.id) : 'NEW-RECORD';
  const formatCode = draft.id ? draft.id.split('-')[1] : 'SV';
  const colour = FORMAT_COLOUR[formatCode] || [94, 23, 235];

  // ── Page 1 — Card 1 ──────────────────────────────────────
  drawHeader(doc, headerId, colour);
  doc.setFontSize(11);
  let y = 110;
  const fields1 = [
    ['Category', draft.category], ['Title', draft.title], ['Persona', draft.persona],
    ['Date', `${draft.date || ''}  ${draft.time || ''}`], ['Format', draft.format],
    ['Platform', (draft.platforms || []).join(', ')], ['Playlist', draft.playlist],
    ['Index', draft.index],
  ];
  fields1.forEach(([label, value]) => {
    doc.setFont(undefined, 'bold');
    doc.text(`${label}:`, 50, y);
    doc.setFont(undefined, 'normal');
    doc.text(String(value || '—'), 150, y, { maxWidth: 380 });
    y += 28;
  });

  // ── Page 2 — Card 2 ──────────────────────────────────────
  doc.addPage();
  drawHeader(doc, headerId, colour);
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('Content Panel', 50, 100);
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(draft.content?.notes || '(no production notes yet)', 50, 124, { maxWidth: 495 });
  const notesHeight = doc.getTextDimensions(draft.content?.notes || '', { maxWidth: 495 }).h;
  doc.setFont(undefined, 'italic');
  doc.text('References:', 50, 130 + notesHeight + 16);
  doc.setFont(undefined, 'normal');
  doc.text(draft.content?.references || '—', 50, 130 + notesHeight + 32, { maxWidth: 495 });

  // ── Page 3+ — Card 3, one page per platform ──────────────
  (draft.platforms || []).forEach(p => {
    doc.addPage();
    drawHeader(doc, headerId, colour);
    const d = draft.distribution?.[p] || {};
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`Distribution — ${p}`, 50, 100);
    doc.setFontSize(10);
    let dy = 124;
    [['Title', d.title], ['Description', d.description], ['Hashtags', d.hashtags],
     ['Tags', d.tags], ['CTA', d.cta], ['Keywords', d.keywords]].forEach(([label, value]) => {
      doc.setFont(undefined, 'bold');
      doc.text(`${label}:`, 50, dy);
      doc.setFont(undefined, 'normal');
      const lines = doc.splitTextToSize(String(value || '—'), 420);
      doc.text(lines, 150, dy);
      dy += 18 + (lines.length - 1) * 14;
    });
  });

  doc.save(`${headerId}.pdf`);
}

function drawHeader(doc, headerId, colour) {
  doc.setFillColor(...colour);
  doc.rect(0, 0, 595, 70, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text(headerId, 50, 42);
  doc.setTextColor(0, 0, 0);
}
