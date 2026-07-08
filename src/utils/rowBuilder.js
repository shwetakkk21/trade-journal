/**
 * Single source of truth for the Dhan-format row layout.
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
 *  S  Last Modified   - YYYY-MM-DD (hidden bookkeeping column — the *date
 *                        the row was added / last touched by the app*, used
 *                        by TodaysEditsTable to surface "today's" activity
 *                        without any localStorage.)
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
    // Column S — hidden last-modified stamp. Always overwritten to *today's*
    // local calendar date whenever the row is written or updated, so the
    // "Today's Transactions" view can filter directly off the sheet.
    todayIsoLocal(),
  ];
};
