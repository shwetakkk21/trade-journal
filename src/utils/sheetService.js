import { buildTradeRowValues } from './rowBuilder';
import { parseSheetDate } from './dateUtils';

const sanitizeNumber = (value) => {
  if (
    !value ||
    value === '—' ||
    value.toString().includes('#') ||
    value.toString().includes('NaN')
  ) {
    return 0;
  }
  const cleanStr = value.toString().replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleanStr);
  return isNaN(parsed) ? 0 : parsed;
};

// Column S (0-indexed 18) holds the hidden bookkeeping stamp written by
// rowBuilder: "YYYY-MM-DD|TAG|LINK". Older rows may only have a bare date
// (or nothing) — callers treat those as "not modified today" so they won't
// appear in the today's-transactions view, and infer a tag from the row's
// own open/closed state so nothing crashes on legacy data.
const LAST_MODIFIED_COL_INDEX = 18;

const parseBookkeeping = (rawValue, isClosed) => {
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return { lastModified: null, txTag: isClosed ? 'SELL' : 'BUY', txLink: null };
  }
  const parts = String(rawValue).split('|');
  const lastModified = parseSheetDate(parts[0]);
  const txTag = parts[1] || (isClosed ? 'SELL' : 'BUY');
  const txLink = parts[2] ? Number(parts[2]) : null;
  return { lastModified, txTag, txLink: Number.isNaN(txLink) ? null : txLink };
};

/**
 * Fetch a sub-sheet and normalise into ledger rows.
 */
export const fetchAndSanitizeSheet = async (
  spreadsheetId,
  subsheetName,
  accountType,
  accessToken
) => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${subsheetName}!A1:Z1000`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Google Sheets connection error: ${response.statusText}`);
  }

  const data = await response.json();
  const rawRows = data.values;
  if (!rawRows || rawRows.length === 0) return [];

  let headerIndex = rawRows.findIndex(
    (row) =>
      row.join(',').toLowerCase().includes('symbol') &&
      row.join(',').toLowerCase().includes('qty')
  );
  if (headerIndex === -1) headerIndex = 0;

  const rawHeaders = rawRows[headerIndex].map((h) => h.trim().toLowerCase());
  const getColIndex = (names) =>
    rawHeaders.findIndex((h) => names.some((p) => h.includes(p)));

  const symbolIndexes = rawHeaders
    .map((h, i) => (h === 'symbol' || h === 'nse:symbol' ? i : -1))
    .filter((i) => i !== -1);
  const idxSymbol =
    symbolIndexes.length > 1 ? symbolIndexes[1] : symbolIndexes[0] ?? -1;

  const idxBuyDt = getColIndex(['buy dt', 'buy date']);
  const idxBuyPrice = getColIndex(['buy price']);
  const idxQty = getColIndex(['qty', 'quantity']);
  const idxLivePrice = rawHeaders.findIndex((h) => h.trim() === 'price');
  const idxSellDt = getColIndex(['sell date', 'sell dt']);
  const idxSellPrice = getColIndex(['sell price', 'exit price']);
  const idxRelPL = getColIndex(['rel p/l', 'realized p/l']);
  const idxStrategy = getColIndex(['trade type', 'strategy', 'setup']);

  const cleanLedger = [];

  for (let i = headerIndex + 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (
      !row ||
      idxSymbol === -1 ||
      !row[idxSymbol] ||
      row[idxSymbol] === '' ||
      row[idxSymbol].toString().includes('#N/A')
    ) {
      continue;
    }

    const symbol = row[idxSymbol]
      .toString()
      .replace(/^(NSE:|BOM:)/i, '')
      .trim()
      .toUpperCase();
    const qty = sanitizeNumber(row[idxQty]);
    const buyPrice = sanitizeNumber(row[idxBuyPrice]);
    const sellPrice = idxSellPrice !== -1 ? sanitizeNumber(row[idxSellPrice]) : 0;
    const livePrice =
      idxLivePrice !== -1 ? sanitizeNumber(row[idxLivePrice]) : buyPrice;
    const rawRealizedPL = idxRelPL !== -1 ? sanitizeNumber(row[idxRelPL]) : 0;

    if (qty <= 0 || buyPrice <= 0) continue;

    const buyValue = qty * buyPrice;
    const isClosed = sellPrice > 0 || (idxSellDt !== -1 && !!row[idxSellDt]);

    let realizedPL = 0;
    let unrealizedPL = 0;
    let currentValue = buyValue;

    if (isClosed) {
      realizedPL =
        rawRealizedPL !== 0 ? rawRealizedPL : (sellPrice - buyPrice) * qty;
    } else {
      currentValue = qty * (livePrice > 0 ? livePrice : buyPrice);
      unrealizedPL = currentValue - buyValue;
    }

    // Sheets renders date cells per-column using whatever number format is
    // actually applied there (dd mmm yy / d mmm yy / d mmmm yy across the
    // real journal tabs), so the raw cell value is display text like
    // "19 Jun 26", not ISO. parseSheetDate normalises that into the
    // "YYYY-MM-DD" form the rest of the app expects.
    const rawBuyDt = idxBuyDt !== -1 ? row[idxBuyDt] : null;
    const parsedBuyDt = parseSheetDate(rawBuyDt);
    const fallbackDateStr = parsedBuyDt || new Date().toISOString().split('T')[0];

    const rawSellDt = idxSellDt !== -1 ? row[idxSellDt] : null;
    const rawSellDtStr = parseSheetDate(rawSellDt);

    // Hidden bookkeeping column S — date this row was created/last touched
    // by the app, plus a transaction tag (BUY / SELL / ADJ) and an optional
    // link to a sibling row (see rowBuilder.js). Missing = legacy row, so
    // lastModified stays null (not fallbackDateStr) to keep the
    // today-filter honest, and the tag is inferred from open/closed state.
    const rawLastModified = row[LAST_MODIFIED_COL_INDEX];
    const { lastModified, txTag, txLink } = parseBookkeeping(rawLastModified, isClosed);

    cleanLedger.push({
      id: `${accountType}_${symbol}_${i}`,
      spreadsheetId,
      subsheetName,
      sheetRowIndex: i + 1, // 1-indexed sheet coordinate
      sheetName: accountType,
      symbol,
      qty,
      buyPrice,
      buyValue,
      livePrice: livePrice > 0 ? livePrice : buyPrice,
      currentValue,
      buyDate: parsedBuyDt,
      sellDate: rawSellDtStr,
      sellPrice,
      realizedPL,
      unrealizedPL,
      strategy:
        idxStrategy !== -1 && row[idxStrategy]
          ? row[idxStrategy].trim()
          : 'Unassigned',
      tradeDate: fallbackDateStr,
      lastModified,
      txTag,
      txLink,
    });
  }

  return cleanLedger;
};

