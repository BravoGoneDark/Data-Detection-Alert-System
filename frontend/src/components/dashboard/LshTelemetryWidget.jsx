import React from 'react';

export default function LshTelemetryWidget({ lshStats, loadingLsh, backfillingLsh, lshSuccessMsg, onBackfill }) {
  return (
    <div className="bg-slate-900/90 rounded-2xl p-4 shadow-xl border border-cyan-900/40 backdrop-blur-md">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-700/50 text-cyan-400 text-xl shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white">LSH Sub-Linear Indexing Engine</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 animate-pulse">
                ● ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {lshStats
                ? `Banded bucket indexing partitioned across ${lshStats.simhash_entries} SimHash & ${lshStats.minhash_entries} MinHash buckets`
                : 'Locality-Sensitive Hashing candidate pair generator'}
            </p>
          </div>
        </div>

        {/* Metrics Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5">
            <span className="text-[10px] text-slate-400 block uppercase font-mono">Bucket Postings</span>
            <span className="text-xs font-mono font-bold text-cyan-300">
              {lshStats?.total_bucket_entries?.toLocaleString() || '...'}
            </span>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5">
            <span className="text-[10px] text-slate-400 block uppercase font-mono">Unique Keys</span>
            <span className="text-xs font-mono font-bold text-cyan-300">
              {lshStats?.unique_bucket_keys?.toLocaleString() || '...'}
            </span>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5">
            <span className="text-[10px] text-slate-400 block uppercase font-mono">Indexed Datasets</span>
            <span className="text-xs font-mono font-bold text-emerald-400">
              {lshStats?.indexed_datasets_count?.toLocaleString() || '...'}
            </span>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5">
            <span className="text-[10px] text-slate-400 block uppercase font-mono">Collision Density</span>
            <span className="text-xs font-mono font-bold text-fuchsia-400">
              {lshStats ? `${lshStats.collision_density}x` : '...'}
            </span>
          </div>
        </div>

        {/* Backfill Action */}
        <div className="flex items-center gap-2">
          <button
            onClick={onBackfill}
            disabled={backfillingLsh || loadingLsh}
            className="text-xs px-3 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 transition-colors disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
          >
            <span>{backfillingLsh ? '⏳' : '⚡'}</span>
            {backfillingLsh ? 'Indexing...' : 'Re-index Buckets'}
          </button>
        </div>
      </div>

      {lshSuccessMsg && (
        <div className="mt-3 px-3 py-1.5 bg-emerald-950/80 border border-emerald-700/60 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
          <span>✓</span> {lshSuccessMsg}
        </div>
      )}
    </div>
  );
}
