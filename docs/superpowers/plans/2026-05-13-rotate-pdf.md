# Rotate PDF Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Rotate PDF tool that lets users rotate all pages of a PDF by 90° CW, 180°, or 90° CCW and download the result as a new PDF.

**Architecture:** Follows the same pattern as the Extract Pages tool — a pure tool file `src/tools/rotate.ts` (no React), a page component `src/pages/Rotate.tsx` that mirrors `Extract.tsx` (idle → ready → rotating → done state machine), and wiring in `App.tsx` and `Home.tsx`. The tool uses pdf-lib's `degrees()` helper to add the chosen rotation to each page's existing rotation, handling cases where pages already have a non-zero rotation. The UI offers three toggle buttons (90° CW / 180° / 90° CCW) then a single "Apply & Download" button.

**Tech Stack:** React 18 (TypeScript), Tailwind CSS v3, pdf-lib, Vitest + @testing-library/react

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/tools/rotate.ts` | Create | `RotationDegrees` type, `rotatePDF`, re-export `getPageCount` |
| `src/tools/rotate.test.ts` | Create | Unit tests for `rotatePDF` |
| `src/pages/Rotate.tsx` | Create | Page UI: drop → pick rotation → apply → download |
| `src/pages/Rotate.test.tsx` | Create | UI state machine tests |
| `src/App.tsx` | Modify | Add `/rotate` route |
| `src/pages/Home.tsx` | Modify | Add Rotate card, update grid to `md:grid-cols-3` for 5 tools |
| `src/pages/Home.test.tsx` | Modify | Add tests for Extract and Rotate cards (both were missing) |

---

## Task 1: Rotate tool logic

**Files:**
- Create: `src/tools/rotate.ts`
- Create: `src/tools/rotate.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/tools/rotate.test.ts` with exactly this content:

```ts
import { vi, describe, it, expect } from 'vitest'

vi.mock('pdf-lib', () => {
  const mockPage = {
    getRotation: vi.fn().mockReturnValue({ angle: 0 }),
    setRotation: vi.fn(),
  }
  const mockDoc = {
    getPages: vi.fn().mockReturnValue([mockPage, mockPage]),
    save: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
  }
  return {
    PDFDocument: {
      load: vi.fn().mockResolvedValue(mockDoc),
    },
    degrees: vi.fn((n: number) => ({ type: 'degrees', angle: n })),
  }
})

import { rotatePDF } from './rotate'

