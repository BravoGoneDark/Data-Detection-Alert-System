import { useState } from 'react'

const API_URL = 'http://localhost:8000'

function App() {
  const [file, setFile] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleFileChange = (e) => {
    setFile(e.target.files[0])
    setResult(null)
    setError(null)
  }

  const handleUpload = async () => {
    if (!file) return

    setLoading(true)
    setError(null)
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${API_URL}/datasets/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`)
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-900 rounded-2xl p-8 shadow-xl border border-slate-800">
        <h1 className="text-2xl font-bold mb-1">DDAS</h1>
        <p className="text-slate-400 text-sm mb-6">
          Data Download Duplication & Anomaly Detection
        </p>

        <input
          type="file"
          onChange={handleFileChange}
          className="block w-full text-sm text-slate-300 mb-4
                     file:mr-4 file:py-2 file:px-4
                     file:rounded-lg file:border-0
                     file:bg-blue-600 file:text-white
                     file:cursor-pointer hover:file:bg-blue-500"
        />

        <button
          onClick={handleUpload}
          disabled={!file || loading}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700
                     disabled:cursor-not-allowed text-white font-medium
                     py-2 rounded-lg transition-colors"
        >
          {loading ? 'Checking...' : 'Upload & Check'}
        </button>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-950 border border-red-800 text-red-300 text-sm">
            Error: {error}
          </div>
        )}

        {result && (
          <div
            className={`mt-4 p-4 rounded-lg border text-sm ${
              result.duplicate
                ? 'bg-amber-950 border-amber-800 text-amber-200'
                : 'bg-emerald-950 border-emerald-800 text-emerald-200'
            }`}
          >
            <p className="font-semibold mb-2">
              {result.duplicate ? '⚠ Duplicate detected' : '✓ Unique dataset'}
            </p>
            <p className="text-xs opacity-80 break-all mb-1">
              SHA-256: {result.sha256}
            </p>
            <p className="text-xs opacity-80 mb-1">
              Size: {(result.size_bytes / 1024).toFixed(1)} KB
            </p>

            {result.duplicate && result.existing && (
              <div className="mt-3 pt-3 border-t border-amber-800/50">
                <p className="opacity-80">
                  Matches existing file: <strong>{result.existing.filename}</strong>
                </p>
                <p className="opacity-80 text-xs">
                  Uploaded: {new Date(result.existing.uploaded_at).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App