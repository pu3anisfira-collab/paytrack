/**
 * TNG eWallet exports use inconsistent date formats depending on export
 * region/version. This tries the common ones in order and returns a JS Date,
 * or null if nothing matches.
 */
function parseFlexibleDate(raw) {
  if (!raw) return null;
  const value = String(raw).trim();

  // Already a valid ISO-ish date
  const isoAttempt = new Date(value);
  if (!Number.isNaN(isoAttempt.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return isoAttempt;
  }

  // DD.MM.YY or DD.MM.YYYY
  let match = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (match) return buildDate(match[1], match[2], match[3]);

  // DD/MM/YYYY or DD/MM/YY
  match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (match) return buildDate(match[1], match[2], match[3]);

  // DD-MM-YYYY
  match = value.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
  if (match) return buildDate(match[1], match[2], match[3]);

  // Fallback to native parser (handles "12 Jan 2024" etc.)
  const fallback = new Date(value);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function buildDate(day, month, year) {
  let y = parseInt(year, 10);
  if (y < 100) y += 2000;
  const d = parseInt(day, 10);
  const m = parseInt(month, 10) - 1;
  const date = new Date(Date.UTC(y, m, d));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Parses a numeric amount string, stripping currency symbols and commas. */
function parseAmount(raw) {
  if (raw === null || raw === undefined) return null;
  const cleaned = String(raw).replace(/[^0-9.-]/g, '');
  const value = parseFloat(cleaned);
  return Number.isNaN(value) ? null : value;
}

module.exports = { parseFlexibleDate, parseAmount };
