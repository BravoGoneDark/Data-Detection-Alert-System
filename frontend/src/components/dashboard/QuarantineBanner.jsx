// frontend/src/components/dashboard/QuarantineBanner.jsx
import React from 'react';

export default function QuarantineBanner({ myQuarantine }) {
  if (!myQuarantine?.is_quarantined || !myQuarantine?.record) {
    return null;
  }

  const { record } = myQuarantine;

  return (
    <div className="relative overflow-hidden rounded-xl border border-rose-500/60 bg-gradient-to-r from-rose-950/90 via-red-950/80 to-slate-900/90 p-4 sm:p-5 shadow-[0_0_25px_rgba(244,63,94,0.35)] animate-pulse mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-rose-600/30 border border-rose-500/60 text-rose-400 text-2xl">
            🔒
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-rose-200 tracking-wide uppercase font-mono">
                Active Account Quarantine Containment Policy
              </h3>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/30 text-rose-300 border border-rose-500/40">
                Risk Score: {record.risk_score}
              </span>
            </div>
            <p className="text-sm text-rose-300/90 mt-1 font-medium">
              <span className="text-white font-semibold">Reason:</span> {record.reason}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Quarantined At:{' '}
              {record.quarantined_at
                ? new Date(record.quarantined_at).toLocaleString()
                : 'Active'}
              {' | '}
              <span className="text-rose-400 font-medium">
                Download privileges revoked pending Administrator clearance.
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="px-3 py-1.5 rounded-lg bg-rose-900/60 border border-rose-500/40 text-rose-200 text-xs font-mono">
            STATUS: RESTRICTED
          </span>
        </div>
      </div>
    </div>
  );
}
