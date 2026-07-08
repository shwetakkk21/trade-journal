/**
 * Pure planning layer. Given the current portfolio and a trade request,
 * produce the exact list of sheet operations to execute. No I/O here.
 *
 * Ops shape:
 *   { kind: 'append', spreadsheetId, subsheetName, payload }
 *   { kind: 'update', spreadsheetId, subsheetName, rowIndex, payload, snapshot }
 *
 * `snapshot` on update ops captures the pre-change row payload so a caller
 * can revert (used when the user later deletes the transaction).
 */

const isOpen = (t) => !(Number(t.sellPrice || 0) > 0 || t.sellDate);

const rowToPayload = (row) => ({
  symbol: row.symbol,
  buyDate: row.tradeDate,
  buyPrice: row.buyPrice,
  qty: row.qty,
  sellDate: row.sellDate || '',
  sellPrice: row.sellPrice || '',
  tradeDate: row.tradeDate,
});

const openLotsForSymbol = (portfolio, symbol, demat) =>
  portfolio
    .filter((t) => t.symbol === symbol && t.sheetName === demat && isOpen(t))
    // LIFO: latest buy first, tiebreak by sheet row (later row = later entry)
    .sort((a, b) => {
      const dA = new Date(a.tradeDate).getTime() || 0;
      const dB = new Date(b.tradeDate).getTime() || 0;
      if (dB !== dA) return dB - dA;
      return (b.sheetRowIndex || 0) - (a.sheetRowIndex || 0);
    });

export const availableQty = (portfolio, symbol, demat) =>
  openLotsForSymbol(portfolio, symbol, demat).reduce((s, l) => s + l.qty, 0);

/**
 * @param {Array} portfolio - normalised ledger from sheetService
 * @param {Object} request  - { type, symbol, demat, qty, price, date, strategy,
 *                             spreadsheetId, subsheetName }
 * @returns {{ ops: Array, error?: string, txSummary: Object }}
 */
export const planTrade = (portfolio, request) => {
  const {
    type,
    symbol,
    demat,
    qty,
    price,
    date,
    spreadsheetId,
    subsheetName,
  } = request;

  const txSummary = {
    type,
    symbol,
    demat,
    qty,
    price,
    date,
  };

  if (type === 'BUY') {
    const ops = [
      {
        kind: 'append',
        spreadsheetId,
        subsheetName,
        payload: {
          symbol,
          buyDate: date,
          tradeDate: date,
          buyPrice: price,
          qty,
          sellDate: '',
          sellPrice: '',
        },
      },
    ];
    return { ops, txSummary };
  }

  // ---------- SELL ----------
  const lots = openLotsForSymbol(portfolio, symbol, demat);
  const available = lots.reduce((s, l) => s + l.qty, 0);

  if (available <= 0) {
    return {
      ops: [],
      error: `No open ${symbol} position in ${demat}. You can only sell shares that already exist in the sheet.`,
      txSummary,
    };
  }
  if (qty > available) {
    return {
      ops: [],
      error: `Cannot sell ${qty} of ${symbol} — only ${available} available in ${demat}.`,
      txSummary,
    };
  }

  const ops = [];
  let remaining = qty;

  for (const lot of lots) {
    if (remaining <= 0) break;

    if (lot.qty <= remaining) {
      // Convert whole open row into a closed sell.
      ops.push({
        kind: 'update',
        spreadsheetId: lot.spreadsheetId,
        subsheetName: lot.subsheetName,
        rowIndex: lot.sheetRowIndex,
        snapshot: rowToPayload(lot),
        payload: {
          symbol: lot.symbol,
          buyDate: lot.tradeDate,
          tradeDate: lot.tradeDate,
          buyPrice: lot.buyPrice,
          qty: lot.qty,
          sellDate: date,
          sellPrice: price,
        },
      });
      remaining -= lot.qty;
    } else {
      // Partial: shrink the open row, append a new closed row for the sold slice.
      const soldSlice = remaining;
      const remainingOpen = lot.qty - soldSlice;

      ops.push({
        kind: 'update',
        spreadsheetId: lot.spreadsheetId,
        subsheetName: lot.subsheetName,
        rowIndex: lot.sheetRowIndex,
        snapshot: rowToPayload(lot),
        payload: {
          symbol: lot.symbol,
          buyDate: lot.tradeDate,
          tradeDate: lot.tradeDate,
          buyPrice: lot.buyPrice,
          qty: remainingOpen,
          sellDate: '',
          sellPrice: '',
        },
      });

      ops.push({
        kind: 'append',
        spreadsheetId: lot.spreadsheetId,
        subsheetName: lot.subsheetName,
        payload: {
          symbol: lot.symbol,
          buyDate: lot.tradeDate,
          tradeDate: lot.tradeDate,
          buyPrice: lot.buyPrice,
          qty: soldSlice,
          sellDate: date,
          sellPrice: price,
        },
      });

      remaining = 0;
    }
  }

  return { ops, txSummary };
};
