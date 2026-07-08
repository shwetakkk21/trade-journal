/**
 * Advanced portfolio calendar utility for calculation windows.
 */

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