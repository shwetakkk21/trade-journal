import { useState } from 'react';
import { saveLinkedSheet, removeLinkedSheet } from './utils/dbService';
import { fetchSpreadsheetTabNames } from './utils/sheetService';
import { openSpreadsheetPicker } from './utils/googlePicker';

import { useAuth } from './hooks/useAuth';
import { useNotifications } from './hooks/useNotifications';
import { usePortfolioSync } from './hooks/usePortfolioSync';
import { usePortfolioAnalytics } from './hooks/usePortfolioAnalytics';
import { useTradeActions } from './hooks/useTradeActions';

import { LoadingScreen } from './components/LoadingScreen';
import { AuthScreen } from './components/AuthScreen';
import { PendingApprovalScreen } from './components/PendingApprovalScreen';
import { AppHeader } from './components/AppHeader';
import { AdminView } from './components/AdminView';
import { SettingsView } from './components/SettingsView';
import { WorkbookSnapshotsView } from './components/WorkbookSnapshotsView';
import { DashboardView } from './components/DashboardView';
import { ManualTradeModal } from './components/ManualTradeModal';
import { CsvImportModal } from './components/CsvImportModal';
import { NotificationModal } from './components/NotificationModal';
import { ProcessingOverlay } from './components/ProcessingOverlay';

