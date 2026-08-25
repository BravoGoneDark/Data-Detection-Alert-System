// frontend/src/hooks/useSecurityFeeds.js
import { useState, useEffect } from 'react';
import { API_URL } from '../constants/classifications';

export function useSecurityFeeds(token) {
  // Stage 9 LSH State
  const [lshStats, setLshStats] = useState(null);
  const [loadingLsh, setLoadingLsh] = useState(false);
  const [backfillingLsh, setBackfillingLsh] = useState(false);
  const [lshSuccessMsg, setLshSuccessMsg] = useState(null);

  // Stage 10 Audit State
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditStats, setAuditStats] = useState(null);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditSeverity, setAuditSeverity] = useState('');
  const [auditEventType, setAuditEventType] = useState('');
  const [auditUserFilter, setAuditUserFilter] = useState('');

  // Stage 11 Anomaly State
  const [anomalies, setAnomalies] = useState([]);
  const [totalAnomalies, setTotalAnomalies] = useState(0);
  const [anomalyStats, setAnomalyStats] = useState(null);
  const [loadingAnomalies, setLoadingAnomalies] = useState(false);
  const [anomalySeverity, setAnomalySeverity] = useState('');
  const [anomalyStatus, setAnomalyStatus] = useState('');
  const [anomalyType, setAnomalyType] = useState('');
  const [anomalyUserFilter, setAnomalyUserFilter] = useState('');

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

  const handleLshBackfill = async (setError) => {
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
      if (setError) setError('Failed to backfill LSH buckets: ' + err.message);
    } finally {
      setBackfillingLsh(false);
    }
  };

  const fetchAuditLogs = async (silent = false) => {
    if (!token) return;
    if (!silent) setLoadingAudit(true);
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
      if (!silent) setLoadingAudit(false);
    }
  };

  const fetchAnomalies = async (silent = false) => {
    if (!token) return;
    if (!silent) setLoadingAnomalies(true);
    try {
      const params = new URLSearchParams();
      if (anomalySeverity) params.append('severity', anomalySeverity);
      if (anomalyStatus) params.append('status', anomalyStatus);
      if (anomalyType) params.append('anomaly_type', anomalyType);
      if (anomalyUserFilter) params.append('username', anomalyUserFilter);
      params.append('limit', '50');

      const [anomRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/admin/anomalies?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/admin/anomalies/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (anomRes.ok) {
        const data = await anomRes.json();
        setAnomalies(data.anomalies || []);
        setTotalAnomalies(data.total || 0);
      }
      if (statsRes.ok) {
        const data = await statsRes.json();
        setAnomalyStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch anomalies:', err);
    } finally {
      if (!silent) setLoadingAnomalies(false);
    }
  };

  return {
    lshStats,
    loadingLsh,
    backfillingLsh,
    lshSuccessMsg,
    fetchLshStats,
    handleLshBackfill,
    auditLogs,
    auditTotal,
    auditStats,
    loadingAudit,
    auditSeverity,
    setAuditSeverity,
    auditEventType,
    setAuditEventType,
    auditUserFilter,
    setAuditUserFilter,
    fetchAuditLogs,
    anomalies,
    totalAnomalies,
    anomalyStats,
    loadingAnomalies,
    anomalySeverity,
    setAnomalySeverity,
    anomalyStatus,
    setStatusFilter: setAnomalyStatus,
    anomalyType,
    setTypeFilter: setAnomalyType,
    anomalyUserFilter,
    setUserFilter: setAnomalyUserFilter,
    fetchAnomalies,
  };
}
