import { useState, useEffect, useMemo } from 'react'
import DropZone from '../components/DropZone'
import PageMeta from '../components/PageMeta'
import { parsePageRanges, getPageCount, extractPages } from '../tools/extract'
import { formatBytes } from '../utils/formatBytes'

type Status = 'idle' | 'ready' | 'extracting' | 'done' | 'error'

export default function Extract() {
  const [status, setStatus] = useState<Status>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState<number | null>(null)
  const [rangeInput, setRangeInput] = useState('')
  const [result, setResult] = useState<Uint8Array | null>(null)
  const [error, setError] = useState<string | null>(null)

  const downloadUrl = useMemo(() => {
    if (!result) return null
    return URL.createObjectURL(new Blob([result.buffer as ArrayBuffer], { type: 'application/pdf' }))
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

  async function handleExtract() {
    if (!file || pageCount === null) return
    let pageNumbers: number[]
    try {
      pageNumbers = parsePageRanges(rangeInput, pageCount).flat()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid range.')
      return
    }
    setStatus('extracting')
    try {
      const output = await extractPages(file, pageNumbers)
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
    setPageCount(null)
    setResult(null)
    setError(null)
    setRangeInput('')
  }

  const downloadName = file ? file.name.replace(/\.pdf$/i, '-extracted.pdf') : 'extracted.pdf'

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <PageMeta
        title="PDFNip | Extract PDF Pages"
        description="Extract specific pages from a PDF for free, instantly in your browser. Enter a page range and download a new PDF. No uploads needed."
        path="/extract"
      />
      <h1 className="text-2xl font-semibold text-white mb-2">Extract Pages</h1>
      <p className="text-gray-400 mb-8">
        Pull out specific pages into a new PDF — all processing happens in your browser.
      </p>

      {(status === 'idle' || status === 'error') && (
        <>
          <DropZone accept="application/pdf" onFiles={handleFiles} />
          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
          <p className="text-gray-600 text-xs mt-3">
            Your files never leave your browser · Ads keep this tool free.
          </p>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="bg-surface rounded-xl p-4">
              <p className="text-2xl mb-2">📄</p>
              <p className="text-white text-xs font-medium mb-1">Drop your PDF</p>
              <p className="text-gray-500 text-xs">Upload any PDF up to 100 MB</p>
            </div>
            <div className="bg-surface rounded-xl p-4">
              <p className="text-2xl mb-2">🔢</p>
              <p className="text-white text-xs font-medium mb-1">Enter page range</p>
              <p className="text-gray-500 text-xs">e.g. 1-3, 5, 8-10</p>
            </div>
            <div className="bg-surface rounded-xl p-4">
              <p className="text-2xl mb-2">⬇️</p>
              <p className="text-white text-xs font-medium mb-1">Download</p>
              <p className="text-gray-500 text-xs">Get your extracted pages as a new PDF</p>
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
            <label htmlFor="range-input" className="text-gray-400 text-sm block mb-2">
              Page range
            </label>
            <input
              id="range-input"
              type="text"
              value={rangeInput}
              onChange={(e) => setRangeInput(e.target.value)}
              placeholder="e.g. 1-3, 5, 8-10"
              className="w-full bg-surface border border-gray-700 rounded-lg px-4 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-primary"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={handleExtract}
            className="w-full py-3 rounded-full bg-primary text-bg font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Extract
          </button>
        </div>
      )}

      {status === 'extracting' && (
        <p className="text-gray-400 text-sm text-center">Extracting…</p>
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
            Extract another PDF
          </button>
        </div>
      )}
    </div>
  )
}
