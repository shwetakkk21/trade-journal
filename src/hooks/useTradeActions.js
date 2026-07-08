import { useCallback, useMemo, useRef, useState } from 'react';
import {
  appendTradeRow,
  updateTradeRow,
  clearTradeRow,
} from '../utils/sheetService';
import { planTrade } from '../utils/tradeEngine';
import { getTodayString } from '../utils/dateUtils';


const localDateStringFromTs = (ts) => {
  const d = new Date(ts || 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const rowKey = (p) => `${p.spreadsheetId}::${p.subsheetName}::${p.sheetRowIndex}`;

const synthesizeTransaction = (p) => {
  const isSell = Number(p.sellPrice) > 0;
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
    executedOps: [
      {
        kind: 'append',
        spreadsheetId: p.spreadsheetId,
        subsheetName: p.subsheetName,
        appendedRowIndex: p.sheetRowIndex,
      },
    ],
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
  const opsCacheRef = useRef(new Map());
  const [pendingDeletes, setPendingDeletes] = useState(() => new Set());

  const today = getTodayString();

  const sessionTransactions = useMemo(() => {
    if (!Array.isArray(portfolio)) return [];
    const rows = portfolio
      .filter((p) => p && p.lastModified === today)
      .filter((p) => !pendingDeletes.has(rowKey(p)))
      .map(synthesizeTransaction)
      // newest first
      .sort((a, b) => (b.ts || 0) - (a.ts || 0));

  
    return rows.map((tx) => {
      const cached = opsCacheRef.current.get(tx._rowKey);
      return cached ? { ...tx, executedOps: cached } : tx;
    });
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
      const executed = [];
      for (const op of ops) {
        if (op.kind === 'append') {
          const res = await appendTradeRow(
            op.spreadsheetId,
            op.subsheetName,
            op.payload,
            googleToken
          );
          executed.push({ ...op, appendedRowIndex: res.appendedRow });
        } else if (op.kind === 'update') {
          await updateTradeRow(
            op.spreadsheetId,
            op.subsheetName,
            op.rowIndex,
            op.payload,
            googleToken
          );
          executed.push({ ...op });
        }
      }
      return executed;
    },
    [googleToken]
  );

  const submitTrade = useCallback(
    async (request) => {
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

      const { ops, error } = planTrade(portfolio, enriched);
      if (error) {
        notify('Invalid Sell Order', error, 'WARNING');
        return { ok: false };
      }

      try {
        setSubmittingSafe(true);
        const executedOps = await runOps(ops);

        
        const primary =
          executedOps.find((o) => o.kind === 'append') ||
          executedOps.find((o) => o.kind === 'update');
        if (primary) {
          const key =
            primary.kind === 'append'
              ? `${primary.spreadsheetId}::${primary.subsheetName}::${primary.appendedRowIndex}`
              : `${primary.spreadsheetId}::${primary.subsheetName}::${primary.rowIndex}`;
          opsCacheRef.current.set(key, executedOps);
        }

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

  const revertOps = useCallback(
    async (ops) => {
      for (const op of ops || []) {
        if (op.kind === 'append' && op.appendedRowIndex) {
          await clearTradeRow(op.spreadsheetId, op.subsheetName, op.appendedRowIndex, googleToken);
        } else if (op.kind === 'update' && op.snapshot) {
          await updateTradeRow(
            op.spreadsheetId,
            op.subsheetName,
            op.rowIndex,
            op.snapshot,
            googleToken
          );
        }
      }
    },
    [googleToken]
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
        await revertOps(tx.executedOps);
        // Hide immediately; next sync will confirm.
        if (tx._rowKey) {
          setPendingDeletes((prev) => {
            const next = new Set(prev);
            next.add(tx._rowKey);
            return next;
          });
          opsCacheRef.current.delete(tx._rowKey);
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
        notify('Transaction Reverted', `${tx.type} ${tx.qty} ${tx.symbol} rolled back.`, 'SUCCESS');
        return { ok: true };
      } catch (err) {
        notify('Delete Failed', err.message, 'WARNING');
        return { ok: false };
      } finally {
        setSubmittingSafe(false);
        setSyncing(false);
      }
    },
    [revertOps, linkedSheets, googleToken, executeDataSync, notify, setSyncing, setSubmittingSafe, findBlockingSell]
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
      try {
        setSubmittingSafe(true);
        await revertOps(originalTx.executedOps);
        if (originalTx._rowKey) opsCacheRef.current.delete(originalTx._rowKey);
        setSubmittingSafe(false);
        setSyncing(true);
        await executeDataSync(linkedSheets, googleToken);
      } catch (err) {
        notify('Update Failed', err.message, 'WARNING');
        setSubmittingSafe(false);
        setSyncing(false);
        return { ok: false };
      } finally {
        setSubmittingSafe(false);
        setSyncing(false);
      }
      return submitTrade(newRequest);
    },
    [revertOps, linkedSheets, googleToken, executeDataSync, notify, setSyncing, setSubmittingSafe, submitTrade, findBlockingSell]
  );

  return {
    sessionTransactions,
    submitTrade,
    deleteTransaction,
    updateTransaction,
    findBlockingSell,
    _debug: { localDateStringFromTs },
  };
}