import { useMemo } from 'react';
import { isWithinTimeframe } from '../utils/dateUtils';

const isClosedTrade = (t) => Number(t.sellPrice || 0) > 0 || Boolean(t.sellDate);
const strategyOf = (t) => t.strategy || 'Unassigned';

export function usePortfolioAnalytics({
  portfolio,
  selectedDemat,
  selectedStrategy,
  activeTimeframe,
  customStartDate,
  customEndDate,
}) {
  const dematOptions = useMemo(
    () => ['ALL', ...new Set(portfolio.map((t) => t.sheetName))],
    [portfolio]
  );

  const strategyOptions = useMemo(
    () => ['ALL', ...new Set(portfolio.map(strategyOf))],
    [portfolio]
  );

  const matchesFilters = (t) => {
    const dematOk = selectedDemat === 'ALL' || t.sheetName === selectedDemat;
    const stratOk = selectedStrategy === 'ALL' || strategyOf(t) === selectedStrategy;
    return dematOk && stratOk;
  };

  // Rows shown in the table; closed trades honour the timeframe window.
  const filteredDataByDropdowns = useMemo(() => {
    return portfolio.filter((trade) => {
      if (!matchesFilters(trade)) return false;
      if (!isClosedTrade(trade)) return true;
      const date = trade.sellDate || trade.tradeDate;
      return isWithinTimeframe(date, activeTimeframe, customStartDate, customEndDate);
    });
    
  }, [portfolio, selectedDemat, selectedStrategy, activeTimeframe, customStartDate, customEndDate]);

  const consolidatedAnalysis = useMemo(() => {
    let realized = 0;
    let unrealized = 0;
    let wins = 0;
    let losses = 0;
    let winVal = 0;
    let lossVal = 0;
    let buyValRealized = 0;
    let buyValUnrealized = 0;
    const perSymbol = {};

    for (const t of portfolio) {
      if (!matchesFilters(t)) continue;

      if (!perSymbol[t.symbol]) {
        perSymbol[t.symbol] = { name: t.symbol, Realized: 0, Unrealized: 0 };
      }

      if (isClosedTrade(t)) {
        const date = t.sellDate || t.tradeDate;
        const inWindow = isWithinTimeframe(
          date,
          activeTimeframe,
          customStartDate,
          customEndDate
        );
        if (!inWindow) continue;

        realized += t.realizedPL;
        buyValRealized += t.buyValue;
        perSymbol[t.symbol].Realized += t.realizedPL;

        if (t.realizedPL > 0) {
          wins += 1;
          winVal += t.realizedPL;
        } else {
          losses += 1;
          lossVal += Math.abs(t.realizedPL);
        }
      } else {
        unrealized += t.unrealizedPL;
        buyValUnrealized += t.buyValue;
        perSymbol[t.symbol].Unrealized += t.unrealizedPL;
      }
    }

    const totalTrades = wins + losses;
    const winRatio = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const avgGain = wins > 0 ? winVal / wins : 0;
    const avgLoss = losses > 0 ? lossVal / losses : 0;
    const riskReward = avgLoss > 0 ? (avgGain / avgLoss).toFixed(2) : 'Max Edge';

    return {
      historicalStats: {
        realized,
        pctRealized: buyValRealized > 0 ? (realized / buyValRealized) * 100 : 0,
        totalTrades,
        winRatio,
        riskReward,
      },
      liveHoldingsStats: {
        unrealized,
        pctUnrealized: buyValUnrealized > 0 ? (unrealized / buyValUnrealized) * 100 : 0,
      },
      chartData: Object.values(perSymbol).filter(
        (item) => item.Realized !== 0 || item.Unrealized !== 0
      ),
    };
    
  }, [portfolio, selectedDemat, selectedStrategy, activeTimeframe, customStartDate, customEndDate]);

  return { dematOptions, strategyOptions, filteredDataByDropdowns, consolidatedAnalysis };
}
