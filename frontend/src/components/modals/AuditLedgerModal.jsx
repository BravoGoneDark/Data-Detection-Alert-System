import React, { useState, useEffect } from 'react';

export default function AuditLedgerModal({
  isOpen,
  onClose,
  auditLogs,
  logs,
  auditTotal,
  totalLogs,
  auditStats,
  stats,
  loadingAudit,
  loading,
  auditSeverity,
  setAuditSeverity,
  auditEventType,
  setAuditEventType,
  auditUserFilter,
  setAuditUserFilter,
  onRefresh,
}) {
  const [localSearch, setLocalSearch] = useState(auditUserFilter || '');

  // Keep localSearch in sync if parent filter changes
  useEffect(() => {
    setLocalSearch(auditUserFilter || '');
  }, [auditUserFilter]);

  // Debounce audit username filter
  useEffect(() => {
    if (!isOpen) return;
    const handler = setTimeout(() => {
      if (typeof setAuditUserFilter === 'function' && localSearch !== auditUserFilter) {
        setAuditUserFilter(localSearch);
      }
    }, 250);
    return () => clearTimeout(handler);
  }, [localSearch, setAuditUserFilter, isOpen, auditUserFilter]);

  if (!isOpen) return null;

  const logsList = auditLogs || logs || [];
  const statistics = auditStats || stats || {};
  const total = auditTotal ?? totalLogs ?? 0;
  const isLoading = loadingAudit ?? loading ?? false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-rose-800/60 rounded-2xl max-w-5xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-950/80 border border-rose-700/60 text-rose-400 text-lg shadow-[0_0_15px_rgba(244,63,94,0.2)]">
              🛡️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white text-base">Security Audit Ledger & Compliance Telemetry</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950/80 text-rose-300 border border-rose-700/60">
                  IMMUTABLE LEDGER
                </span>
              </div>
              <p className="text-[11px] text-slate-400">PostgreSQL security audit trail tracking RBAC, clearance violations, and operations</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={loadingAudit}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1"
            >
              <span>🔄</span> {loadingAudit ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-sm p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Security Telemetry Overview Chips */}
        {statistics && (
          <div className="space-y-3 flex-shrink-0">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] text-slate-400 block uppercase font-mono">Total Recorded Events</span>
                <span className="text-lg font-mono font-bold text-white">
                  {statistics.total_events?.toLocaleString() || 0}
                </span>
              </div>
              <div className="bg-rose-950/40 border border-rose-800/50 rounded-xl p-3">
                <span className="text-[10px] text-rose-400 block uppercase font-mono font-bold">Critical Breaches</span>
                <span className="text-lg font-mono font-bold text-rose-300">
                  {statistics.severity_breakdown?.CRITICAL || 0}
                </span>
              </div>
              <div className="bg-amber-950/40 border border-amber-800/50 rounded-xl p-3">
                <span className="text-[10px] text-amber-400 block uppercase font-mono font-bold">Warnings / Duplicates</span>
                <span className="text-lg font-mono font-bold text-amber-300">
                  {statistics.severity_breakdown?.WARNING || 0}
                </span>
              </div>
              <div className="bg-cyan-950/40 border border-cyan-800/50 rounded-xl p-3">
                <span className="text-[10px] text-cyan-400 block uppercase font-mono font-bold">Legitimate Ops</span>
                <span className="text-lg font-mono font-bold text-cyan-300">
                  {statistics.severity_breakdown?.INFO || 0}
                </span>
              </div>
            </div>

            {/* Top Access Violators Alert Bar */}
            {statistics.top_denied_users && statistics.top_denied_users.length > 0 && (
              <div className="bg-rose-950/30 border border-rose-800/40 rounded-xl p-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-rose-300">
                  <span className="text-sm">⚠️</span>
                  <span className="font-semibold text-[11px]">Top Clearance Violators:</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {statistics.top_denied_users.map((v, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-rose-900/60 border border-rose-700/60 text-rose-200 text-[10px] font-mono">
                      {v.username}: <strong className="text-white">{v.violations_count} blocked</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex-shrink-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={auditSeverity}
              onChange={(e) => setAuditSeverity(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-rose-500 font-mono"
            >
              <option value="">All Severities</option>
              <option value="CRITICAL">🔴 CRITICAL</option>
              <option value="WARNING">🟡 WARNING</option>
              <option value="INFO">🟢 INFO</option>
            </select>

            <select
              value={auditEventType}
              onChange={(e) => setAuditEventType(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-rose-500 font-mono"
            >
              <option value="">All Event Types</option>
              <option value="ACCESS_DENIED">ACCESS_DENIED</option>
              <option value="USER_QUARANTINED">USER_QUARANTINED</option>
              <option value="QUARANTINE_RELEASED">QUARANTINE_RELEASED</option>
              <option value="USER_ROLE_CHANGED">USER_ROLE_CHANGED</option>
              <option value="DATASET_UPLOAD">DATASET_UPLOAD</option>
              <option value="DUPLICATE_DETECTED">DUPLICATE_DETECTED</option>
              <option value="DATASET_DOWNLOAD">DATASET_DOWNLOAD</option>
            </select>

            <input
              type="text"
              placeholder="Filter by username..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-rose-500 font-mono w-40"
            />
          </div>

          <span className="text-[11px] text-slate-400 font-mono">
            Showing <strong className="text-white">{logsList.length}</strong> of <strong className="text-white">{total}</strong> logs
          </span>
        </div>

        {/* Audit Logs Table with Persistent Height (Zero Bouncing) */}
        <div className="flex-1 overflow-y-auto border border-slate-800 rounded-xl bg-slate-950/80 min-h-[260px] relative">
          {isLoading && (
            <div className="absolute top-0 inset-x-0 h-1 bg-rose-500/80 animate-pulse z-10" />
          )}

          {!isLoading && logsList.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-500 text-xs font-mono">
              No security audit logs found matching criteria.
            </div>
          ) : (
            <table className={`w-full text-left text-xs border-collapse font-mono transition-opacity duration-200 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
              <thead className="bg-slate-900/90 text-slate-400 text-[10px] uppercase sticky top-0 border-b border-slate-800 z-10">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Event Type</th>
                  <th className="py-2.5 px-3">User</th>
                  <th className="py-2.5 px-3">Classification</th>
                  <th className="py-2.5 px-3">IP / Client</th>
                  <th className="py-2.5 px-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {logsList.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-2 px-3 text-[10px] text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                        log.severity === 'CRITICAL'
                          ? 'bg-rose-950/90 text-rose-300 border-rose-600/70 shadow-[0_0_8px_rgba(244,63,94,0.4)]'
                          : log.severity === 'WARNING'
                          ? 'bg-amber-950/80 text-amber-300 border-amber-600/60'
                          : 'bg-cyan-950/80 text-cyan-300 border-cyan-700/50'
                      }`}>
                        {log.severity}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-[11px] font-bold text-slate-200 whitespace-nowrap">
                      {log.event_type}
                    </td>
                    <td className="py-2 px-3 text-[11px] text-slate-300 whitespace-nowrap">
                      {log.username || <span className="text-slate-500 italic">anonymous</span>}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      {log.classification ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-900 border border-slate-700 text-slate-300">
                          {log.classification}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-[10px] text-slate-400 whitespace-nowrap">
                      {log.ip_address || '127.0.0.1'}
                    </td>
                    <td className="py-2 px-3 text-[10px] text-slate-400 max-w-xs truncate" title={log.action_details || ''}>
                      {log.action_details ? (
                        <code className="text-slate-300 bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-800 text-[10px]">
                          {log.action_details}
                        </code>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-800 flex-shrink-0">
          <span className="text-[11px] text-slate-400">
            Audit events are cryptographically recorded and persisted to PostgreSQL table <code className="text-rose-300 font-mono">audit_logs</code>.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
