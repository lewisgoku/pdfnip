# Convert PDF & Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the existing "PDF to Images" and "Images to PDF" tools into a single combined page at `/convert`, with direction-picker UI, redirects from old routes, and deletion of old page files.

**Architecture:** A single `Convert.tsx` page holds `direction` state (`null | 'pdf-to-images' | 'images-to-pdf'`). When null, two direction buttons are shown. Once picked, the relevant flow renders inline. Existing tool functions (`pdfToImages.ts`, `imagesToPdf.ts`) are untouched. Old page files are deleted and old routes become `<Navigate>` redirects.

**Tech Stack:** React 18, TypeScript strict, Tailwind CSS v3, Vitest + Testing Library, React Router v6 (`Navigate`).

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/pages/Convert.tsx` | Combined page — direction picker + both flows |
| Create | `src/pages/Convert.test.tsx` | UI tests for all states and both flows |
| Delete | `src/pages/PdfToImages.tsx` | Replaced by Convert |
| Delete | `src/pages/PdfToImages.test.tsx` | Replaced by Convert.test |
| Delete | `src/pages/ImagesToPdf.tsx` | Replaced by Convert |
| Delete | `src/pages/ImagesToPdf.test.tsx` | Replaced by Convert.test |
| Modify | `src/App.tsx` | Add `/convert` route; change old routes to `<Navigate>` |
| Modify | `src/pages/Home.tsx` | Replace two cards with one Convert card |
| Modify | `src/components/Navbar.tsx` | Replace two links with one Convert link |
| Modify | `public/sitemap.xml` | Replace two entries with one `/convert` entry |

---

## Task 1: Combined page — `src/pages/Convert.tsx`

**Files:**
- Create: `src/pages/Convert.tsx`
- Create: `src/pages/Convert.test.tsx`

### Step 1 — Write the failing tests

Create `src/pages/Convert.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, beforeEach } from 'vitest'

vi.mock('../tools/pdfToImages', () => ({ pdfToImages: vi.fn() }))
vi.mock('../tools/imagesToPdf', () => ({ imagesToPdf: vi.fn() }))

import { pdfToImages } from '../tools/pdfToImages'
import { imagesToPdf } from '../tools/imagesToPdf'
import Convert from './Convert'

const mockPdfToImages = vi.mocked(pdfToImages)
const mockImagesToPdf = vi.mocked(imagesToPdf)

beforeEach(() => {
  mockPdfToImages.mockReset()
  mockPdfToImages.mockResolvedValue(new Uint8Array(2048))
  mockImagesToPdf.mockReset()
  mockImagesToPdf.mockResolvedValue(new Uint8Array(4096))
})

function makePDF(name = 'doc.pdf', size = 1024) {
  return new File([new ArrayBuffer(size)], name, { type: 'application/pdf' })
}
function makeJpeg(name = 'photo.jpg', size = 1024) {
  return new File([new ArrayBuffer(size)], name, { type: 'image/jpeg' })
}
function makePng(name = 'photo.png', size = 1024) {
  return new File([new ArrayBuffer(size)], name, { type: 'image/png' })
}
function dropFile(file: File) {
  fireEvent.drop(screen.getByTestId('dropzone'), { dataTransfer: { files: [file] } })
}
function dropFiles(files: File[]) {
  fireEvent.drop(screen.getByTestId('dropzone'), { dataTransfer: { files } })
}
function clickPdfToImages() {
  fireEvent.click(screen.getByRole('button', { name: /pdf.*→.*images/i }))
}
function clickImagesToPdf() {
  fireEvent.click(screen.getByRole('button', { name: /images.*→.*pdf/i }))
}

// ── Direction picker ─────────────────────────────────────────────────────────

it('renders direction picker with two direction buttons', () => {
  render(<Convert />)
  expect(screen.getByRole('button', { name: /pdf.*→.*images/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /images.*→.*pdf/i })).toBeInTheDocument()
})

