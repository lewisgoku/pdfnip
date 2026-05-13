# PDF to Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "PDF to Images" tool that converts every PDF page to a JPG or PNG and delivers them as a ZIP download, fully in-browser.

**Architecture:** `src/tools/pdfToImages.ts` renders each page via PDF.js onto an off-screen canvas, exports each frame as a JPG or PNG data URL, packs all images into a ZIP using JSZip, and returns `Uint8Array` ZIP bytes. `src/pages/PdfToImages.tsx` follows the same `idle → ready → converting → done | error` state machine used by all other tool pages.

**Tech Stack:** PDF.js (`pdfjs-dist` — already installed), JSZip (`jszip` — already installed), pdf-lib not needed, Vitest + @testing-library/react

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/tools/pdfToImages.ts` | Create | `ImageFormat`, `ImageQuality` types, `pdfToImages` function |
| `src/tools/pdfToImages.test.ts` | Create | Unit tests: MIME type, scale, file naming |
| `src/pages/PdfToImages.tsx` | Create | Page UI: drop → format/quality → convert → download ZIP |
| `src/pages/PdfToImages.test.tsx` | Create | 13 UI state machine tests |
| `src/App.tsx` | Modify | Add `/pdf-to-images` route |
| `src/pages/Home.tsx` | Modify | Add PDF to Images card, update grid to `md:grid-cols-3` |
| `src/components/Navbar.tsx` | Modify | Add "PDF to Images" to `NAV_LINKS` |
| `src/pages/Home.test.tsx` | Modify | Add test for PDF to Images card and route |

---

## Task 1: Tool logic

**Files:**
- Create: `src/tools/pdfToImages.ts`
- Create: `src/tools/pdfToImages.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/tools/pdfToImages.test.ts`:

```ts
import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockToDataURL = vi.hoisted(() => vi.fn(() => 'data:image/jpeg;base64,AAAA'))

const mockZip = vi.hoisted(() => ({
  file: vi.fn(),
  generateAsync: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
}))

const mockPage = vi.hoisted(() => ({
  getViewport: vi.fn().mockReturnValue({ width: 100, height: 150 }),
  render: vi.fn().mockReturnValue({ promise: Promise.resolve() }),
}))

const mockPdf = vi.hoisted(() => ({
  numPages: 2,
  getPage: vi.fn().mockResolvedValue(mockPage),
}))

const mockGetDocument = vi.hoisted(() => vi.fn())

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: mockGetDocument,
}))

vi.mock('jszip', () => ({
  default: vi.fn(() => mockZip),
}))

import { pdfToImages } from './pdfToImages'

beforeEach(() => {
  vi.clearAllMocks()
  HTMLCanvasElement.prototype.toDataURL = mockToDataURL
  mockToDataURL.mockReturnValue('data:image/jpeg;base64,AAAA')
  mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockPdf) })
  mockPdf.getPage.mockResolvedValue(mockPage)
  mockPage.getViewport.mockReturnValue({ width: 100, height: 150 })
  mockPage.render.mockReturnValue({ promise: Promise.resolve() })
  mockZip.generateAsync.mockResolvedValue(new Uint8Array([1, 2, 3]))
})

function makePDF() {
  return new File([new ArrayBuffer(1024)], 'doc.pdf', { type: 'application/pdf' })
}

