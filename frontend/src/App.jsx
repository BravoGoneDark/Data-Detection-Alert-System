// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthenticationPage from './components/auth/AuthenticationPage';
import { API_URL } from './constants/classifications';
import HeaderToolbar from './components/dashboard/HeaderToolbar';
import LshTelemetryWidget from './components/dashboard/LshTelemetryWidget';
import UploadDropzone from './components/dashboard/UploadDropzone';
import DatasetInventory from './components/dashboard/DatasetInventory';
import QuarantineBanner from './components/dashboard/QuarantineBanner';
import AuditLedgerModal from './components/modals/AuditLedgerModal';
import LshArchitectureModal from './components/modals/LshArchitectureModal';
import AnomalyDefenseModal from './components/modals/AnomalyDefenseModal';
import QuarantineModal from './components/modals/QuarantineModal';
import WebhookConfigModal from './components/modals/WebhookConfigModal';
import RedisTasksModal from './components/modals/RedisTasksModal';
import { useSecurityFeeds } from './hooks/useSecurityFeeds';
import { useQuarantineFeeds } from './hooks/useQuarantineFeeds';
import { useDatasetUpload } from './hooks/useDatasetUpload';

function UploadPanel() {
  const { token, logout } = useAuth();
  const [datasets, setDatasets] = useState([]);
  const [loadingDatasets, setLoadingDatasets] = useState(false);

  // Modal Visibility State
  const [showLshModal, setShowLshModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showAnomalyModal, setShowAnomalyModal] = useState(false);
  const [showQuarantineModal, setShowQuarantineModal] = useState(false);
  const [showWebhooksModal, setShowWebhooksModal] = useState(false);
  const [showRedisModal, setShowRedisModal] = useState(false);

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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 font-sans selection:bg-rose-500 selection:text-white">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Navigation Toolbar */}
        <HeaderToolbar
          onOpenAudit={() => setShowAuditModal(true)}
          onOpenLsh={() => setShowLshModal(true)}
          onOpenAnomaly={() => setShowAnomalyModal(true)}
          onOpenQuarantine={() => setShowQuarantineModal(true)}
          onOpenWebhooks={() => setShowWebhooksModal(true)}
          onOpenRedis={() => setShowRedisModal(true)}
          activeThreatsCount={feeds.anomalyStats?.active_threats || 0}
          activeQuarantinesCount={qFeeds.quarantineStats?.active_quarantines || 0}
          onLogout={logout}
        />

        {/* Stage 12 Active Quarantine Lockdown Banner */}
        <QuarantineBanner myQuarantine={qFeeds.myQuarantine} />

        {/* Stage 9 LSH Telemetry Bar */}
        <LshTelemetryWidget
          lshStats={feeds.lshStats}
          loadingLsh={feeds.loadingLsh}
          backfillingLsh={feeds.backfillingLsh}
          lshSuccessMsg={feeds.lshSuccessMsg}
          onBackfill={() => feeds.handleLshBackfill(uploadOps.setError)}
        />

        {/* Global Error / Alert Banner */}
        {uploadOps.error && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-800/80 text-red-300 text-sm flex items-center justify-between shadow-lg">
            <span>⚠ {uploadOps.error}</span>
            <button onClick={() => uploadOps.setError(null)} className="text-red-400 hover:text-red-200 text-xs font-semibold px-2 py-0.5 rounded bg-red-900/40">✕ Dismiss</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Upload Dropzone */}
          <div className="lg:col-span-4 space-y-6">
            <UploadDropzone
              file={uploadOps.file}
              setFile={uploadOps.setFile}
              classification={uploadOps.classification}
              setClassification={uploadOps.setClassification}
              description={uploadOps.description}
              setDescription={uploadOps.setDescription}
              loading={uploadOps.loading}
              result={uploadOps.result}
              setResult={uploadOps.setResult}
              onUpload={uploadOps.handleUpload}
              onDownload={uploadOps.handleDownload}
              isAsyncMode={uploadOps.isAsyncMode}
              setIsAsyncMode={uploadOps.setIsAsyncMode}
              asyncTask={uploadOps.asyncTask}
            />
          </div>

          {/* Right Column: Dataset Inventory */}
          <div className="lg:col-span-8 space-y-4">
            <DatasetInventory
              datasets={datasets}
              loadingDatasets={loadingDatasets}
              onRefresh={fetchDatasets}
              onDownload={uploadOps.handleDownload}
              downloadingId={uploadOps.downloadingId}
              isQuarantined={qFeeds.myQuarantine?.is_quarantined}
            />
          </div>
        </div>

        {/* Modals */}
        <RedisTasksModal
          isOpen={showRedisModal}
          onClose={() => setShowRedisModal(false)}
          token={token}
        />

        <LshArchitectureModal
          isOpen={showLshModal}
          onClose={() => setShowLshModal(false)}
        />

        <AuditLedgerModal
          isOpen={showAuditModal}
          onClose={() => setShowAuditModal(false)}
          auditLogs={feeds.auditLogs}
          auditTotal={feeds.auditTotal}
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
          onRelease={async (id, notes) => {
            await qFeeds.releaseQuarantine(id, notes);
            await qFeeds.fetchMyQuarantineStatus();
          }}
          onManualQuarantine={async (targetUsername, reason, riskScore) => {
            await qFeeds.manualQuarantine(targetUsername, reason, riskScore);
            await qFeeds.fetchMyQuarantineStatus();
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
        />

      </div>
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