it('clicking PDF→Images hides picker and shows DropZone', () => {
  render(<Convert />)
  clickPdfToImages()
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /pdf.*→.*images/i })).not.toBeInTheDocument()
})

it('clicking Images→PDF hides picker and shows DropZone', () => {
  render(<Convert />)
  clickImagesToPdf()
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /images.*→.*pdf/i })).not.toBeInTheDocument()
})

it('"← Change direction" from PDF→Images resets to picker', () => {
  render(<Convert />)
  clickPdfToImages()
  fireEvent.click(screen.getByRole('button', { name: /change direction/i }))
  expect(screen.getByRole('button', { name: /pdf.*→.*images/i })).toBeInTheDocument()
})

it('"← Change direction" from Images→PDF resets to picker', () => {
  render(<Convert />)
  clickImagesToPdf()
  fireEvent.click(screen.getByRole('button', { name: /change direction/i }))
  expect(screen.getByRole('button', { name: /images.*→.*pdf/i })).toBeInTheDocument()
})

// ── PDF → Images: idle & validation ─────────────────────────────────────────

it('[pdf→images] idle: shows DropZone', () => {
  render(<Convert />)
  clickPdfToImages()
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
})

it('[pdf→images] non-PDF shows error', () => {
  render(<Convert />)
  clickPdfToImages()
  dropFile(new File(['txt'], 'doc.txt', { type: 'text/plain' }))
  expect(screen.getByText('Please select a valid PDF file.')).toBeInTheDocument()
})

it('[pdf→images] file over 100MB shows error', () => {
  render(<Convert />)
  clickPdfToImages()
  dropFile(new File([new ArrayBuffer(101 * 1024 * 1024)], 'big.pdf', { type: 'application/pdf' }))
  expect(screen.getByText('File is too large (max 100MB).')).toBeInTheDocument()
})

// ── PDF → Images: ready & options ───────────────────────────────────────────

it('[pdf→images] valid PDF drop shows ready state', () => {
  render(<Convert />)
  clickPdfToImages()
  dropFile(makePDF('report.pdf'))
  expect(screen.getByText('report.pdf')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /^Convert$/ })).toBeInTheDocument()
})

it('[pdf→images] JPG selected by default', () => {
  render(<Convert />)
  clickPdfToImages()
  dropFile(makePDF())
  expect(screen.getByRole('button', { name: 'JPG' })).toHaveClass('bg-primary')
})

it('[pdf→images] quality selector shown for JPG', () => {
  render(<Convert />)
  clickPdfToImages()
  dropFile(makePDF())
  expect(screen.getByText('Quality')).toBeInTheDocument()
})

it('[pdf→images] quality selector hidden for PNG', () => {
  render(<Convert />)
  clickPdfToImages()
  dropFile(makePDF())
  fireEvent.click(screen.getByRole('button', { name: 'PNG' }))
  expect(screen.queryByText('Quality')).not.toBeInTheDocument()
})

// ── PDF → Images: converting & done ─────────────────────────────────────────

it('[pdf→images] shows loading state while converting', async () => {
  mockPdfToImages.mockImplementation(() => new Promise(() => {}))
  render(<Convert />)
  clickPdfToImages()
  dropFile(makePDF())
  fireEvent.click(screen.getByRole('button', { name: /^Convert$/ }))
  await waitFor(() => expect(screen.getByText(/converting/i)).toBeInTheDocument())
})

it('[pdf→images] done state shows download link with correct filename', async () => {
  render(<Convert />)
  clickPdfToImages()
  dropFile(makePDF('report.pdf'))
  fireEvent.click(screen.getByRole('button', { name: /^Convert$/ }))
  await waitFor(() => screen.getByRole('link', { name: 'Download' }))
  expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute('download', 'report-images.zip')
})

