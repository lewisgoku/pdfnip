import { useState, useEffect, useMemo, useRef } from 'react'
import DropZone from '../components/DropZone'
import PageMeta from '../components/PageMeta'
import { imagesToPdf, type PageSize } from '../tools/imagesToPdf'
import { formatBytes } from '../utils/formatBytes'

type Status = 'idle' | 'ready' | 'converting' | 'done' | 'error'

type ImageFile = {
  file: File
  id: string
}

const PAGE_SIZES: { value: PageSize; label: string }[] = [
  { value: 'a4', label: 'A4' },
  { value: 'letter', label: 'Letter' },
  { value: 'image', label: 'Match image size' },
]

function isJpeg(file: File) {
  return file.type === 'image/jpeg'
}

function isPng(file: File) {
  return file.type === 'image/png'
}

export default function ImagesToPdf() {
  const [status, setStatus] = useState<Status>('idle')
  const [files, setFiles] = useState<ImageFile[]>([])
  const [pageSize, setPageSize] = useState<PageSize>('a4')
  const [result, setResult] = useState<Uint8Array | null>(null)
  const [error, setError] = useState<string | null>(null)
  const dragIndex = useRef<number | null>(null)

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
    for (const f of incoming) {
      if (!isJpeg(f) && !isPng(f)) {
        setError('Only JPG and PNG images are supported.')
        setStatus('error')
        return
      }
    }

    const all = [...files.map((f) => f.file), ...incoming]

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
    setFiles((prev) => [...prev, ...next])
    setError(null)
    setStatus('ready')
  }

  function removeFile(id: string) {
    const next = files.filter((f) => f.id !== id)
    setFiles(next)
    if (next.length === 0) setStatus('idle')
  }

  function handleDragStart(index: number) {
    dragIndex.current = index
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex.current === null || dragIndex.current === targetIndex) return
    setFiles((prev) => {
      const next = [...prev]
      const [moved] = next.splice(dragIndex.current!, 1)
      next.splice(targetIndex, 0, moved)
      return next
    })
    dragIndex.current = null
  }

  async function handleConvert() {
    setError(null)
    setStatus('converting')
    try {
      const output = await imagesToPdf(files.map((f) => f.file), pageSize)
      setResult(output)
      setStatus('done')
    } catch {
      setError('Something went wrong. Please try again.')
      setStatus('ready')
    }
  }

  function handleReset() {
    setStatus('idle')
    setFiles([])
    setResult(null)
    setError(null)
    setPageSize('a4')
  }

  const totalSize = files.reduce((sum, f) => sum + f.file.size, 0)

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <PageMeta
        title="PDFNip | Images to PDF"
        description="Convert JPG and PNG images to a PDF for free, right in your browser. Drag to reorder pages. No uploads, no account needed."
        path="/images-to-pdf"
      />
      <h1 className="text-2xl font-semibold text-white mb-2">Images to PDF</h1>
      <p className="text-gray-400 mb-8">
        Convert JPG and PNG images into a single PDF — all processing happens in your browser.
      </p>

      {(status === 'idle' || status === 'error') && (
        <>
          <DropZone
            accept="image/jpeg,image/png"
            multiple
            onFiles={handleFiles}
            label="Drop your images here or click to browse"
          />
          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
          <p className="text-gray-600 text-xs mt-3">
            Your files never leave your browser · Ads keep this tool free.
          </p>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="bg-surface rounded-xl p-4">
              <p className="text-2xl mb-2">🖼️</p>
              <p className="text-white text-xs font-medium mb-1">Drop your images</p>
              <p className="text-gray-500 text-xs">Add 1–20 JPG or PNG files, max 50 MB total</p>
            </div>
            <div className="bg-surface rounded-xl p-4">
              <p className="text-2xl mb-2">↕️</p>
              <p className="text-white text-xs font-medium mb-1">Reorder</p>
              <p className="text-gray-500 text-xs">Drag images into the page order you want</p>
            </div>
            <div className="bg-surface rounded-xl p-4">
              <p className="text-2xl mb-2">⬇️</p>
              <p className="text-white text-xs font-medium mb-1">Download PDF</p>
              <p className="text-gray-500 text-xs">One image per page, instant download</p>
            </div>
          </div>
        </>
      )}

      {status === 'ready' && (
        <div className="space-y-4">
          <p className="text-gray-400 text-xs">
            {files.length} {files.length === 1 ? 'image' : 'images'} · {formatBytes(totalSize)}
          </p>
          <ul className="space-y-2">
            {files.map((mf, index) => (
              <li
                key={mf.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(index)}
                className="flex items-center gap-3 bg-surface rounded-xl px-4 py-3"
              >
                <span className="text-gray-600 cursor-grab select-none">⠿</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{mf.file.name}</p>
                  <p className="text-gray-400 text-xs">{formatBytes(mf.file.size)}</p>
                </div>
                <button
                  onClick={() => removeFile(mf.id)}
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
            onClick={handleConvert}
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
            <p className="text-white font-semibold">
              {files.length} {files.length === 1 ? 'image' : 'images'} · {formatBytes(result.byteLength)}
            </p>
          </div>
          <a
            href={downloadUrl}
            download="images.pdf"
            className="block w-full py-3 rounded-full bg-primary text-bg font-semibold text-sm text-center hover:opacity-90 transition-opacity"
          >
            Download
          </a>
          <button
            onClick={handleReset}
            className="w-full py-2 text-gray-400 text-sm hover:text-white transition-colors"
          >
            Convert more images
          </button>
        </div>
      )}
    </div>
  )
}
