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
                Stage 5: CAS & Duplicate Refinement
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
                  {loading ? 'Processing & Computing Hash...' : 'Upload & Analyze'}
                </button>
              </div>
            </div>

            {/* Duplicate Detection Refined Alert Card */}
            {result && result.duplicate && result.existing && (
              <div className="bg-amber-950/40 border border-amber-600/60 rounded-2xl p-6 space-y-4 shadow-lg backdrop-blur-md">
                <div className="flex items-center gap-2 text-amber-300">
                  <span className="text-xl">⚠</span>
                  <h3 className="font-semibold text-base">Duplicate Dataset Detected</h3>
                </div>

                <p className="text-xs text-amber-200/80 leading-relaxed">
                  An identical dataset with this cryptographic signature already exists in the system. Single-Instance Storage avoids duplicate storage overhead.
                </p>

                <div className="bg-slate-950/80 border border-amber-800/40 rounded-xl p-4 space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-slate-800">
                    <span className="text-slate-400">Canonical Filename:</span>
                    <span className="font-mono text-amber-200 font-medium">{result.existing.filename}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-800">
                    <span className="text-slate-400">Original Uploader:</span>
                    <span className="text-slate-200">{result.existing.uploader_username || 'System'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-800">
                    <span className="text-slate-400">Classification:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${getClassificationBadge(result.existing.classification)}`}>
                      {result.existing.classification}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-800">
                    <span className="text-slate-400">Upload Date:</span>
                    <span className="text-slate-300">{new Date(result.existing.uploaded_at).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-800">
                    <span className="text-slate-400">File Size:</span>
                    <span className="text-slate-300 font-mono">{(result.size_bytes / 1024).toFixed(1)} KB</span>
                  </div>
                  <div className="pt-1">
                    <span className="text-slate-500 block text-[10px] uppercase tracking-wider mb-0.5">SHA-256 Digest:</span>
                    <span className="font-mono text-[11px] text-amber-300/90 break-all">{result.sha256}</span>
                  </div>
                </div>

                {/* Duplicate Actions */}
                <div className="pt-2 space-y-2">
                  <button
                    onClick={() => handleDownload(result.existing.id, result.existing.filename)}
                    className="w-full py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-black font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    ⬇ Use Existing Dataset (Download)
                  </button>

                  <button
                    onClick={() => handleUpload(true)}
                    disabled={loading}
                    className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs transition-colors"
                  >
                    ⚡ Proceed Anyway (Register Alias Record)
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
                <div className="text-xs space-y-1 text-emerald-200/80">
                  <p>File: <strong className="text-white font-mono">{result.filename}</strong></p>
                  <p>Classification: <strong className="text-white">{result.classification}</strong></p>
                  <p>Size: <span className="font-mono">{(result.size_bytes / 1024).toFixed(1)} KB</span></p>
                  <p className="text-[11px] font-mono break-all opacity-80">SHA-256: {result.sha256}</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Dataset Repository & Downloads */}
          <div className="lg:col-span-8">
            <div className="bg-slate-900/90 rounded-2xl p-6 shadow-xl border border-slate-800/80 backdrop-blur-md">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">Dataset Inventory</h2>
                  <p className="text-xs text-slate-400">
                    Filtered by your role classification clearance.
                  </p>
                </div>
                <button
                  onClick={fetchDatasets}
                  disabled={loadingDatasets}
                  className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
                >
                  {loadingDatasets ? 'Refreshing...' : '🔄 Refresh'}
                </button>
              </div>

              {datasets.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-sm">
                  {loadingDatasets ? 'Loading datasets...' : 'No datasets registered yet. Upload one on the left!'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 px-3">Dataset</th>
                        <th className="py-2.5 px-2">Classification</th>
                        <th className="py-2.5 px-2">Uploader</th>
                        <th className="py-2.5 px-2">Size</th>
                        <th className="py-2.5 px-2">Downloads</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {datasets.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-medium text-slate-200">{d.filename}</div>
                            {d.description && (
                              <div className="text-[11px] text-slate-500 truncate max-w-xs">{d.description}</div>
                            )}
                            <div className="text-[10px] font-mono text-slate-500 truncate max-w-xs">{d.sha256.slice(0, 16)}...</div>
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