it('[pdf→images] "Convert another PDF" resets to idle within pdf-to-images flow', async () => {
  render(<Convert />)
  clickPdfToImages()
  dropFile(makePDF())
  fireEvent.click(screen.getByRole('button', { name: /^Convert$/ }))
  await waitFor(() => screen.getByRole('link', { name: 'Download' }))
  fireEvent.click(screen.getByRole('button', { name: /convert another/i }))
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
  // direction preserved — change direction button still shown, picker buttons absent
  expect(screen.getByRole('button', { name: /change direction/i })).toBeInTheDocument()
})

it('[pdf→images] conversion failure shows error and stays in ready state', async () => {
  mockPdfToImages.mockRejectedValue(new Error('boom'))
  render(<Convert />)
  clickPdfToImages()
  dropFile(makePDF())
  fireEvent.click(screen.getByRole('button', { name: /^Convert$/ }))
  await waitFor(() =>
    expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument(),
  )
  expect(screen.getByRole('button', { name: /^Convert$/ })).toBeInTheDocument()
})

// ── Images → PDF: idle & validation ─────────────────────────────────────────

it('[images→pdf] idle: shows DropZone', () => {
  render(<Convert />)
  clickImagesToPdf()
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
})

it('[images→pdf] non-image shows error', () => {
  render(<Convert />)
  clickImagesToPdf()
  dropFiles([new File(['txt'], 'doc.txt', { type: 'text/plain' })])
  expect(screen.getByText('Only JPG and PNG images are supported.')).toBeInTheDocument()
})

it('[images→pdf] more than 20 images shows error', () => {
  render(<Convert />)
  clickImagesToPdf()
  dropFiles(Array.from({ length: 21 }, (_, i) => makeJpeg(`img${i}.jpg`)))
  expect(screen.getByText('Maximum 20 images allowed.')).toBeInTheDocument()
})

