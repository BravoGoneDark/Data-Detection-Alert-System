// frontend/src/components/modals/WebhookConfigModal.jsx
import React, { useState } from 'react';

const EVENT_OPTIONS = [
  { key: 'ALL', label: 'All Security Threat Events' },
  { key: 'QUARANTINE_TRIGGERED', label: 'Quarantine Triggered (Critical)' },
  { key: 'QUARANTINE_RELEASED', label: 'Quarantine Released (Info)' },
  { key: 'CRITICAL_ANOMALY', label: 'Critical Anomaly Detections' },
  { key: 'TEST_PING', label: 'Test Ping Signals' },
];

export default function WebhookConfigModal({
  isOpen,
  onClose,
  webhooks,
  loading,
  testResult,
  onRefresh,
  onCreate,
  onDelete,
  onTest,
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [secretToken, setSecretToken] = useState('');
  const [selectedEvents, setSelectedEvents] = useState(['ALL']);
  const [actionError, setActionError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const toggleEvent = (key) => {
    if (key === 'ALL') {
      setSelectedEvents(['ALL']);
      return;
    }
    const filtered = selectedEvents.filter((k) => k !== 'ALL');
    if (filtered.includes(key)) {
      const next = filtered.filter((k) => k !== key);
      setSelectedEvents(next.length ? next : ['ALL']);
    } else {
      setSelectedEvents([...filtered, key]);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;
    setSubmitting(true);
    setActionError(null);
    const res = await onCreate(name.trim(), url.trim(), secretToken.trim() || null, selectedEvents);
    setSubmitting(false);
    if (res?.success) {
      setShowAddForm(false);
      setName('');
      setUrl('');
      setSecretToken('');
      setSelectedEvents(['ALL']);
    } else {
      setActionError(res?.error || 'Failed to register webhook');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-4xl rounded-2xl border border-indigo-500/40 bg-slate-950 p-6 shadow-2xl max-h-[90vh] flex flex-col text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-950/80 border border-indigo-700/60 text-indigo-400 text-xl">
              📡
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-white tracking-wide">
                  Outbound Security Webhooks & SOC Alerting
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full border border-indigo-500/40 bg-indigo-950/60 text-indigo-300 font-mono">
                  HMAC Signed Payloads
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Broadcast real-time cryptographic threat events to SIEM, Slack, Discord, and SOC endpoints
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Action Header */}
        <div className="flex items-center justify-between py-3.5 border-b border-slate-800/80">
          <div className="text-xs text-slate-400 font-mono">
            Configured Channels: <span className="text-white font-bold">{webhooks.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              🔄 Refresh
            </button>
            <button
              onClick={() => {
                setShowAddForm(true);
                setActionError(null);
              }}
              className="text-xs px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors shadow-[0_0_10px_rgba(99,102,241,0.4)] flex items-center gap-1"
            >
              <span>+</span> Register New Webhook
            </button>
          </div>
        </div>

        {/* Webhooks List */}
        <div className="flex-1 overflow-y-auto min-h-0 py-3 space-y-3">
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400 animate-pulse">
              Scanning active webhook endpoints...
            </div>
          ) : webhooks.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              No outbound webhooks registered yet. Add a destination to receive real-time security alerts.
            </div>
          ) : (
            webhooks.map((wh) => {
              const isTesting = testResult?.webhookId === wh.id && testResult?.loading;
              const hasTested = testResult?.webhookId === wh.id && !testResult?.loading;

              return (
                <div
                  key={wh.id}
                  className="p-4 rounded-xl border border-slate-800/90 bg-slate-900/60 hover:border-slate-700/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <h4 className="text-sm font-bold text-white tracking-wide">{wh.name}</h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-950/80 border border-indigo-700/60 text-indigo-300">
                        ID #{wh.id}
                      </span>
                      {wh.is_active ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          ACTIVE
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-bold">PAUSED</span>
                      )}
                    </div>
                    <div className="text-xs font-mono text-slate-300 truncate" title={wh.url}>
                      {wh.url}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-400 uppercase font-mono">Events:</span>
                      {wh.event_types?.map((ev) => (
                        <span
                          key={ev}
                          className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-indigo-200"
                        >
                          {ev}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions & Status */}
                  <div className="flex flex-col sm:items-end gap-2 shrink-0">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onTest(wh.id)}
                        disabled={isTesting}
                        className="px-3 py-1 rounded-lg bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 text-xs font-semibold transition-colors flex items-center gap-1"
                      >
                        <span>📡</span> {isTesting ? 'Pinging...' : 'Test Ping'}
                      </button>
                      <button
                        onClick={() => onDelete(wh.id)}
                        className="px-2.5 py-1 rounded-lg bg-rose-950/50 hover:bg-rose-900/70 border border-rose-800/60 text-rose-300 text-xs transition-colors"
                        title="Delete Webhook"
                      >
                        🗑️
                      </button>
                    </div>

                    {hasTested && (
                      <div
                        className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                          testResult.success
                            ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                            : 'bg-rose-950/80 border-rose-700 text-rose-300'
                        }`}
                      >
                        {testResult.success
                          ? `✓ 200 OK (${testResult.latency_ms}ms)`
                          : `✕ Failed (${testResult.error || 'Timeout'})`}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal: Add Webhook Form */}
        {showAddForm && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-xl border border-indigo-500 bg-slate-950 p-5 shadow-2xl">
              <h3 className="text-base font-bold text-white mb-1">Register New Security Webhook</h3>
              <p className="text-xs text-slate-400 mb-4">
                Configure destination URL and optional HMAC SHA-256 secret token.
              </p>
              {actionError && (
                <div className="mb-3 p-2.5 rounded bg-rose-950/80 border border-rose-700 text-xs text-rose-300">
                  {actionError}
                </div>
              )}
              <form onSubmit={handleCreateSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Webhook Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Primary SOC Discord / SIEM Alert Channel"
                    className="w-full text-xs px-3 py-2 rounded bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-300">Endpoint POST URL</label>
                    <button
                      type="button"
                      onClick={() => setUrl('http://127.0.0.1:8000/admin/webhooks/echo')}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-mono underline"
                    >
                      ⚡ Use Local Echo Receiver
                    </button>
                  </div>
                  <input
                    type="url"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://your-soc-endpoint.io/webhook"
                    className="w-full text-xs px-3 py-2 rounded bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    HMAC Secret Key <span className="text-slate-500">(Optional for X-DDAS-Signature)</span>
                  </label>
                  <input
                    type="password"
                    value={secretToken}
                    onChange={(e) => setSecretToken(e.target.value)}
                    placeholder="Shared secret key..."
                    className="w-full text-xs px-3 py-2 rounded bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Subscribed Threat Events</label>
                  <div className="space-y-1.5">
                    {EVENT_OPTIONS.map((opt) => (
                      <label key={opt.key} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedEvents.includes(opt.key)}
                          onChange={() => toggleEvent(opt.key)}
                          className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors"
                  >
                    {submitting ? 'Registering...' : 'Register Webhook'}
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