function App() {
  const { user, approvalStatus, isAdmin, authLoading, login, logout } = useAuth();
  const { alertConfig, notify, closeAlert } = useNotifications();
  const {
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
  } = usePortfolioSync(user);

  const [submitting, setSubmitting] = useState(false);

  const {
    sessionTransactions,
    submitTrade,
    deleteTransaction,
    updateTransaction,
    findBlockingSell,
    importCsvBatch,
  } = useTradeActions({
    googleToken,
    linkedSheets,
    portfolio,
    executeDataSync,
    setSyncing,
    setSubmitting,
    notify,
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedDemat, setSelectedDemat] = useState('ALL');
  const [selectedStrategy, setSelectedStrategy] = useState('ALL');
  const [newLink, setNewLink] = useState({ spreadsheetId: '', spreadSheetName: '', accountType: '' });

  const [activeTimeframe, setActiveTimeframe] = useState('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  // Every linked tab (not just ones that already have portfolio rows), so a
  // freshly-linked-but-empty demat still shows up as an import destination.
  const csvDematOptions = [...new Set(linkedSheets.map((s) => s.accountType))];

  const {
    dematOptions,
    strategyOptions,
    consolidatedAnalysis,
  } = usePortfolioAnalytics({
    portfolio,
    selectedDemat,
    selectedStrategy,
    activeTimeframe,
    customStartDate,
    customEndDate,
  });

  // -------------------------- auth handlers --------------------------
  const handleGoogleLogin = async () => {
    try {
      const { user: signedInUser, accessToken } = await login();
      if (!accessToken || !signedInUser) return;
      saveToken(accessToken);
      const sheets = await refreshLinkedSheets(signedInUser.uid);
      if (sheets && sheets.length > 0) executeDataSync(sheets, accessToken);
    } catch (err) {
      notify('Authentication Failed', err.message, 'WARNING');
    }
  };

  const handleLogout = () => {
    notify(
      'Confirm Session Termination',
      'Are you sure you want to log out of this secure session?',
      'WARNING',
      async () => {
        try {
          resetSyncState();
          await logout();
        } catch (err) {
          console.error('Signout failure:', err);
        }
      }
    );
  };

  const handleImmediateLogout = async () => {
    try {
      resetSyncState();
      await logout();
    } catch (err) {
      console.error('Direct logout failure:', err);
    }
  };

  // -------------------------- sync handlers --------------------------
  const triggerLiveSheetsSync = async () => {
    if (!googleToken || isTokenExpired()) {
      resetSyncState();
      return handleGoogleLogin();
    }
    setSyncing(true);
    await executeDataSync(linkedSheets, googleToken);
    setSyncing(false);
  };

  // -------------------------- picker + linking --------------------------
  const handleOpenGoogleDrivePicker = async () => {
    if (!googleToken) {
      return notify('Access Required', 'Please establish an authorized Google Sheets connection first.', 'WARNING');
    }
    try {
      const picked = await openSpreadsheetPicker(googleToken);
      if (!picked) return;
      setNewLink((prev) => ({ ...prev, spreadsheetId: picked.id, spreadsheetName: picked.name }));
    } catch (err) {
      notify('Interface Error', err.message || 'Failed to initialize sheet picker.', 'WARNING');
    }
  };

  const handleAddSheetLink = async (e) => {
    e.preventDefault();
    if (!newLink.spreadsheetId) {
      return notify('Missing Resource ID', 'Select or paste a destination workbook code string.', 'WARNING');
    }
    try {
      setSyncing(true);
      const tabs = await fetchSpreadsheetTabNames(newLink.spreadsheetId, googleToken);
      await Promise.all(
        tabs.map((tabName) =>
          saveLinkedSheet(user.uid, {
            spreadsheetId: newLink.spreadsheetId,
            subsheetName: tabName,
            accountType: tabName,
          })
        )
      );
      setNewLink({ spreadsheetId: '', spreadsheetName: '', accountType: '' });
      const sheets = await refreshLinkedSheets(user.uid);
      if (sheets.length > 0) executeDataSync(sheets, googleToken);
    } catch (err) {
      notify('Integration Refusal', err.message, 'WARNING');
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteSheetLink = (id) => {
    notify(
      'Confirm Disconnect',
      'Are you sure you want to disconnect this subsheet? Underlying cell rows remain safe.',
      'WARNING',
      async () => {
        try {
          setSyncing(true);
          await removeLinkedSheet(user.uid, id);
          const sheets = await refreshLinkedSheets(user.uid);
          setPortfolio([]);
          if (sheets.length > 0) executeDataSync(sheets, googleToken);
        } catch (err) {
          notify('Database Error', err.message, 'WARNING');
        } finally {
          setSyncing(false);
        }
      }
    );
  };

  // -------------------------- trade actions --------------------------
  const handleModalSubmit = async (request) => {
    const result = editingTx
      ? await updateTransaction(editingTx, request)
      : await submitTrade(request);

    if (result?.ok) {
      setIsModalOpen(false);
      setEditingTx(null);
    }
  };

  const openEditModal = (tx) => {
    setEditingTx(tx);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTx(null);
  };

  const handleDeleteTransaction = (tx) => {
    // Special-case: deleting a BUY that already has a corresponding SELL
    const blockingSell = findBlockingSell ? findBlockingSell(tx) : null;
    if (blockingSell) {
      notify(
        'Cannot Delete This Buy',
        `A matching SELL of ${blockingSell.qty} ${tx.symbol} on ${tx.demat} was executed after this BUY (at ${new Date(blockingSell.ts).toLocaleTimeString()}).\n\nDeleting this BUY would leave that SELL referencing shares that no longer exist.\n\nPlease delete the SELL transaction first, then this BUY becomes reversible.`,
        'WARNING'
      );
      return;
    }
    notify(
      'Confirm Delete',
      `This will revert the ${tx.type} of ${tx.qty} ${tx.symbol} on the sheet. Continue?`,
      'CONFIRM',
      () => deleteTransaction(tx)
    );
  };

  // -------------------------- render --------------------------
  if (authLoading) return <LoadingScreen />;
  if (!user) return <AuthScreen onLogin={handleGoogleLogin} />;

  if (approvalStatus !== 'APPROVED' && !isAdmin) {
    return <PendingApprovalScreen approvalStatus={approvalStatus} onLogout={handleImmediateLogout} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <AppHeader
        user={user}
        isAdmin={isAdmin}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
      />

      <main className="flex-1 p-6">
        {activeTab === 'settings' && (
          <SettingsView
            newLink={newLink}
            onPickWorkbook={handleOpenGoogleDrivePicker}
            onSubmitLink={handleAddSheetLink}
            linkedSheets={linkedSheets}
            onDeleteSheet={handleDeleteSheetLink}
            syncing={syncing}
          />
        )}

        {activeTab === 'admin' && isAdmin && <AdminView />}

        {activeTab === 'snapshots' && (
          <WorkbookSnapshotsView linkedSheets={linkedSheets} googleToken={googleToken} />
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            googleToken={googleToken}
            syncing={syncing}
            hasLinkedSheets={linkedSheets.length > 0}
            onConnect={handleGoogleLogin}
            onSync={triggerLiveSheetsSync}
            onOpenManualTrade={() => { setEditingTx(null); setIsModalOpen(true); }}
            onOpenCsvImport={() => setIsCsvModalOpen(true)}
            dematOptions={dematOptions}
            strategyOptions={strategyOptions}
            selectedDemat={selectedDemat}
            setSelectedDemat={setSelectedDemat}
            selectedStrategy={selectedStrategy}
            setSelectedStrategy={setSelectedStrategy}
            activeTimeframe={activeTimeframe}
            setActiveTimeframe={setActiveTimeframe}
            customStartDate={customStartDate}
            setCustomStartDate={setCustomStartDate}
            customEndDate={customEndDate}
            setCustomEndDate={setCustomEndDate}
            consolidatedAnalysis={consolidatedAnalysis}
            sessionTransactions={sessionTransactions}
            onEditTransaction={openEditModal}
            onDeleteTransaction={handleDeleteTransaction}
          />
        )}
      </main>

      <ManualTradeModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={handleModalSubmit}
        dematOptions={dematOptions}
        editTx={editingTx}
        portfolio={portfolio}
      />
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        dematOptions={csvDematOptions}
        onExecute={importCsvBatch}
      />
      <NotificationModal
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={closeAlert}
        onConfirm={alertConfig.onConfirm}
      />
      <ProcessingOverlay show={submitting} variant="transaction" />
      <ProcessingOverlay show={!submitting && syncing} variant="sync" />
    </div>
  );
}

export default App;