it('[images→pdf] total size over 50MB shows error', () => {
  render(<Convert />)
  clickImagesToPdf()
  dropFiles([new File([new ArrayBuffer(51 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' })])
  expect(screen.getByText('Total size exceeds 50 MB limit.')).toBeInTheDocument()
})

// ── Images → PDF: ready & options ───────────────────────────────────────────

it('[images→pdf] valid images show ready state with file list and Convert to PDF button', () => {
  render(<Convert />)
  clickImagesToPdf()
  dropFiles([makeJpeg('a.jpg'), makePng('b.png')])
  expect(screen.getByText('a.jpg')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /convert to pdf/i })).toBeInTheDocument()
})

it('[images→pdf] A4 selected by default', () => {
  render(<Convert />)
  clickImagesToPdf()
  dropFiles([makeJpeg()])
  expect(screen.getByRole('button', { name: 'A4' })).toHaveClass('bg-primary')
})

it('[images→pdf] page size selector shows A4, Letter, and Match image size', () => {
  render(<Convert />)
  clickImagesToPdf()
  dropFiles([makeJpeg()])
  expect(screen.getByRole('button', { name: 'A4' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Letter' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /match image size/i })).toBeInTheDocument()
})

it('[images→pdf] remove button removes file from list', () => {
  render(<Convert />)
  clickImagesToPdf()
  dropFiles([makeJpeg('a.jpg'), makePng('b.png')])
  fireEvent.click(screen.getByRole('button', { name: /remove a\.jpg/i }))
  expect(screen.queryByText('a.jpg')).not.toBeInTheDocument()
  expect(screen.getByText('b.png')).toBeInTheDocument()
})

it('[images→pdf] removing all files shows DropZone', () => {
  render(<Convert />)
  clickImagesToPdf()
  dropFiles([makeJpeg('a.jpg')])
  fireEvent.click(screen.getByRole('button', { name: /remove a\.jpg/i }))
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
})

it('[images→pdf] drag-to-reorder changes file order', () => {
  render(<Convert />)
  clickImagesToPdf()
  dropFiles([makeJpeg('a.jpg'), makePng('b.png'), makeJpeg('c.jpg')])
  const items = screen.getAllByRole('listitem')
  fireEvent.dragStart(items[0])
  fireEvent.dragOver(items[2])
  fireEvent.drop(items[2])
  const updated = screen.getAllByRole('listitem')
  expect(updated[0]).toHaveTextContent('b.png')
  expect(updated[2]).toHaveTextContent('a.jpg')
})

// ── Images → PDF: converting & done ─────────────────────────────────────────

it('[images→pdf] shows loading state while converting', async () => {
  mockImagesToPdf.mockImplementation(() => new Promise(() => {}))
  render(<Convert />)
  clickImagesToPdf()
  dropFiles([makeJpeg()])
  fireEvent.click(screen.getByRole('button', { name: /convert to pdf/i }))
  await waitFor(() => expect(screen.getByText(/converting/i)).toBeInTheDocument())
})

it('[images→pdf] done state shows download link with filename images.pdf', async () => {
  render(<Convert />)
  clickImagesToPdf()
  dropFiles([makeJpeg()])
  fireEvent.click(screen.getByRole('button', { name: /convert to pdf/i }))
  await waitFor(() => screen.getByRole('link', { name: 'Download' }))
  expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute('download', 'images.pdf')
})

it('[images→pdf] "Convert more images" resets to idle within images-to-pdf flow', async () => {
  render(<Convert />)
  clickImagesToPdf()
  dropFiles([makeJpeg()])
  fireEvent.click(screen.getByRole('button', { name: /convert to pdf/i }))
  await waitFor(() => screen.getByRole('link', { name: 'Download' }))
  fireEvent.click(screen.getByRole('button', { name: /convert more images/i }))
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /change direction/i })).toBeInTheDocument()
})

it('[images→pdf] conversion failure shows error and stays in ready state', async () => {
  mockImagesToPdf.mockRejectedValue(new Error('boom'))
  render(<Convert />)
  clickImagesToPdf()
  dropFiles([makeJpeg()])
  fireEvent.click(screen.getByRole('button', { name: /convert to pdf/i }))
  await waitFor(() =>
    expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument(),
  )
  expect(screen.getByRole('button', { name: /convert to pdf/i })).toBeInTheDocument()
})

it('[images→pdf] passes selected page size to imagesToPdf', async () => {
  render(<Convert />)
  clickImagesToPdf()
  dropFiles([makeJpeg()])
  fireEvent.click(screen.getByRole('button', { name: 'Letter' }))
  fireEvent.click(screen.getByRole('button', { name: /convert to pdf/i }))
  await waitFor(() => screen.getByRole('link', { name: 'Download' }))
  expect(mockImagesToPdf).toHaveBeenCalledWith(expect.any(Array), 'letter')
})
```

### Step 2 — Run tests to verify they fail

```
npx vitest run src/pages/Convert.test.tsx
```

Expected: all tests fail with `Cannot find module './Convert'`.

### Step 3 — Implement `src/pages/Convert.tsx`

```tsx
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
    if (dragIndex.current === null || dragIndex.current === targetIndex) return
    setImageFiles((prev) => {
      const next = [...prev]
      const [moved] = next.splice(dragIndex.current!, 1)
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
```

### Step 4 — Run tests to verify they pass

```
npx vitest run src/pages/Convert.test.tsx
```

Expected: 35 tests passing, 0 failing. If any fail, fix the implementation (not the tests) before proceeding.

### Step 5 — Typecheck

```
npm run typecheck
```

Expected: no errors.

### Step 6 — Commit

```
git add src/pages/Convert.tsx src/pages/Convert.test.tsx
git commit -m "feat: add Convert page combining PDF-to-Images and Images-to-PDF flows"
```

---

## Task 2: Wiring + cleanup

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/pages/Home.tsx`
- Modify: `src/components/Navbar.tsx`
- Modify: `public/sitemap.xml`
- Delete: `src/pages/PdfToImages.tsx`
- Delete: `src/pages/PdfToImages.test.tsx`
- Delete: `src/pages/ImagesToPdf.tsx`
- Delete: `src/pages/ImagesToPdf.test.tsx`

### Step 1 — Read the current state of all four files before editing

```
# Read each file before editing — required by the editor
```

Read: `src/App.tsx`, `src/pages/Home.tsx`, `src/components/Navbar.tsx`, `public/sitemap.xml`

### Step 2 — Update `src/App.tsx`

Replace the current content with:

```tsx
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Compress from './pages/Compress'
import Merge from './pages/Merge'
import Split from './pages/Split'
import Extract from './pages/Extract'
import Rotate from './pages/Rotate'
import Convert from './pages/Convert'
import UnlockPdf from './pages/UnlockPdf'
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
      { path: 'convert', element: <Convert /> },
      { path: 'pdf-to-images', element: <Navigate to="/convert" replace /> },
      { path: 'images-to-pdf', element: <Navigate to="/convert" replace /> },
      { path: 'unlock-pdf', element: <UnlockPdf /> },
      { path: 'privacy', element: <PrivacyPolicy /> },
      { path: 'terms', element: <Terms /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
```

### Step 3 — Update `src/pages/Home.tsx`

Change the lucide-react import — replace `ImageDown` and `FileImage` with `ArrowLeftRight`:

```ts
import { FileDown, GitMerge, Scissors, FileOutput, RotateCw, ArrowLeftRight, LockOpen } from 'lucide-react'
```

Replace the two tool entries (PDF to Images and Images to PDF) with one Convert entry. The TOOLS array should become:

```ts
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
  {
    title: 'Convert',
    description: 'Convert between PDFs and images',
    detail: 'PDF → JPG/PNG · Images → PDF',
    icon: <ArrowLeftRight size={32} />,
    href: '/convert',
  },
  {
    title: 'Unlock PDF',
    description: 'Remove password protection and owner restrictions',
    detail: 'No password? Auto-detected · No uploads',
    icon: <LockOpen size={32} />,
    href: '/unlock-pdf',
  },
]
```

### Step 4 — Update `src/components/Navbar.tsx`

Replace the two Convert-related entries in `NAV_LINKS` with one:

```ts
const NAV_LINKS = [
  { to: '/compress', label: 'Compress' },
  { to: '/merge', label: 'Merge' },
  { to: '/split', label: 'Split' },
  { to: '/extract', label: 'Extract' },
  { to: '/rotate', label: 'Rotate' },
  { to: '/convert', label: 'Convert' },
  { to: '/unlock-pdf', label: 'Unlock' },
]
```

### Step 5 — Update `public/sitemap.xml`

Replace the `/pdf-to-images` and `/images-to-pdf` entries with a single `/convert` entry. The sitemap should contain:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://pdfnip.com/</loc>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://pdfnip.com/compress</loc>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://pdfnip.com/merge</loc>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://pdfnip.com/split</loc>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://pdfnip.com/extract</loc>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://pdfnip.com/rotate</loc>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://pdfnip.com/convert</loc>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://pdfnip.com/unlock-pdf</loc>
    <lastmod>2026-05-14</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://pdfnip.com/privacy</loc>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>https://pdfnip.com/terms</loc>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
</urlset>
```

### Step 6 — Delete the four old page files

```
Remove-Item src/pages/PdfToImages.tsx
Remove-Item src/pages/PdfToImages.test.tsx
Remove-Item src/pages/ImagesToPdf.tsx
Remove-Item src/pages/ImagesToPdf.test.tsx
```

### Step 7 — Run all tests

```
npx vitest run
```

Expected: all tests pass. The old PdfToImages and ImagesToPdf test files are gone; their coverage is replaced by Convert.test.tsx. Tool-level tests (`pdfToImages.test.ts`, `imagesToPdf.test.ts`) are untouched and still pass.

### Step 8 — Typecheck and build

```
npm run typecheck && npm run build
```

Expected: no errors, build succeeds.

### Step 9 — Commit

```
git add src/App.tsx src/pages/Home.tsx src/components/Navbar.tsx public/sitemap.xml
git commit -m "feat: wire /convert route, update home card and navbar, redirect old routes"
```
