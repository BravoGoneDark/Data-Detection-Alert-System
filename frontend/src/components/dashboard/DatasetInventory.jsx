import React, { useState } from 'react';
import { getClassificationBadge } from '../../constants/classifications';

export default function DatasetInventory({
  datasets = [],
  loadingDatasets = false,
  onRefresh,
  onDownload,
  downloadingId,
  isQuarantined = false,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const filteredDatasets = datasets
    .filter((d) => {
      const q = searchQuery.toLowerCase();
      return (
        d.filename?.toLowerCase().includes(q) ||
        (d.classification && d.classification.toLowerCase().includes(q)) ||
        (d.uploader_username && d.uploader_username.toLowerCase().includes(q)) ||
        (d.top_keywords && d.top_keywords.some((k) => k.toLowerCase().includes(q)))
      );
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') comparison = new Date(b.uploaded_at) - new Date(a.uploaded_at);
      else if (sortBy === 'size') comparison = b.size_bytes - a.size_bytes;
      else if (sortBy === 'filename') comparison = (a.filename || '').localeCompare(b.filename || '');
      else if (sortBy === 'downloads') comparison = (b.download_count || 0) - (a.download_count || 0);
      return sortOrder === 'asc' ? -comparison : comparison;
    });

  const totalItems = filteredDatasets.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedDatasets = filteredDatasets.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getPaginationPages = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl p-6 shadow-xl border border-slate-800/80 backdrop-blur-md">
      {/* Inventory Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-semibold text-white">Dataset Inventory</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              ⚡ Redis Cache Active
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Filtered by your role classification clearance • {totalItems} total datasets
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={loadingDatasets}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors flex items-center gap-1.5"
          >
            <span>🔄</span> Refresh
          </button>
        </div>
      </div>

      {/* Filter & Sort Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by filename, uploader, classification, keywords, or columns..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full text-xs pl-9 pr-4 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
          <span className="absolute left-3 top-2.5 text-xs text-slate-500">🔍</span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2 text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="date">Sort by Date</option>
            <option value="size">Sort by Size</option>
            <option value="filename">Sort by Name</option>
            <option value="downloads">Sort by Downloads</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="text-xs px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 hover:bg-slate-800 transition-colors font-mono"
            title="Toggle sort order"
          >
            {sortOrder === 'asc' ? '▲ Asc' : '▼ Desc'}
          </button>

          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="text-xs px-2.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="6">6 / page</option>
            <option value="12">12 / page</option>
            <option value="24">24 / page</option>
          </select>
        </div>
      </div>

      {/* Dataset Table / Empty State */}
      {loadingDatasets && datasets.length === 0 ? (
        <div className="py-16 text-center text-sm text-slate-400 animate-pulse">
          Loading datasets from secure storage...
        </div>
      ) : paginatedDatasets.length === 0 ? (
        <div className="py-16 text-center text-sm text-slate-400">
          No datasets found matching your search query.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-slate-800/80">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 cursor-pointer hover:text-white" onClick={() => toggleSort('filename')}>
                    Dataset & Schema {sortBy === 'filename' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="py-2.5 px-2">Classification</th>
                  <th className="py-2.5 px-2">Uploader</th>
                  <th className="py-2.5 px-2 cursor-pointer hover:text-white" onClick={() => toggleSort('size')}>
                    Size {sortBy === 'size' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="py-2.5 px-2 cursor-pointer hover:text-white" onClick={() => toggleSort('downloads')}>
                    Downloads {sortBy === 'downloads' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {paginatedDatasets.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white truncate max-w-xs">{d.filename}</span>
                        <span className="text-[10px] text-slate-400 px-1 py-0.2 rounded bg-slate-800 font-mono">
                          {d.mime_type?.split('/')[1]?.toUpperCase() || 'TXT'}
                        </span>
                        {d.simhash && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-fuchsia-950/50 text-fuchsia-300 border border-fuchsia-800/40 font-mono">
                            ⚡ {d.simhash.slice(0, 10)}...
                          </span>
                        )}
                      </div>

                      {d.columns && d.columns.length > 0 ? (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] font-mono text-slate-400">
                            {d.row_count !== null ? `${d.row_count} rows • ` : ''}{d.columns.length} cols:
                          </span>
                          <div className="flex flex-wrap gap-1 max-w-xs truncate">
                            {d.columns.slice(0, 3).map((c) => (
                              <span key={c} className="px-1 py-0.2 rounded text-[9px] font-mono bg-slate-800 text-slate-300">
                                {c}
                              </span>
                            ))}
                            {d.columns.length > 3 && (
                              <span className="text-[9px] text-slate-500 font-mono">+{d.columns.length - 3}</span>
                            )}
                          </div>
                        </div>
                      ) : d.top_keywords && d.top_keywords.length > 0 ? (
                        <div className="flex items-center gap-1 mt-1">
                          {d.top_keywords.slice(0, 3).map((kw) => (
                            <span key={kw} className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-fuchsia-950/60 text-fuchsia-400 border border-fuchsia-800/40">
                              #{kw}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[10px] font-mono text-slate-500 truncate max-w-xs mt-0.5">{d.sha256.slice(0, 16)}...</div>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${getClassificationBadge(d.classification)}`}>
                        {d.classification}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-slate-400">
                      {d.uploader_username || 'System'}
                    </td>
                    <td className="py-3 px-2 font-mono text-slate-300">
                      {(d.size_bytes / 1024).toFixed(1)} KB
                    </td>
                    <td className="py-3 px-2 text-slate-400 font-mono">
                      {d.download_count}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onDownload(d.id, d.filename)}
                        disabled={downloadingId === d.id || isQuarantined}
                        className={`px-3 py-1.5 rounded font-medium text-xs transition-all ${
                          isQuarantined
                            ? 'bg-rose-950/70 border border-rose-800/70 text-rose-300/80 cursor-not-allowed opacity-80'
                            : 'bg-cyan-600/80 hover:bg-cyan-500 text-white disabled:bg-slate-800'
                        }`}
                        title={isQuarantined ? 'Downloads are blocked under active account quarantine policy' : 'Download dataset file'}
                      >
                        {downloadingId === d.id ? 'Downloading...' : isQuarantined ? '🔒 Restricted' : '⬇ Download'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs">
            <div className="text-slate-400 text-[11px] font-mono">
              Showing <span className="text-white font-semibold">{(currentPage - 1) * pageSize + 1}</span>–
              <span className="text-white font-semibold">{Math.min(currentPage * pageSize, totalItems)}</span> of{' '}
              <span className="text-cyan-400 font-semibold">{totalItems}</span> datasets
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-950/60 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ‹ Prev
              </button>

              {getPaginationPages().map((page, idx) =>
                page === '...' ? (
                  <span key={`dots-${idx}`} className="px-2 text-slate-600 font-mono">...</span>
                ) : (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`min-w-[30px] h-[30px] rounded-lg text-xs font-mono transition-all ${
                      currentPage === page
                        ? 'bg-cyan-600 text-white font-bold shadow-[0_0_10px_rgba(0,194,222,0.4)] border border-cyan-400'
                        : 'bg-slate-950/60 border border-slate-800 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    {page}
                  </button>
                )
              )}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-950/60 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next ›
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
