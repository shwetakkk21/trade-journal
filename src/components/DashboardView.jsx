import { AggregationFilters } from './AggregationFilters';
import { TimeframeSelector } from './TimeframeSelector';
import { MetricCards } from './MetricCards';
import { AnalyticsCharts } from './AnalyticsCharts';
import { TodaysEditsTable } from './TodaysEditsTable';
import { SyncActionsPanel } from './SyncActionsPanel';

export function DashboardView({
  googleToken,
  syncing,
  hasLinkedSheets,
  onConnect,
  onSync,
  onOpenManualTrade,
  onOpenCsvImport,
  dematOptions,
  strategyOptions,
  selectedDemat,
  setSelectedDemat,
  selectedStrategy,
  setSelectedStrategy,
  activeTimeframe,
  setActiveTimeframe,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  consolidatedAnalysis,
  sessionTransactions,
  onEditTransaction,
  onDeleteTransaction,
}) {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SyncActionsPanel
          googleToken={googleToken}
          syncing={syncing}
          hasLinkedSheets={hasLinkedSheets}
          onConnect={onConnect}
          onSync={onSync}
          onOpenManualTrade={onOpenManualTrade}
          onOpenCsvImport={onOpenCsvImport}
        />

        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-xl flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-4">
            <h2 className="text-sm font-semibold text-slate-200 font-sans">
              View Historical Metrics
            </h2>
            <AggregationFilters
              selectedDemat={selectedDemat}
              setSelectedDemat={setSelectedDemat}
              dematOptions={dematOptions}
              selectedStrategy={selectedStrategy}
              setSelectedStrategy={setSelectedStrategy}
              strategyOptions={strategyOptions}
            />
          </div>
          <div>
            <TimeframeSelector
              activeTimeframe={activeTimeframe}
              onTimeframeChange={setActiveTimeframe}
              customStartDate={customStartDate}
              setCustomStartDate={setCustomStartDate}
              customEndDate={customEndDate}
              setCustomEndDate={setCustomEndDate}
            />
            <MetricCards
              historicalStats={consolidatedAnalysis.historicalStats}
              liveHoldingsStats={consolidatedAnalysis.liveHoldingsStats}
            />
          </div>
        </div>
      </div>

      <AnalyticsCharts
        chartData={consolidatedAnalysis.chartData}
        trendData={consolidatedAnalysis.trendData}
      />
      <TodaysEditsTable
        transactions={sessionTransactions}
        onEdit={onEditTransaction}
        onDelete={onDeleteTransaction}
      />
    </div>
  );
}
