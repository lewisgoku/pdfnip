import { useState, useEffect, useMemo } from 'react'
import DropZone from '../components/DropZone'
import PageMeta from '../components/PageMeta'
import { protectPdf, MAX_BYTES, type ProtectPermissions } from '../tools/protectPdf'
import { formatBytes } from '../utils/formatBytes'

type Status = 'idle' | 'ready' | 'protecting' | 'done'

function getDownloadName(file: File): string {
  const dotIndex = file.name.lastIndexOf('.')
  const base = dotIndex >= 0 ? file.name.slice(0, dotIndex) : file.name
  return `${base}-protected.pdf`
}

export default function ProtectPdf() {
  const [status, setStatus] = useState<Status>('idle')
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [permissions, setPermissions] = useState<ProtectPermissions>({
    printing: true,
    copying: true,
    editing: true,
  })
  const [result, setResult] = useState<Uint8Array | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dropError, setDropError] = useState<string | null>(null)

  const downloadUrl = useMemo(() => {
    if (!result) return null
    return URL.createObjectURL(new Blob([result as BufferSource], { type: 'application/pdf' }))
  }, [result])

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    }
  }, [downloadUrl])

  function handleFiles(incoming: File[]) {
    const file = incoming[0]
    if (!file || file.type !== 'application/pdf') {
      setDropError('Please select a valid PDF file.')
      return
    }
    if (file.size > MAX_BYTES) {
      setDropError('File is too large (max 100MB).')
      return
    }
    setDropError(null)
    setCurrentFile(file)
    setPassword('')
    setConfirmPassword('')
    setError(null)
    setStatus('ready')
  }

  const passwordError =
    password === ''
      ? 'Please enter a password.'
      : password !== confirmPassword
        ? 'Passwords do not match.'
        : null

  const canSubmit = passwordError === null

  async function handleProtect() {
    if (!currentFile || !canSubmit) return
    setError(null)
    setStatus('protecting')
    try {
      const output = await protectPdf(currentFile, password, permissions)
      setResult(output)
      setStatus('done')
    } catch {
      setError('Something went wrong. Please try again.')
      setStatus('ready')
    }
  }

  function handleReset() {
    setStatus('idle')
    setCurrentFile(null)
    setPassword('')
    setConfirmPassword('')
    setPermissions({ printing: true, copying: true, editing: true })
    setResult(null)
    setError(null)
    setDropError(null)
  }

  function togglePermission(key: keyof ProtectPermissions) {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const PERMISSION_LABELS: { key: keyof ProtectPermissions; label: string }[] = [
    { key: 'printing', label: 'Allow printing' },
    { key: 'copying', label: 'Allow copying text' },
    { key: 'editing', label: 'Allow editing' },
  ]

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <PageMeta
        title="PDFNip | Protect PDF"
        description="Add a password to your PDF for free, right in your browser. No uploads, no account needed."
        path="/protect-pdf"
      />
      <h1 className="text-2xl font-semibold text-white mb-2">Protect PDF</h1>
      <p className="text-gray-400 mb-8">
        Add a password and restrict permissions — all processing happens in your browser.
      </p>

      {status === 'idle' && (
        <>
          <DropZone
            accept="application/pdf"
            multiple={false}
            onFiles={handleFiles}
            label="Drop your PDF here or click to browse"
          />
          {dropError && <p className="text-red-400 text-sm mt-3">{dropError}</p>}
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
              <p className="text-2xl mb-2">🔒</p>
              <p className="text-white text-xs font-medium mb-1">Set a password</p>
              <p className="text-gray-500 text-xs">Choose permissions too</p>
            </div>
            <div className="bg-surface rounded-xl p-4">
              <p className="text-2xl mb-2">⬇️</p>
              <p className="text-white text-xs font-medium mb-1">Download</p>
              <p className="text-gray-500 text-xs">Password-protected PDF ready</p>
            </div>
          </div>
        </>
      )}

      {status === 'ready' && currentFile && (
        <div className="space-y-6">
          <div className="bg-surface rounded-xl p-4">
            <p className="text-white text-sm font-medium">{currentFile.name}</p>
            <p className="text-gray-400 text-xs mt-0.5">{formatBytes(currentFile.size)}</p>
          </div>
          <div className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full bg-surface text-white text-sm rounded-xl px-4 py-3 border border-white/10 focus:outline-none focus:border-primary"
              autoFocus
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              className="w-full bg-surface text-white text-sm rounded-xl px-4 py-3 border border-white/10 focus:outline-none focus:border-primary"
            />
            {(password !== '' || confirmPassword !== '') && passwordError && (
              <p className="text-red-400 text-sm">{passwordError}</p>
            )}
          </div>
          <div>
            <p className="text-gray-400 text-sm mb-3">Restrict actions (optional)</p>
            <div className="space-y-2">
              {PERMISSION_LABELS.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permissions[key]}
                    onChange={() => togglePermission(key)}
                    className="accent-primary w-4 h-4"
                  />
                  <span className="text-gray-300 text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            onClick={handleProtect}
            disabled={!canSubmit}
            className="w-full py-3 rounded-full bg-primary text-bg font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Protect PDF
          </button>
        </div>
      )}

      {status === 'protecting' && (
        <p className="text-gray-400 text-sm text-center">Protecting…</p>
      )}

      {status === 'done' && result && downloadUrl && currentFile && (
        <div className="space-y-6">
          <div className="bg-surface rounded-xl p-6 text-center">
            <p className="text-white font-semibold">{formatBytes(result.byteLength)}</p>
            <p className="text-gray-500 text-xs mt-1">Password-protected PDF</p>
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
            Protect another PDF
          </button>
        </div>
      )}
    </div>
  )
}
