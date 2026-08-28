// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthenticationPage from './components/auth/AuthenticationPage';
import { API_URL } from './constants/classifications';

// Layout Components
import Sidebar from './components/layout/Sidebar';
import TopHeader from './components/layout/TopHeader';

// Dashboard & Content Views
import OverviewSection from './components/dashboard/OverviewSection';
import UploadDropzone from './components/dashboard/UploadDropzone';
import DatasetInventory from './components/dashboard/DatasetInventory';
import QuarantineBanner from './components/dashboard/QuarantineBanner';

// Modals
import AuditLedgerModal from './components/modals/AuditLedgerModal';
import LshArchitectureModal from './components/modals/LshArchitectureModal';
import AnomalyDefenseModal from './components/modals/AnomalyDefenseModal';
import QuarantineModal from './components/modals/QuarantineModal';
import WebhookConfigModal from './components/modals/WebhookConfigModal';
import RedisTasksModal from './components/modals/RedisTasksModal';
import UsersModal from './components/modals/UsersModal';

// Hooks
import { useSecurityFeeds } from './hooks/useSecurityFeeds';
import { useQuarantineFeeds } from './hooks/useQuarantineFeeds';
import { useDatasetUpload } from './hooks/useDatasetUpload';

function UploadPanel() {
  const { token, user, logout } = useAuth();
  const [activeView, setActiveView] = useState('overview'); // 'overview' | 'inventory' | 'upload'
  const [globalSearch, setGlobalSearch] = useState('');
  const [datasets, setDatasets] = useState([]);
  const [loadingDatasets, setLoadingDatasets] = useState(false);
  const [overviewStage, setOverviewStage] = useState(1);

  // Modal Visibility State
  const [showLshModal, setShowLshModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showAnomalyModal, setShowAnomalyModal] = useState(false);
  const [showQuarantineModal, setShowQuarantineModal] = useState(false);
  const [showWebhooksModal, setShowWebhooksModal] = useState(false);
  const [showRedisModal, setShowRedisModal] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);

  // Security Telemetry Feeds Hooks
  const feeds = useSecurityFeeds(token);
  const qFeeds = useQuarantineFeeds(token);

  const fetchDatasets = async () => {
    if (!token) return;
    setLoadingDatasets(true);
    try {
      const response = await fetch(`${API_URL}/datasets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401) {
        logout();
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setDatasets(data);
      }
    } catch (err) {
      console.error('Failed to fetch datasets:', err);
    } finally {
      setLoadingDatasets(false);
    }
  };

  // Dataset Upload & Queue Operations Hook
  const uploadOps = useDatasetUpload(token, logout, fetchDatasets, feeds, qFeeds);

  useEffect(() => {
    if (showAuditModal && token) feeds.fetchAuditLogs();
  }, [showAuditModal, feeds.auditSeverity, feeds.auditEventType, feeds.auditUserFilter, token]);

  useEffect(() => {
    if ((showAnomalyModal || token) && token) feeds.fetchAnomalies();
  }, [showAnomalyModal, feeds.anomalySeverity, feeds.anomalyStatus, feeds.anomalyType, feeds.anomalyUserFilter, token]);

  useEffect(() => {
    if ((showQuarantineModal || token) && token) {
      qFeeds.fetchQuarantines();
      qFeeds.fetchMyQuarantineStatus();
    }
  }, [showQuarantineModal, qFeeds.quarantineStatusFilter, qFeeds.quarantineUserFilter, token]);

  useEffect(() => {
    if (showWebhooksModal && token) qFeeds.fetchWebhooks();
  }, [showWebhooksModal, token]);

  useEffect(() => {
    if (token) {
      fetchDatasets();
      feeds.fetchLshStats();
      feeds.fetchAnomalies();
      qFeeds.fetchMyQuarantineStatus();
      qFeeds.fetchQuarantines();

      // Periodic 3.5s background synchronization (silent to prevent UI flicker)
      const timer = setInterval(() => {
        qFeeds.fetchMyQuarantineStatus();
        feeds.fetchAnomalies(true);
        if (showQuarantineModal) qFeeds.fetchQuarantines(true);
      }, 3500);
      return () => clearInterval(timer);
    }
  }, [token, showQuarantineModal]);

  // Clear quarantine alert message once quarantine is lifted
  useEffect(() => {
    if (!qFeeds.myQuarantine?.is_quarantined && uploadOps.error && uploadOps.error.toLowerCase().includes('quarantin')) {
      uploadOps.setError(null);
    }
  }, [qFeeds.myQuarantine?.is_quarantined]);

  const isAdmin = (user?.role || '').toUpperCase() === 'ADMIN' || ['pratyush', 'admin'].includes((user?.username || '').toLowerCase());
  const activeThreats = feeds.anomalyStats?.active_threats ?? feeds.anomalies.filter((a) => a.status === 'ACTIVE').length;
  const quarantinedCount = qFeeds.quarantineStats?.active_quarantines ?? 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans selection:bg-violet-500 selection:text-white">
      
      {/* 1. FIXED LEFT SIDEBAR NAVIGATION */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        overviewStage={overviewStage}
        setOverviewStage={setOverviewStage}
        activeModals={{
          watchdog: showAnomalyModal,
          quarantine: showQuarantineModal,
          audit: showAuditModal,
          users: showUsersModal,
          redis: showRedisModal,
          webhooks: showWebhooksModal,
        }}
        onOpenWatchdog={() => setShowAnomalyModal(true)}
        onOpenQuarantine={() => setShowQuarantineModal(true)}
        onOpenAudit={() => setShowAuditModal(true)}
        onOpenUsers={() => setShowUsersModal(true)}
        onOpenRedis={() => setShowRedisModal(true)}
        onOpenWebhooks={() => setShowWebhooksModal(true)}
        onLogout={logout}
        user={user}
        datasetCount={datasets.length}
        activeThreats={activeThreats}
        quarantinedCount={quarantinedCount}
      />

      {/* 2. MAIN APP CONTENT CONTAINER (OFFSET WITH pl-64 TO ACCOMMODATE FIXED SIDEBAR) */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen pl-64">
        
        {/* Top Executive Header */}
        <TopHeader
          user={user}
          onOpenWatchdog={() => setShowAnomalyModal(true)}
          onOpenWebhooks={() => setShowWebhooksModal(true)}
          activeThreats={activeThreats}
        />

        {/* Dynamic Scrollable Body Area */}
        <main className="flex-1 p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto">
          
          {/* Active Quarantine Lockdown Banner */}
          {qFeeds.myQuarantine?.is_quarantined && (
            <QuarantineBanner myQuarantine={qFeeds.myQuarantine} />
          )}

          {/* VIEW 1: MASTER SOC OVERVIEW (4-SECTION SCROLL JOURNEY) */}
          {activeView === 'overview' && (
            <OverviewSection
              datasets={datasets}
              loadingDatasets={loadingDatasets}
              fetchDatasets={fetchDatasets}
              token={token}
              myQuarantine={qFeeds.myQuarantine}
              anomalies={feeds.anomalies}
              anomalyStats={feeds.anomalyStats}
              quarantineStats={qFeeds.quarantineStats}
              redisStats={feeds.lshStats}
              webhooks={qFeeds.webhooks}
              auditLogs={feeds.auditLogs}
              onOpenUpload={() => setActiveView('upload')}
              onOpenInventory={() => setActiveView('inventory')}
              onOpenWatchdog={() => setShowAnomalyModal(true)}
              onOpenQuarantine={() => setShowQuarantineModal(true)}
              onOpenAudit={() => setShowAuditModal(true)}
              onOpenUsers={() => setShowUsersModal(true)}
              onOpenRedis={() => setShowRedisModal(true)}
              onOpenWebhooks={() => setShowWebhooksModal(true)}
              isAdmin={isAdmin}
              initialStage={overviewStage}
              onStageChange={setOverviewStage}
            />
          )}

          {/* VIEW 2: DEDICATED DATASET INVENTORY */}
          {activeView === 'inventory' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-wide">Content-Addressable Storage Repository</h2>
                  <p className="text-xs text-slate-400">Filter, search, and download datasets according to security clearance</p>
                </div>
                <button
                  onClick={() => setActiveView('upload')}
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-lg transition-colors flex items-center gap-1.5"
                >
                  <span>⚡</span> Upload Dataset
                </button>
              </div>
              <DatasetInventory
                datasets={datasets}
                loading={loadingDatasets}
                onRefresh={fetchDatasets}
                token={token}
                isAdmin={isAdmin}
                isQuarantined={qFeeds.myQuarantine?.is_quarantined}
                quarantineRiskScore={qFeeds.myQuarantine?.risk_score}
              />
            </div>
          )}

          {/* VIEW 3: INGESTION DROPZONE */}
          {activeView === 'upload' && (
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-wide">Dataset Ingestion & Registration</h2>
                  <p className="text-xs text-slate-400">Multi-tier deduplication verification with real-time LSH indexing</p>
                </div>
                <button
                  onClick={() => setActiveView('overview')}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
                >
                  ← Back to Overview
                </button>
              </div>
              <UploadDropzone
                uploadOps={uploadOps}
                myQuarantine={qFeeds.myQuarantine}
                onOpenLsh={() => setShowLshModal(true)}
              />
            </div>
          )}
        </main>
      </div>

      {/* 3. MODALS CONTAINER */}
      <LshArchitectureModal
        isOpen={showLshModal}
        onClose={() => setShowLshModal(false)}
        stats={feeds.lshStats}
        onBackfill={feeds.handleLshBackfill}
      />

      <RedisTasksModal
        isOpen={showRedisModal}
        onClose={() => setShowRedisModal(false)}
        token={token}
      />

      <AuditLedgerModal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
        auditLogs={feeds.auditLogs}
        auditTotal={feeds.totalAuditLogs}
        auditStats={feeds.auditStats}
        loadingAudit={feeds.loadingAudit}
        auditSeverity={feeds.auditSeverity}
        setAuditSeverity={feeds.setAuditSeverity}
        auditEventType={feeds.auditEventType}
        setAuditEventType={feeds.setAuditEventType}
        auditUserFilter={feeds.auditUserFilter}
        setAuditUserFilter={feeds.setAuditUserFilter}
        onRefresh={feeds.fetchAuditLogs}
      />

      <AnomalyDefenseModal
        isOpen={showAnomalyModal}
        onClose={() => setShowAnomalyModal(false)}
        anomalies={feeds.anomalies}
        totalAnomalies={feeds.totalAnomalies}
        anomalyStats={feeds.anomalyStats}
        loadingAnomalies={feeds.loadingAnomalies}
        severityFilter={feeds.anomalySeverity}
        setSeverityFilter={feeds.setAnomalySeverity}
        statusFilter={feeds.anomalyStatus}
        setStatusFilter={feeds.setStatusFilter}
        typeFilter={feeds.anomalyType}
        setTypeFilter={feeds.setTypeFilter}
        userFilter={feeds.anomalyUserFilter}
        setUserFilter={feeds.setUserFilter}
        onRefresh={feeds.fetchAnomalies}
        token={token}
        isAdmin={isAdmin}
      />

      <QuarantineModal
        isOpen={showQuarantineModal}
        onClose={() => setShowQuarantineModal(false)}
        records={qFeeds.quarantineRecords}
        total={qFeeds.quarantineTotal}
        stats={qFeeds.quarantineStats}
        loading={qFeeds.loadingQuarantine}
        statusFilter={qFeeds.quarantineStatusFilter}
        setStatusFilter={qFeeds.setQuarantineStatusFilter}
        userFilter={qFeeds.quarantineUserFilter}
        setUserFilter={qFeeds.setQuarantineUserFilter}
        onRefresh={qFeeds.fetchQuarantines}
        isAdmin={isAdmin}
        onRelease={async (id, notes) => {
          const res = await qFeeds.releaseQuarantine(id, notes);
          await qFeeds.fetchMyQuarantineStatus();
          return res;
        }}
        onManualQuarantine={async (targetUsername, reason, riskScore) => {
          const res = await qFeeds.manualQuarantine(targetUsername, reason, riskScore);
          await qFeeds.fetchMyQuarantineStatus();
          return res;
        }}
      />

      <WebhookConfigModal
        isOpen={showWebhooksModal}
        onClose={() => setShowWebhooksModal(false)}
        webhooks={qFeeds.webhooks}
        loading={qFeeds.loadingWebhooks}
        testResult={qFeeds.testResult}
        onRefresh={qFeeds.fetchWebhooks}
        onCreate={qFeeds.createWebhook}
        onDelete={qFeeds.deleteWebhook}
        onTest={qFeeds.testWebhook}
        isAdmin={isAdmin}
      />

      <UsersModal
        isOpen={showUsersModal}
        onClose={() => setShowUsersModal(false)}
        token={token}
        currentUsername={user?.username}
      />

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthenticationPage>
        <UploadPanel />
      </AuthenticationPage>
    </AuthProvider>
  );
}