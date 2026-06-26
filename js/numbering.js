// numbering.js — Content ID numbering system
// 3C Content Record Centre · 3C Thread To Success™
//
// One shared record can be filed under several platforms at once.
// Each platform keeps its OWN independent sequence counter — TG might
// be at #150 while TK is only at #55 — so adding a platform to an
// existing record never reuses another platform's number, and never
// touches another platform's already-saved work.

export const PLATFORM_ABBR = {
  Telegram:  'TG',
  YouTube:   'YT',
  TikTok:    'TK',
  Pinterest: 'PI',
};

export const ALL_PLATFORMS = Object.keys(PLATFORM_ABBR);

export const FORMAT_ABBR = {
  'short video': 'SV',
  'long video':  'LV',
  'post card':   'PC',
};

export const FORMAT_META = {
  SV: { label: 'short video', colour: '#5e17eb', font: '#ffffff' },
  LV: { label: 'long video',  colour: '#ffbc66', font: '#1a1a1a' },
  PC: { label: 'post card',   colour: '#03e493', font: '#1a1a1a' },
};

export const PERSONA_ABBR = {
  Falcon:  'FL',
  Panther: 'PT',
  Wolf:    'WF',
  Lion:    'LN',
  All:     'AL',
};

/**
 * Builds the storage-key ID for a record — based on whichever platform
 * is the "home" platform (the one it was first created under). This is
 * the filename in R2, never reassigned once a record exists.
 */
export function buildCanonicalId({ platform, format, persona, month, year, sequence }) {
  const p  = PLATFORM_ABBR[platform]   || platform;
  const f  = FORMAT_ABBR[format]       || format;
  const pr = PERSONA_ABBR[persona]     || persona;
  const mm = String(month).padStart(2, '0');
  const yyyy = String(year);
  const seq = String(sequence).padStart(4, '0');
  return `${p}-${f}-${pr}-${mm}-${yyyy}-${seq}`;
}

/**
 * Card header display, for whichever platform is currently the active
 * tab — uses THAT platform's own sequence number, not the storage-key id.
 * Matches the Canva mockup: YT-SV-FL-06.26-0055
 */
export function formatCardHeaderForPlatform(record, platform) {
  const abbr = PLATFORM_ABBR[platform] || platform;
  const f    = FORMAT_ABBR[record.format] || record.format;
  const pr   = PERSONA_ABBR[record.persona] || record.persona;
  const mm   = (record.date || '').slice(5, 7);
  const yy   = (record.date || '').slice(2, 4);
  const seq  = record.sequences?.[platform];
  const seqStr = seq != null ? String(seq).padStart(3, '0') : '---';
  return `${abbr}-${f}-${pr}-${mm}.${yy}-${seqStr}`;
}

/**
 * Index list display tail for a specific platform — matches the Canva
 * mockup: 06.2026.0055
 */
export function formatIndexTailForPlatform(record, platform) {
  const mm   = (record.date || '').slice(5, 7);
  const yyyy = (record.date || '').slice(0, 4);
  const seq  = record.sequences?.[platform];
  const seqStr = seq != null ? String(seq).padStart(3, '0') : '---';
  return `${mm}.${yyyy}.${seqStr}`;
}

/**
 * Finds the next free sequence number for a specific platform + format
 * combination, looking across every existing record's own per-platform
 * sequence map. Starts at 1.
 */
export function nextSequence(existingRecords, platform, format) {
  const max = existingRecords.reduce((acc, r) => {
    if (r.format !== format) return acc;
    const seq = r.sequences?.[platform];
    return seq != null ? Math.max(acc, seq) : acc;
  }, 0);
  return max + 1;
}
