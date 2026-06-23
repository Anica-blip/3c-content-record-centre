// numbering.js — Content ID numbering system
// 3C Content Record Centre · 3C Thread To Success™
//
// ID sequence order: platform (1st) + format (2nd) + persona (3rd)
// + month (4th) + year (5th) + generated number (6th, starts at 001
// per platform+format combination)

export const PLATFORM_ABBR = {
  YouTube:   'YT',
  Telegram:  'TG',
  TikTok:    'TK',
  Pinterest: 'PI',
};

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
 * Builds the canonical machine ID (stored, never shown raw to the user).
 * Example: YT-SV-FL-05-2026-0001
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
 * Parses a canonical ID back into its parts.
 */
export function parseCanonicalId(id) {
  const [platform, format, persona, month, year, sequence] = id.split('-');
  return { platform, format, persona, month, year, sequence };
}

/**
 * Card header display style — matches the Canva mockup exactly:
 * YT-SV-FL-05.26-001  (2-digit year, hyphen-dot mix, 3-digit sequence)
 */
export function formatCardHeader(id) {
  const { platform, format, persona, month, year, sequence } = parseCanonicalId(id);
  const yy = year.slice(-2);
  const seq3 = String(parseInt(sequence, 10)).padStart(3, '0');
  return `${platform}-${format}-${persona}-${month}.${yy}-${seq3}`;
}

/**
 * Index list display style — matches the Canva mockup exactly:
 * 05.2026.0001  (4-digit year, dot separator, 4-digit sequence)
 * Used as the trailing fragment after the platform list in an index row.
 */
export function formatIndexTail(id) {
  const { month, year, sequence } = parseCanonicalId(id);
  return `${month}.${year}.${sequence}`;
}

/**
 * Given existing records (already loaded), finds the next free sequence
 * number for a specific platform + format combination. Starts at 1.
 */
export function nextSequence(existingRecords, platform, format) {
  const matches = existingRecords.filter(r =>
    r.platforms?.[0] === platform && r.format === format
  );
  if (!matches.length) return 1;
  const max = matches.reduce((acc, r) => {
    const { sequence } = parseCanonicalId(r.id);
    return Math.max(acc, parseInt(sequence, 10));
  }, 0);
  return max + 1;
}

/**
 * Builds the platform abbreviation list for an index row, e.g. "YT/TG/PI/TK",
 * with the primary (filed-under) platform distinguished from the rest.
 */
export function formatPlatformList(platforms, primaryPlatform) {
  return platforms.map(p => {
    const abbr = PLATFORM_ABBR[p] || p;
    const isPrimary = p === primaryPlatform;
    return { abbr, isPrimary };
  });
}
