// frontend/src/components/modals/IngestionAnalysisModal.jsx
import React from 'react';
import { getClassificationBadge } from '../../constants/classifications';

export default function IngestionAnalysisModal({
  isOpen,
  onClose,
  result,
  onDownload,
  onForceUpload,
  loading = false,
}) {
  if (!isOpen || !result) return null;

  const isDuplicate = Boolean(result.duplicate);
  const existingMatch = result.existing || result.existing_dataset;
  const isExactMatch = result.match_type === 'EXACT';
  const isFuzzy = result.match_type === 'FUZZY_SIMILAR';
  const isContent = result.match_type === 'CONTENT_SIMILAR';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className={`relative w-full max-w-3xl rounded-3xl p-6 shadow-2xl backdrop-blur-2xl border ${
        isDuplicate
          ? isExactMatch
            ? 'bg-slate-950/95 border-amber-500/70 shadow-[0_0_50px_rgba(245,158,11,0.25)]'
            : isFuzzy
            ? 'bg-slate-950/95 border-rose-500/70 shadow-[0_0_50px_rgba(244,63,94,0.25)]'
            : 'bg-slate-950/95 border-fuchsia-500/70 shadow-[0_0_50px_rgba(217,70,239,0.25)]'
          : 'bg-slate-950/95 border-emerald-500/70 shadow-[0_0_50px_rgba(16,185,129,0.25)]'
      } space-y-5 max-h-[90vh] overflow-y-auto`}>
        
        {/* Top Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border ${
              isDuplicate
                ? isExactMatch
                  ? 'bg-amber-950/80 text-amber-300 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                  : 'bg-rose-950/80 text-rose-300 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
            }`}>
              {isDuplicate ? (isExactMatch ? '⚡' : '🧬') : '🛡️'}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg font-bold text-white tracking-wide">
                  {isDuplicate
                    ? (isExactMatch ? 'Exact Duplicate Blocked' : 'Near-Duplicate Detected')
                    : 'Dataset Ingestion & Forensic Verification'}
                </h3>
                {result.id && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-emerald-900/80 text-emerald-300 border border-emerald-600">
                    ID: #{result.id}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {isDuplicate
                  ? 'Cryptographic and Locality-Sensitive Hashing (LSH) collision identified'
                  : 'Committed to Content-Addressable Storage (CAS) with 0 collision.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider border ${
              isDuplicate
                ? isExactMatch
                  ? 'bg-amber-950 text-amber-300 border-amber-500/60 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                  : 'bg-rose-950 text-rose-300 border-rose-500/60 shadow-[0_0_10px_rgba(244,63,94,0.3)] animate-pulse'
                : 'bg-emerald-950 text-emerald-300 border-emerald-500/60 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
            }`}>
              {result.match_type || (isDuplicate ? 'DUPLICATE' : 'UNIQUE')}
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Forensic Metadata Grid */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
          <div className="flex justify-between items-center py-1.5 border-b border-slate-800/80">
            <span className="text-slate-400">Filename:</span>
            <span className="font-mono text-white font-bold">{result.filename}</span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-800/80">
            <span className="text-slate-400">SHA-256 Digest:</span>
            <span className="font-mono text-cyan-300 text-[11px] truncate max-w-[320px] sm:max-w-[480px]" title={result.sha256}>
              {result.sha256}
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-800/80">
            <span className="text-slate-400">SimHash (64-Bit LSH):</span>
            <span className="font-mono text-violet-300 text-[11px]">
              {result.simhash || '0x0000000000000000'}
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-800/80">
            <span className="text-slate-400">Classification & Metrics:</span>
            <div className="flex items-center gap-2 font-mono">
              <span className={`px-2 py-0.5 rounded text-[10px] border ${getClassificationBadge(result.classification)}`}>
                {result.classification}
              </span>
              <span className="text-slate-300">
                {(result.size_bytes / 1024).toFixed(1)} KB {result.row_count ? `• ${result.row_count} rows × ${result.col_count} cols` : ''}
              </span>
            </div>
          </div>

          {/* Extracted Columns */}
          {result.extracted_columns && result.extracted_columns.length > 0 && (
            <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
              <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                <span>Extracted Columns ({result.extracted_columns.length})</span>
                <span>{result.row_count !== null ? `${result.row_count} rows` : ''}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {result.extracted_columns.map((col) => (
                  <span
                    key={col}
                    className="px-2 py-0.5 rounded text-[10px] font-mono border bg-slate-950 text-cyan-300 border-cyan-800/60"
                  >
                    {col} ✓
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Top TF-IDF Keywords */}
          {result.top_keywords && result.top_keywords.length > 0 && (
            <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
              <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">
                Top TF-IDF Keywords:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {result.top_keywords.map((kw) => (
                  <span
                    key={kw}
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-mono border bg-violet-950/80 text-violet-300 border-violet-700/60"
                  >
                    #{kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Text Preview */}
          {result.text_preview && (
            <div className="pt-2 border-t border-slate-800/80 space-y-1">
              <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">Content Preview:</span>
              <p className="text-[11px] font-mono text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800 max-h-24 overflow-y-auto leading-relaxed">
                {result.text_preview}
              </p>
            </div>
          )}
        </div>

        {/* Existing Conflict Card (If duplicate) */}
        {isDuplicate && existingMatch && (
          <div className="bg-amber-950/30 border border-amber-500/40 rounded-2xl p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between text-amber-300 font-semibold font-mono">
              <span>⚠️ Clashing Existing Dataset:</span>
              <span>#{existingMatch.id} • {existingMatch.filename}</span>
            </div>
            <div className="flex justify-between text-slate-400 text-[11px]">
              <span>Uploader: {existingMatch.uploader_username || 'System'}</span>
              <span>Classification: {existingMatch.classification}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          {isDuplicate && existingMatch && onDownload && (
            <button
              onClick={() => { onDownload(existingMatch.id, existingMatch.filename); onClose(); }}
              className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all shadow-[0_0_15px_rgba(0,194,222,0.3)] flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>⬇</span> Download Existing Dataset
            </button>
          )}

          {isDuplicate && onForceUpload && (
            <button
              onClick={() => { onForceUpload(); onClose(); }}
              disabled={loading}
              className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs transition-colors cursor-pointer"
            >
              <span>⚡</span> Force Override & Ingest
            </button>
          )}

          {!isDuplicate && result.id && onDownload && (
            <button
              onClick={() => { onDownload(result.id, result.filename); onClose(); }}
              className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>⬇</span> Download Ingested Dataset
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full sm:w-auto py-2.5 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </div>

      </div>
    </div>
  );
}
