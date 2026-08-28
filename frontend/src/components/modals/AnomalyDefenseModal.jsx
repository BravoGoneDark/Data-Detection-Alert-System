// frontend/src/components/modals/AnomalyDefenseModal.jsx
import React, { useState, useEffect } from 'react';
import { API_URL } from '../../constants/classifications';

export default function AnomalyDefenseModal({
  isOpen,
  onClose,
  anomalies,
  totalAnomalies,
  anomalyStats,
  loadingAnomalies,
  severityFilter,
  setSeverityFilter,
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
  userFilter,
  setUserFilter,
  onRefresh,
  token,
}) {
  const [resolvingId, setResolvingId] = useState(null);
  const [resolutionSuccess, setResolutionSuccess] = useState(null);
  const [localSearch, setLocalSearch] = useState(userFilter || '');

  // Keep localSearch in sync if parent filter changes
  useEffect(() => {
    setLocalSearch(userFilter || '');
  }, [userFilter]);

  // Debounce username filter
  useEffect(() => {
    if (!isOpen) return;
    const handler = setTimeout(() => {
      if (typeof setUserFilter === 'function' && localSearch !== userFilter) {
        setUserFilter(localSearch);
      }
    }, 250);
    return () => clearTimeout(handler);
  }, [localSearch, setUserFilter, isOpen, userFilter]);

  if (!isOpen) return null;

  const handleResolve = async (anomalyId, newStatus) => {
    if (!token) return;
    setResolvingId(anomalyId);
    setResolutionSuccess(null);
    try {
      const res = await fetch(`${API_URL}/admin/anomalies/${anomalyId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: newStatus,
          notes: `Analyst updated status to ${newStatus} via Security Dashboard`,
        }),
      });
      if (res.ok) {
        setResolutionSuccess(`Incident #${anomalyId} marked as ${newStatus}`);
        onRefresh();
        setTimeout(() => setResolutionSuccess(null), 4000);
      }
    } catch (err) {
      console.error('Failed to resolve anomaly:', err);
    } finally {
      setResolvingId(null);
    }
  };

  const getSeverityBadge = (sev) => {
    const s = (sev || 'LOW').toUpperCase();
    if (s === 'CRITICAL') return 'bg-rose-950/80 text-rose-300 border-rose-600/80 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.4)]';
    if (s === 'HIGH') return 'bg-orange-950/80 text-orange-300 border-orange-600/80';
    if (s === 'MEDIUM') return 'bg-amber-950/80 text-amber-300 border-amber-600/80';
    return 'bg-blue-950/80 text-blue-300 border-blue-600/80';
  };

  const getStatusBadge = (st) => {
    const s = (st || 'ACTIVE').toUpperCase();
    if (s === 'ACTIVE') return 'bg-rose-900/40 text-rose-300 border-rose-500/50';
    if (s === 'INVESTIGATING') return 'bg-amber-900/40 text-amber-300 border-amber-500/50';
    if (s === 'RESOLVED') return 'bg-emerald-900/40 text-emerald-300 border-emerald-500/50';
    return 'bg-slate-800 text-slate-400 border-slate-700';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-slate-900/95 border border-amber-500/30 rounded-2xl max-w-6xl w-full max-h-[90vh] flex flex-col shadow-[0_0_50px_rgba(245,158,11,0.15)] overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-lg">
              ⚡
            </span>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-white tracking-wide">
                  Behavioral Anomaly Defense Watchdog
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full border border-amber-500/50 bg-amber-950/50 text-amber-300 font-mono">
                  Stage 11: Z-Score & Burst Analytics
                </span>
                {anomalyStats?.active_threats > 0 && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/50 animate-pulse font-medium">
                    {anomalyStats.active_threats} Active Threat{anomalyStats.active_threats > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time statistical outlier detection, sliding-window burst tracking & user risk profiling
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Telemetry Metrics Bar */}
        {anomalyStats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 bg-slate-950/40 border-b border-slate-800/80">
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-mono">Total Recorded</span>
              <span className="text-xl font-bold text-white mt-1 block font-mono">{anomalyStats.total_anomalies}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-800/40">
              <span className="text-[11px] text-rose-400 uppercase tracking-wider block font-mono">Active Threats</span>
              <span className="text-xl font-bold text-rose-300 mt-1 block font-mono">{anomalyStats.active_threats}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-orange-950/30 border border-orange-800/40">
              <span className="text-[11px] text-orange-400 uppercase tracking-wider block font-mono">Critical / High</span>
              <span className="text-xl font-bold text-orange-300 mt-1 block font-mono">
                {(anomalyStats.severity_breakdown?.CRITICAL || 0) + (anomalyStats.severity_breakdown?.HIGH || 0)}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40">
              <span className="text-[11px] text-emerald-400 uppercase tracking-wider block font-mono">Resolved Incidents</span>
              <span className="text-xl font-bold text-emerald-300 mt-1 block font-mono">
                {anomalyStats.status_breakdown?.RESOLVED || 0}
              </span>
            </div>
          </div>
        )}

        {/* High Risk Watchlist Banner */}
        {anomalyStats?.highest_risk_users?.length > 0 && (
          <div className="p-4 bg-amber-950/20 border-b border-amber-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-semibold text-xs uppercase tracking-wider flex items-center gap-1.5 font-mono">
                ⚠ Security Watchlist (Top Risk Users):
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {anomalyStats.highest_risk_users.map((u, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900/80 border border-amber-500/40 text-xs text-slate-200">
                  <span className="font-semibold text-amber-300">{u.username}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 font-mono">Risk: {u.cumulative_risk}</span>
                  <span className="text-[10px] text-slate-400">({u.incident_count} events)</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Alert Banner */}
        {resolutionSuccess && (
          <div className="p-3 bg-emerald-950/60 border-b border-emerald-700/60 text-emerald-300 text-xs flex items-center justify-between">
            <span>✓ {resolutionSuccess}</span>
            <button onClick={() => setResolutionSuccess(null)} className="text-emerald-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Filters Toolbar */}
        <div className="p-4 bg-slate-900/50 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-amber-500"
            >
              <option value="">All Severities</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-amber-500"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INVESTIGATING">INVESTIGATING</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="FALSE_POSITIVE">FALSE POSITIVE</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-amber-500"
            >
              <option value="">All Anomaly Types</option>
              <option value="BURST_EXFILTRATION">BURST EXFILTRATION</option>
              <option value="Z_SCORE_SPIKE">Z-SCORE SPIKE</option>
              <option value="OFF_HOURS_ACCESS">OFF-HOURS ACCESS</option>
              <option value="CLASSIFICATION_DRIFT">CLASSIFICATION DRIFT</option>
            </select>

            <input
              type="text"
              placeholder="Filter by username..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-xs rounded-lg px-3 py-1.5 text-slate-300 placeholder-slate-500 focus:outline-none focus:border-amber-500 w-40 font-mono"
            />
          </div>

          <button
            onClick={onRefresh}
            disabled={loadingAnomalies}
            className="text-xs px-3 py-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-700/60 transition-colors flex items-center gap-1 font-medium"
          >
            <span>🔄</span> Refresh Feed
          </button>
        </div>

        {/* Anomaly Records Table with Persistent Height (Zero Bouncing) */}
        <div className="flex-1 overflow-y-auto min-h-[260px] p-4 relative">
          {loadingAnomalies && (
            <div className="absolute top-0 inset-x-4 h-1 bg-amber-500/80 animate-pulse z-10" />
          )}

          {!loadingAnomalies && anomalies.length === 0 ? (
            <div className="py-20 text-center text-slate-500 text-sm font-mono">
              No anomaly events found matching "{localSearch}".
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className={`w-full text-left text-xs text-slate-300 border-collapse transition-opacity duration-200 ${loadingAnomalies ? 'opacity-50' : 'opacity-100'}`}>
                <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 font-mono">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">User</th>
                    <th className="p-3">Anomaly Type</th>
                    <th className="p-3">Severity</th>
                    <th className="p-3">Z-Score / Risk</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {anomalies.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 font-mono text-slate-400 whitespace-nowrap">
                        {new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="p-3 font-semibold text-white">
                        {a.username}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-mono border border-slate-700 bg-slate-800/80 text-amber-200">
                          {a.anomaly_type}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono border font-semibold ${getSeverityBadge(a.severity)}`}>
                          {a.severity}
                        </span>
                      </td>
                      <td className="p-3 font-mono">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-200 font-semibold">{a.risk_score}</span>
                          {a.z_score !== null && a.z_score !== undefined && (
                            <span className="text-[10px] text-slate-400">(Z={a.z_score})</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono border ${getStatusBadge(a.status)}`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {a.status === 'ACTIVE' && (
                            <button
                              disabled={resolvingId === a.id}
                              onClick={() => handleResolve(a.id, 'INVESTIGATING')}
                              className="px-2 py-1 rounded bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-700/60 text-[10px] transition-colors"
                            >
                              Investigate
                            </button>
                          )}
                          {a.status !== 'RESOLVED' && (
                            <button
                              disabled={resolvingId === a.id}
                              onClick={() => handleResolve(a.id, 'RESOLVED')}
                              className="px-2 py-1 rounded bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-700/60 text-[10px] transition-colors"
                            >
                              Resolve
                            </button>
                          )}
                          {a.status !== 'FALSE_POSITIVE' && a.status !== 'RESOLVED' && (
                            <button
                              disabled={resolvingId === a.id}
                              onClick={() => handleResolve(a.id, 'FALSE_POSITIVE')}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 text-[10px] transition-colors"
                            >
                              False Pos
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span>Showing {anomalies.length} of {totalAnomalies} recorded anomaly events</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            Close Defense Center
          </button>
        </div>

      </div>
    </div>
  );
}
