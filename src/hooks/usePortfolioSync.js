import { useCallback, useEffect, useState } from 'react';
import { getLinkedSheets } from '../utils/dbService';
import { fetchAndSanitizeSheet } from '../utils/sheetService';
import {
  readCachedToken,
  writeCachedToken,
  clearCachedToken,
  isTokenExpired,
  subscribeTokenChanges,
} from '../utils/tokenCache';


export function usePortfolioSync(user) {
  const [googleToken, setGoogleToken] = useState(() => readCachedToken());
  const [linkedSheets, setLinkedSheets] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [syncing, setSyncing] = useState(false);

  const executeDataSync = useCallback(async (sheets, token) => {
    if (!sheets || sheets.length === 0 || !token) return;
    setSyncing(true);
    try {
      const ledger = [];
      for (const sheet of sheets) {
        const rows = await fetchAndSanitizeSheet(
          sheet.spreadsheetId,
          sheet.subsheetName,
          sheet.accountType,
          token
        );
        ledger.push(...rows);
      }
      setPortfolio(ledger);
    } catch (err) {
      console.error('Data pipeline sync aborted:', err);
    } finally {
      setSyncing(false);
    }
  }, []);

  const refreshLinkedSheets = useCallback(async (uid) => {
    const sheets = (await getLinkedSheets(uid)) || [];
    setLinkedSheets(sheets);
    return sheets;
  }, []);

  // Use this only for an intentional logout/disconnect action.
  const resetSyncState = useCallback(() => {
    setGoogleToken(null);
    setPortfolio([]);
    setLinkedSheets([]);
    clearCachedToken();
  }, []);

  const saveToken = useCallback((token) => {
    setGoogleToken(token);
    writeCachedToken(token);
  }, []);

  // Keep this hook in sync when useAuth writes/refreshed the Google token.
  useEffect(() => subscribeTokenChanges(setGoogleToken), []);

  
  useEffect(() => {
    if (!user) {
      setGoogleToken(readCachedToken());
      setPortfolio([]);
      setLinkedSheets([]);
      return;
    }

    let cancelled = false;

    (async () => {
      const sheets = await refreshLinkedSheets(user.uid);
      if (cancelled) return;

      const cached = readCachedToken();
      if (cached) {
        setGoogleToken(cached);
        if (sheets.length > 0) executeDataSync(sheets, cached);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, refreshLinkedSheets, executeDataSync]);

  return {
    googleToken,
    linkedSheets,
    portfolio,
    syncing,
    setSyncing,
    setPortfolio,
    saveToken,
    resetSyncState,
    refreshLinkedSheets,
    executeDataSync,
    isTokenExpired,
  };
}