import { useCallback, useMemo, useState } from 'react';
import {
  appendTradeRow,
  updateTradeRow,
  clearTradeRow,
} from '../utils/sheetService';
import { planTrade, planRevert } from '../utils/tradeEngine';
import { getTodayString } from '../utils/dateUtils';

const rowKey = (p) => `${p.spreadsheetId}::${p.subsheetName}::${p.sheetRowIndex}`;

// Builds one ledger line per *real* transaction row. Rows tagged 'ADJ' are
// deliberately excluded here — they're the leftover open remainder of a lot
// after a partial sell sliced part of it off, not a transaction in their
// own right, and showing them would surface raw row mutations instead of
// what the user actually did (see rowBuilder.js for the tagging scheme).
const synthesizeTransaction = (p) => {
  const isSell = p.txTag === 'SELL';
  const ts = p.lastModified ? Date.parse(p.lastModified) : Date.now();
  return {
    id: `row_${rowKey(p)}`,
    ts,
    symbol: p.symbol,
    demat: p.sheetName,
    type: isSell ? 'SELL' : 'BUY',
    date: isSell ? (p.sellDate || '') : (p.buyDate || p.tradeDate || ''),
    price: isSell ? p.sellPrice : p.buyPrice,
    qty: p.qty,
    strategy: p.strategy,
    // Fields needed to reconstruct a correct revert straight from the
    // sheet (see tradeEngine.planRevert) — no separate cache required.
    buyPrice: p.buyPrice,
    buyDate: p.buyDate,
    sheetRowIndex: p.sheetRowIndex,
    spreadsheetId: p.spreadsheetId,
    subsheetName: p.subsheetName,
    link: p.txLink || null,
    _rowKey: rowKey(p),
  };
};

