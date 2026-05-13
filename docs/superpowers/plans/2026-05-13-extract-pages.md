# Extract Pages Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Extract Pages tool that lets users type a page range (e.g. "1-3, 5") and download only those pages as a new single PDF.

**Architecture:** Follows the same pattern as existing tools — a pure tool file `src/tools/extract.ts` (no React imports), a page component `src/pages/Extract.tsx` that mirrors the Compress page structure (single file in, single file out), and wiring in `App.tsx` and `Home.tsx`. `parsePageRanges` and `getPageCount` are duplicated from `split.ts` to keep each tool file self-contained. The tool accepts a flat array of 1-based page numbers and uses pdf-lib to copy those pages into a new PDF document.

**Tech Stack:** React 18 (TypeScript), Tailwind CSS v3, pdf-lib, Vitest + @testing-library/react

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/tools/extract.ts` | Create | Pure functions: `parsePageRanges`, `getPageCount`, `extractPages` |
| `src/tools/extract.test.ts` | Create | Unit tests for all three tool functions |
| `src/pages/Extract.tsx` | Create | Page UI: drop → range input → extract → download |
| `src/pages/Extract.test.tsx` | Create | UI state machine tests |
| `src/App.tsx` | Modify | Add `/extract` route |
| `src/pages/Home.tsx` | Modify | Add Extract card to TOOLS array |

---

## Task 1: Extract tool logic

**Files:**
- Create: `src/tools/extract.ts`
- Create: `src/tools/extract.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/tools/extract.test.ts` with the full contents below:

```ts
import { vi, describe, it, expect } from 'vitest'

vi.mock('pdf-lib', () => {
  const mockSrcDoc = {
    getPageCount: vi.fn().mockReturnValue(10),
  }
  const mockOutDoc = {
    copyPages: vi.fn().mockResolvedValue(['page1', 'page2']),
    addPage: vi.fn(),
    save: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
  }
  return {
    PDFDocument: {
      load: vi.fn().mockResolvedValue(mockSrcDoc),
      create: vi.fn().mockResolvedValue(mockOutDoc),
    },
  }
})

import { parsePageRanges, getPageCount, extractPages } from './extract'

describe('parsePageRanges', () => {
  it('parses a single page', () => {
    expect(parsePageRanges('5', 10)).toEqual([[5]])
  })

  it('parses a range', () => {
    expect(parsePageRanges('1-3', 10)).toEqual([[1, 2, 3]])
  })

  it('parses mixed input', () => {
    expect(parsePageRanges('1-3, 5', 10)).toEqual([[1, 2, 3], [5]])
  })

  it('throws on start > end', () => {
    expect(() => parsePageRanges('5-3', 10)).toThrow('Invalid range: 5-3')
  })

  it('throws on page out of range', () => {
    expect(() => parsePageRanges('15', 10)).toThrow('Page 15 out of range')
  })

  it('throws on empty input', () => {
    expect(() => parsePageRanges('', 10)).toThrow('Empty input')
  })
})

describe('getPageCount', () => {
  it('returns the page count for a valid PDF', async () => {
    const file = new File([new ArrayBuffer(1024)], 'doc.pdf', { type: 'application/pdf' })
    expect(await getPageCount(file)).toBe(10)
  })
})

