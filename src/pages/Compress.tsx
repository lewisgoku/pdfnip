import { useState, useEffect, useMemo } from 'react'
import DropZone from '../components/DropZone'
import { compressPDF, type Quality } from '../tools/compress'
import { formatBytes } from '../utils/formatBytes'
import PageMeta from '../components/PageMeta'

type Status = 'idle' | 'ready' | 'compressing' | 'done' | 'error'

const QUALITY_OPTIONS: { value: Quality; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

export default function Compress() {
  const [status, setStatus] = useState<Status>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [quality, setQuality] = useState<Quality>('medium')
  const [progress, setProgress] = useState({ page: 0, total: 0 })
  const [result, setResult] = useState<ArrayBuffer | null>(null)
  const [error, setError] = useState<string | null>(null)

  const downloadUrl = useMemo(() => {
    if (!result) return null
    return URL.createObjectURL(new Blob([result], { type: 'application/pdf' }))
  }, [result])

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    }
  }, [downloadUrl])

  function handleFiles(files: File[]) {
    const f = files[0]
    if (!f) return
    const isPDF =
      f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
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
  }

  async function handleCompress() {
    if (!file) return
    setStatus('compressing')
    setProgress({ page: 0, total: 0 })
    try {
      const output = await compressPDF(file, quality, (page, total) => {
        setProgress({ page, total })
      })
      setResult(output)
      setStatus('done')
    } catch {
      setError('Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  function handleReset() {
    setStatus('idle')
    setFile(null)
    setResult(null)
    setError(null)
    setProgress({ page: 0, total: 0 })
  }

  const downloadName = file
    ? `${file.name.replace(/\.pdf$/i, '')}_${quality}_compressPDF_pdfnip.com.pdf`
    : ''

  const savingPct = result && file
    ? Math.max(0, Math.round((1 - result.byteLength / file.size) * 100))
    : 0

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <PageMeta
        title="PDFNip | Compress PDF"
        description="Reduce your PDF file size for free, instantly in your browser. Choose Low, Medium, or High compression. No uploads, no account needed."
        path="/compress"
      />
      <h1 className="text-2xl font-semibold text-white mb-2">Compress PDF</h1>
      <p className="text-gray-400 mb-8">
        Reduce your PDF file size — all processing happens in your browser.
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
              <p className="text-2xl mb-2">⚙️</p>
              <p className="text-white text-xs font-medium mb-1">Pick quality</p>
              <p className="text-gray-500 text-xs">Low, Medium, or High — your choice</p>
            </div>
            <div className="bg-surface rounded-xl p-4">
              <p className="text-2xl mb-2">⬇️</p>
              <p className="text-white text-xs font-medium mb-1">Download</p>
              <p className="text-gray-500 text-xs">Get your smaller PDF instantly</p>
            </div>
          </div>
        </>
      )}

      {status === 'ready' && file && (
        <div className="space-y-6">
          <div className="bg-surface rounded-xl p-4">
            <p className="text-white text-sm font-medium">{file.name}</p>
            <p className="text-gray-400 text-xs mt-0.5">{formatBytes(file.size)}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm mb-3">Quality</p>
            <div className="flex gap-3">
              {QUALITY_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setQuality(value)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    quality === value
                      ? 'bg-primary text-bg'
                      : 'bg-surface text-gray-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleCompress}
            className="w-full py-3 rounded-full bg-primary text-bg font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Compress
          </button>
        </div>
      )}

      {status === 'compressing' && (
        <div className="space-y-4">
          <div className="w-full bg-surface rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{
                width:
                  progress.total > 0
                    ? `${(progress.page / progress.total) * 100}%`
                    : '0%',
              }}
            />
          </div>
          <p className="text-gray-400 text-sm text-center">
            {progress.total > 0
              ? `Processing page ${progress.page} of ${progress.total}…`
              : 'Starting…'}
          </p>
        </div>
      )}

      {status === 'done' && result && file && downloadUrl && (
        <div className="space-y-6">
          <div className="bg-surface rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div className="text-center">
                <p className="text-gray-400 text-xs mb-1">Original</p>
                <p className="text-white font-semibold">{formatBytes(file.size)}</p>
              </div>
              <span className="text-gray-600 text-xl">→</span>
              <div className="text-center">
                <p className="text-gray-400 text-xs mb-1">Compressed</p>
                <p className="text-primary font-semibold">
                  {formatBytes(result.byteLength)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-xs mb-1">Saving</p>
                <p className="text-primary font-semibold">{savingPct}%</p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
              <span className="text-gray-500">Quality · <span className="text-white capitalize">{quality}</span></span>
              <span className="text-gray-500 truncate ml-4 max-w-[60%] text-right">{file.name}</span>
            </div>
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
            Compress another PDF
          </button>
        </div>
      )}
    </div>
  )
}
