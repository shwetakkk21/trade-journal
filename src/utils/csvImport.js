/**
 * CSV trade-history import: parsing + FIFO order grouping.
 *
 * A broker tradebook export has one row per *fill*, not per order — a single
 * order can be filled across many rows (partial fills at slightly different
 * prices/times). This module:
 *   1. Parses the raw CSV into normalised fill rows.
 *   2. Groups fills that share the same order_id (regardless of where they
 *      sit in the file — real exports aren't always sorted by order_id),
 *      combining them into ONE order: summed quantity, weighted-average
 *      price. This is what "reduces transaction load" — one sheet row per
 *      order instead of one per fill.
 *   3. Sorts the resulting orders by earliest execution time, so they can be
 *      replayed through the trade engine in true FIFO order.
 *
 * No I/O here — this is a pure transform, safe to unit test and safe to run
 * entirely client-side before anything touches the sheet.
 */

const HEADER_ALIASES = {
  symbol: ['symbol', 'tradingsymbol', 'trading symbol'],
  type: ['trade_type', 'transaction_type', 'side', 'buy/sell'],
  qty: ['quantity', 'qty'],
  price: ['price', 'trade_price', 'rate'],
  date: ['trade_date', 'date'],
  orderId: ['order_id', 'order_no', 'order no'],
  execTime: ['order_execution_time', 'exchange_time', 'order_time', 'time'],
};

/** Minimal RFC4180-ish line splitter — handles quoted fields with embedded commas. */
const splitCsvLine = (line) => {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
};

/**
 * @param {string} text - raw CSV file contents
 * @returns {{ rows: Array, error: string|null }}
 */
export const parseCsvText = (text) => {
  const lines = (text || '').split(/\r\n|\n|\r/).filter((l) => l.trim() !== '');
  if (lines.length < 2) {
    return { rows: [], error: 'CSV file is empty or has no data rows.' };
  }

  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const findCol = (aliases) => headers.findIndex((h) => aliases.includes(h));

  const idx = {
    symbol: findCol(HEADER_ALIASES.symbol),
    type: findCol(HEADER_ALIASES.type),
    qty: findCol(HEADER_ALIASES.qty),
    price: findCol(HEADER_ALIASES.price),
    date: findCol(HEADER_ALIASES.date),
    orderId: findCol(HEADER_ALIASES.orderId),
    execTime: findCol(HEADER_ALIASES.execTime),
  };

  const missing = Object.entries(idx)
    .filter(([, v]) => v === -1)
    .map(([k]) => k);
  if (missing.length > 0) {
    return {
      rows: [],
      error: `CSV is missing required column(s): ${missing.join(', ')}. Expected headers like symbol, trade_type, quantity, price, trade_date, order_id, order_execution_time.`,
    };
  }

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    if (cells.length < headers.length) continue;

    const rawType = (cells[idx.type] || '').trim().toLowerCase();
    const type = rawType.startsWith('b') ? 'BUY' : rawType.startsWith('s') ? 'SELL' : null;
    const symbol = (cells[idx.symbol] || '').trim().toUpperCase();
    const qty = parseFloat(cells[idx.qty]);
    const price = parseFloat(cells[idx.price]);
    const rawDate = (cells[idx.date] || '').trim();
    const date = rawDate.split(' ')[0].split('T')[0];
    const orderId = (cells[idx.orderId] || '').trim();
    const rawExec = (cells[idx.execTime] || '').trim();
    const timestamp = Date.parse(rawExec) || Date.parse(rawDate) || 0;

    if (!symbol || !type || !orderId || !(qty > 0) || !(price > 0)) continue;

    rows.push({ symbol, type, qty, price, date, orderId, timestamp });
  }

  if (rows.length === 0) {
    return { rows: [], error: 'No valid trade rows found — check the file matches the expected format.' };
  }

  return { rows, error: null };
};

/**
 * Groups fills by order_id (wherever they appear in the file), combines each
 * group into one order (summed qty, weighted-avg price), and returns the
 * orders sorted by earliest execution time (FIFO replay order).
 *
 * @param {Array} rows - output of parseCsvText
 * @returns {{ orders: Array, warnings: Array<string> }}
 */
export const groupOrdersFifo = (rows) => {
  const groups = new Map();
  for (const row of rows) {
    if (!groups.has(row.orderId)) groups.set(row.orderId, []);
    groups.get(row.orderId).push(row);
  }

  const orders = [];
  const warnings = [];

  for (const [orderId, fills] of groups) {
    const symbols = new Set(fills.map((f) => f.symbol));
    const types = new Set(fills.map((f) => f.type));
    if (symbols.size > 1 || types.size > 1) {
      warnings.push(`Order ${orderId} mixes multiple symbols or sides — skipped.`);
      continue;
    }

    const totalQty = fills.reduce((s, f) => s + f.qty, 0);
    const totalValue = fills.reduce((s, f) => s + f.qty * f.price, 0);
    const avgPrice = totalQty > 0 ? totalValue / totalQty : 0;
    const earliest = fills.reduce((a, b) => (b.timestamp < a.timestamp ? b : a));

    orders.push({
      orderId,
      symbol: [...symbols][0],
      type: [...types][0],
      // Round away float noise from repeated summation; broker quantities
      // are whole shares in practice.
      qty: Math.round(totalQty * 100000) / 100000,
      price: Math.round(avgPrice * 100) / 100,
      date: earliest.date,
      timestamp: earliest.timestamp,
      fillCount: fills.length,
    });
  }

  orders.sort((a, b) => a.timestamp - b.timestamp);
  return { orders, warnings };
};