export function useTradeActions({
  googleToken,
  linkedSheets,
  portfolio,
  executeDataSync,
  setSyncing,
  setSubmitting,
  notify,
}) {
  const [pendingDeletes, setPendingDeletes] = useState(() => new Set());

  const today = getTodayString();

  const sessionTransactions = useMemo(() => {
    if (!Array.isArray(portfolio)) return [];
    return portfolio
      .filter((p) => p && p.lastModified === today)
      .filter((p) => p.txTag === 'BUY' || p.txTag === 'SELL')
      .filter((p) => !pendingDeletes.has(rowKey(p)))
      .map(synthesizeTransaction)
      // newest first
      .sort((a, b) => (b.ts || 0) - (a.ts || 0));
  }, [portfolio, today, pendingDeletes]);

  const setSubmittingSafe = useCallback(
    (v) => {
      if (typeof setSubmitting === 'function') setSubmitting(v);
    },
    [setSubmitting]
  );

  const resolveChannel = useCallback(
    (demat) =>
      linkedSheets.find((s) => s.accountType === demat) || linkedSheets[0],
    [linkedSheets]
  );

  const runOps = useCallback(
    async (ops) => {
      for (const op of ops) {
        if (op.kind === 'append') {
          await appendTradeRow(op.spreadsheetId, op.subsheetName, op.payload, googleToken);
        } else if (op.kind === 'update') {
          await updateTradeRow(
            op.spreadsheetId,
            op.subsheetName,
            op.rowIndex,
            op.payload,
            googleToken
          );
        } else if (op.kind === 'clear') {
          await clearTradeRow(op.spreadsheetId, op.subsheetName, op.rowIndex, googleToken);
        }
      }
    },
    [googleToken]
  );

  const submitTrade = useCallback(
    async (request, portfolioOverride) => {
      const channel = resolveChannel(request.demat);
      if (!channel) {
        notify('No Linked Sheet', 'Link a Google Sheet in Settings first.', 'WARNING');
        return { ok: false };
      }
      const enriched = {
        ...request,
        spreadsheetId: channel.spreadsheetId,
        subsheetName: channel.subsheetName,
      };

      const activePortfolio = portfolioOverride || portfolio;
      const { ops, error } = planTrade(activePortfolio, enriched);
      if (error) {
        // Covers both "sellQty > available" and "no open position" cases.
        notify('Invalid Sell Order', error, 'WARNING');
        return { ok: false };
      }

      try {
        setSubmittingSafe(true);
        await runOps(ops);
        setSubmittingSafe(false);
        setSyncing(true);
        await executeDataSync(linkedSheets, googleToken);
        notify(
          'Trade Executed',
          `${request.type} ${request.qty} ${request.symbol} @ ₹${request.price} recorded on ${channel.subsheetName}.`,
          'SUCCESS'
        );
        return { ok: true };
      } catch (err) {
        notify('Write Error', err.message, 'WARNING');
        return { ok: false };
      } finally {
        setSubmittingSafe(false);
        setSyncing(false);
      }
    },
    [portfolio, googleToken, linkedSheets, resolveChannel, runOps, executeDataSync, notify, setSyncing, setSubmittingSafe]
  );

  // Blocks deleting/editing a BUY once a later SELL of the same
  // symbol+demat exists today — deleting/changing the buy underneath it
  // would leave that sell referencing shares that no longer exist.
  const findBlockingSell = useCallback(
    (tx, allSessionTxs = sessionTransactions) => {
      if (tx.type !== 'BUY') return null;
      return (
        allSessionTxs.find(
          (other) =>
            other.id !== tx.id &&
            other.type === 'SELL' &&
            other.symbol === tx.symbol &&
            other.demat === tx.demat &&
            (other.ts || 0) > (tx.ts || 0)
        ) || null
      );
    },
    [sessionTransactions]
  );

  const deleteTransaction = useCallback(
    async (tx) => {
      const blocker = findBlockingSell(tx);
      if (blocker) {
        notify(
          'Deletion Blocked',
          `A SELL of ${tx.symbol} on ${tx.demat} was executed after this BUY. Delete the SELL first, then this BUY becomes reversible.`,
          'WARNING'
        );
        return { ok: false };
      }
      try {
        setSubmittingSafe(true);
        const { ops, warning } = planRevert(tx, portfolio);
        await runOps(ops);
        // Hide immediately; next sync will confirm.
        if (tx._rowKey) {
          setPendingDeletes((prev) => {
            const next = new Set(prev);
            next.add(tx._rowKey);
            return next;
          });
        }
        setSubmittingSafe(false);
        setSyncing(true);
        await executeDataSync(linkedSheets, googleToken);

        if (tx._rowKey) {
          setPendingDeletes((prev) => {
            if (!prev.has(tx._rowKey)) return prev;
            const next = new Set(prev);
            next.delete(tx._rowKey);
            return next;
          });
        }

        if (warning) {
          notify('Partial Revert', warning, 'WARNING');
        } else {
          notify('Transaction Reverted', `${tx.type} ${tx.qty} ${tx.symbol} rolled back.`, 'SUCCESS');
        }
        return { ok: true };
      } catch (err) {
        notify('Delete Failed', err.message, 'WARNING');
        return { ok: false };
      } finally {
        setSubmittingSafe(false);
        setSyncing(false);
      }
    },
    [portfolio, runOps, linkedSheets, googleToken, executeDataSync, notify, setSyncing, setSubmittingSafe, findBlockingSell]
  );

  const updateTransaction = useCallback(
    async (originalTx, newRequest) => {
      const blocker = findBlockingSell(originalTx);
      if (blocker) {
        notify(
          'Edit Blocked',
          `A SELL of ${originalTx.symbol} on ${originalTx.demat} was executed after this BUY. Delete the SELL first, then this BUY becomes editable.`,
          'WARNING'
        );
        return { ok: false };
      }
      let freshPortfolio = portfolio;
      try {
        setSubmittingSafe(true);
        const { ops, warning } = planRevert(originalTx, portfolio);
        await runOps(ops);
        if (warning) notify('Partial Revert', warning, 'WARNING');
        setSubmittingSafe(false);
        setSyncing(true);
        // Use the freshly-synced ledger (not the stale closure value) so
        // the re-submitted trade below is planned against post-revert state.
        const synced = await executeDataSync(linkedSheets, googleToken);
        if (synced) freshPortfolio = synced;
      } catch (err) {
        notify('Update Failed', err.message, 'WARNING');
        setSubmittingSafe(false);
        setSyncing(false);
        return { ok: false };
      } finally {
        setSubmittingSafe(false);
        setSyncing(false);
      }
      return submitTrade(newRequest, freshPortfolio);
    },
    [portfolio, runOps, linkedSheets, googleToken, executeDataSync, notify, setSyncing, setSubmittingSafe, submitTrade, findBlockingSell]
  );

  return {
    sessionTransactions,
    submitTrade,
    deleteTransaction,
    updateTransaction,
    findBlockingSell,
  };
}
