import { useState, useEffect, useMemo } from 'react'
import DropZone from '../components/DropZone'
import PageMeta from '../components/PageMeta'
import { unlockPdf, PasswordRequiredError, IncorrectPasswordError } from '../tools/unlockPdf'
import { formatBytes } from '../utils/formatBytes'

type Status = 'idle' | 'unlocking' | 'needs_password' | 'done' | 'error'

const MAX_BYTES = 100 * 1024 * 1024

function getDownloadName(file: File): string {
  const dotIndex = file.name.lastIndexOf('.')
  const base = dotIndex >= 0 ? file.name.slice(0, dotIndex) : file.name
  return `${base}-unlocked.pdf`
}

export default function UnlockPdf() {
  const [status, setStatus] = useState<Status>('idle')
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [result, setResult] = useState<Uint8Array | null>(null)
  const [error, setError] = useState<string | null>(null)

  const downloadUrl = useMemo(() => {
    if (!result) return null
    return URL.createObjectURL(new Blob([result as BufferSource], { type: 'application/pdf' }))
  }, [result])

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    }
  }, [downloadUrl])

  async function attemptUnlock(file: File, pwd?: string) {
    setStatus('unlocking')
    setPasswordError(null)
    try {
      const output = await unlockPdf(file, pwd)
      setResult(output)
      setStatus('done')
    } catch (e) {
      if (e instanceof PasswordRequiredError) {
        setStatus('needs_password')
      } else if (e instanceof IncorrectPasswordError) {
        setPasswordError('Incorrect password. Please try again.')
        setStatus('needs_password')
      } else {
        setError('Something went wrong. Please try again.')
        setStatus('error')
      }
    }
  }

  function handleFiles(incoming: File[]) {
    const file = incoming[0]
    if (!file || file.type !== 'application/pdf') {
      setError('Please select a valid PDF file.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('File is too large (max 100MB).')
      return
    }
    setError(null)
    setCurrentFile(file)
    setPassword('')
    void attemptUnlock(file)
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!currentFile) return
    void attemptUnlock(currentFile, password)
  }

  function handleReset() {
    setStatus('idle')
    setCurrentFile(null)
    setPassword('')
    setPasswordError(null)
    setResult(null)
    setError(null)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <PageMeta
        title="PDFNip | Unlock PDF"
        description="Remove password protection and restrictions from a PDF for free, right in your browser. No uploads, no account needed."
        path="/unlock-pdf"
      />
      <h1 className="text-2xl font-semibold text-white mb-2">Unlock PDF</h1>
      <p className="text-gray-400 mb-8">
        Remove password protection and owner restrictions — all processing happens in your browser.
      </p>

      {(status === 'idle' || status === 'error') && (
        <>
          <DropZone
            accept="application/pdf"
            multiple={false}
            onFiles={handleFiles}
            label="Drop your PDF here or click to browse"
          />
          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
          <p className="text-gray-600 text-xs mt-3">
            Your files never leave your browser · Ads keep this tool free.
          </p>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="bg-surface rounded-xl p-4">
              <p className="text-2xl mb-2">📄</p>
              <p className="text-white text-xs font-medium mb-1">Drop your PDF</p>
              <p className="text-gray-500 text-xs">Up to 100 MB</p>
            </div>
            <div className="bg-surface rounded-xl p-4">
              <p className="text-2xl mb-2">🔓</p>
              <p className="text-white text-xs font-medium mb-1">Instant unlock</p>
              <p className="text-gray-500 text-xs">Enter password if prompted</p>
            </div>
            <div className="bg-surface rounded-xl p-4">
              <p className="text-2xl mb-2">⬇️</p>
              <p className="text-white text-xs font-medium mb-1">Download</p>
              <p className="text-gray-500 text-xs">Restrictions-free PDF ready</p>
            </div>
          </div>
        </>
      )}

      {status === 'unlocking' && (
        <p className="text-gray-400 text-sm text-center">Unlocking…</p>
      )}

      {status === 'needs_password' && (
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <p className="text-gray-300 text-sm">
            This PDF is password-protected. Enter the password to unlock it.
          </p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="w-full bg-surface text-white text-sm rounded-xl px-4 py-3 border border-white/10 focus:outline-none focus:border-primary"
            autoFocus
          />
          {passwordError && <p className="text-red-400 text-sm">{passwordError}</p>}
          <button
            type="submit"
            className="w-full py-3 rounded-full bg-primary text-bg font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Unlock
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="w-full py-2 text-gray-400 text-sm hover:text-white transition-colors"
          >
            Use a different file
          </button>
        </form>
      )}

      {status === 'done' && result && downloadUrl && currentFile && (
        <div className="space-y-6">
          <div className="bg-surface rounded-xl p-6 text-center">
            <p className="text-white font-semibold">{formatBytes(result.byteLength)}</p>
            <p className="text-gray-500 text-xs mt-1">Unlocked PDF</p>
          </div>
          <a
            href={downloadUrl}
            download={getDownloadName(currentFile)}
            className="block w-full py-3 rounded-full bg-primary text-bg font-semibold text-sm text-center hover:opacity-90 transition-opacity"
          >
            Download
          </a>
          <button
            onClick={handleReset}
            className="w-full py-2 text-gray-400 text-sm hover:text-white transition-colors"
          >
            Unlock another PDF
          </button>
        </div>
      )}
    </div>
  )
}
