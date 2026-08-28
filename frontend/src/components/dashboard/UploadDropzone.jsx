import React, { useState, useEffect } from 'react';
import { CLASSIFICATIONS, getClassificationBadge } from '../../constants/classifications';
import IngestionAnalysisModal from '../modals/IngestionAnalysisModal';

export default function UploadDropzone(props) {
  const ops = props.uploadOps || props;

  const [localFile, setLocalFile] = useState(null);
  const [localClassification, setLocalClassification] = useState('INTERNAL');
  const [localDescription, setLocalDescription] = useState('');
  const [localIsAsync, setLocalIsAsync] = useState(false);
  const [localResult, setLocalResult] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [batchProgress, setBatchProgress] = useState(null);
  const [modalQueue, setModalQueue] = useState([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);

  const file = ops.file !== undefined && ops.file !== null ? ops.file : localFile;
  const setFile = (f) => {
    setLocalFile(f);
    if (ops.setFile) ops.setFile(f);
  };

  const classification = ops.classification !== undefined ? ops.classification : localClassification;
  const setClassification = (c) => {
    setLocalClassification(c);
    if (ops.setClassification) ops.setClassification(c);
  };

  const description = ops.description !== undefined ? ops.description : localDescription;
  const setDescription = (d) => {
    setLocalDescription(d);
    if (ops.setDescription) ops.setDescription(d);
  };

  const isAsyncMode = ops.isAsyncMode !== undefined ? ops.isAsyncMode : localIsAsync;
  const setIsAsyncMode = (a) => {
    setLocalIsAsync(a);
    if (ops.setIsAsyncMode) ops.setIsAsyncMode(a);
  };

  const result = ops.result !== undefined && ops.result !== null ? ops.result : localResult;
  const setResult = (r) => {
    setLocalResult(r);
    if (ops.setResult) ops.setResult(r);
    if (r) {
      setModalQueue([r]);
      setCurrentQueueIndex(0);
      setShowModal(true);
    }
  };

  useEffect(() => {
    if (result && modalQueue.length === 0) {
      setModalQueue([result]);
      setCurrentQueueIndex(0);
      setShowModal(true);
    }
  }, [result]);

  const activeResult = modalQueue.length > 0 && currentQueueIndex < modalQueue.length
    ? modalQueue[currentQueueIndex]
    : result;

  const handleNextOrCloseModal = () => {
    if (modalQueue.length > 0 && currentQueueIndex + 1 < modalQueue.length) {
      setCurrentQueueIndex((prev) => prev + 1);
    } else {
      setShowModal(false);
      setModalQueue([]);
      setCurrentQueueIndex(0);
      setResult(null);
      setFile(null);
    }
  };

  const loading = (ops.loading ?? props.loading ?? false) || Boolean(batchProgress);
  const onUpload = ops.handleUpload ?? props.onUpload;
  const onDownload = ops.handleDownload ?? props.onDownload;
  const asyncTask = ops.asyncTask ?? props.asyncTask;
  const error = ops.error ?? props.error;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArr = Array.from(e.target.files);
      setSelectedFiles(filesArr);
      setFile(filesArr[0]);
      setResult(null);
      setShowModal(false);
    }
  };

  const handleTriggerUpload = async () => {
    if (selectedFiles.length > 1) {
      const resultsAccumulator = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        const curFile = selectedFiles[i];
        setBatchProgress({ current: i + 1, total: selectedFiles.length, name: curFile.name });
        setFile(curFile);
        if (onUpload) {
          const res = await onUpload(false, false, curFile, classification, description);
          if (res) {
            resultsAccumulator.push(res);
          }
        }
      }
      setBatchProgress(null);
      setSelectedFiles([]);
      if (resultsAccumulator.length > 0) {
        setModalQueue(resultsAccumulator);
        setCurrentQueueIndex(0);
        setShowModal(true);
      }
    } else {
      if (onUpload) {
        const res = await onUpload(false);
        if (res) {
          setModalQueue([res]);
          setCurrentQueueIndex(0);
          setShowModal(true);
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Registration Card */}
      <div className="bg-slate-900/90 rounded-2xl p-6 shadow-xl border border-slate-800/80 backdrop-blur-md">
        <h2 className="text-lg font-semibold text-white mb-1">Dataset Registration</h2>
        <p className="text-xs text-slate-400 mb-5">
          Files are deduplicated via Content-Addressable Storage (SHA-256) & LSH.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-700/80 text-rose-300 text-xs font-semibold flex items-center justify-between animate-fadeIn">
            <span>⚠️ {error}</span>
            {ops.setError && (
              <button onClick={() => ops.setError(null)} className="text-slate-400 hover:text-white text-xs ml-3 cursor-pointer">✕</button>
            )}
          </div>
        )}

        {batchProgress && (
          <div className="mb-4 p-3 rounded-xl bg-violet-950/80 border border-violet-700/80 text-violet-300 text-xs font-semibold flex items-center justify-between animate-pulse">
            <span>⚙️ Ingesting Batch File {batchProgress.current} of {batchProgress.total}: {batchProgress.name}...</span>
            <span className="font-mono text-xs">{Math.round((batchProgress.current / batchProgress.total) * 100)}%</span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              File {selectedFiles.length > 1 && `(${selectedFiles.length} files selected)`}
            </label>
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              className="block w-full text-xs text-slate-300
                         file:mr-3 file:py-2 file:px-3
                         file:rounded-lg file:border-0
                         file:bg-cyan-600 file:text-white
                         file:cursor-pointer hover:file:bg-cyan-500
                         border border-slate-700/80 rounded-lg bg-slate-950/60 cursor-pointer"
            />
            {selectedFiles.length > 1 ? (
              <p className="text-[11px] text-violet-400 mt-1 font-mono">
                Selected {selectedFiles.length} files: {selectedFiles.map(f => f.name).join(', ')}
              </p>
            ) : file ? (
              <p className="text-[11px] text-cyan-400 mt-1 font-mono">
                Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            ) : null}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Classification Level</label>
            <select
              value={classification}
              onChange={(e) => setClassification && setClassification(e.target.value)}
              className="w-full text-xs bg-slate-950/80 border border-slate-700/80 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
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
              onChange={(e) => setDescription && setDescription(e.target.value)}
              className="w-full text-xs bg-slate-950/80 border border-slate-700/80 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Stage 13: Async Background Queue Toggle */}
          <div
            onClick={() => setIsAsyncMode && setIsAsyncMode(!isAsyncMode)}
            className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-bold text-sm">⚡</span>
              <div>
                <div className="text-xs font-semibold text-slate-200">Async Background Queue</div>
                <div className="text-[10px] text-slate-400">Offload feature extraction to Redis worker</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={isAsyncMode}
              onChange={(e) => {
                e.stopPropagation();
                if (setIsAsyncMode) setIsAsyncMode(e.target.checked);
              }}
              className="h-4 w-4 rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-amber-500 cursor-pointer accent-amber-500"
            />
          </div>

          {/* Live Async Task Progress Bar */}
          {asyncTask && (
            <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-2 animate-fade-in">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-300">
                  {asyncTask.status === 'COMPLETED' ? '✓ Processing Complete' : '⚙️ Worker Processing...'}
                </span>
                <span className="font-mono text-amber-400 font-bold">{asyncTask.progress || 0}%</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className="bg-amber-400 h-full rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(245,158,11,0.6)]"
                  style={{ width: `${asyncTask.progress || 0}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-300 font-mono truncate">{asyncTask.message}</p>
            </div>
          )}

          <button
            onClick={handleTriggerUpload}
            disabled={!file || loading}
            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800
                       disabled:cursor-not-allowed text-white text-sm font-medium
                       py-2.5 rounded-lg transition-all shadow-[0_0_15px_rgba(0,194,222,0.2)] cursor-pointer"
          >
            {loading ? 'Processing & Analyzing Text...' : selectedFiles.length > 1 ? `⚡ Ingest All ${selectedFiles.length} Datasets` : isAsyncMode ? '⚡ Queue in Background' : 'Upload & Analyze'}
          </button>
        </div>
      </div>

      {/* Duplicate Detection Alert Card */}
      {(() => {
        const existingMatch = result?.existing || result?.existing_dataset;
        if (!result || !result.duplicate || !existingMatch) return null;

        return (
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
                    <span className="text-rose-300 font-bold">{existingMatch.simhash || '0x...'}</span>
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
                  <span>🏷️</span> Shared Salient Vocabulary (TF-IDF Intersect)
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
                <span className="font-mono text-cyan-200 font-medium">{existingMatch.filename}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Original Uploader:</span>
                <span className="text-slate-200">{existingMatch.uploader_username || 'System'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Classification:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${getClassificationBadge(existingMatch.classification)}`}>
                  {existingMatch.classification}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Uploaded Size:</span>
                <span className="text-slate-300 font-mono">{(result.size_bytes / 1024).toFixed(1)} KB (vs. {(existingMatch.size_bytes / 1024).toFixed(1)} KB existing)</span>
              </div>

              {result.extracted_columns && result.extracted_columns.length > 0 && (
                <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                    <span>Extracted Columns ({result.extracted_columns.length})</span>
                    <span>{result.row_count !== null ? `${result.row_count} rows` : ''}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {result.extracted_columns.map((col) => {
                      const isShared = (existingMatch.columns || []).includes(col);
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
                onClick={() => onDownload(existingMatch.id, existingMatch.filename)}
                className="w-full py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all shadow-[0_0_12px_rgba(0,194,222,0.25)] flex items-center justify-center gap-1.5"
              >
                ⬇ Use Existing Dataset (Download)
              </button>

              <button
                onClick={() => onUpload(true)}
                disabled={loading}
                className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs transition-colors cursor-pointer"
              >
                ⚡ Proceed Anyway (Register as Variant)
              </button>

              <button
                onClick={() => { setResult(null); if (setFile) setFile(null); }}
                className="w-full py-1.5 text-center text-xs text-slate-500 hover:text-slate-400 transition-colors cursor-pointer"
              >
                Cancel / Choose Another File
              </button>
            </div>
          </div>
        );
      })()}

      {/* Unique Ingestion Success Forensic Card */}
      {(() => {
        if (!result || result.duplicate || !result.id) return null;

        return (
          <div className="rounded-2xl p-6 space-y-4 shadow-xl backdrop-blur-md bg-emerald-950/40 border border-emerald-500/60 shadow-[0_0_30px_rgba(16,185,129,0.15)] animate-fadeIn">
            {/* Header with Match Type Badge */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🛡️</span>
                <div>
                  <h3 className="font-semibold text-base text-white flex items-center gap-2">
                    <span>Unique Dataset Verified & Ingested</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/80 text-emerald-300 border border-emerald-600 font-mono">
                      #{result.id}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Content-Addressable Storage (CAS) committed with zero duplicate collisions.
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border bg-emerald-900/80 text-emerald-300 border-emerald-500/60 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                MATCH TYPE: UNIQUE
              </span>
            </div>

            {/* Cryptographic & Similarity Metrics */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Filename:</span>
                <span className="font-mono text-emerald-200 font-bold">{result.filename}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">SHA-256 Digest:</span>
                <span className="font-mono text-cyan-300 text-[11px] truncate max-w-[280px] sm:max-w-[420px]" title={result.sha256}>
                  {result.sha256}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">SimHash Fingerprint (64-Bit):</span>
                <span className="font-mono text-violet-300 text-[11px]">
                  {result.simhash || '0x0000000000000000'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Classification & Payload:</span>
                <div className="flex items-center gap-2 font-mono">
                  <span className={`px-2 py-0.5 rounded text-[10px] border ${getClassificationBadge(result.classification)}`}>
                    {result.classification}
                  </span>
                  <span className="text-slate-300 text-[11px]">
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
                        className="px-1.5 py-0.5 rounded text-[10px] font-mono border bg-emerald-950/80 text-emerald-300 border-emerald-700/60"
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
                    Top TF-IDF Extracted Keywords:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {result.top_keywords.map((kw) => (
                      <span
                        key={kw}
                        className="px-2 py-0.5 rounded-full text-[10px] font-mono border bg-violet-950/80 text-violet-300 border-violet-700/60"
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
                  <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">Ingested Text Preview:</span>
                  <p className="text-[11px] font-mono text-slate-300 bg-slate-900/90 p-2 rounded border border-slate-800 max-h-20 overflow-y-auto leading-relaxed">
                    {result.text_preview}
                  </p>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="pt-1 flex items-center gap-3">
              {onDownload && (
                <button
                  onClick={() => onDownload(result.id, result.filename)}
                  className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-[0_0_12px_rgba(16,185,129,0.25)] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  ⬇ Download Verified Dataset
                </button>
              )}
              <button
                onClick={() => { setResult(null); if (setFile) setFile(null); }}
                className="py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-colors cursor-pointer"
              >
                ✕ Dismiss / Ingest Next File
              </button>
            </div>
          </div>
        );
      })()}

      {/* Forensic Analysis High-Impact Modal Popup */}
      <IngestionAnalysisModal
        isOpen={showModal && Boolean(activeResult)}
        onClose={handleNextOrCloseModal}
        result={activeResult}
        onDownload={onDownload}
        onForceUpload={() => onUpload && onUpload(true)}
        loading={loading}
        queueInfo={modalQueue.length > 1 ? { current: currentQueueIndex + 1, total: modalQueue.length } : null}
      />
    </div>
  );
}
