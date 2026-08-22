import React from 'react';
import { getClassificationBadge } from '../../constants/classifications';

export default function DatasetInventory({
  datasets,
  filteredDatasets,
  paginatedDatasets,
  loadingDatasets,
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  pageSize,
  setPageSize,
  currentPage,
  setCurrentPage,
  totalPages,
  totalItems,
  getPaginationPages,
  onRefresh,
  onDownload,
  downloadingId,
}) {
  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl p-6 shadow-xl border border-slate-800/80 backdrop-blur-md">
      {/* Inventory Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-lg font-semibold text-white">Dataset Inventory</h2>
          <p className="text-xs text-slate-400">
            Filtered by your role classification clearance • {filteredDatasets.length} total datasets
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={loadingDatasets}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors flex items-center gap-1.5"
          >
            {loadingDatasets ? 'Refreshing...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {/* Search & Sort Controls Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 pb-4 border-b border-slate-800/80">
        {/* Search input */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 text-xs">
            🔍
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by filename, uploader, classification, keywords, or columns..."
            className="w-full pl-8 pr-8 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Sort Dropdown & Toggle */}
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="date">Sort by Date</option>
            <option value="size">Sort by Size</option>
            <option value="filename">Sort by Filename</option>
            <option value="classification">Sort by Clearance</option>
            <option value="uploader">Sort by Uploader</option>
            <option value="downloads">Sort by Downloads</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            title={`Current: ${sortOrder === 'asc' ? 'Ascending (A-Z, Low-High)' : 'Descending (Z-A, High-Low)'}`}
            className="px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 text-xs text-cyan-400 font-mono transition-colors"
          >
            {sortOrder === 'asc' ? '▲ Asc' : '▼ Desc'}
          </button>

          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="bg-slate-950/80 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-400 focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value={5}>5 / page</option>
            <option value={6}>6 / page</option>
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
          </select>
        </div>
      </div>

      {/* Table or Empty State */}
      {datasets.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-sm">
          {loadingDatasets ? 'Loading datasets...' : 'No datasets registered yet. Upload one on the left!'}
        </div>
      ) : filteredDatasets.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl space-y-2">
          <p className="text-slate-400 text-sm">No datasets matching "{searchQuery}"</p>
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs text-cyan-400 hover:text-cyan-300 underline"
          >
            Clear search query
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3 cursor-pointer hover:text-slate-200" onClick={() => toggleSort('filename')}>
                    Dataset & Schema {sortBy === 'filename' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="py-2.5 px-2 cursor-pointer hover:text-slate-200" onClick={() => toggleSort('classification')}>
                    Classification {sortBy === 'classification' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="py-2.5 px-2 cursor-pointer hover:text-slate-200" onClick={() => toggleSort('uploader')}>
                    Uploader {sortBy === 'uploader' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="py-2.5 px-2 cursor-pointer hover:text-slate-200" onClick={() => toggleSort('size')}>
                    Size {sortBy === 'size' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="py-2.5 px-2 cursor-pointer hover:text-slate-200" onClick={() => toggleSort('downloads')}>
                    Downloads {sortBy === 'downloads' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {paginatedDatasets.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-200">{d.filename}</span>
                        {d.mime_type && d.mime_type.includes('csv') && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-cyan-950/80 text-cyan-400 border border-cyan-800/50">CSV</span>
                        )}
                        {d.mime_type && d.mime_type.includes('json') && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-purple-950/80 text-purple-400 border border-purple-800/50">JSON</span>
                        )}
                        {d.mime_type && d.mime_type.includes('text') && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">TXT</span>
                        )}
                        {d.simhash && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-rose-950/70 text-rose-300 border border-rose-800/40" title={`SimHash Fingerprint: ${d.simhash}`}>
                            🧬 {d.simhash.slice(0, 8)}...
                          </span>
                        )}
                      </div>

                      {d.description && (
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">{d.description}</div>
                      )}

                      {/* Schema columns & keywords pills */}
                      {d.columns && d.columns.length > 0 ? (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] font-mono text-slate-400">
                            {d.row_count !== null ? `${d.row_count} rows • ` : ''}{d.columns.length} cols:
                          </span>
                          <div className="flex flex-wrap gap-1 max-w-xs truncate">
                            {d.columns.slice(0, 3).map(c => (
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
                          {d.top_keywords.slice(0, 3).map(kw => (
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
                        disabled={downloadingId === d.id}
                        className="px-3 py-1.5 rounded bg-cyan-600/80 hover:bg-cyan-500 text-white font-medium text-xs transition-colors disabled:bg-slate-800"
                      >
                        {downloadingId === d.id ? 'Downloading...' : '⬇ Download'}
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
              {/* Previous Page Button */}
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-950/60 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ‹ Prev
              </button>

              {/* Numbered Page Buttons */}
              {getPaginationPages().map((page, idx) => (
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
              ))}

              {/* Next Page Button */}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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
