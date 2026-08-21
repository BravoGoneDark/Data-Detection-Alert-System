import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from "./context/AuthContext";
import AuthenticationPage from "./components/auth/AuthenticationPage";

const API_URL = 'http://localhost:8000'

const CLASSIFICATIONS = [
  { value: 'INTERNAL', label: 'Internal', desc: 'Standard internal access (Students, Faculty, Researchers, Admins)' },
  { value: 'PUBLIC', label: 'Public', desc: 'Accessible to everyone, including guests' },
  { value: 'RESTRICTED', label: 'Restricted', desc: 'Higher security clearance (Faculty, Researchers, Admins)' },
  { value: 'CONFIDENTIAL', label: 'Confidential', desc: 'Strict clearance (Admins only)' },
]

function getClassificationBadge(classification) {
  const cls = (classification || 'INTERNAL').toUpperCase()
  switch (cls) {
    case 'PUBLIC':
      return 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
    case 'RESTRICTED':
      return 'bg-amber-950/80 text-amber-300 border-amber-700/60'
    case 'CONFIDENTIAL':
      return 'bg-purple-950/80 text-purple-300 border-purple-700/60'
    case 'INTERNAL':
    default:
      return 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60'
  }
}

function UploadPanel() {
  const { token, logout } = useAuth()
  const [file, setFile] = useState(null)
  const [classification, setClassification] = useState('INTERNAL')
  const [description, setDescription] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [datasets, setDatasets] = useState([])
  const [loadingDatasets, setLoadingDatasets] = useState(false)
  const [downloadingId, setDownloadingId] = useState(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('date') // 'date', 'size', 'filename', 'classification', 'uploader', 'downloads'
  const [sortOrder, setSortOrder] = useState('desc') // 'asc' | 'desc'
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(6)

  const fetchDatasets = async () => {
    if (!token) return
    setLoadingDatasets(true)
    try {
      const response = await fetch(`${API_URL}/datasets`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.status === 401) {
        logout()
        return
      }
      if (response.ok) {
        const data = await response.json()
        setDatasets(data)
      }
    } catch (err) {
      console.error("Failed to fetch datasets:", err)
    } finally {
      setLoadingDatasets(false)
    }
  }

  useEffect(() => {
    fetchDatasets()
  }, [token])

  // Reset to page 1 whenever search query or sort changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, sortBy, sortOrder, pageSize])

  const handleFileChange = (e) => {
    setFile(e.target.files[0] || null)
    setResult(null)
    setError(null)
  }

  const handleUpload = async (forceUpload = false) => {
    if (!file) return

    setLoading(true)
    setError(null)
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('classification', classification)
    if (description) formData.append('description', description)
    if (forceUpload) formData.append('force', 'true')

    try {
      const response = await fetch(`${API_URL}/datasets/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      if (response.status === 401) {
        logout()
        return
      }

      if (response.status === 403) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || 'Forbidden: Insufficient permissions')
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || `Server responded with ${response.status}`)
      }

      const data = await response.json()
      setResult(data)
      // Refresh the dataset list
      fetchDatasets()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (datasetId, filename) => {
    setDownloadingId(datasetId)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/datasets/${datasetId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.status === 401) {
        logout()
        return
      }

      if (response.status === 403) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || "Access denied: Insufficient classification clearance")
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || `Download failed with status ${response.status}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename || `dataset_${datasetId}.bin`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      // Refresh list to update download count
      fetchDatasets()
    } catch (err) {
      setError(err.message)
    } finally {
      setDownloadingId(null)
    }
  }

  // Filter & Search Logic
  const filteredDatasets = datasets.filter((d) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    const matchName = (d.filename || '').toLowerCase().includes(q)
    const matchUploader = (d.uploader_username || '').toLowerCase().includes(q)
    const matchClass = (d.classification || '').toLowerCase().includes(q)
    const matchDesc = (d.description || '').toLowerCase().includes(q)
    const matchMime = (d.mime_type || '').toLowerCase().includes(q)
    const matchKeywords = (d.top_keywords || []).some(k => k.toLowerCase().includes(q))
    const matchCols = (d.columns || []).some(c => c.toLowerCase().includes(q))
    return matchName || matchUploader || matchClass || matchDesc || matchMime || matchKeywords || matchCols
  })

  // Sorting Logic
  const sortedDatasets = [...filteredDatasets].sort((a, b) => {
    let comparison = 0
    if (sortBy === 'date') {
      comparison = new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime()
    } else if (sortBy === 'size') {
      comparison = a.size_bytes - b.size_bytes
    } else if (sortBy === 'filename') {
      comparison = a.filename.localeCompare(b.filename)
    } else if (sortBy === 'uploader') {
      comparison = (a.uploader_username || '').localeCompare(b.uploader_username || '')
    } else if (sortBy === 'classification') {
      const rank = { PUBLIC: 0, INTERNAL: 1, RESTRICTED: 2, CONFIDENTIAL: 3 }
      comparison = (rank[a.classification] || 0) - (rank[b.classification] || 0)
    } else if (sortBy === 'downloads') {
      comparison = (a.download_count || 0) - (b.download_count || 0)
    }
    return sortOrder === 'asc' ? comparison : -comparison
  })

  // Pagination calculations
  const totalItems = sortedDatasets.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const paginatedDatasets = sortedDatasets.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // Generate pagination page numbers array
  const getPaginationPages = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    if (currentPage <= 3) {
      return [1, 2, 3, 4, '...', totalPages]
    }
    if (currentPage >= totalPages - 2) {
      return [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages]
  }

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  return (
    <div className="min-h-screen bg-[#05070d] text-slate-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_12px_rgba(0,194,222,0.8)]" />
              <h1 className="text-2xl font-bold tracking-tight text-white">DDAS Platform</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 font-mono">
                Stage 7: TF-IDF & Cosine Similarity
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-1">
              Secure Data Download Duplication & Anomaly Detection System
            </p>
          </div>
          <button
            onClick={logout}
            className="text-xs px-4 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            Logout
          </button>
        </header>

        {/* Global Error Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-800/80 text-red-300 text-sm flex items-center justify-between">
            <span>⚠ {error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200 text-xs">✕ Dismiss</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Upload Section */}
          <div className="lg:col-span-4 space-y-6">
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
                  onClick={() => handleUpload(false)}
                  disabled={!file || loading}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800
                             disabled:cursor-not-allowed text-white text-sm font-medium
                             py-2.5 rounded-lg transition-all shadow-[0_0_15px_rgba(0,194,222,0.2)]"
                >
                  {loading ? 'Processing & Analyzing Text...' : 'Upload & Analyze'}
                </button>
              </div>
            </div>

            {/* Duplicate Detection Refined Alert Card (Stage 7 Tri-Tier) */}
            {result && result.duplicate && result.existing && (
              <div className={`rounded-2xl p-6 space-y-4 shadow-xl backdrop-blur-md border ${
                result.match_type === 'EXACT'
                  ? 'bg-amber-950/40 border-amber-600/60 shadow-[0_0_25px_rgba(217,119,6,0.15)]'
                  : result.match_type === 'CONTENT_SIMILAR'
                  ? 'bg-purple-950/40 border-fuchsia-500/60 shadow-[0_0_25px_rgba(217,70,239,0.18)]'
                  : 'bg-indigo-950/40 border-cyan-500/60 shadow-[0_0_25px_rgba(6,182,212,0.15)]'
              }`}>
                
                {/* Header with Match Type Badge */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">
                      {result.match_type === 'EXACT' ? '⚡' : result.match_type === 'CONTENT_SIMILAR' ? '📑' : '🔍'}
                    </span>
                    <div>
                      <h3 className="font-semibold text-base text-white">
                        {result.match_type === 'EXACT'
                          ? 'Exact Duplicate Detected'
                          : result.match_type === 'CONTENT_SIMILAR'
                          ? 'Content & Plagiarism Match'
                          : 'Structural Similarity Match'}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {result.match_type === 'EXACT'
                          ? 'Identical SHA-256 cryptographic fingerprint found'
                          : result.match_type === 'CONTENT_SIMILAR'
                          ? `High text vocabulary & TF-IDF cosine overlap (${result.similarity_score}%)`
                          : `High structural & schema overlap (${result.similarity_score}%)`}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border ${
                    result.match_type === 'EXACT'
                      ? 'bg-amber-900/60 text-amber-300 border-amber-500/50'
                      : result.match_type === 'CONTENT_SIMILAR'
                      ? 'bg-fuchsia-900/60 text-fuchsia-300 border-fuchsia-400/50 animate-pulse'
                      : 'bg-cyan-900/60 text-cyan-300 border-cyan-400/50 animate-pulse'
                  }`}>
                    {result.match_type === 'EXACT'
                      ? '100% HASH MATCH'
                      : result.match_type === 'CONTENT_SIMILAR'
                      ? `${result.similarity_score}% COSINE MATCH`
                      : `${result.similarity_score}% SIMILAR`}
                  </span>
                </div>

                {/* Shared Keywords for Content Similarity (TF-IDF) */}
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

                {/* Candidate & Incoming Schema Comparison */}
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

                  {/* Schema Columns comparison if available */}
                  {result.extracted_columns && result.extracted_columns.length > 0 && (
                    <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                        <span>Extracted Columns ({result.extracted_columns.length})</span>
                        <span>{result.row_count !== null ? `${result.row_count} rows` : ''}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {result.extracted_columns.map((col) => {
                          const isShared = (result.existing.columns || []).includes(col)
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
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Text preview snippet comparison */}
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
                    onClick={() => handleDownload(result.existing.id, result.existing.filename)}
                    className="w-full py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all shadow-[0_0_12px_rgba(0,194,222,0.25)] flex items-center justify-center gap-1.5"
                  >
                    ⬇ Use Existing Dataset (Download)
                  </button>

                  <button
                    onClick={() => handleUpload(true)}
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

            {/* Unique Success Card */}
            {result && !result.duplicate && (
              <div className="bg-emerald-950/40 border border-emerald-600/60 rounded-2xl p-5 space-y-3 shadow-lg backdrop-blur-md">
                <div className="flex items-center gap-2 text-emerald-300 font-semibold text-sm">
                  <span>✓</span>
                  <h3>Unique Dataset Registered</h3>
                </div>
                <div className="text-xs space-y-1.5 text-emerald-200/80">
                  <p>File: <strong className="text-white font-mono">{result.filename}</strong></p>
                  <p>Classification: <strong className="text-white">{result.classification}</strong></p>
                  <p>Size: <span className="font-mono">{(result.size_bytes / 1024).toFixed(1)} KB</span></p>
                  {result.row_count !== null && (
                    <p>Shape: <span className="font-mono">{result.row_count} rows • {result.extracted_columns?.length || 0} columns</span></p>
                  )}
                  {result.top_keywords && result.top_keywords.length > 0 && (
                    <div className="pt-2">
                      <span className="text-[10px] text-emerald-400/70 block uppercase tracking-wider mb-1 font-mono">TF-IDF Salient Terms:</span>
                      <div className="flex flex-wrap gap-1">
                        {result.top_keywords.map(kw => (
                          <span key={kw} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-900/60 border border-emerald-700/50 text-emerald-200">
                            #{kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Dataset Repository & Downloads with Search, Sort & Pagination */}
          <div className="lg:col-span-8 space-y-4">
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
                    onClick={fetchDatasets}
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
                                onClick={() => handleDownload(d.id, d.filename)}
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
          </div>

        </div>

      </div>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AuthenticationPage>
        <UploadPanel />
      </AuthenticationPage>
    </AuthProvider>
  )
}

export default App