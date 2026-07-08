const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { google } = require('googleapis');

admin.initializeApp();
const db = admin.firestore();

/**
 * UTILITY: Safely converts messy user spreadsheet string cell values 
 * into accurate, mathematically stable floats or integers.
 */
const sanitizeNumber = (value) => {
  if (!value || value === '—' || value.toString().includes('#') || value.toString().includes('NaN')) {
    return 0;
  }
  // Strip commas, currency tags, and percentage signs completely
  const cleanStr = value.toString().replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleanStr);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * CORE BACKEND SYNC LOOP:
 * Queries Firestore for all sheets linked to this user profile,
 * pulls from Google APIs in parallel, and normalizes human formatting errors.
 */
exports.syncSheetsPerformance = functions.https.onCall(async (data, context) => {
  // Enforce absolute session authentication check
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Access Denied: Session invalid.');
  }

  try {
    // Collect all unique spreadsheet links bound to this specific User ID
    const accountsSnapshot = await db.collection('users')
      .doc(context.auth.uid)
      .collection('linkedAccounts')
      .get();

    let masterNormalizedLedger = [];

    // Map through links asynchronously to fire requests in parallel
    const syncPromises = accountsSnapshot.docs.map(async (docSnapshot) => {
      const sheetMeta = docSnapshot.data();
      if (!sheetMeta.spreadsheetId || !sheetMeta.subsheetName) return;

      // Establish authenticated OAuth connection using the user's running session code
      const authClient = new google.auth.OAuth2();
      authClient.setCredentials({ access_token: data.accessToken });

      const sheetsInstance = google.sheets({ version: 'v4', auth: authClient });

      // Ingest the raw cell matrix
      const response = await sheetsInstance.spreadsheets.values.get({
        spreadsheetId: sheetMeta.spreadsheetId,
        range: `${sheetMeta.subsheetName}!A1:Z1000`
      });

      const rawRows = response.data.values;
      if (!rawRows || rawRows.length === 0) return;

      // Locate where headers begin to sidestep trailing blank space rows
      let headerRowIndex = rawRows.findIndex(row => 
        row.join(',').toLowerCase().includes('symbol') && 
        row.join(',').toLowerCase().includes('qty')
      );
      if (headerRowIndex === -1) headerRowIndex = 0;

      const rawHeaders = rawRows[headerRowIndex].map(h => h.trim().toLowerCase());
      const getColIndex = (possibleNames) => 
        rawHeaders.findIndex(h => possibleNames.some(p => h.includes(p)));

      // Enforce clean layout index matching matching your strict sheet columns
      const idxSymbol = rawHeaders.findIndex(h => h === 'symbol' || h === 'nse:symbol');
      const idxBuyDt = getColIndex(['buy dt', 'buy date', 'date']);
      const idxBuyPrice = getColIndex(['buy price', 'buy price ']);
      const idxQty = getColIndex(['qty', 'quantity']);
      const idxLivePrice = getColIndex(['price', 'current price', 'pre close']);
      const idxSellDt = getColIndex(['sell date', 'sell dt']);
      const idxSellPrice = getColIndex(['sell price', 'exit price']);
      const idxRelPL = getColIndex(['profit/loss', 'rel p/l']);
      const idxStrategy = getColIndex(['trade type', 'strategy', 'setup']);

      // Transform rows down below the header into clean tracking primitives
      for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row || !row[idxSymbol] || row[idxSymbol] === '' || row[idxSymbol].includes('#N/A')) {
          continue; // Skip placeholders or blank fields without breaking
        }

        const symbol = row[idxSymbol].replace(/^(NSE:|BOM:)/i, '').trim().toUpperCase();
        const qty = sanitizeNumber(row[idxQty]);
        const buyPrice = sanitizeNumber(row[idxBuyPrice]);
        const sellPrice = idxSellPrice !== -1 ? sanitizeNumber(row[idxSellPrice]) : 0;
        const livePrice = idxLivePrice !== -1 ? sanitizeNumber(row[idxLivePrice]) : buyPrice;
        const rawRealizedPL = idxRelPL !== -1 ? sanitizeNumber(row[idxRelPL]) : 0;

        if (qty <= 0 || buyPrice <= 0) continue; // Throw out un-executed trades

        const buyValue = qty * buyPrice;
        const isClosed = sellPrice > 0 || (idxSellDt !== -1 && row[idxSellDt]);

        let realizedPL = 0;
        let unrealizedPL = 0;
        let currentValue = buyValue;

        if (isClosed) {
          realizedPL = rawRealizedPL !== 0 ? rawRealizedPL : (sellPrice - buyPrice) * qty;
        } else {
          currentValue = qty * (livePrice > 0 ? livePrice : buyPrice);
          unrealizedPL = currentValue - buyValue;
        }

        masterNormalizedLedger.push({
          id: `${sheetMeta.id}_${symbol}_${i}`,
          accountName: sheetMeta.accountType, // Dhan, Neha, etc.
          subsheetName: sheetMeta.subsheetName,
          symbol,
          qty,
          buyPrice,
          buyValue,
          livePrice: livePrice > 0 ? livePrice : buyPrice,
          currentValue,
          sellDate: idxSellDt !== -1 && row[idxSellDt] ? row[idxSellDt] : null,
          sellPrice,
          realizedPL,
          unrealizedPL,
          strategy: idxStrategy !== -1 && row[idxStrategy] ? row[idxStrategy].trim() : 'Unassigned',
          tradeDate: row[idxBuyDt] ? row[idxBuyDt].split(' ')[0] : new Date().toISOString().split('T')[0]
        });
      }
    });

    await Promise.all(syncPromises);
    return { ledger: masterNormalizedLedger };

  } catch (error) {
    throw new functions.https.HttpsError('internal', `Sheets Sync Pipeline Failed: ${error.message}`);
  }
});