describe('pdfToImages', () => {
  it('returns a Uint8Array', async () => {
    expect(await pdfToImages(makePDF(), 'jpg', 'medium')).toBeInstanceOf(Uint8Array)
  })

  it('uses jpeg MIME type for jpg format', async () => {
    await pdfToImages(makePDF(), 'jpg', 'medium')
    expect(mockToDataURL).toHaveBeenCalledWith('image/jpeg', expect.any(Number))
  })

  it('uses png MIME type for png format', async () => {
    await pdfToImages(makePDF(), 'png', 'medium')
    expect(mockToDataURL).toHaveBeenCalledWith('image/png')
  })

  it.each([
    ['low', 1.0],
    ['medium', 1.5],
    ['high', 2.0],
  ] as const)('uses scale %.1f for %s quality', async (quality, expectedScale) => {
    await pdfToImages(makePDF(), 'jpg', quality)
    expect(mockPage.getViewport).toHaveBeenCalledWith({ scale: expectedScale })
  })

  it('names jpg files with .jpg extension', async () => {
    await pdfToImages(makePDF(), 'jpg', 'medium')
    expect(mockZip.file).toHaveBeenCalledWith('page-1.jpg', expect.any(Uint8Array))
    expect(mockZip.file).toHaveBeenCalledWith('page-2.jpg', expect.any(Uint8Array))
  })

  it('names png files with .png extension', async () => {
    await pdfToImages(makePDF(), 'png', 'medium')
    expect(mockZip.file).toHaveBeenCalledWith('page-1.png', expect.any(Uint8Array))
    expect(mockZip.file).toHaveBeenCalledWith('page-2.png', expect.any(Uint8Array))
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```
cd "e:\vscode projects\pdfnip" && npx vitest run src/tools/pdfToImages.test.ts
```

Expected: all tests fail with "Cannot find module './pdfToImages'".

- [ ] **Step 3: Implement `src/tools/pdfToImages.ts`**

```ts
import * as pdfjsLib from 'pdfjs-dist'
import JSZip from 'jszip'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export type ImageFormat = 'jpg' | 'png'
export type ImageQuality = 'low' | 'medium' | 'high'

const QUALITY_SETTINGS: Record<ImageQuality, { scale: number; jpegQuality: number }> = {
  low:    { scale: 1.0, jpegQuality: 0.60 },
  medium: { scale: 1.5, jpegQuality: 0.82 },
  high:   { scale: 2.0, jpegQuality: 0.95 },
}

export async function pdfToImages(
  file: File,
  format: ImageFormat,
  quality: ImageQuality,
): Promise<Uint8Array> {
  const { scale, jpegQuality } = QUALITY_SETTINGS[quality]
  const arrayBuffer = await file.arrayBuffer()
  const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const numPages = pdfDoc.numPages
  const zip = new JSZip()

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    await page.render({ canvas, viewport }).promise

    const dataUrl =
      format === 'jpg'
        ? canvas.toDataURL('image/jpeg', jpegQuality)
        : canvas.toDataURL('image/png')

    const base64 = dataUrl.split(',')[1]
    const binaryStr = atob(base64)
    const bytes = new Uint8Array(binaryStr.length)
    for (let j = 0; j < binaryStr.length; j++) {
      bytes[j] = binaryStr.charCodeAt(j)
    }

    const ext = format === 'jpg' ? 'jpg' : 'png'
    zip.file(`page-${i}.${ext}`, bytes)
  }

  return zip.generateAsync({ type: 'uint8array' })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```
cd "e:\vscode projects\pdfnip" && npx vitest run src/tools/pdfToImages.test.ts
```

Expected: 8/8 passing.

- [ ] **Step 5: Typecheck**

```
cd "e:\vscode projects\pdfnip" && npm run typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```
git add src/tools/pdfToImages.ts src/tools/pdfToImages.test.ts
git commit -m "feat: add PDF to images tool logic"
```

---

## Task 2: Page UI

**Files:**
- Create: `src/pages/PdfToImages.tsx`
- Create: `src/pages/PdfToImages.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/pages/PdfToImages.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, beforeEach } from 'vitest'

vi.mock('../tools/pdfToImages', () => ({
  pdfToImages: vi.fn(),
}))

import { pdfToImages } from '../tools/pdfToImages'
import PdfToImages from './PdfToImages'

const mockPdfToImages = vi.mocked(pdfToImages)

beforeEach(() => {
  mockPdfToImages.mockReset()
  mockPdfToImages.mockResolvedValue(new Uint8Array(2048))
})

function dropFile(file: File) {
  const dropArea = screen.getByTestId('dropzone')
  fireEvent.drop(dropArea, { dataTransfer: { files: [file] } })
}

function makePDF(name = 'doc.pdf', size = 1024) {
  return new File([new ArrayBuffer(size)], name, { type: 'application/pdf' })
}

it('renders idle state with DropZone and privacy note', () => {
  render(<PdfToImages />)
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
  expect(screen.getByText(/never leaves your browser/i)).toBeInTheDocument()
})

it('renders how-it-works guide in idle state', () => {
  render(<PdfToImages />)
  expect(screen.getByText(/pick format/i)).toBeInTheDocument()
})

it('transitions to ready state after dropping a valid PDF', () => {
  render(<PdfToImages />)
  dropFile(makePDF('report.pdf'))
  expect(screen.getByText('report.pdf')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /^Convert$/ })).toBeInTheDocument()
})

it('shows error for non-PDF file', () => {
  render(<PdfToImages />)
  dropFile(new File(['text'], 'doc.txt', { type: 'text/plain' }))
  expect(screen.getByText('Please select a valid PDF file.')).toBeInTheDocument()
})

it('shows error for file over 100MB', () => {
  render(<PdfToImages />)
  dropFile(new File([new ArrayBuffer(101 * 1024 * 1024)], 'big.pdf', { type: 'application/pdf' }))
  expect(screen.getByText('File is too large (max 100MB).')).toBeInTheDocument()
})

it('shows JPG format selected by default', () => {
  render(<PdfToImages />)
  dropFile(makePDF())
  expect(screen.getByRole('button', { name: 'JPG' })).toHaveClass('bg-primary')
})

it('shows quality selector when JPG is selected', () => {
  render(<PdfToImages />)
  dropFile(makePDF())
  expect(screen.getByText('Quality')).toBeInTheDocument()
})

it('hides quality selector when PNG is selected', () => {
  render(<PdfToImages />)
  dropFile(makePDF())
  fireEvent.click(screen.getByRole('button', { name: 'PNG' }))
  expect(screen.queryByText('Quality')).not.toBeInTheDocument()
})

it('shows loading state while converting', async () => {
  mockPdfToImages.mockImplementation(() => new Promise(() => {}))
  render(<PdfToImages />)
  dropFile(makePDF())
  fireEvent.click(screen.getByRole('button', { name: /^Convert$/ }))
  await waitFor(() => expect(screen.getByText(/converting/i)).toBeInTheDocument())
})

it('shows download button in done state', async () => {
  render(<PdfToImages />)
  dropFile(makePDF('report.pdf'))
  fireEvent.click(screen.getByRole('button', { name: /^Convert$/ }))
  await waitFor(() => screen.getByText('Download'))
  expect(screen.getByRole('link', { name: 'Download' })).toBeInTheDocument()
})

it('download link has correct filename', async () => {
  render(<PdfToImages />)
  dropFile(makePDF('report.pdf'))
  fireEvent.click(screen.getByRole('button', { name: /^Convert$/ }))
  await waitFor(() => screen.getByText('Download'))
  expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute(
    'download',
    'report-images.zip',
  )
})

it('"Convert another PDF" resets to idle', async () => {
  render(<PdfToImages />)
  dropFile(makePDF())
  fireEvent.click(screen.getByRole('button', { name: /^Convert$/ }))
  await waitFor(() => screen.getByText('Download'))
  fireEvent.click(screen.getByRole('button', { name: /convert another/i }))
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
})

it('shows error when conversion fails', async () => {
  mockPdfToImages.mockRejectedValue(new Error('boom'))
  render(<PdfToImages />)
  dropFile(makePDF())
  fireEvent.click(screen.getByRole('button', { name: /^Convert$/ }))
  await waitFor(() =>
    expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument(),
  )
})
```

- [ ] **Step 2: Run tests to verify they fail**

```
cd "e:\vscode projects\pdfnip" && npx vitest run src/pages/PdfToImages.test.tsx
```

Expected: all 13 tests fail with "Cannot find module './PdfToImages'".

- [ ] **Step 3: Implement `src/pages/PdfToImages.tsx`**

```tsx
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
```

- [ ] **Step 4: Run tests to verify they pass**

```
cd "e:\vscode projects\pdfnip" && npx vitest run src/pages/PdfToImages.test.tsx
```

Expected: 13/13 passing.

- [ ] **Step 5: Typecheck**

```
cd "e:\vscode projects\pdfnip" && npm run typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```
git add src/pages/PdfToImages.tsx src/pages/PdfToImages.test.tsx
git commit -m "feat: add PDF to Images page UI"
```

---

## Task 3: Route, Home card, Navbar link

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/pages/Home.tsx`
- Modify: `src/components/Navbar.tsx`
- Modify: `src/pages/Home.test.tsx`

- [ ] **Step 1: Add route in `src/App.tsx`**

Read `src/App.tsx`. Add `import PdfToImages from './pages/PdfToImages'` after the Rotate import, and add `{ path: 'pdf-to-images', element: <PdfToImages /> }` after the rotate route. Full file after changes:

```tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Compress from './pages/Compress'
import Merge from './pages/Merge'
import Split from './pages/Split'
import Extract from './pages/Extract'
import Rotate from './pages/Rotate'
import PdfToImages from './pages/PdfToImages'
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
      { path: 'pdf-to-images', element: <PdfToImages /> },
      { path: 'privacy', element: <PrivacyPolicy /> },
      { path: 'terms', element: <Terms /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
```

- [ ] **Step 2: Add card and update grid in `src/pages/Home.tsx`**

Read `src/pages/Home.tsx`. Make three changes:

**Change 1** — update the lucide-react import to add `ImageDown`:

```tsx
import { FileDown, GitMerge, Scissors, FileOutput, RotateCw, ImageDown } from 'lucide-react'
```

**Change 2** — add PDF to Images as the 6th entry in `TOOLS` (after Rotate):

```tsx
  {
    title: 'PDF to Images',
    description: 'Convert every page to JPG or PNG',
    detail: 'JPG or PNG · Low / Medium / High quality · ZIP output',
    icon: <ImageDown size={32} />,
    href: '/pdf-to-images',
  },
```

**Change 3** — update the tool grid class. Find `className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"` and change to `"grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"` (6 tools fit cleanly as 2 rows of 3 on md+).

**Change 4** — update the `PageMeta` description to include "convert to images":

```tsx
description="Free PDF tools that run entirely in your browser. Compress, merge, split, extract, rotate PDFs, and convert to images — your files never leave your device."
```

- [ ] **Step 3: Add Navbar link in `src/components/Navbar.tsx`**

Read `src/components/Navbar.tsx`. Add `{ to: '/pdf-to-images', label: 'PDF to Images' }` at the end of `NAV_LINKS`:

```ts
const NAV_LINKS = [
  { to: '/compress', label: 'Compress' },
  { to: '/merge', label: 'Merge' },
  { to: '/split', label: 'Split' },
  { to: '/extract', label: 'Extract' },
  { to: '/rotate', label: 'Rotate' },
  { to: '/pdf-to-images', label: 'PDF to Images' },
]
```

- [ ] **Step 4: Add Home tests for PDF to Images card**

Read `src/pages/Home.test.tsx`. Add two tests at the end (match the existing test style — top-level `it()` calls using a `renderHome()` helper):

```tsx
it('renders PDF to Images tool card', () => {
  renderHome()
  expect(screen.getByText('PDF to Images')).toBeInTheDocument()
})

it('PDF to Images card links to correct route', () => {
  renderHome()
  expect(screen.getByRole('link', { name: /^PDF to Images/ })).toHaveAttribute(
    'href',
    '/pdf-to-images',
  )
})
```

- [ ] **Step 5: Run the full test suite**

```
cd "e:\vscode projects\pdfnip" && npx vitest run
```

Expected: all tests passing, no regressions.

- [ ] **Step 6: Typecheck**

```
cd "e:\vscode projects\pdfnip" && npm run typecheck
```

Expected: no errors.

- [ ] **Step 7: Commit**

```
git add src/App.tsx src/pages/Home.tsx src/components/Navbar.tsx src/pages/Home.test.tsx
git commit -m "feat: wire up /pdf-to-images route, home card, and navbar link"
```

---

## Self-Review

**Spec coverage:**
- ✅ PDF → Images tool with JPG and PNG format choice
- ✅ Quality selector (Low / Medium / High) for JPG, hidden for PNG
- ✅ Scale factor per quality: 1.0× / 1.5× / 2.0×
- ✅ JPG quality values: 0.60 / 0.82 / 0.95
- ✅ Output always a ZIP (`page-1.jpg`, `page-1.png`, etc.)
- ✅ Download filename: `originalname-images.zip`
- ✅ File drop, 100 MB limit, PDF-only validation
- ✅ Error messages match spec exactly
- ✅ Route `/pdf-to-images` in App.tsx
- ✅ Home card with `ImageDown` icon
- ✅ Navbar link added
- ✅ Mobile responsive (inherits `max-w-2xl`, `grid-cols-1 sm:grid-cols-3`)
- ✅ Tests for tool logic (8 tests)
- ✅ Tests for page UI (13 tests)
- ✅ Home tests updated

**Placeholder scan:** None. All steps contain complete code.

**Type consistency:**
- `ImageFormat = 'jpg' | 'png'` exported from `pdfToImages.ts`, imported as `type ImageFormat` in `PdfToImages.tsx` ✅
- `ImageQuality = 'low' | 'medium' | 'high'` exported from `pdfToImages.ts`, imported as `type ImageQuality` in `PdfToImages.tsx` ✅
- `pdfToImages(file, format, quality): Promise<Uint8Array>` consistent throughout ✅
