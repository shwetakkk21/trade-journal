/**
 * 
 *
 *  A  S.No.           - number (or =ROW()-2)
 *  B  Symbol          - =CONCAT("NSE:",C{r})
 *  C  Symbol (plain)  - ticker
 *  D  Market Cap      - GOOGLEFINANCE
 *  E  Price (live)    - GOOGLEFINANCE
 *  F  Pre Close       - GOOGLEFINANCE
 *  G  % Change        - =(E{r}/F{r}-1)*100
 *  H  Buy dt
 *  I  Buy Price
 *  J  Qty
 *  K  Buy Value       - =I{r}*J{r}
 *  L  Sell Date
 *  M  Sell Price
 *  N  Sell Value      - =M{r}*J{r}
 *  O  Rel P/L         - =N{r}-K{r}
 *  P  Current Value   - =J{r}*E{r}
 *  Q  Un rel P/L      - =P{r}-K{r}
 *  R  % Profit/Loss   - =IFERROR(O{r}/K{r})
 *  S  Last Modified   - "YYYY-MM-DD|TAG|LINK" (hidden bookkeeping column):
 *                        - YYYY-MM-DD: calendar date the row was added /
 *                          last touched by the app.
 *                        - TAG: one of
 *                            BUY  - a genuine, standalone buy transaction
 *                            SELL - a genuine, standalone sell transaction
 *                                   (either a full lot closure, or the
 *                                   "sold slice" split off during a partial
 *                                   sell)
 *                            ADJ  - NOT a transaction. The leftover open
 *                                   remainder of a lot after a partial sell
 *                                   sliced part of it off. Pure bookkeeping
 *                                   state, must never surface as its own
 *                                   line item on the ledger.
 *                        - LINK: only set on a SELL row created by a partial
 *                          sell (the "sold slice"). Points at the sheet row
 *                          index of the lot it was cut from, so deleting
 *                          that SELL can add the quantity straight back to
 *                          whatever is currently in the origin row — no
 *                          separate snapshot/cache needed, and it survives
 *                          page reloads because it lives in the sheet.
 *                        parseSheetDate() only reads the date prefix, so
 *                        this stays backward compatible with any date-only
 *                        value in older rows.
 *  T  Strategy         - free-text tag ("Momentum", "Swing", etc.), set from
 *                         the Manual Execution modal. Defaults to
 *                         "UNASSIGNED" when the caller doesn't supply one so
 *                         the column is never left blank on a fresh write.
 *                         Only ever *assigned* on a BUY (the modal hides the
 *                         field for SELL, and tradeEngine.js always forwards
 *                         the original lot's strategy on SELL/ADJ instead of
 *                         letting the caller set a new one) - but once set,
 *                         it is written through unchanged on every row for
 *                         that lot, including its SELL and any ADJ remainder,
 *                         so selling never erases or changes it.
 */


const todayIsoLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const buildTradeRowValues = (rowIndex, payload) => {
  const r = rowIndex;
  const isClosed =
    (payload.sellPrice && Number(payload.sellPrice) > 0) || !!payload.sellDate;

  const sNo =
    payload.sNo !== undefined && payload.sNo !== null && payload.sNo !== ''
      ? payload.sNo
      : `=ROW()-2`;

  const toDateStr = (d) => {
    if (!d) return '';
    if (d instanceof Date) return d.toISOString().split('T')[0];
    return String(d).split(' ')[0];
  };
  const buyDt = toDateStr(payload.buyDate || payload.tradeDate);
  const sellDt = toDateStr(payload.sellDate || (isClosed ? payload.tradeDate : ''));

  
  const txTag = payload.txTag || (isClosed ? 'SELL' : 'BUY');
  const txLink =
    payload.txLink !== undefined && payload.txLink !== null && payload.txLink !== ''
      ? payload.txLink
      : '';
  const bookkeeping = `${todayIsoLocal()}|${txTag}|${txLink}`;

  return [
    sNo,
    `=CONCAT("NSE:",C${r})`,
    payload.symbol.toString().trim(),
    `=IFERROR(GOOGLEFINANCE(B${r},"marketcap")/10000000)`,
    `=IFERROR(GOOGLEFINANCE(B${r},"price"))`,
    `=IFERROR(GOOGLEFINANCE(B${r},"closeyest"))`,
    `=(E${r}/F${r}-1)*100`,
    buyDt,
    payload.buyPrice,
    payload.qty,
    `=I${r}*J${r}`,
    isClosed ? sellDt : '',
    isClosed ? payload.sellPrice : '',
    isClosed ? `=M${r}*J${r}` : '',
    isClosed ? `=N${r}-K${r}` : '',
    isClosed ? '' : `=J${r}*E${r}`,
    isClosed ? '' : `=P${r}-K${r}`,
    `=IFERROR(O${r}/K${r})`,
    
    bookkeeping,
    
    (payload.strategy && payload.strategy.toString().trim().toUpperCase()) || 'UNASSIGNED',
  ];
};