/**
 * Locate the next truly-empty data row (data begins at row 3).
 * Column B is a pure formula echo of C and is skipped when scanning.
 * Column S (last-modified) is also written by the app but is included in the
 * scan so a row that only carries the timestamp still counts as occupied.
 */
const findNextEmptyRow = async (spreadsheetId, subsheetName, accessToken) => {
  const encoded = encodeURIComponent(subsheetName);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encoded}!A3:S?majorDimension=ROWS`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Failed to locate next empty row: ${res.statusText}`);

  const data = await res.json();
  const rows = data.values || [];

  const SKIP_COL = 1; // column B is a formula echo, ignore
  const isFilled = (v) => v !== undefined && v !== null && v.toString().trim() !== '';
  const isOccupied = (row) => {
    if (!row) return false;
    for (let c = 0; c < row.length; c++) {
      if (c === SKIP_COL) continue;
      if (isFilled(row[c])) return true;
    }
    return false;
  };

  let lastFilledOffset = -1;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (isOccupied(rows[i])) {
      lastFilledOffset = i;
      break;
    }
  }
  return 3 + (lastFilledOffset + 1);
};

const putRow = async (spreadsheetId, subsheetName, rowIndex, valuesArray, accessToken) => {
  const encoded = encodeURIComponent(subsheetName);
  const range = `${encoded}!A${rowIndex}:S${rowIndex}`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range: `${subsheetName}!A${rowIndex}:S${rowIndex}`,
      majorDimension: 'ROWS',
      values: [valuesArray],
    }),
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText);
    throw new Error(`Sheet write failed: ${errText}`);
  }
  return response.json();
};

/** Append a new trade row (BUY, standalone SELL, or split-off closed row). */
export const appendTradeRow = async (spreadsheetId, subsheetName, payload, accessToken) => {
  const r = await findNextEmptyRow(spreadsheetId, subsheetName, accessToken);
  const values = buildTradeRowValues(r, payload);
  const result = await putRow(spreadsheetId, subsheetName, r, values, accessToken);
  return { ...result, appendedRow: r };
};

/** Overwrite a specific row with a fresh payload (also refreshes col S). */
export const updateTradeRow = async (
  spreadsheetId,
  subsheetName,
  rowIndex,
  payload,
  accessToken
) => {
  const values = buildTradeRowValues(rowIndex, payload);
  return putRow(spreadsheetId, subsheetName, rowIndex, values, accessToken);
};

/** Clear a row's A..S cells (row itself stays so other formulas don't shift). */
export const clearTradeRow = async (spreadsheetId, subsheetName, rowIndex, accessToken) => {
  const encoded = encodeURIComponent(subsheetName);
  const range = `${encoded}!A${rowIndex}:S${rowIndex}`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:clear`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText);
    throw new Error(`Sheet clear failed: ${errText}`);
  }
  return response.json();
};

export const fetchSpreadsheetTabNames = async (spreadsheetId, accessToken) => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Failed to read sheet structure: ${response.statusText}`);
  }
  const data = await response.json();
  return data.sheets.map((sheet) => sheet.properties.title);
};

// -------- legacy names kept as thin aliases so existing imports don't break --
export const appendFormulaRowToGoogle = appendTradeRow;
export const updateRowInGoogle = async (
  spreadsheetId,
  subsheetName,
  rowIndex,
  valuesArray,
  accessToken
) => putRow(spreadsheetId, subsheetName, rowIndex, valuesArray, accessToken);
export const deleteRowFromGoogle = clearTradeRow;