import { useState, useEffect, useMemo, useRef } from 'react'
import DropZone from '../components/DropZone'
import PageMeta from '../components/PageMeta'
import { pdfToImages, type ImageFormat, type ImageQuality } from '../tools/pdfToImages'
import { imagesToPdf, type PageSize } from '../tools/imagesToPdf'
import { formatBytes } from '../utils/formatBytes'

type Direction = 'pdf-to-images' | 'images-to-pdf' | null
type Status = 'idle' | 'ready' | 'converting' | 'done' | 'error'

type ImageFile = {
  file: File
  id: string
}

const FORMATS: { value: ImageFormat; label: string }[] = [
  { value: 'jpg', label: 'JPG' },
  { value: 'png', label: 'PNG' },
]

const QUALITIES: { value: ImageQuality; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

const PAGE_SIZES: { value: PageSize; label: string }[] = [
  { value: 'a4', label: 'A4' },
  { value: 'letter', label: 'Letter' },
  { value: 'image', label: 'Match image size' },
]

function isJpeg(file: File) { return file.type === 'image/jpeg' }
function isPng(file: File) { return file.type === 'image/png' }

export default function Convert() {
  const [direction, setDirection] = useState<Direction>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  // PDF→Images state
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [format, setFormat] = useState<ImageFormat>('jpg')
  const [quality, setQuality] = useState<ImageQuality>('medium')

  // Images→PDF state
  const [imageFiles, setImageFiles] = useState<ImageFile[]>([])
  const [pageSize, setPageSize] = useState<PageSize>('a4')
  const dragIndex = useRef<number | null>(null)

  // Shared result
  const [result, setResult] = useState<Uint8Array | null>(null)

  const downloadUrl = useMemo(() => {
    if (!result) return null
    const mimeType = direction === 'pdf-to-images' ? 'application/zip' : 'application/pdf'
    return URL.createObjectURL(new Blob([result as BufferSource], { type: mimeType }))
  }, [result, direction])

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    }
  }, [downloadUrl])

  // Resets everything — called from "← Change direction"
  function handleReset() {
    setDirection(null)
    setStatus('idle')
    setError(null)
    setPdfFile(null)
    setFormat('jpg')
    setQuality('medium')
    setImageFiles([])
    setPageSize('a4')
    setResult(null)
  }

  function pickDirection(d: Direction) {
    setDirection(d)
    setStatus('idle')
    setError(null)
  }

  // ── PDF→Images handlers ────────────────────────────────────────────────────

  function handlePdfFiles(files: File[]) {
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
    setPdfFile(f)
    setError(null)
    setStatus('ready')
  }

  async function handlePdfConvert() {
    if (!pdfFile) return
    setError(null)
    setStatus('converting')
    const effectiveQuality = format === 'png' ? 'medium' : quality
    try {
      const output = await pdfToImages(pdfFile, format, effectiveQuality)
      setResult(output)
      setStatus('done')
    } catch {
      setError('Something went wrong. Please try again.')
      setStatus('ready')
    }
  }

  // Resets pdf-to-images flow but keeps direction
  function handlePdfReset() {
    setPdfFile(null)
    setFormat('jpg')
    setQuality('medium')
    setResult(null)
    setError(null)
    setStatus('idle')
  }

  const pdfDownloadName = pdfFile
    ? pdfFile.name.replace(/\.pdf$/i, '-images.zip')
    : 'images.zip'

  // ── Images→PDF handlers ────────────────────────────────────────────────────

  function handleImageFiles(incoming: File[]) {
    for (const f of incoming) {
      if (!isJpeg(f) && !isPng(f)) {
        setError('Only JPG and PNG images are supported.')
        setStatus('error')
        return
      }
    }
    const all = [...imageFiles.map((f) => f.file), ...incoming]
    if (all.length > 20) {
      setError('Maximum 20 images allowed.')
      setStatus('error')
      return
    }
    const totalSize = all.reduce((sum, f) => sum + f.size, 0)
    if (totalSize > 50 * 1024 * 1024) {
      setError('Total size exceeds 50 MB limit.')
      setStatus('error')
      return
    }
    const next: ImageFile[] = incoming.map((f) => ({ file: f, id: crypto.randomUUID() }))
    setImageFiles((prev) => [...prev, ...next])
    setError(null)
    setStatus('ready')
  }

  function removeImageFile(id: string) {
    const next = imageFiles.filter((f) => f.id !== id)
    setImageFiles(next)
    if (next.length === 0) setStatus('idle')
  }

  function handleDragStart(index: number) {
    dragIndex.current = index
  }

  function handleDropReorder(targetIndex: number) {
    const from = dragIndex.current
    if (from === null || from === targetIndex) return
    setImageFiles((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(targetIndex, 0, moved)
      return next
    })
    dragIndex.current = null
  }

  async function handleImagesConvert() {
    setError(null)
    setStatus('converting')
    try {
      const output = await imagesToPdf(imageFiles.map((f) => f.file), pageSize)
      setResult(output)
      setStatus('done')
    } catch {
      setError('Something went wrong. Please try again.')
      setStatus('ready')
    }
  }

  // Resets images-to-pdf flow but keeps direction
  function handleImagesReset() {
    setImageFiles([])
    setPageSize('a4')
    setResult(null)
    setError(null)
    setStatus('idle')
  }

  const totalImageSize = imageFiles.reduce((sum, f) => sum + f.file.size, 0)

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <PageMeta
        title="PDFNip | Convert PDF & Images"
        description="Convert PDF pages to JPG or PNG images, or combine images into a PDF — all free, right in your browser. No uploads needed."
        path="/convert"
      />
      <h1 className="text-2xl font-semibold text-white mb-2">Convert PDF & Images</h1>
      <p className="text-gray-400 mb-8">
        Convert PDFs to images or build a PDF from your images — all processing happens in your browser.
      </p>

      {/* Direction picker */}
      {direction === null && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => pickDirection('pdf-to-images')}
              aria-label="PDF → Images"
              className="bg-surface rounded-xl p-6 text-left hover:ring-1 hover:ring-primary transition-all"
            >
              <p className="text-2xl mb-3">📄</p>
              <p className="text-white font-semibold text-sm mb-1">PDF → Images</p>
              <p className="text-gray-500 text-xs">Convert every page to JPG or PNG · ZIP output</p>
            </button>
            <button
              onClick={() => pickDirection('images-to-pdf')}
              aria-label="Images → PDF"
              className="bg-surface rounded-xl p-6 text-left hover:ring-1 hover:ring-primary transition-all"
            >
              <p className="text-2xl mb-3">🖼️</p>
              <p className="text-white font-semibold text-sm mb-1">Images → PDF</p>
              <p className="text-gray-500 text-xs">Combine JPG and PNG images into one PDF</p>
            </button>
          </div>
          <p className="text-gray-600 text-xs mt-3">
            Your files never leave your browser · Ads keep this tool free.
          </p>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="bg-surface rounded-xl p-4">
              <p className="text-2xl mb-2">👆</p>
              <p className="text-white text-xs font-medium mb-1">Pick a direction</p>
              <p className="text-gray-500 text-xs">PDF to images or images to PDF</p>
            </div>
            <div className="bg-surface rounded-xl p-4">
              <p className="text-2xl mb-2">⚙️</p>
              <p className="text-white text-xs font-medium mb-1">Configure options</p>
              <p className="text-gray-500 text-xs">Format, quality, page size</p>
            </div>
            <div className="bg-surface rounded-xl p-4">
              <p className="text-2xl mb-2">⬇️</p>
              <p className="text-white text-xs font-medium mb-1">Download instantly</p>
              <p className="text-gray-500 text-xs">No uploads, no waiting</p>
            </div>
          </div>
        </>
      )}

      {/* PDF → Images flow */}
      {direction === 'pdf-to-images' && (
        <>
          <button
            onClick={handleReset}
            aria-label="← Change direction"
            className="text-gray-400 text-sm hover:text-white transition-colors mb-6 flex items-center gap-1"
          >
            ← Change direction
          </button>

          {(status === 'idle' || status === 'error') && (
            <>
              <DropZone accept="application/pdf" onFiles={handlePdfFiles} />
              {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
              <p className="text-gray-600 text-xs mt-3">
                Your file never leaves your browser · Ads keep this tool free.
              </p>
            </>
          )}

          {status === 'ready' && pdfFile && (
            <div className="space-y-6">
              <div className="bg-surface rounded-xl p-4">
                <p className="text-white text-sm font-medium">{pdfFile.name}</p>
                <p className="text-gray-400 text-xs mt-0.5">{formatBytes(pdfFile.size)}</p>
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
                onClick={handlePdfConvert}
                className="w-full py-3 rounded-full bg-primary text-bg font-semibold text-sm hover:opacity-90 transition-opacity"
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
                  {pdfDownloadName} · {formatBytes(result.byteLength)}
                </p>
              </div>
              <a
                href={downloadUrl}
                download={pdfDownloadName}
                className="block w-full py-3 rounded-full bg-primary text-bg font-semibold text-sm text-center hover:opacity-90 transition-opacity"
              >
                Download
              </a>
              <button
                onClick={handlePdfReset}
                className="w-full py-2 text-gray-400 text-sm hover:text-white transition-colors"
              >
                Convert another PDF
              </button>
            </div>
          )}
        </>
      )}

      {/* Images → PDF flow */}
      {direction === 'images-to-pdf' && (
        <>
          <button
            onClick={handleReset}
            aria-label="← Change direction"
            className="text-gray-400 text-sm hover:text-white transition-colors mb-6 flex items-center gap-1"
          >
            ← Change direction
          </button>

          {(status === 'idle' || status === 'error') && (
            <>
              <DropZone
                accept="image/jpeg,image/png"
                multiple
                onFiles={handleImageFiles}
                label="Drop your images here or click to browse"
              />
              {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
              <p className="text-gray-600 text-xs mt-3">
                Your files never leave your browser · Ads keep this tool free.
              </p>
            </>
          )}

          {status === 'ready' && (
            <div className="space-y-4">
              <p className="text-gray-400 text-xs">
                {imageFiles.length} {imageFiles.length === 1 ? 'image' : 'images'} ·{' '}
                {formatBytes(totalImageSize)}
              </p>
              <ul className="space-y-2">
                {imageFiles.map((mf, index) => (
                  <li
                    key={mf.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDropReorder(index)}
                    className="flex items-center gap-3 bg-surface rounded-xl px-4 py-3"
                  >
                    <span className="text-gray-600 cursor-grab select-none">⠿</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{mf.file.name}</p>
                      <p className="text-gray-400 text-xs">{formatBytes(mf.file.size)}</p>
                    </div>
                    <button
                      onClick={() => removeImageFile(mf.id)}
                      className="text-gray-600 hover:text-red-400 transition-colors text-sm"
                      aria-label={`Remove ${mf.file.name}`}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
              <div>
                <p className="text-gray-400 text-sm mb-3">Page size</p>
                <div className="flex gap-3">
                  {PAGE_SIZES.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setPageSize(value)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        pageSize === value
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
                onClick={handleImagesConvert}
                className="w-full py-3 rounded-full bg-primary text-bg font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                Convert to PDF
              </button>
            </div>
          )}

          {status === 'converting' && (
            <p className="text-gray-400 text-sm text-center">Converting…</p>
          )}

          {status === 'done' && result && downloadUrl && (
            <div className="space-y-6">
              <div className="bg-surface rounded-xl p-6 text-center">
                <p className="text-white font-semibold">{formatBytes(result.byteLength)}</p>
              </div>
              <a
                href={downloadUrl}
                download="images.pdf"
                className="block w-full py-3 rounded-full bg-primary text-bg font-semibold text-sm text-center hover:opacity-90 transition-opacity"
              >
                Download
              </a>
              <button
                onClick={handleImagesReset}
                className="w-full py-2 text-gray-400 text-sm hover:text-white transition-colors"
              >
                Convert more images
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
