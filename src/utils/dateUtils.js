/**
 * Advanced portfolio calendar utility for calculation windows.
 */

// Google Sheets DATE MAPPING
const MONTH_NAME_TO_INDEX = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

const toIsoDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Normalise any date value coming out of a Google Sheet cell (or already
 * in ISO form) into a canonical "YYYY-MM-DD" string. Returns null when the
 * value is empty or unparseable so callers can keep treating "no date" as
 * "no date" rather than silently falling back to today.
 */
export const parseSheetDate = (rawValue) => {
  if (rawValue === null || rawValue === undefined || rawValue === '') return null;

  if (rawValue instanceof Date) {
    return isNaN(rawValue.getTime()) ? null : toIsoDate(rawValue);
  }

  const str = String(rawValue).trim();
  if (!str || str === '—' || str === '-' || str.includes('#')) return null;

  // Already ISO, optionally with a time component (e.g. from column S, or
  // an UNFORMATTED_VALUE fetch): "2026-06-19", "2026-06-19 00:00:00"...
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  // The sheet's actual formatted display text: "19 Jun 26", "3 June 2026",
  // "9 May 26"... day is 1-2 digits, month is a name, year is 2 or 4 digits.
  const textMatch = str.match(/^(\d{1,2})\s+([A-Za-z]+)\.?\s+(\d{2,4})$/);
  if (textMatch) {
    const day = parseInt(textMatch[1], 10);
    const month = MONTH_NAME_TO_INDEX[textMatch[2].toLowerCase()];
    let year = parseInt(textMatch[3], 10);
    if (textMatch[3].length === 2) {
      year += year < 70 ? 2000 : 1900;
    }
    if (month !== undefined && !isNaN(day) && !isNaN(year)) {
      const parsed = new Date(year, month, day);
      if (!isNaN(parsed.getTime())) return toIsoDate(parsed);
    }
  }

  // Last resort: let the engine take a shot (covers other reasonable
  // formats), but only accept it if it produced a real date.
  const fallbackParsed = new Date(str);
  if (!isNaN(fallbackParsed.getTime())) return toIsoDate(fallbackParsed);

  return null;
};

export const getTodayString = () => {
  const today = new Date();
  // Adjusts cleanly for localized timezone boundaries
  const offset = today.getTimezoneOffset();
  const adjustedDate = new Date(today.getTime() - offset * 60 * 1000);
  return adjustedDate.toISOString().split('T')[0];
};

export const isWithinTimeframe = (dateString, timeframe, customStart = null, customEnd = null) => {
  if (!dateString) return false;
  if (timeframe === 'ALL') return true;

  const recordDate = new Date(dateString);
  const now = new Date();

  // Strip hours, minutes, and seconds to ensure purely calendar-day matching
  now.setHours(0, 0, 0, 0);
  recordDate.setHours(0, 0, 0, 0);

  // Handle explicit custom date intervals
  if (timeframe === 'CUSTOM') {
    if (!customStart) return true; // Yield all records gracefully until user finishes input selections
    const startBound = new Date(customStart);
    startBound.setHours(0, 0, 0, 0);

    const endBound = customEnd ? new Date(customEnd) : new Date();
    endBound.setHours(23, 59, 59, 999);

    return recordDate >= startBound && recordDate <= endBound;
  }

  // Calculate the raw age of the trade in days
  const timeDiff = now.getTime() - recordDate.getTime();
  const daysAgo = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

  // Block any accidental future-stamped records from leaking into active historical tracking
  if (daysAgo < 0) return timeframe === '1DAY';

  switch (timeframe) {
    case '1DAY':
      return daysAgo === 0; // Strictly matching today's calendar window
    case '1WEEK':
      return daysAgo >= 0 && daysAgo <= 7;
    case '2WEEKS':
      return daysAgo >= 0 && daysAgo <= 14;
    case '1MONTH':
      return daysAgo >= 0 && daysAgo <= 30;
    case '1QUARTER':
      return daysAgo >= 0 && daysAgo <= 90;
    case '1YEAR':
      return daysAgo >= 0 && daysAgo <= 365;
    default:
      return true;
  }
};