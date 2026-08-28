// frontend/src/hooks/useQuarantineFeeds.js
import { useState, useRef, useEffect } from 'react';
import { API_URL } from '../constants/classifications';

export function useQuarantineFeeds(token) {
  const [quarantineRecords, setQuarantineRecords] = useState([]);
  const [quarantineTotal, setQuarantineTotal] = useState(0);
  const [quarantineStats, setQuarantineStats] = useState(null);
  const [loadingQuarantine, setLoadingQuarantine] = useState(false);
  const [quarantineStatusFilter, setQuarantineStatusFilter] = useState('');
  const [quarantineUserFilter, setQuarantineUserFilter] = useState('');

  // Keep persistent refs to prevent stale closure wiping when background sync runs
  const statusFilterRef = useRef(quarantineStatusFilter);
  const userFilterRef = useRef(quarantineUserFilter);
  const tokenRef = useRef(token);

  useEffect(() => {
    statusFilterRef.current = quarantineStatusFilter;
  }, [quarantineStatusFilter]);

  useEffect(() => {
    userFilterRef.current = quarantineUserFilter;
  }, [quarantineUserFilter]);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  // Current logged in user quarantine state
  const [myQuarantine, setMyQuarantine] = useState({ is_quarantined: false, record: null });

  // Webhooks State
  const [webhooks, setWebhooks] = useState([]);
  const [loadingWebhooks, setLoadingWebhooks] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const fetchMyQuarantineStatus = async () => {
    const currentToken = tokenRef.current || token;
    if (!currentToken) return;
    try {
      const res = await fetch(`${API_URL}/quarantine/status`, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMyQuarantine(data);
      }
    } catch (err) {
      console.error('Failed to fetch user quarantine status:', err);
    }
  };

  const fetchQuarantines = async (silent = false) => {
    const currentToken = tokenRef.current || token;
    if (!currentToken) return;
    if (!silent) setLoadingQuarantine(true);
    try {
      const params = new URLSearchParams();
      const currentStatus = statusFilterRef.current;
      const currentUsername = userFilterRef.current;
      if (currentStatus) params.append('status', currentStatus);
      if (currentUsername) params.append('username', currentUsername);
      params.append('limit', '50');

      const [listRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/admin/quarantine?${params.toString()}`, {
          headers: { Authorization: `Bearer ${currentToken}` },
        }),
        fetch(`${API_URL}/admin/quarantine/stats`, {
          headers: { Authorization: `Bearer ${currentToken}` },
        }),
      ]);

      if (listRes.ok) {
        const listData = await listRes.json();
        setQuarantineRecords(listData.records || []);
        setQuarantineTotal(listData.total || 0);
      }
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setQuarantineStats(statsData);
      }
    } catch (err) {
      console.error('Failed to fetch quarantine records:', err);
    } finally {
      if (!silent) setLoadingQuarantine(false);
    }
  };

  const manualQuarantine = async (username, reason, riskScore = 85.0) => {
    if (!token) return { success: false, error: 'Unauthorized' };
    try {
      const res = await fetch(`${API_URL}/admin/quarantine`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: jsonToStringSafe({
          username,
          reason,
          risk_score: parseFloat(riskScore) || 85.0,
        }),
      });
      if (res.ok) {
        await fetchQuarantines();
        await fetchMyQuarantineStatus();
        return { success: true };
      } else {
        const errData = await res.json();
        return { success: false, error: errData.detail || 'Manual quarantine failed' };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const releaseQuarantine = async (recordId, releaseNotes) => {
    if (!token) return { success: false, error: 'Unauthorized' };
    try {
      const res = await fetch(`${API_URL}/admin/quarantine/${recordId}/release`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: jsonToStringSafe({ release_notes: releaseNotes || 'Cleared by security admin' }),
      });
      if (res.ok) {
        await fetchQuarantines();
        await fetchMyQuarantineStatus();
        return { success: true };
      } else {
        const errData = await res.json();
        return { success: false, error: errData.detail || 'Release failed' };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const fetchWebhooks = async () => {
    if (!token) return;
    setLoadingWebhooks(true);
    try {
      const res = await fetch(`${API_URL}/admin/webhooks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setWebhooks(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch webhooks:', err);
    } finally {
      setLoadingWebhooks(false);
    }
  };

  const createWebhook = async (name, url, secretToken, eventTypes = ['ALL']) => {
    if (!token) return { success: false, error: 'Unauthorized' };
    try {
      const res = await fetch(`${API_URL}/admin/webhooks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: jsonToStringSafe({
          name,
          url,
          secret_token: secretToken || null,
          event_types: eventTypes,
        }),
      });
      if (res.ok) {
        await fetchWebhooks();
        return { success: true };
      } else {
        const errData = await res.json();
        return { success: false, error: errData.detail || 'Failed to create webhook' };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const deleteWebhook = async (webhookId) => {
    if (!token) return { success: false, error: 'Unauthorized' };
    try {
      const res = await fetch(`${API_URL}/admin/webhooks/${webhookId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await fetchWebhooks();
        return { success: true };
      } else {
        const errData = await res.json();
        return { success: false, error: errData.detail || 'Failed to delete webhook' };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const testWebhook = async (webhookId) => {
    if (!token) return;
    setTestResult({ webhookId, loading: true });
    try {
      const res = await fetch(`${API_URL}/admin/webhooks/${webhookId}/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setTestResult({ webhookId, loading: false, ...data });
    } catch (err) {
      setTestResult({ webhookId, loading: false, success: false, error: err.message });
    }
  };

  return {
    quarantineRecords,
    quarantineTotal,
    quarantineStats,
    loadingQuarantine,
    quarantineStatusFilter,
    setQuarantineStatusFilter,
    quarantineUserFilter,
    setQuarantineUserFilter,
    myQuarantine,
    fetchMyQuarantineStatus,
    fetchQuarantines,
    manualQuarantine,
    releaseQuarantine,
    webhooks,
    loadingWebhooks,
    testResult,
    fetchWebhooks,
    createWebhook,
    deleteWebhook,
    testWebhook,
  };
}

function jsonToStringSafe(obj) {
  try {
    return JSON.stringify(obj);
  } catch {
    return '{}';
  }
}