describe('extractPages', () => {
  it('returns a Uint8Array', async () => {
    const file = new File([new ArrayBuffer(1024)], 'doc.pdf', { type: 'application/pdf' })
    const result = await extractPages(file, [1, 2])
    expect(result).toBeInstanceOf(Uint8Array)
  })

  it('passes 0-based indices to copyPages', async () => {
    const { PDFDocument } = await import('pdf-lib')
    const file = new File([new ArrayBuffer(1024)], 'doc.pdf', { type: 'application/pdf' })
    await extractPages(file, [1, 3, 5])
    const outDoc = await vi.mocked(PDFDocument.create)()
    expect(vi.mocked(outDoc.copyPages)).toHaveBeenCalledWith(
      expect.anything(),
      [0, 2, 4],
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```
npm test -- --run src/tools/extract.test.ts
```

Expected: all tests fail with "Cannot find module './extract'".

- [ ] **Step 3: Implement `src/tools/extract.ts`**

Create `src/tools/extract.ts` with the full contents below:

```ts
import { PDFDocument } from 'pdf-lib'

export function parsePageRanges(input: string, totalPages: number): number[][] {
  const trimmed = input.trim()
  if (!trimmed) throw new Error('Empty input')
  return trimmed.split(',').map((token) => {
    const part = token.trim()
    if (part.includes('-')) {
      const segments = part.split('-')
      if (segments.length !== 2) throw new Error(`Invalid range: ${part}`)
      const [startStr, endStr] = segments
      const start = parseInt(startStr, 10)
      const end = parseInt(endStr, 10)
      if (Number.isNaN(start) || Number.isNaN(end)) throw new Error(`Invalid range: ${part}`)
      if (start > end) throw new Error(`Invalid range: ${part}`)
      if (start < 1 || end > totalPages) {
        const bad = start < 1 ? start : end
        throw new Error(`Page ${bad} out of range`)
      }
      return Array.from({ length: end - start + 1 }, (_, i) => start + i)
    } else {
      const page = parseInt(part, 10)
      if (Number.isNaN(page)) throw new Error(`Invalid page: ${part}`)
      if (page < 1 || page > totalPages) throw new Error(`Page ${page} out of range`)
      return [page]
    }
  })
}

export async function getPageCount(file: File): Promise<number> {
  const arrayBuffer = await file.arrayBuffer()
  const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
  return doc.getPageCount()
}

export async function extractPages(file: File, pageNumbers: number[]): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer()
  const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
  const outDoc = await PDFDocument.create()
  const pages = await outDoc.copyPages(srcDoc, pageNumbers.map((p) => p - 1))
  for (const page of pages) {
    outDoc.addPage(page)
  }
  return outDoc.save()
}
```

- [ ] **Step 4: Run tests to verify they pass**

```
npm test -- --run src/tools/extract.test.ts
```

Expected: all 9 tests passing.

- [ ] **Step 5: Commit**

```
git add src/tools/extract.ts src/tools/extract.test.ts
git commit -m "feat: add extract pages tool logic"
```

---

## Task 2: Extract page UI

**Files:**
- Create: `src/pages/Extract.tsx`
- Create: `src/pages/Extract.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/pages/Extract.test.tsx` with the full contents below:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, beforeEach } from 'vitest'

vi.mock('../tools/extract', () => ({
  parsePageRanges: vi.fn(),
  getPageCount: vi.fn(),
  extractPages: vi.fn(),
}))

import { parsePageRanges, getPageCount, extractPages } from '../tools/extract'
import Extract from './Extract'

const mockParsePageRanges = vi.mocked(parsePageRanges)
const mockGetPageCount = vi.mocked(getPageCount)
const mockExtractPages = vi.mocked(extractPages)

beforeEach(() => {
  mockParsePageRanges.mockReset()
  mockGetPageCount.mockReset()
  mockExtractPages.mockReset()
  mockGetPageCount.mockResolvedValue(10)
  mockParsePageRanges.mockReturnValue([[1, 2, 3]])
  mockExtractPages.mockResolvedValue(new Uint8Array(2048))
})

function dropFile(file: File) {
  const dropArea = screen.getByTestId('dropzone')
  fireEvent.drop(dropArea, { dataTransfer: { files: [file] } })
}

function makePDF(name = 'doc.pdf', size = 1024) {
  return new File([new ArrayBuffer(size)], name, { type: 'application/pdf' })
}

it('renders idle state with DropZone and privacy note', () => {
  render(<Extract />)
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
  expect(screen.getByText(/never leaves your browser/i)).toBeInTheDocument()
})

it('renders how-it-works guide in idle state', () => {
  render(<Extract />)
  expect(screen.getByText(/enter page range/i)).toBeInTheDocument()
})

it('transitions to ready state after dropping a valid PDF', () => {
  render(<Extract />)
  dropFile(makePDF('report.pdf'))
  expect(screen.getByText('report.pdf')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Extract' })).toBeInTheDocument()
})

it('shows error for non-PDF file', () => {
  render(<Extract />)
  const txt = new File(['text'], 'doc.txt', { type: 'text/plain' })
  dropFile(txt)
  expect(screen.getByText('Please select a valid PDF file.')).toBeInTheDocument()
})

it('shows error for file over 100MB', () => {
  render(<Extract />)
  const big = new File([new ArrayBuffer(101 * 1024 * 1024)], 'big.pdf', {
    type: 'application/pdf',
  })
  dropFile(big)
  expect(screen.getByText('File is too large (max 100MB).')).toBeInTheDocument()
})

it('shows page count after file is dropped', async () => {
  render(<Extract />)
  dropFile(makePDF())
  await waitFor(() => expect(screen.getByText(/10 pages/i)).toBeInTheDocument())
})

it('shows page range input when ready', () => {
  render(<Extract />)
  dropFile(makePDF())
  expect(screen.getByLabelText(/page range/i)).toBeInTheDocument()
})

it('shows error when range is invalid on extract click', async () => {
  mockParsePageRanges.mockImplementation(() => {
    throw new Error('Invalid range: 5-3')
  })
  render(<Extract />)
  dropFile(makePDF())
  await waitFor(() => screen.getByText(/10 pages/i))
  fireEvent.click(screen.getByRole('button', { name: 'Extract' }))
  expect(screen.getByText('Invalid range: 5-3')).toBeInTheDocument()
})

it('shows loading state while extracting', async () => {
  mockExtractPages.mockImplementation(() => new Promise(() => {}))
  render(<Extract />)
  dropFile(makePDF())
  await waitFor(() => screen.getByText(/10 pages/i))
  fireEvent.click(screen.getByRole('button', { name: 'Extract' }))
  await waitFor(() =>
    expect(screen.getByText(/extracting/i)).toBeInTheDocument(),
  )
})

it('shows download button in done state', async () => {
  render(<Extract />)
  dropFile(makePDF('report.pdf'))
  await waitFor(() => screen.getByText(/10 pages/i))
  fireEvent.click(screen.getByRole('button', { name: 'Extract' }))
  await waitFor(() => screen.getByText('Download'))
  expect(screen.getByRole('link', { name: 'Download' })).toBeInTheDocument()
})

it('download link has correct filename', async () => {
  render(<Extract />)
  dropFile(makePDF('report.pdf'))
  await waitFor(() => screen.getByText(/10 pages/i))
  fireEvent.click(screen.getByRole('button', { name: 'Extract' }))
  await waitFor(() => screen.getByText('Download'))
  expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute(
    'download',
    'report-extracted.pdf',
  )
})

it('"Extract another PDF" resets to idle', async () => {
  render(<Extract />)
  dropFile(makePDF())
  await waitFor(() => screen.getByText(/10 pages/i))
  fireEvent.click(screen.getByRole('button', { name: 'Extract' }))
  await waitFor(() => screen.getByText('Download'))
  fireEvent.click(screen.getByRole('button', { name: /extract another/i }))
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
})

it('shows error when extraction fails', async () => {
  mockExtractPages.mockRejectedValue(new Error('boom'))
  render(<Extract />)
  dropFile(makePDF())
  await waitFor(() => screen.getByText(/10 pages/i))
  fireEvent.click(screen.getByRole('button', { name: 'Extract' }))
  await waitFor(() =>
    expect(
      screen.getByText('Something went wrong. Please try again.'),
    ).toBeInTheDocument(),
  )
})
```

- [ ] **Step 2: Run tests to verify they fail**

```
npm test -- --run src/pages/Extract.test.tsx
```

Expected: all tests fail with "Cannot find module './Extract'".

- [ ] **Step 3: Implement `src/pages/Extract.tsx`**

Create `src/pages/Extract.tsx` with the full contents below:

```tsx
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
            Your file never leaves your browser · Ads keep this tool free.
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
```

- [ ] **Step 4: Run tests to verify they pass**

```
npm test -- --run src/pages/Extract.test.tsx
```

Expected: all 13 tests passing.

- [ ] **Step 5: Commit**

```
git add src/pages/Extract.tsx src/pages/Extract.test.tsx
git commit -m "feat: add Extract Pages page UI"
```

---

## Task 3: Wire up route and home card

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/pages/Home.tsx`

- [ ] **Step 1: Add the route in `src/App.tsx`**

Replace the full contents of `src/App.tsx`:

```tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Compress from './pages/Compress'
import Merge from './pages/Merge'
import Split from './pages/Split'
import Extract from './pages/Extract'
import PrivacyPolicy from './pages/PrivacyPolicy'
import Terms from './pages/Terms'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'compress', element: <Compress /> },
      { path: 'merge', element: <Merge /> },
      { path: 'split', element: <Split /> },
      { path: 'extract', element: <Extract /> },
      { path: 'privacy', element: <PrivacyPolicy /> },
      { path: 'terms', element: <Terms /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
```

- [ ] **Step 2: Add the Extract card to `src/pages/Home.tsx`**

In `src/pages/Home.tsx`, replace the import line at the top:

```tsx
import { FileDown, GitMerge, Scissors, FileOutput } from 'lucide-react'
```

Then replace the `TOOLS` array:

```tsx
const TOOLS = [
  {
    title: 'Compress',
    description: 'Reduce PDF file size without losing quality',
    detail: '3 quality levels · No file size limit',
    icon: <FileDown size={32} />,
    href: '/compress',
  },
  {
    title: 'Merge',
    description: 'Join multiple PDFs into one document',
    detail: '2–10 files · Drag to reorder',
    icon: <GitMerge size={32} />,
    href: '/merge',
  },
  {
    title: 'Split',
    description: 'Extract pages or split into parts',
    detail: 'By range, every N pages, or all · ZIP output',
    icon: <Scissors size={32} />,
    href: '/split',
  },
  {
    title: 'Extract',
    description: 'Pull specific pages into a new PDF',
    detail: 'Page range · Single PDF output',
    icon: <FileOutput size={32} />,
    href: '/extract',
  },
]
```

- [ ] **Step 3: Run the full test suite**

```
npm test -- --run
```

Expected: all tests passing, no regressions.

- [ ] **Step 4: Typecheck**

```
npm run typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```
git add src/App.tsx src/pages/Home.tsx
git commit -m "feat: wire up /extract route and add Extract card to home page"
```

---

## Self-Review

**Spec coverage:**
- ✅ `src/tools/extract.ts` — page range input, single merged PDF output
- ✅ `src/pages/Extract.tsx` — file drop, range input, extract action, loading state, download, error state
- ✅ Route `/extract` in `App.tsx`
- ✅ Extract card on home page
- ✅ Mobile responsive (`max-w-2xl`, existing Tailwind responsive classes match other pages)
- ✅ Tests for tool logic (9 tests)
- ✅ Tests for page UI (13 tests)

**Placeholder scan:** None found. All steps contain complete code.

**Type consistency:** `parsePageRanges` returns `number[][]`, `.flat()` in `handleExtract` produces `number[]` passed to `extractPages(file, pageNumbers: number[])`. Consistent throughout.
