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

  // Stage 9 LSH Telemetry State
  const [lshStats, setLshStats] = useState(null);
  const [loadingLsh, setLoadingLsh] = useState(false);
  const [backfillingLsh, setBackfillingLsh] = useState(false);
  const [lshSuccessMsg, setLshSuccessMsg] = useState(null);
  const [showLshModal, setShowLshModal] = useState(false);

  // Stage 10 Security Audit Logging & Compliance Ledger State
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditStats, setAuditStats] = useState(null);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditSeverity, setAuditSeverity] = useState('');
  const [auditEventType, setAuditEventType] = useState('');
  const [auditUserFilter, setAuditUserFilter] = useState('');

  const fetchAuditLogs = async () => {
    if (!token) return;
    setLoadingAudit(true);
    try {
      const params = new URLSearchParams();
      if (auditSeverity) params.append('severity', auditSeverity);
      if (auditEventType) params.append('event_type', auditEventType);
      if (auditUserFilter) params.append('username', auditUserFilter);
      params.append('limit', '50');

      const [logsRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/admin/audit-logs?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/admin/audit-logs/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (logsRes.ok) {
        const data = await logsRes.json();
        setAuditLogs(data.logs || []);
        setAuditTotal(data.total || 0);
      }
      if (statsRes.ok) {
        const data = await statsRes.json();
        setAuditStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    if (showAuditModal && token) {
      fetchAuditLogs();
    }
  }, [showAuditModal, auditSeverity, auditEventType, auditUserFilter, token]);

  const fetchLshStats = async () => {
    if (!token) return;
    setLoadingLsh(true);
    try {
      const res = await fetch(`${API_URL}/lsh/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLshStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch LSH stats:', err);
    } finally {
      setLoadingLsh(false);
    }
  };

  const handleLshBackfill = async () => {
    if (!token) return;
    setBackfillingLsh(true);
    setLshSuccessMsg(null);
    try {
      const res = await fetch(`${API_URL}/lsh/backfill`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLshSuccessMsg(data.message || 'LSH backfill complete!');
        await fetchLshStats();
        setTimeout(() => setLshSuccessMsg(null), 5000);
      }
    } catch (err) {
      setError('Failed to backfill LSH buckets: ' + err.message);
    } finally {
      setBackfillingLsh(false);
    }
  };

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
    fetchDatasets();
    fetchLshStats();
  }, [token]);

  const handleUpload = async (forceOverride = false) => {
    if (!file) {
      setError('Please select a file');
      return;
    }
    setLoading(true);
    setError(null);
    if (!forceOverride) setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('classification', classification);
    if (description) formData.append('description', description);
    if (forceOverride) formData.append('force_override', 'true');

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

      const data = await response.json();
      if (response.ok) {
        setResult(data);
        if (!data.duplicate || forceOverride) {
          await fetchDatasets();
          await fetchLshStats();
          if (forceOverride) {
            setFile(null);
          }
        }
      } else {
        setError(data.detail || 'Upload failed');
      }
    } catch (err) {
      setError('Upload failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (datasetId, filename) => {
    setDownloadingId(datasetId);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/datasets/${datasetId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 403) {
        const data = await response.json();
        setError(`Access Denied: ${data.detail || 'Insufficient clearance level to download this dataset.'}`);
        return;
      }

      if (!response.ok) {
        setError('Download failed with status ' + response.status);
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      await fetchDatasets();
    } catch (err) {
      setError('Download failed: ' + err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  // Filter datasets by query
  const filteredDatasets = datasets.filter((d) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (d.filename && d.filename.toLowerCase().includes(q)) ||
      (d.description && d.description.toLowerCase().includes(q)) ||
      (d.uploader_username && d.uploader_username.toLowerCase().includes(q)) ||
      (d.classification && d.classification.toLowerCase().includes(q)) ||
      (d.sha256 && d.sha256.toLowerCase().includes(q)) ||
      (d.columns && d.columns.some((c) => c.toLowerCase().includes(q))) ||
      (d.top_keywords && d.top_keywords.some((k) => k.toLowerCase().includes(q)))
    );
  });

  // Sort datasets
  const sortedDatasets = [...filteredDatasets].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'date') {
      comparison = new Date(a.uploaded_at) - new Date(b.uploaded_at);
    } else if (sortBy === 'size') {
      comparison = a.size_bytes - b.size_bytes;
    } else if (sortBy === 'filename') {
      comparison = a.filename.localeCompare(b.filename);
    } else if (sortBy === 'uploader') {
      comparison = (a.uploader_username || '').localeCompare(b.uploader_username || '');
    } else if (sortBy === 'classification') {
      const rank = { PUBLIC: 1, INTERNAL: 2, RESTRICTED: 3, CONFIDENTIAL: 4 };
      comparison = (rank[a.classification] || 0) - (rank[b.classification] || 0);
    } else if (sortBy === 'downloads') {
      comparison = (a.download_count || 0) - (b.download_count || 0);
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Pagination calculations
  const totalItems = sortedDatasets.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedDatasets = sortedDatasets.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getPaginationPages = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 3) {
      return [1, 2, 3, 4, '...', totalPages];
    }
    if (currentPage >= totalPages - 2) {
      return [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  return (
    <div className="min-h-screen bg-[#05070d] text-slate-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <HeaderToolbar
          onOpenAudit={() => setShowAuditModal(true)}
          onOpenLsh={() => setShowLshModal(true)}
          onLogout={logout}
        />

        {/* Stage 9 LSH Telemetry Bar */}
        <LshTelemetryWidget
          lshStats={lshStats}
          loadingLsh={loadingLsh}
          backfillingLsh={backfillingLsh}
          lshSuccessMsg={lshSuccessMsg}
          onBackfill={handleLshBackfill}
        />

        {/* Global Error Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-800/80 text-red-300 text-sm flex items-center justify-between">
            <span>⚠ {error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200 text-xs">✕ Dismiss</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Upload Dropzone & Duplicate Alert */}
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
          auditLogs={auditLogs}
          auditTotal={auditTotal}
          auditStats={auditStats}
          loadingAudit={loadingAudit}
          auditSeverity={auditSeverity}
          setAuditSeverity={setAuditSeverity}
          auditEventType={auditEventType}
          setAuditEventType={setAuditEventType}
          auditUserFilter={auditUserFilter}
          setAuditUserFilter={setAuditUserFilter}
          onRefresh={fetchAuditLogs}
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