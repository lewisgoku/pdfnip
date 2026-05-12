import { useState, useEffect, useMemo, useRef } from 'react'
import DropZone from '../components/DropZone'
import { mergePDFs, getPageCount } from '../tools/merge'
import { formatBytes } from '../utils/formatBytes'

type Status = 'idle' | 'ready' | 'merging' | 'done' | 'error'

type MergeFile = {
  file: File
  id: string
  pageCount: number | null
}

export default function Merge() {
  const [status, setStatus] = useState<Status>('idle')
  const [files, setFiles] = useState<MergeFile[]>([])
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [result, setResult] = useState<ArrayBuffer | null>(null)
  const [error, setError] = useState<string | null>(null)
  const dragIndex = useRef<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const downloadUrl = useMemo(() => {
    if (!result) return null
    return URL.createObjectURL(new Blob([result], { type: 'application/pdf' }))
  }, [result])

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    }
  }, [downloadUrl])

  function handleFiles(incoming: File[]) {
    const valid: MergeFile[] = []
    let fileError: string | null = null

    for (const f of incoming) {
      const isPDF =
        f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
      if (!isPDF) {
        fileError = 'Please select valid PDF files only.'
        continue
      }
      if (f.size > 100 * 1024 * 1024) {
        fileError = 'One or more files exceed the 100MB limit.'
        continue
      }
      valid.push({ file: f, id: crypto.randomUUID(), pageCount: null })
    }

    if (valid.length === 0) {
      if (fileError) setError(fileError)
      return
    }

    setError(fileError)
    setFiles((prev) => [...prev, ...valid].slice(0, 10))
    setStatus('ready')

    for (const mf of valid) {
      getPageCount(mf.file)
        .then((count) => {
          setFiles((prev) =>
            prev.map((f) => (f.id === mf.id ? { ...f, pageCount: count } : f)),
          )
        })
        .catch(() => {})
    }
  }

  function removeFile(id: string) {
    const next = files.filter((f) => f.id !== id)
    if (next.length < 2) {
      setFiles([])
      setStatus('idle')
    } else {
      setFiles(next)
    }
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

  async function handleMerge() {
    setStatus('merging')
    setProgress({ current: 0, total: files.length })
    try {
      const output = await mergePDFs(
        files.map((f) => f.file),
        (current, total) => setProgress({ current, total }),
      )
      setResult(output)
      setStatus('done')
    } catch {
      setError('Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  function handleReset() {
    setStatus('idle')
    setFiles([])
    setResult(null)
    setError(null)
    setProgress({ current: 0, total: 0 })
  }

  const totalPages = files.reduce((sum, f) => sum + (f.pageCount ?? 0), 0)

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-semibold text-white mb-2">Merge PDFs</h1>
      <p className="text-gray-400 mb-8">
        Combine multiple PDF files into one — all processing happens in your
        browser.
      </p>

      {(status === 'idle' || status === 'error') && (
        <>
          <DropZone
            accept="application/pdf"
            multiple
            onFiles={handleFiles}
            label="Drop your PDFs here or click to browse"
          />
          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
          <p className="text-gray-600 text-xs mt-3">
            Your file never leaves your browser.
          </p>
        </>
      )}

      {status === 'ready' && (
        <div className="space-y-4">
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
                  <p className="text-white text-sm font-medium truncate">
                    {mf.file.name}
                  </p>
                  <p className="text-gray-400 text-xs">
                    {formatBytes(mf.file.size)} ·{' '}
                    {mf.pageCount === null ? '— pages' : `${mf.pageCount} pages`}
                  </p>
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

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-2 rounded-full border border-gray-600 text-gray-400 text-sm hover:border-primary hover:text-primary transition-colors"
            >
              + Add more
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(Array.from(e.target.files ?? []))}
            />
            <button
              onClick={handleMerge}
              className="flex-1 py-2 rounded-full bg-primary text-bg font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Merge
            </button>
          </div>
        </div>
      )}

      {status === 'merging' && (
        <div className="space-y-4">
          <div className="w-full bg-surface rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{
                width:
                  progress.total > 0
                    ? `${(progress.current / progress.total) * 100}%`
                    : '0%',
              }}
            />
          </div>
          <p className="text-gray-400 text-sm text-center">
            {progress.total > 0
              ? `Merging file ${progress.current} of ${progress.total}…`
              : 'Starting…'}
          </p>
        </div>
      )}

      {status === 'done' && result && downloadUrl && (
        <div className="space-y-6">
          <div className="bg-surface rounded-xl p-6 text-center">
            <p className="text-white font-semibold">
              {files.length} files merged · {totalPages} pages ·{' '}
              {formatBytes(result.byteLength)}
            </p>
          </div>
          <a
            href={downloadUrl}
            download="merged.pdf"
            className="block w-full py-3 rounded-full bg-primary text-bg font-semibold text-sm text-center hover:opacity-90 transition-opacity"
          >
            Download
          </a>
          <button
            onClick={handleReset}
            className="w-full py-2 text-gray-400 text-sm hover:text-white transition-colors"
          >
            Merge another PDFs
          </button>
        </div>
      )}
    </div>
  )
}
