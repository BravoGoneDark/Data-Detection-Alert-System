import React from 'react';
import { CLASSIFICATIONS, getClassificationBadge } from '../../constants/classifications';

export default function UploadDropzone({
  file,
  setFile,
  classification,
  setClassification,
  description,
  setDescription,
  loading,
  result,
  setResult,
  onUpload,
  onDownload,
}) {
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Registration Card */}
      <div className="bg-slate-900/90 rounded-2xl p-6 shadow-xl border border-slate-800/80 backdrop-blur-md">
        <h2 className="text-lg font-semibold text-white mb-1">Dataset Registration</h2>
        <p className="text-xs text-slate-400 mb-5">
          Files are deduplicated via Content-Addressable Storage (SHA-256).
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">File</label>
            <input
              type="file"
              onChange={handleFileChange}
              className="block w-full text-xs text-slate-300
                         file:mr-3 file:py-2 file:px-3
                         file:rounded-lg file:border-0
                         file:bg-cyan-600 file:text-white
                         file:cursor-pointer hover:file:bg-cyan-500
                         border border-slate-700/80 rounded-lg bg-slate-950/60"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Classification Level</label>
            <select
              value={classification}
              onChange={(e) => setClassification(e.target.value)}
              className="w-full text-xs bg-slate-950/80 border border-slate-700/80 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              {CLASSIFICATIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label} ({c.value})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              {CLASSIFICATIONS.find(c => c.value === classification)?.desc}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Description (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Research dataset benchmark v1"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs bg-slate-950/80 border border-slate-700/80 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <button
            onClick={() => onUpload(false)}
            disabled={!file || loading}
            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800
                       disabled:cursor-not-allowed text-white text-sm font-medium
                       py-2.5 rounded-lg transition-all shadow-[0_0_15px_rgba(0,194,222,0.2)]"
          >
            {loading ? 'Processing & Analyzing Text...' : 'Upload & Analyze'}
          </button>
        </div>
      </div>

      {/* Duplicate Detection Alert Card */}
      {result && result.duplicate && result.existing && (
        <div className={`rounded-2xl p-6 space-y-4 shadow-xl backdrop-blur-md border ${
          result.match_type === 'EXACT'
            ? 'bg-amber-950/40 border-amber-600/60 shadow-[0_0_25px_rgba(217,119,6,0.15)]'
            : result.match_type === 'FUZZY_SIMILAR'
            ? 'bg-rose-950/40 border-rose-500/60 shadow-[0_0_25px_rgba(244,63,94,0.2)]'
            : result.match_type === 'CONTENT_SIMILAR'
            ? 'bg-purple-950/40 border-fuchsia-500/60 shadow-[0_0_25px_rgba(217,70,239,0.18)]'
            : 'bg-indigo-950/40 border-cyan-500/60 shadow-[0_0_25px_rgba(6,182,212,0.15)]'
        }`}>
          {/* Header with Match Type Badge */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">
                {result.match_type === 'EXACT' ? '⚡' : result.match_type === 'FUZZY_SIMILAR' ? '🧬' : result.match_type === 'CONTENT_SIMILAR' ? '📑' : '🔍'}
              </span>
              <div>
                <h3 className="font-semibold text-base text-white">
                  {result.match_type === 'EXACT'
                    ? 'Exact Duplicate Detected'
                    : result.match_type === 'FUZZY_SIMILAR'
                    ? 'Fuzzy & SimHash Shingle Match'
                    : result.match_type === 'CONTENT_SIMILAR'
                    ? 'Content & Plagiarism Match'
                    : 'Structural Similarity Match'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {result.match_type === 'EXACT'
                    ? 'Identical SHA-256 cryptographic fingerprint found'
                    : result.match_type === 'FUZZY_SIMILAR'
                    ? `Near-identical text with minor typos/sentence edits (${result.hamming_distance}/64 bits distance)`
                    : result.match_type === 'CONTENT_SIMILAR'
                    ? `High text vocabulary & TF-IDF cosine overlap (${result.similarity_score}%)`
                    : `High structural & schema overlap (${result.similarity_score}%)`}
                </p>
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border ${
              result.match_type === 'EXACT'
                ? 'bg-amber-900/60 text-amber-300 border-amber-500/50'
                : result.match_type === 'FUZZY_SIMILAR'
                ? 'bg-rose-900/60 text-rose-300 border-rose-400/50 animate-pulse'
                : result.match_type === 'CONTENT_SIMILAR'
                ? 'bg-fuchsia-900/60 text-fuchsia-300 border-fuchsia-400/50 animate-pulse'
                : 'bg-cyan-900/60 text-cyan-300 border-cyan-400/50 animate-pulse'
            }`}>
              {result.match_type === 'EXACT'
                ? '100% HASH MATCH'
                : result.match_type === 'FUZZY_SIMILAR'
                ? `${result.hamming_distance} BITS FLIPPED (${result.similarity_score}%)`
                : result.match_type === 'CONTENT_SIMILAR'
                ? `${result.similarity_score}% COSINE MATCH`
                : `${result.similarity_score}% SIMILAR`}
            </span>
          </div>

          {/* LSH Sub-linear Acceleration Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950/80 border border-cyan-800/40 text-[11px] text-cyan-300">
            <span className="animate-pulse">⚡</span>
            <span>
              <strong className="font-mono text-cyan-200">LSH Accelerated Index:</strong> Candidate pair retrieved in <span className="font-mono text-emerald-400 font-bold">O(1)</span> time without scanning all database rows.
            </span>
          </div>

          {/* 64-bit SimHash Fingerprint Comparator */}
          {result.match_type === 'FUZZY_SIMILAR' && (
            <div className="bg-slate-950/80 border border-rose-900/50 rounded-xl p-3.5 space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-wider text-rose-400 flex items-center justify-between">
                <span className="flex items-center gap-1"><span>🧬</span> 64-bit SimHash Fingerprints</span>
                <span className="text-rose-300 font-bold">{64 - (result.hamming_distance || 0)} / 64 Bits Aligned</span>
              </div>
              <div className="space-y-1 text-xs font-mono">
                <div className="flex justify-between items-center bg-slate-900/80 px-2.5 py-1.5 rounded border border-slate-800">
                  <span className="text-slate-400 text-[10px]">Incoming Fingerprint:</span>
                  <span className="text-rose-300 font-bold">{result.simhash || '0x...'}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-900/80 px-2.5 py-1.5 rounded border border-slate-800">
                  <span className="text-slate-400 text-[10px]">Closest Fingerprint:</span>
                  <span className="text-rose-300 font-bold">{result.existing.simhash || '0x...'}</span>
                </div>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-rose-500 rounded-full transition-all duration-500"
                  style={{ width: `${result.similarity_score}%` }}
                />
              </div>
            </div>
          )}

          {/* Shared Keywords for Content Similarity */}
          {result.match_type === 'CONTENT_SIMILAR' && result.shared_keywords && result.shared_keywords.length > 0 && (
            <div className="bg-slate-950/70 border border-fuchsia-900/40 rounded-xl p-3.5 space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-wider text-fuchsia-400 flex items-center gap-1.5">
                <span>🏷</span> Shared Salient Vocabulary (TF-IDF Intersect)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.shared_keywords.map((kw) => (
                  <span
                    key={kw}
                    className="px-2 py-0.5 rounded text-[10px] font-mono bg-fuchsia-950/80 text-fuchsia-300 border border-fuchsia-700/60"
                  >
                    #{kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Similarity Breakdown Bars for Metadata Matches */}
          {result.match_type === 'METADATA_SIMILAR' && result.score_breakdown && (
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Similarity Metrics Breakdown
              </div>
              
              <div className="space-y-1.5 text-xs">
                <div>
                  <div className="flex justify-between text-[11px] text-slate-300 mb-0.5">
                    <span>Filename Match</span>
                    <span className="font-mono text-cyan-300">{result.score_breakdown.filename_similarity}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 rounded-full transition-all duration-500"
                      style={{ width: `${result.score_breakdown.filename_similarity}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-300 mb-0.5">
                    <span>Schema & Column Overlap</span>
                    <span className="font-mono text-cyan-300">{result.score_breakdown.schema_similarity}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 rounded-full transition-all duration-500"
                      style={{ width: `${result.score_breakdown.schema_similarity}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-300 mb-0.5">
                    <span>File Size Proximity</span>
                    <span className="font-mono text-cyan-300">{result.score_breakdown.size_proximity}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-600 rounded-full transition-all duration-500"
                      style={{ width: `${result.score_breakdown.size_proximity}%` }}
                    />
                  </div>
                </div>

                {result.score_breakdown.row_proximity !== null && (
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-300 mb-0.5">
                      <span>Row Count Alignment</span>
                      <span className="font-mono text-cyan-300">{result.score_breakdown.row_proximity}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-500 rounded-full transition-all duration-500"
                        style={{ width: `${result.score_breakdown.row_proximity}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Existing Match Info */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
              <span className="text-slate-400">Closest Existing Dataset:</span>
              <span className="font-mono text-cyan-200 font-medium">{result.existing.filename}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
              <span className="text-slate-400">Original Uploader:</span>
              <span className="text-slate-200">{result.existing.uploader_username || 'System'}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
              <span className="text-slate-400">Classification:</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${getClassificationBadge(result.existing.classification)}`}>
                {result.existing.classification}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
              <span className="text-slate-400">Uploaded Size:</span>
              <span className="text-slate-300 font-mono">{(result.size_bytes / 1024).toFixed(1)} KB (vs. {(result.existing.size_bytes / 1024).toFixed(1)} KB existing)</span>
            </div>

            {result.extracted_columns && result.extracted_columns.length > 0 && (
              <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                  <span>Extracted Columns ({result.extracted_columns.length})</span>
                  <span>{result.row_count !== null ? `${result.row_count} rows` : ''}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {result.extracted_columns.map((col) => {
                    const isShared = (result.existing.columns || []).includes(col);
                    return (
                      <span
                        key={col}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                          isShared
                            ? 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60'
                            : 'bg-amber-950/80 text-amber-300 border-amber-700/60'
                        }`}
                      >
                        {col} {isShared ? '✓' : '+'}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {result.text_preview && (
              <div className="pt-2 border-t border-slate-800/80 space-y-1">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">Incoming Text Preview:</span>
                <p className="text-[11px] font-mono text-slate-300 bg-slate-900/90 p-2 rounded border border-slate-800 max-h-16 overflow-y-auto leading-relaxed">
                  {result.text_preview}
                </p>
              </div>
            )}
          </div>

          {/* Duplicate Actions */}
          <div className="pt-1 space-y-2">
            <button
              onClick={() => onDownload(result.existing.id, result.existing.filename)}
              className="w-full py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all shadow-[0_0_12px_rgba(0,194,222,0.25)] flex items-center justify-center gap-1.5"
            >
              ⬇ Use Existing Dataset (Download)
            </button>

            <button
              onClick={() => onUpload(true)}
              disabled={loading}
              className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs transition-colors"
            >
              ⚡ Proceed Anyway (Register as Variant)
            </button>

            <button
              onClick={() => { setResult(null); setFile(null); }}
              className="w-full py-1.5 text-center text-xs text-slate-500 hover:text-slate-400 transition-colors"
            >
              Cancel / Choose Another File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
