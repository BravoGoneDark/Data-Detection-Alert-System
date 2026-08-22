// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthenticationPage from './components/auth/AuthenticationPage';
import { API_URL } from './constants/classifications';
import HeaderToolbar from './components/dashboard/HeaderToolbar';
import LshTelemetryWidget from './components/dashboard/LshTelemetryWidget';
import UploadDropzone from './components/dashboard/UploadDropzone';
import DatasetInventory from './components/dashboard/DatasetInventory';
import AuditLedgerModal from './components/modals/AuditLedgerModal';
import LshArchitectureModal from './components/modals/LshArchitectureModal';
import AnomalyDefenseModal from './components/modals/AnomalyDefenseModal';
import { useSecurityFeeds } from './hooks/useSecurityFeeds';

function UploadPanel() {
  const { token, logout } = useAuth();
  const [file, setFile] = useState(null);
  const [classification, setClassification] = useState('INTERNAL');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [loadingDatasets, setLoadingDatasets] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  // Search, Filter & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  // Modal Visibility State
  const [showLshModal, setShowLshModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showAnomalyModal, setShowAnomalyModal] = useState(false);

  // Security Telemetry Feeds Hook
  const feeds = useSecurityFeeds(token);

  useEffect(() => {
    if (showAuditModal && token) feeds.fetchAuditLogs();
  }, [showAuditModal, feeds.auditSeverity, feeds.auditEventType, feeds.auditUserFilter, token]);

  useEffect(() => {
    if ((showAnomalyModal || token) && token) feeds.fetchAnomalies();
  }, [showAnomalyModal, feeds.anomalySeverity, feeds.anomalyStatus, feeds.anomalyType, feeds.anomalyUserFilter, token]);

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

  useEffect(() => {
    if (token) {
      fetchDatasets();
      feeds.fetchLshStats();
      feeds.fetchAnomalies();
    }
  }, [token]);

  const handleUpload = async (e, forceUpload = false) => {
    if (e) e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);
    if (!forceUpload) setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('classification', classification);
    if (description) formData.append('description', description);
    if (forceUpload) formData.append('force', 'true');

    try {
      const response = await fetch(`${API_URL}/datasets/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (response.status === 401) {
        logout();
        return;
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Upload failed');
      }

      const data = await response.json();
      setResult(data);

      if (!data.duplicate || forceUpload) {
        setFile(null);
        setDescription('');
        const fileInput = document.getElementById('file-upload');
        if (fileInput) fileInput.value = '';
        await fetchDatasets();
        await feeds.fetchLshStats();
        await feeds.fetchAnomalies();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (datasetId, filename) => {
    if (!token) return;
    setDownloadingId(datasetId);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/datasets/${datasetId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) {
        logout();
        return;
      }

      if (response.status === 403) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(`[SECURITY ALERT 403] ${errData.detail || 'Access denied: Clearance insufficient'}`);
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      await fetchDatasets();
      await feeds.fetchAnomalies();
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  // Filter & Pagination computations
  const filteredDatasets = datasets
    .filter((d) => {
      const q = searchQuery.toLowerCase();
      return (
        d.filename.toLowerCase().includes(q) ||
        (d.classification && d.classification.toLowerCase().includes(q)) ||
        (d.uploader_username && d.uploader_username.toLowerCase().includes(q)) ||
        (d.top_keywords && d.top_keywords.some((k) => k.toLowerCase().includes(q)))
      );
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') comparison = new Date(b.uploaded_at) - new Date(a.uploaded_at);
      else if (sortBy === 'size') comparison = b.size_bytes - a.size_bytes;
      else if (sortBy === 'filename') comparison = a.filename.localeCompare(b.filename);
      else if (sortBy === 'downloads') comparison = (b.download_count || 0) - (a.download_count || 0);
      return sortOrder === 'asc' ? -comparison : comparison;
    });

  const totalItems = filteredDatasets.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedDatasets = filteredDatasets.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getPaginationPages = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 font-sans selection:bg-cyan-500 selection:text-black">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Navigation Toolbar */}
        <HeaderToolbar
          onOpenAudit={() => setShowAuditModal(true)}
          onOpenLsh={() => setShowLshModal(true)}
          onOpenAnomaly={() => setShowAnomalyModal(true)}
          activeThreatsCount={feeds.anomalyStats?.active_threats || 0}
          onLogout={logout}
        />

        {/* Stage 9 LSH Telemetry Bar */}
        <LshTelemetryWidget
          lshStats={feeds.lshStats}
          loadingLsh={feeds.loadingLsh}
          backfillingLsh={feeds.backfillingLsh}
          lshSuccessMsg={feeds.lshSuccessMsg}
          onBackfill={() => feeds.handleLshBackfill(setError)}
        />

        {/* Global Error Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-800/80 text-red-300 text-sm flex items-center justify-between">
            <span>⚠ {error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200 text-xs">✕ Dismiss</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Upload Dropzone */}
          <div className="lg:col-span-4 space-y-6">
            <UploadDropzone
              file={file}
              setFile={setFile}
              classification={classification}
              setClassification={setClassification}
              description={description}
              setDescription={setDescription}
              loading={loading}
              result={result}
              setResult={setResult}
              onUpload={handleUpload}
              onDownload={handleDownload}
            />
          </div>

          {/* Right Column: Dataset Inventory */}
          <div className="lg:col-span-8 space-y-4">
            <DatasetInventory
              datasets={datasets}
              filteredDatasets={filteredDatasets}
              paginatedDatasets={paginatedDatasets}
              loadingDatasets={loadingDatasets}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              sortBy={sortBy}
              setSortBy={setSortBy}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
              pageSize={pageSize}
              setPageSize={setPageSize}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              getPaginationPages={getPaginationPages}
              onRefresh={fetchDatasets}
              onDownload={handleDownload}
              downloadingId={downloadingId}
            />
          </div>
        </div>

        {/* Modals */}
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