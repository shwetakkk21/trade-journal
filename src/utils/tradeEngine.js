/**
 * Pure planning layer. Given the current portfolio and a trade request,
 * produce the exact list of sheet operations to execute. No I/O here.
 *
 * Ops shape:
 *   { kind: 'append', spreadsheetId, subsheetName, payload }
 *   { kind: 'update', spreadsheetId, subsheetName, rowIndex, payload }
 *   { kind: 'clear',  spreadsheetId, subsheetName, rowIndex }
 *
 * Every payload carries an explicit txTag ('BUY' | 'SELL' | 'ADJ') and
 * txLink (sheet row index of a sibling row, or '') which rowBuilder writes
 * into column S. That tag is what the ledger (Today's Transactions) uses to
 * decide whether a row is a real transaction or just leftover bookkeeping
 * state from a partial sell — see rowBuilder.js for the full scheme.
 *
 * Reverting a transaction (delete, or edit-which-reverts-then-resubmits)
 * does NOT rely on any snapshot or in-memory cache. planRevert() below
 * reconstructs the correct undo purely from the row's own current data
 * (plus its txLink for partial-sell "sold slice" rows), so it survives
 * page reloads and works correctly even when several rows were touched by
 * one sell.
 */

import { getTodayString } from './dateUtils';

const isOpen = (t) => !(Number(t.sellPrice || 0) > 0 || t.sellDate);

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
          txTag: 'BUY',
          txLink: '',
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
      // Exact/full match: convert the whole open row into a closed sell,
      // in place. Self-contained — reverting it just needs this row's own
      // buyPrice/qty/buyDate, no link to any other row.
      ops.push({
        kind: 'update',
        spreadsheetId: lot.spreadsheetId,
        subsheetName: lot.subsheetName,
        rowIndex: lot.sheetRowIndex,
        payload: {
          symbol: lot.symbol,
          buyDate: lot.tradeDate,
          tradeDate: lot.tradeDate,
          buyPrice: lot.buyPrice,
          qty: lot.qty,
          sellDate: date,
          sellPrice: price,
          txTag: 'SELL',
          txLink: '',
        },
      });
      remaining -= lot.qty;
    } else {
      // Partial: shrink the open row to whatever remains open (tagged ADJ —
      // not a transaction, hidden from the ledger), and append a brand new
      // closed row for the sold slice (tagged SELL, linked back to the lot
      // row it was cut from so a later delete can restore it exactly).
      const soldSlice = remaining;
      const remainingOpen = lot.qty - soldSlice;

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
          txTag: 'SELL',
          txLink: lot.sheetRowIndex,
        },
      });

      ops.push({
        kind: 'update',
        spreadsheetId: lot.spreadsheetId,
        subsheetName: lot.subsheetName,
        rowIndex: lot.sheetRowIndex,
        payload: {
          symbol: lot.symbol,
          buyDate: lot.tradeDate,
          tradeDate: lot.tradeDate,
          buyPrice: lot.buyPrice,
          qty: remainingOpen,
          sellDate: '',
          sellPrice: '',
          txTag: 'ADJ',
          txLink: '',
        },
      });

      remaining = 0;
    }
  }

  return { ops, txSummary };
};

/**
 * Given a synthesized ledger transaction (see useTradeActions.js —
 * carries type, sheetRowIndex, buyPrice, buyDate, qty, link, etc.) and the
 * current portfolio, produce the ops that undo it. No snapshot/cache is
 * needed: everything required to reconstruct the pre-transaction state is
 * either already on the row itself, or (for a partial-sell "sold slice")
 * reachable through its txLink.
 *
 * @returns {{ ops: Array, warning?: string }}
 */
export const planRevert = (tx, portfolio) => {
  const today = getTodayString();
  const base = { spreadsheetId: tx.spreadsheetId, subsheetName: tx.subsheetName };

  if (tx.type === 'BUY') {
    // A standalone buy that was never touched by a sell — just wipe it.
    return { ops: [{ kind: 'clear', ...base, rowIndex: tx.sheetRowIndex }] };
  }

  // SELL, no link: a full lot closure done in place. Reopen this row using
  // its own stored buy fields. If the underlying buy happened on an
  // earlier day, tag it ADJ (not a fresh "today" transaction) so reverting
  // a sell never manufactures a phantom BUY entry in today's ledger.
  if (!tx.link) {
    return {
      ops: [
        {
          kind: 'update',
          ...base,
          rowIndex: tx.sheetRowIndex,
          payload: {
            symbol: tx.symbol,
            buyDate: tx.buyDate,
            tradeDate: tx.buyDate,
            buyPrice: tx.buyPrice,
            qty: tx.qty,
            sellDate: '',
            sellPrice: '',
            txTag: tx.buyDate === today ? 'BUY' : 'ADJ',
            txLink: '',
          },
        },
      ],
    };
  }

  // SELL with a link: this row is the "sold slice" of a partial sell.
  // Restore the quantity to whatever the origin lot row currently holds,
  // then clear this row entirely.
  const sibling = portfolio.find(
    (p) =>
      p.spreadsheetId === tx.spreadsheetId &&
      p.subsheetName === tx.subsheetName &&
      p.sheetRowIndex === tx.link
  );

  const ops = [];
  let warning;

  if (sibling) {
    ops.push({
      kind: 'update',
      ...base,
      rowIndex: sibling.sheetRowIndex,
      payload: {
        symbol: sibling.symbol,
        buyDate: sibling.buyDate,
        tradeDate: sibling.buyDate,
        buyPrice: sibling.buyPrice,
        qty: Number(sibling.qty) + Number(tx.qty),
        sellDate: '',
        sellPrice: '',
        txTag: sibling.buyDate === today ? 'BUY' : 'ADJ',
        txLink: '',
      },
    });
  } else {
    warning = `Could not find the original lot (row ${tx.link}) this sell was split from — the sold quantity could not be restored. The sell row itself was still cleared.`;
  }

  ops.push({ kind: 'clear', ...base, rowIndex: tx.sheetRowIndex });

  return { ops, warning };
};
