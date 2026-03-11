// utils/accessionGenerator.js
const dayjs = require('dayjs');

/**
 * Format accession string:
 * Example -> PREFIX + YYYYMMDD + - + zero-padded seq
 * e.g. ACC20251125-000042
 */
function formatAccession(prefix = 'ACC', seq = 0, pad = 6, date = new Date()) {
  const d = dayjs(date).format('YYYYMMDD');
  const s = String(seq).padStart(pad, '0');
  return `${prefix}${d}-${s}`;
}

module.exports = { formatAccession };
