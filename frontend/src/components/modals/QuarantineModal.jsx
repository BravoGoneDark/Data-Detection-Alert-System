// frontend/src/components/modals/QuarantineModal.jsx
import React, { useState, useEffect } from 'react';

export default function QuarantineModal({
  isOpen,
  onClose,
  records,
  total,
  stats,
  loading,
  statusFilter,
  setStatusFilter,
  userFilter,
  setUserFilter,
  onRefresh,
  onRelease,
  onManualQuarantine,
  isAdmin = false,
}) {
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualUser, setManualUser] = useState('');
  const [manualReason, setManualReason] = useState('');
  const [manualRisk, setManualRisk] = useState('85.0');
  const [manualError, setManualError] = useState(null);

  // Release note modal
  const [releasingRecord, setReleasingRecord] = useState(null);
  const [releaseNotes, setReleaseNotes] = useState('');
  const [releaseError, setReleaseError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [localSearch, setLocalSearch] = useState(userFilter || '');

  // Keep localSearch in sync if parent filter changes
  useEffect(() => {
    setLocalSearch(userFilter || '');
  }, [userFilter]);

  // Debounce search input by 250ms to prevent rapid re-queries and layout bouncing
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

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualUser.trim() || !manualReason.trim()) return;
    setActionLoading(true);
    setManualError(null);
    const res = await onManualQuarantine(manualUser.trim(), manualReason.trim(), manualRisk);
    setActionLoading(false);
    if (res?.success) {
      setShowManualModal(false);
      setManualUser('');
      setManualReason('');
      setManualError(null);
    } else {
      setManualError(res?.error || 'Failed to quarantine user');
    }
  };

  const handleReleaseSubmit = async (e) => {
    e.preventDefault();
    if (!releasingRecord) return;
    setActionLoading(true);
    setReleaseError(null);
    const res = await onRelease(releasingRecord.id, releaseNotes.trim() || 'Cleared by admin');
    setActionLoading(false);
    if (res?.success) {
      setReleasingRecord(null);
      setReleaseNotes('');
      setReleaseError(null);
    } else {
      setReleaseError(res?.error || 'Failed to release quarantine');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-5xl rounded-2xl border border-rose-500/40 bg-slate-950 p-6 shadow-2xl max-h-[90vh] flex flex-col text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-950/80 border border-rose-700/60 text-rose-400 text-xl">
              🛡️
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-white tracking-wide">
                  Policy Quarantine & Incident Containment
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full border border-rose-500/40 bg-rose-950/60 text-rose-300 font-mono">
                  Autonomous Containment Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time isolation of high-risk threat actors and administrative privilege restoration
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setManualError(null);
              setReleaseError(null);
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Telemetry Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[11px] text-slate-400 uppercase font-mono">Active Containments</span>
            <div className="text-xl font-bold text-rose-400 mt-0.5 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
              {stats?.active_quarantines ?? 0}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[11px] text-slate-400 uppercase font-mono">All-Time Isolations</span>
            <div className="text-xl font-bold text-white mt-0.5">
              {stats?.total_quarantined_all_time ?? 0}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[11px] text-slate-400 uppercase font-mono">Released Clearances</span>
            <div className="text-xl font-bold text-emerald-400 mt-0.5">
              {stats?.status_breakdown?.RELEASED ?? 0}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-end">
            {isAdmin ? (
              <button
                onClick={() => {
                  setManualError(null);
                  setManualUser('');
                  setManualReason('');
                  setShowManualModal(true);
                }}
                className="w-full py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors shadow-[0_0_12px_rgba(244,63,94,0.4)] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>⚡</span> Manual Quarantine
              </button>
            ) : (
              <span className="text-[11px] text-slate-500 font-mono text-center w-full">
                🔒 Read-Only Monitoring
              </span>
            )}
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Search by username..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 w-48 font-mono"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 focus:outline-none focus:border-rose-500"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">ACTIVE Only</option>
              <option value="RELEASED">RELEASED Only</option>
            </select>
          </div>
          <button
            onClick={onRefresh}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1"
          >
            <span>🔄</span> Refresh Feeds
          </button>
        </div>

        {/* Quarantine Records Table with Persistent Height (Zero Bouncing) */}
        <div className="flex-1 overflow-y-auto min-h-[260px] border border-slate-800/80 rounded-xl bg-slate-900/40 relative">
          {loading && (
            <div className="absolute top-0 inset-x-0 h-1 bg-rose-500/80 animate-pulse z-10" />
          )}

          {!loading && records.length === 0 ? (
            <div className="py-20 text-center text-sm text-slate-500 font-mono">
              No quarantine containment records found matching "{localSearch}".
            </div>
          ) : (
            <table className={`w-full text-left text-xs border-collapse transition-opacity duration-200 ${loading ? 'opacity-50' : 'opacity-100'}`}>
              <thead className="sticky top-0 bg-slate-900/95 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px] z-10">
                <tr>
                  <th className="py-2.5 px-3">Subject / IP</th>
                  <th className="py-2.5 px-3">Containment Reason</th>
                  <th className="py-2.5 px-3">Risk Score</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Quarantined At</th>
                  <th className="py-2.5 px-3">Resolution / Notes</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-white font-mono">{rec.username}</div>
                      <div className="text-[10px] text-slate-400">{rec.ip_address || 'Internal Session'}</div>
                    </td>
                    <td className="py-3 px-3 max-w-xs truncate text-slate-300" title={rec.reason}>
                      {rec.reason}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold">
                      <span className={`px-2 py-0.5 rounded text-[11px] ${rec.risk_score >= 80 ? 'bg-rose-950/80 text-rose-300 border border-rose-700/60' : 'bg-amber-950/80 text-amber-300 border border-amber-700/60'
                        }`}>
                        {rec.risk_score}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {rec.status === 'ACTIVE' ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                          ACTIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                          ✓ RELEASED
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                      {rec.quarantined_at ? new Date(rec.quarantined_at).toLocaleString() : '—'}
                    </td>
                    <td className="py-3 px-3 text-slate-400 max-w-xs truncate">
                      {rec.status === 'RELEASED' ? (
                        <div>
                          <span className="text-emerald-400 font-medium font-mono">{rec.released_by}:</span> {rec.release_notes || 'Cleared'}
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Under Active Containment</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {rec.status === 'ACTIVE' && (
                        isAdmin ? (
                          <button
                            onClick={() => {
                              setReleaseError(null);
                              setReleasingRecord(rec);
                              setReleaseNotes('');
                            }}
                            className="px-2.5 py-1 rounded bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/60 text-xs font-semibold transition-colors shadow-sm cursor-pointer"
                          >
                            Release Clearance
                          </button>
                        ) : (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-500 font-semibold">
                            🔒 Admin Only
                          </span>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal: Manual Quarantine Dialog */}
        {showManualModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl border border-rose-600 bg-slate-950 p-5 shadow-2xl">
              <h3 className="text-base font-bold text-white mb-1">Manual Account Quarantine</h3>
              <p className="text-xs text-slate-400 mb-4">
                Immediately enforce isolation containment and block downloads for target account.
              </p>
              {manualError && (
                <div className="mb-3 p-2.5 rounded bg-rose-950/80 border border-rose-700 text-xs text-rose-300">
                  {manualError}
                </div>
              )}
              <form onSubmit={handleManualSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Target Username</label>
                  <input
                    type="text"
                    required
                    value={manualUser}
                    onChange={(e) => setManualUser(e.target.value)}
                    placeholder="e.g. analyst_john"
                    className="w-full text-xs px-3 py-2 rounded bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Containment Reason</label>
                  <textarea
                    required
                    rows={2}
                    value={manualReason}
                    onChange={(e) => setManualReason(e.target.value)}
                    placeholder="e.g. Suspicious concurrent downloads detected outside normal pattern"
                    className="w-full text-xs px-3 py-2 rounded bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Assigned Risk Score</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={manualRisk}
                    onChange={(e) => setManualRisk(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setManualError(null);
                      setShowManualModal(false);
                    }}
                    className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-4 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors"
                  >
                    {actionLoading ? 'Applying...' : 'Enforce Quarantine'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Release Quarantine Dialog */}
        {releasingRecord && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl border border-emerald-600 bg-slate-950 p-5 shadow-2xl">
              <h3 className="text-base font-bold text-white mb-1">Release Account Clearance</h3>
              <p className="text-xs text-slate-400 mb-4">
                Lifting quarantine for <span className="text-emerald-400 font-mono font-bold">{releasingRecord.username}</span> will restore download and system privileges.
              </p>
              {releaseError && (
                <div className="mb-3 p-2.5 rounded bg-rose-950/80 border border-rose-700 text-xs text-rose-300">
                  {releaseError}
                </div>
              )}
              <form onSubmit={handleReleaseSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Administrative Release Notes</label>
                  <textarea
                    required
                    rows={3}
                    value={releaseNotes}
                    onChange={(e) => setReleaseNotes(e.target.value)}
                    placeholder="e.g. Identity verified with manager approval. False positive verified."
                    className="w-full text-xs px-3 py-2 rounded bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReleaseError(null);
                      setReleasingRecord(null);
                    }}
                    className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
                  >
                    {actionLoading ? 'Releasing...' : 'Approve & Release'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
