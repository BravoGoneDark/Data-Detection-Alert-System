import React from 'react';

export default function LshArchitectureModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-slate-900 border border-cyan-800/70 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">⚡</span>
            <div>
              <h3 className="font-semibold text-white text-base">LSH Indexing Architecture</h3>
              <p className="text-[11px] text-slate-400">Locality-Sensitive Hashing candidate retrieval parameters</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-sm p-1"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* SimHash Banding Card */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-cyan-300 font-mono font-bold">
              <span>🧬</span> SimHash 4-Band Partition
            </div>
            <ul className="space-y-1 text-slate-400 text-[11px]">
              <li>• <strong className="text-slate-300">Bands (b):</strong> 4 partitions</li>
              <li>• <strong className="text-slate-300">Bits per band (r):</strong> 16 bits</li>
              <li>• <strong className="text-slate-300">Pigeonhole Math:</strong> For Hamming distance $d \le 3$, at least 1 band is guaranteed 0 bit flips.</li>
              <li>• <strong className="text-slate-300">Lookup Cost:</strong> O(1) exact SQL match</li>
            </ul>
          </div>

          {/* MinHash Banding Card */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-fuchsia-300 font-mono font-bold">
              <span>📑</span> MinHash 16-Band Partition
            </div>
            <ul className="space-y-1 text-slate-400 text-[11px]">
              <li>• <strong className="text-slate-300">Bands (b):</strong> 16 partitions</li>
              <li>• <strong className="text-slate-300">Rows per band (r):</strong> 4 hash integers</li>
              <li>• <strong className="text-slate-300">S-Curve Formula:</strong> $P = 1 - (1 - s^4)^{16}$</li>
              <li>• <strong className="text-slate-300">Collision:</strong> &gt; 99.9% for $s \ge 0.80$, &lt; 2.5% for $s \le 0.20$</li>
            </ul>
          </div>
        </div>

        {/* Inverted Index & PostgreSQL Specs */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-1.5 text-xs">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block font-bold">PostgreSQL Index Postings</span>
          <p className="text-slate-300 text-[11px]">
            Every registered dataset creates ~20 bucket entries in <code className="font-mono text-cyan-300 bg-slate-900 px-1 py-0.5 rounded">lsh_buckets</code>. During upload, candidates are retrieved in a single indexed query <code className="font-mono text-cyan-300 bg-slate-900 px-1 py-0.5 rounded">LSHBucket.bucket_key.in_(keys)</code>, pruning the search space by <span className="text-emerald-400 font-bold font-mono">&gt; 99%</span>.
          </p>
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
