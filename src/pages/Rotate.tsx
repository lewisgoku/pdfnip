import { useState, useEffect, useMemo } from 'react'
import DropZone from '../components/DropZone'
import PageMeta from '../components/PageMeta'
import { getPageCount, rotatePDF, type RotationDegrees } from '../tools/rotate'
import { formatBytes } from '../utils/formatBytes'

type Status = 'idle' | 'ready' | 'rotating' | 'done' | 'error'

const ROTATIONS: { value: RotationDegrees; label: string }[] = [
  { value: 90, label: '90° CW' },
  { value: 180, label: '180°' },
  { value: 270, label: '90° CCW' },
]

export default function Rotate() {
  const [status, setStatus] = useState<Status>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState<number | null>(null)
  const [rotation, setRotation] = useState<RotationDegrees>(90)
  const [result, setResult] = useState<Uint8Array | null>(null)
  const [error, setError] = useState<string | null>(null)

  const downloadUrl = useMemo(() => {
    if (!result) return null
    return URL.createObjectURL(new Blob([result as BlobPart], { type: 'application/pdf' }))
  }, [result])

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    }
  }, [downloadUrl])

  function handleFiles(files: File[]) {
    const f = files[0]
    if (!f) return
    const isPDF = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    if (!isPDF) {
      setError('Please select a valid PDF file.')
      setStatus('error')
      return
    }
    if (f.size > 100 * 1024 * 1024) {
      setError('File is too large (max 100MB).')
      setStatus('error')
      return
    }
    setFile(f)
    setError(null)
    setStatus('ready')
    getPageCount(f).then(setPageCount).catch(() => setError('Could not read page count.'))
  }

  async function handleApply() {
    if (!file) return
    setStatus('rotating')
    try {
      const output = await rotatePDF(file, rotation)
      setResult(output)
      setStatus('done')
    } catch {
      setError('Something went wrong. Please try again.')
      setStatus('ready')
    }
  }

  function handleReset() {
    setStatus('idle')
    setFile(null)
    setPageCount(null)
    setResult(null)
    setError(null)
    setRotation(90)
  }

  const downloadName = file ? file.name.replace(/\.pdf$/i, '-rotated.pdf') : 'rotated.pdf'

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <PageMeta
        title="PDFNip | Rotate PDF"
        description="Rotate all pages of a PDF for free, instantly in your browser. Choose 90°, 180°, or 270° and download instantly. No uploads needed."
        path="/rotate"
      />
      <h1 className="text-2xl font-semibold text-white mb-2">Rotate PDF</h1>
      <p className="text-gray-400 mb-8">
        Rotate all pages in your PDF — all processing happens in your browser.
      </p>

      {(status === 'idle' || status === 'error') && (
        <>
          <DropZone accept="application/pdf" onFiles={handleFiles} />
          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
          <p className="text-gray-600 text-xs mt-3">
            Your file never leaves your browser · Ads keep this tool free.
          </p>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="bg-surface rounded-xl p-4">
              <p className="text-2xl mb-2">📄</p>
              <p className="text-white text-xs font-medium mb-1">Drop your PDF</p>
              <p className="text-gray-500 text-xs">Upload any PDF up to 100 MB</p>
            </div>
            <div className="bg-surface rounded-xl p-4">
              <p className="text-2xl mb-2">🔄</p>
              <p className="text-white text-xs font-medium mb-1">Pick rotation</p>
              <p className="text-gray-500 text-xs">90° CW, 180°, or 90° CCW</p>
            </div>
            <div className="bg-surface rounded-xl p-4">
              <p className="text-2xl mb-2">⬇️</p>
              <p className="text-white text-xs font-medium mb-1">Download</p>
              <p className="text-gray-500 text-xs">Get your rotated PDF instantly</p>
            </div>
          </div>
        </>
      )}

      {status === 'ready' && file && (
        <div className="space-y-6">
          <div className="bg-surface rounded-xl p-4">
            <p className="text-white text-sm font-medium">{file.name}</p>
            <p className="text-gray-400 text-xs mt-0.5">
              {formatBytes(file.size)}
              {pageCount !== null ? ` · ${pageCount} pages` : ''}
            </p>
          </div>

          <div>
            <p className="text-gray-400 text-sm mb-3">Rotation</p>
            <div className="flex gap-3">
              {ROTATIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setRotation(value)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    rotation === value
                      ? 'bg-primary text-bg'
                      : 'bg-surface text-gray-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={handleApply}
            disabled={status !== 'ready'}
            className="w-full py-3 rounded-full bg-primary text-bg font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply & Download
          </button>
        </div>
      )}

      {status === 'rotating' && (
        <p className="text-gray-400 text-sm text-center">Rotating…</p>
      )}

      {status === 'done' && result && downloadUrl && (
        <div className="space-y-6">
          <div className="bg-surface rounded-xl p-6 text-center">
            <p className="text-white font-semibold">
              {downloadName} · {formatBytes(result.byteLength)}
            </p>
          </div>
          <a
            href={downloadUrl}
            download={downloadName}
            className="block w-full py-3 rounded-full bg-primary text-bg font-semibold text-sm text-center hover:opacity-90 transition-opacity"
          >
            Download
          </a>
          <button
            onClick={handleReset}
            className="w-full py-2 text-gray-400 text-sm hover:text-white transition-colors"
          >
            Rotate another PDF
          </button>
        </div>
      )}
    </div>
  )
}