describe('rotatePDF', () => {
  it('returns a Uint8Array for 90° rotation', async () => {
    const file = new File([new ArrayBuffer(1024)], 'doc.pdf', { type: 'application/pdf' })
    expect(await rotatePDF(file, 90)).toBeInstanceOf(Uint8Array)
  })

  it('returns a Uint8Array for 180° rotation', async () => {
    const file = new File([new ArrayBuffer(1024)], 'doc.pdf', { type: 'application/pdf' })
    expect(await rotatePDF(file, 180)).toBeInstanceOf(Uint8Array)
  })

  it('returns a Uint8Array for 270° rotation', async () => {
    const file = new File([new ArrayBuffer(1024)], 'doc.pdf', { type: 'application/pdf' })
    expect(await rotatePDF(file, 270)).toBeInstanceOf(Uint8Array)
  })

  it('calls degrees with the sum of existing and requested rotation', async () => {
    const { degrees } = await import('pdf-lib')
    vi.mocked(degrees).mockClear()
    const file = new File([new ArrayBuffer(1024)], 'doc.pdf', { type: 'application/pdf' })
    await rotatePDF(file, 90)
    expect(vi.mocked(degrees)).toHaveBeenCalledWith(90)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```
npm test -- --run src/tools/rotate.test.ts
```

Expected: all 4 tests fail with "Cannot find module './rotate'".

- [ ] **Step 3: Implement `src/tools/rotate.ts`**

Create `src/tools/rotate.ts` with exactly this content:

```ts
import { PDFDocument, degrees } from 'pdf-lib'
import { getPageCount } from './pdfUtils'

export { getPageCount }

export type RotationDegrees = 90 | 180 | 270

export async function rotatePDF(file: File, rotation: RotationDegrees): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer()
  const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
  for (const page of doc.getPages()) {
    const current = page.getRotation().angle
    page.setRotation(degrees((current + rotation) % 360))
  }
  return doc.save()
}
```

- [ ] **Step 4: Run tests to verify they pass**

```
npm test -- --run src/tools/rotate.test.ts
```

Expected: 4/4 passing.

- [ ] **Step 5: Typecheck**

```
npm run typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```
git add src/tools/rotate.ts src/tools/rotate.test.ts
git commit -m "feat: add rotate PDF tool logic"
```

---

## Task 2: Rotate page UI

**Files:**
- Create: `src/pages/Rotate.tsx`
- Create: `src/pages/Rotate.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/pages/Rotate.test.tsx` with exactly this content:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, beforeEach } from 'vitest'

vi.mock('../tools/rotate', () => ({
  getPageCount: vi.fn(),
  rotatePDF: vi.fn(),
}))

import { getPageCount, rotatePDF } from '../tools/rotate'
import Rotate from './Rotate'

const mockGetPageCount = vi.mocked(getPageCount)
const mockRotatePDF = vi.mocked(rotatePDF)

beforeEach(() => {
  mockGetPageCount.mockReset()
  mockRotatePDF.mockReset()
  mockGetPageCount.mockResolvedValue(8)
  mockRotatePDF.mockResolvedValue(new Uint8Array(2048))
})

function dropFile(file: File) {
  const dropArea = screen.getByTestId('dropzone')
  fireEvent.drop(dropArea, { dataTransfer: { files: [file] } })
}

function makePDF(name = 'doc.pdf', size = 1024) {
  return new File([new ArrayBuffer(size)], name, { type: 'application/pdf' })
}

it('renders idle state with DropZone and privacy note', () => {
  render(<Rotate />)
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
  expect(screen.getByText(/never leaves your browser/i)).toBeInTheDocument()
})

it('renders how-it-works guide in idle state', () => {
  render(<Rotate />)
  expect(screen.getByText(/pick rotation/i)).toBeInTheDocument()
})

it('transitions to ready state after dropping a valid PDF', () => {
  render(<Rotate />)
  dropFile(makePDF('report.pdf'))
  expect(screen.getByText('report.pdf')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /apply/i })).toBeInTheDocument()
})

it('shows error for non-PDF file', () => {
  render(<Rotate />)
  const txt = new File(['text'], 'doc.txt', { type: 'text/plain' })
  dropFile(txt)
  expect(screen.getByText('Please select a valid PDF file.')).toBeInTheDocument()
})

it('shows error for file over 100MB', () => {
  render(<Rotate />)
  const big = new File([new ArrayBuffer(101 * 1024 * 1024)], 'big.pdf', {
    type: 'application/pdf',
  })
  dropFile(big)
  expect(screen.getByText('File is too large (max 100MB).')).toBeInTheDocument()
})

it('shows page count after file is dropped', async () => {
  render(<Rotate />)
  dropFile(makePDF())
  await waitFor(() => expect(screen.getByText(/8 pages/i)).toBeInTheDocument())
})

it('renders all three rotation options', () => {
  render(<Rotate />)
  dropFile(makePDF())
  expect(screen.getByRole('button', { name: '90° CW' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '180°' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '90° CCW' })).toBeInTheDocument()
})

it('shows loading state while rotating', async () => {
  mockRotatePDF.mockImplementation(() => new Promise(() => {}))
  render(<Rotate />)
  dropFile(makePDF())
  await waitFor(() => screen.getByText(/8 pages/i))
  fireEvent.click(screen.getByRole('button', { name: /apply/i }))
  await waitFor(() => expect(screen.getByText(/rotating/i)).toBeInTheDocument())
})

it('shows download button in done state', async () => {
  render(<Rotate />)
  dropFile(makePDF('report.pdf'))
  await waitFor(() => screen.getByText(/8 pages/i))
  fireEvent.click(screen.getByRole('button', { name: /apply/i }))
  await waitFor(() => screen.getByText('Download'))
  expect(screen.getByRole('link', { name: 'Download' })).toBeInTheDocument()
})

it('download link has correct filename', async () => {
  render(<Rotate />)
  dropFile(makePDF('report.pdf'))
  await waitFor(() => screen.getByText(/8 pages/i))
  fireEvent.click(screen.getByRole('button', { name: /apply/i }))
  await waitFor(() => screen.getByText('Download'))
  expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute(
    'download',
    'report-rotated.pdf',
  )
})

it('"Rotate another PDF" resets to idle', async () => {
  render(<Rotate />)
  dropFile(makePDF())
  await waitFor(() => screen.getByText(/8 pages/i))
  fireEvent.click(screen.getByRole('button', { name: /apply/i }))
  await waitFor(() => screen.getByText('Download'))
  fireEvent.click(screen.getByRole('button', { name: /rotate another/i }))
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
})

it('shows error when rotation fails', async () => {
  mockRotatePDF.mockRejectedValue(new Error('boom'))
  render(<Rotate />)
  dropFile(makePDF())
  await waitFor(() => screen.getByText(/8 pages/i))
  fireEvent.click(screen.getByRole('button', { name: /apply/i }))
  await waitFor(() =>
    expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument(),
  )
})
```

- [ ] **Step 2: Run tests to verify they fail**

```
npm test -- --run src/pages/Rotate.test.tsx
```

Expected: all 12 tests fail with "Cannot find module './Rotate'".

- [ ] **Step 3: Implement `src/pages/Rotate.tsx`**

Create `src/pages/Rotate.tsx` with exactly this content:

```tsx
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
```

- [ ] **Step 4: Run tests to verify they pass**

```
npm test -- --run src/pages/Rotate.test.tsx
```

Expected: 12/12 passing.

- [ ] **Step 5: Typecheck**

```
npm run typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```
git add src/pages/Rotate.tsx src/pages/Rotate.test.tsx
git commit -m "feat: add Rotate PDF page UI"
```

---

## Task 3: Wire up route, home card, and fix Home tests

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/pages/Home.tsx`
- Modify: `src/pages/Home.test.tsx`

- [ ] **Step 1: Add the `/rotate` route in `src/App.tsx`**

Read the current `src/App.tsx` and replace its full contents with:

```tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Compress from './pages/Compress'
import Merge from './pages/Merge'
import Split from './pages/Split'
import Extract from './pages/Extract'
import Rotate from './pages/Rotate'
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
      { path: 'rotate', element: <Rotate /> },
      { path: 'privacy', element: <PrivacyPolicy /> },
      { path: 'terms', element: <Terms /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
```

- [ ] **Step 2: Add Rotate card and update grid in `src/pages/Home.tsx`**

Read the current `src/pages/Home.tsx`. Make two changes:

**Change 1** — update the lucide-react import line:

```tsx
import { FileDown, GitMerge, Scissors, FileOutput, RotateCw } from 'lucide-react'
```

**Change 2** — replace the entire `TOOLS` array:

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
  {
    title: 'Rotate',
    description: 'Rotate all pages in your PDF',
    detail: '90° CW, 180°, or 90° CCW',
    icon: <RotateCw size={32} />,
    href: '/rotate',
  },
]
```

**Change 3** — update the tool grid class from `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` to `grid-cols-1 sm:grid-cols-2 md:grid-cols-3`:

```tsx
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
```

- [ ] **Step 3: Add missing Home.test.tsx tests for Extract and Rotate cards**

Read `src/pages/Home.test.tsx`. The existing tests only cover Compress, Merge, and Split. Add these two tests at the end of the file:

```tsx
it('renders Extract and Rotate tool cards', () => {
  renderHome()
  expect(screen.getByText('Extract')).toBeInTheDocument()
  expect(screen.getByText('Rotate')).toBeInTheDocument()
})

it('Extract and Rotate cards link to correct routes', () => {
  renderHome()
  expect(screen.getByRole('link', { name: /extract/i })).toHaveAttribute('href', '/extract')
  expect(screen.getByRole('link', { name: /rotate/i })).toHaveAttribute('href', '/rotate')
})
```

- [ ] **Step 4: Run the full test suite**

```
npm test -- --run
```

Expected: all tests passing, no regressions.

- [ ] **Step 5: Typecheck**

```
npm run typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```
git add src/App.tsx src/pages/Home.tsx src/pages/Home.test.tsx
git commit -m "feat: wire up /rotate route, add Rotate card, fix Home tests"
```

---

## Self-Review

**Spec coverage:**
- ✅ `src/tools/rotate.ts` — per-page rotation using pdf-lib `degrees()`, additive with existing angle, returns Uint8Array
- ✅ `src/pages/Rotate.tsx` — file drop, 90°/180°/270° selector, "Apply & Download" button, loading state, download, error state
- ✅ Route `/rotate` in `App.tsx`
- ✅ Rotate card on home page with `RotateCw` icon
- ✅ Home grid updated for 5 tools (`md:grid-cols-3`)
- ✅ Mobile responsive (existing `max-w-2xl`, `grid-cols-1 sm:grid-cols-3` how-it-works)
- ✅ Tests for rotate tool logic (4 tests)
- ✅ Tests for Rotate page UI states (12 tests)
- ✅ Home tests updated for Extract + Rotate cards (2 new tests)

**Placeholder scan:** None found. All steps contain complete code.

**Type consistency:**
- `RotationDegrees = 90 | 180 | 270` exported from `rotate.ts`, imported as `type RotationDegrees` in `Rotate.tsx`
- `rotatePDF(file: File, rotation: RotationDegrees): Promise<Uint8Array>` — consistent throughout
- `getPageCount` re-exported from `rotate.ts`, imported in `Rotate.tsx` — consistent with Extract pattern
