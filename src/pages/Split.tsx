import { useState, useEffect, useMemo } from 'react'
import DropZone from '../components/DropZone'
import {
  parsePageRanges,
  groupsEveryN,
  allPagesGroups,
  splitPDF,
  getPageCount,
  type SplitMode,
} from '../tools/split'
import { formatBytes } from '../utils/formatBytes'

type Status = 'idle' | 'ready' | 'splitting' | 'done' | 'error'

const MODES: { value: SplitMode; label: string }[] = [
  { value: 'range', label: 'Page range' },
  { value: 'every-n', label: 'Every N pages' },
  { value: 'all', label: 'All pages' },
]

export default function Split() {
  const [status, setStatus] = useState<Status>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState<number | null>(null)
  const [mode, setMode] = useState<SplitMode>('range')
  const [rangeInput, setRangeInput] = useState('')
  const [everyN, setEveryN] = useState(1)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [result, setResult] = useState<Uint8Array | null>(null)
  const [error, setError] = useState<string | null>(null)

  const downloadUrl = useMemo(() => {
    if (!result) return null
    const blob = new Blob([new Uint8Array(result)], { type: 'application/zip' })
    return URL.createObjectURL(blob)
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

  async function handleSplit() {
    if (!file || pageCount === null) return
    let groups: number[][]
    if (mode === 'range') {
      try {
        groups = parsePageRanges(rangeInput, pageCount)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Invalid range.')
        return
      }
    } else if (mode === 'every-n') {
      if (everyN < 1) {
        setError('N must be at least 1.')
        return
      }
      if (everyN >= pageCount) {
        setError('N must be less than the total number of pages.')
        return
      }
      groups = groupsEveryN(pageCount, everyN)
    } else {
      groups = allPagesGroups(pageCount)
    }

    setStatus('splitting')
    setProgress({ current: 0, total: groups.length })
    try {
      const output = await splitPDF(file, groups, (current, total) =>
        setProgress({ current, total }),
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
    setFile(null)
    setPageCount(null)
    setResult(null)
    setError(null)
    setRangeInput('')
    setEveryN(1)
    setProgress({ current: 0, total: 0 })
  }

  const downloadName = file ? file.name.replace(/\.pdf$/i, '-split.zip') : 'split.zip'

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-semibold text-white mb-2">Split PDF</h1>
      <p className="text-gray-400 mb-8">
        Extract pages or split into parts — all processing happens in your browser.
      </p>

      {(status === 'idle' || status === 'error') && (
        <>
          <DropZone accept="application/pdf" onFiles={handleFiles} />
          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
          <p className="text-gray-600 text-xs mt-3">Your file never leaves your browser.</p>
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div className="bg-surface rounded-xl p-4">
              <p className="text-2xl mb-2">📄</p>
              <p className="text-white text-xs font-medium mb-1">Drop your PDF</p>
              <p className="text-gray-500 text-xs">Upload any PDF up to 100 MB</p>
            </div>
            <div className="bg-surface rounded-xl p-4">
              <p className="text-2xl mb-2">✂️</p>
              <p className="text-white text-xs font-medium mb-1">Choose how to split</p>
              <p className="text-gray-500 text-xs">Page range, every N pages, or all pages</p>
            </div>
            <div className="bg-surface rounded-xl p-4">
              <p className="text-2xl mb-2">⬇️</p>
              <p className="text-white text-xs font-medium mb-1">Download</p>
              <p className="text-gray-500 text-xs">Get a ZIP with your split PDFs instantly</p>
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
            <p className="text-gray-400 text-sm mb-3">Split mode</p>
            <div className="flex gap-3">
              {MODES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => { setMode(value); setError(null) }}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    mode === value
                      ? 'bg-primary text-bg'
                      : 'bg-surface text-gray-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {mode === 'range' && (
            <div>
              <label htmlFor="range-input" className="text-gray-400 text-sm block mb-2">Page range</label>
              <input
                id="range-input"
                type="text"
                value={rangeInput}
                onChange={(e) => setRangeInput(e.target.value)}
                placeholder="e.g. 1-3, 5, 8-10"
                className="w-full bg-surface border border-gray-700 rounded-lg px-4 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-primary"
              />
            </div>
          )}

          {mode === 'every-n' && (
            <div>
              <label htmlFor="every-n-input" className="text-gray-400 text-sm block mb-2">Every N pages</label>
              <input
                id="every-n-input"
                type="number"
                min={1}
                value={everyN}
                onChange={(e) => setEveryN(Number(e.target.value))}
                className="w-full bg-surface border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-primary"
              />
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={handleSplit}
            disabled={status !== 'ready'}
            className="w-full py-3 rounded-full bg-primary text-bg font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Split
          </button>
        </div>
      )}

      {status === 'splitting' && (
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
              ? `Extracting part ${progress.current} of ${progress.total}…`
              : 'Starting…'}
          </p>
        </div>
      )}

      {status === 'done' && result && downloadUrl && (
        <div className="space-y-6">
          <div className="bg-surface rounded-xl p-6 text-center">
            <p className="text-white font-semibold">
              Split into {progress.total} {progress.total === 1 ? 'part' : 'parts'} ·{' '}
              {downloadName} · {formatBytes(result.byteLength)}
            </p>
          </div>
          <a
            href={downloadUrl}
            download={downloadName}
            className="block w-full py-3 rounded-full bg-primary text-bg font-semibold text-sm text-center hover:opacity-90 transition-opacity"
          >
            Download ZIP
          </a>
          <button
            onClick={handleReset}
            className="w-full py-2 text-gray-400 text-sm hover:text-white transition-colors"
          >
            Split another PDF
          </button>
        </div>
      )}
    </div>
  )
}
