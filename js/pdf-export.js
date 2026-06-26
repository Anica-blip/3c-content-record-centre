// pdf-export.js — PDF export for a complete content record
// 3C Content Record Centre · 3C Thread To Success™
//
// Produces one PDF per record: page 1 = Card 1 (label), page 2 = Card 2
// (production notes), page 3+ = Card 3 (one page per platform filed).
// Uses jsPDF loaded on demand from CDN — no build step needed, matching
// the rest of this repo's plain static-file approach.

import { formatCardHeaderForPlatform, PLATFORM_ABBR, FORMAT_ABBR } from './numbering.js?v=12';

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

// jsPDF's built-in fonts only support the Latin-1/WinAnsi character set —
// any emoji falls outside that entirely and comes out as garbled bytes
// rather than failing cleanly. Stripping them keeps the PDF readable;
// embedding a full emoji-capable font would be a much bigger lift for
// what's mainly a working-content backup, not a branded deliverable.
function cleanForPdf(str) {
  if (!str) return str;
  return String(str).replace(
    /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu,
    ''
  );
}

export async function exportRecordPDF(draft) {
  const JsPDF = await loadJsPDF();
  const doc = new JsPDF({ unit: 'pt', format: 'a4' });
  const homePlatform = draft.platforms?.[0];
  const headerId = draft.id ? formatCardHeaderForPlatform(draft, homePlatform) : 'NEW-RECORD';
  const formatCode = FORMAT_ABBR[draft.format] || 'SV';
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
    doc.text(cleanForPdf(String(value || '—')), 150, y, { maxWidth: 380 });
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
  const notesText = cleanForPdf(draft.content?.notes || '(no production notes yet)');
  doc.text(notesText, 50, 124, { maxWidth: 495 });
  const notesHeight = doc.getTextDimensions(notesText, { maxWidth: 495 }).h;
  doc.setFont(undefined, 'italic');
  doc.text('References:', 50, 130 + notesHeight + 16);
  doc.setFont(undefined, 'normal');
  doc.text(cleanForPdf(draft.content?.references || '—'), 50, 130 + notesHeight + 32, { maxWidth: 495 });

  // ── Page 3+ — Card 3, one page per platform ──────────────
  (draft.platforms || []).forEach(p => {
    doc.addPage();
    const platformHeaderId = formatCardHeaderForPlatform(draft, p);
    drawHeader(doc, platformHeaderId, colour);
    const d = draft.distribution?.[p] || {};
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`Distribution — ${p}`, 50, 100);
    doc.setFontSize(10);
    let dy = 124;
    [['Title', d.title], ['Description', d.description], ['Hashtags', d.hashtags],
     ['Tags', d.tags], ['CTA', d.cta], ['Keywords', d.keywords],
     ['Platform Notes', d.platformNotes]].forEach(([label, value]) => {
      doc.setFont(undefined, 'bold');
      doc.text(`${label}:`, 50, dy);
      doc.setFont(undefined, 'normal');
      const lines = doc.splitTextToSize(cleanForPdf(String(value || '—')), 420);
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
