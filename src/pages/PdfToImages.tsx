import { useState, useEffect, useMemo } from 'react'
import DropZone from '../components/DropZone'
import PageMeta from '../components/PageMeta'
import { pdfToImages, type ImageFormat, type ImageQuality } from '../tools/pdfToImages'
import { formatBytes } from '../utils/formatBytes'

type Status = 'idle' | 'ready' | 'converting' | 'done' | 'error'

const FORMATS: { value: ImageFormat; label: string }[] = [
  { value: 'jpg', label: 'JPG' },
  { value: 'png', label: 'PNG' },
]

const QUALITIES: { value: ImageQuality; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

export default function PdfToImages() {
  const [status, setStatus] = useState<Status>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [format, setFormat] = useState<ImageFormat>('jpg')
  const [quality, setQuality] = useState<ImageQuality>('medium')
  const [result, setResult] = useState<Uint8Array | null>(null)
  const [error, setError] = useState<string | null>(null)

  const downloadUrl = useMemo(() => {
    if (!result) return null
    return URL.createObjectURL(new Blob([result as BlobPart], { type: 'application/zip' }))
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
  }

  async function handleConvert() {
    if (!file) return
    setStatus('converting')
    try {
      const output = await pdfToImages(file, format, quality)
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
    setResult(null)
    setError(null)
    setFormat('jpg')
    setQuality('medium')
  }

  const downloadName = file ? file.name.replace(/\.pdf$/i, '-images.zip') : 'images.zip'

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <PageMeta
        title="PDFNip | PDF to Images"
        description="Convert PDF pages to JPG or PNG images for free, instantly in your browser. Download all pages as a ZIP. No uploads needed."
        path="/pdf-to-images"
      />
      <h1 className="text-2xl font-semibold text-white mb-2">PDF to Images</h1>
      <p className="text-gray-400 mb-8">
        Convert every page to a JPG or PNG — all processing happens in your browser.
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
              <p className="text-2xl mb-2">🖼️</p>
              <p className="text-white text-xs font-medium mb-1">Pick format</p>
              <p className="text-gray-500 text-xs">JPG or PNG, Low / Medium / High quality</p>
            </div>
            <div className="bg-surface rounded-xl p-4">
              <p className="text-2xl mb-2">⬇️</p>
              <p className="text-white text-xs font-medium mb-1">Download ZIP</p>
              <p className="text-gray-500 text-xs">One image per page, packed into a ZIP</p>
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
            <p className="text-gray-400 text-sm mb-3">Format</p>
            <div className="flex gap-3">
              {FORMATS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setFormat(value)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    format === value
                      ? 'bg-primary text-bg'
                      : 'bg-surface text-gray-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {format === 'jpg' && (
            <div>
              <p className="text-gray-400 text-sm mb-3">Quality</p>
              <div className="flex gap-3">
                {QUALITIES.map(({ value, label }) => (
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
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={handleConvert}
            disabled={status !== 'ready'}
            className="w-full py-3 rounded-full bg-primary text-bg font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Convert
          </button>
        </div>
      )}

      {status === 'converting' && (
        <p className="text-gray-400 text-sm text-center">Converting…</p>
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
            Convert another PDF
          </button>
        </div>
      )}
    </div>
  )
}
