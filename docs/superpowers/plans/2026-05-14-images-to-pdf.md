# Images to PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an in-browser "Images to PDF" tool that converts 1–20 JPG/PNG images into a single downloadable PDF via pdf-lib.

**Architecture:** A pure `imagesToPdf(files, pageSize)` function in `src/tools/imagesToPdf.ts` uses pdf-lib's `embedJpg`/`embedPng` to embed images, creates pages at the requested size (A4, Letter, or matching the image's pixel dimensions), and returns `Uint8Array`. The `ImagesToPdf.tsx` page mirrors the Merge page: multi-file DropZone, drag-to-reorder list, page size selector, then convert/download flow.

**Tech Stack:** pdf-lib (already installed), React 18 + TypeScript, Vitest + Testing Library

---

## File Map

| Action | File |
|--------|------|
| Create | `src/tools/imagesToPdf.ts` |
| Create | `src/tools/imagesToPdf.test.ts` |
| Create | `src/pages/ImagesToPdf.tsx` |
| Create | `src/pages/ImagesToPdf.test.tsx` |
| Modify | `src/App.tsx` |
| Modify | `src/pages/Home.tsx` |
| Modify | `src/components/Navbar.tsx` |

---

## Task 1: Tool function — `src/tools/imagesToPdf.ts`

**Files:**
- Create: `src/tools/imagesToPdf.ts`
- Create: `src/tools/imagesToPdf.test.ts`

---

- [ ] **Step 1: Write the failing tests**

Create `src/tools/imagesToPdf.test.ts`:

```ts
import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockImage = vi.hoisted(() => ({ width: 800, height: 600 }))

const mockPage = vi.hoisted(() => ({
  drawImage: vi.fn(),
}))

const mockPdfDoc = vi.hoisted(() => ({
  embedJpg: vi.fn(),
  embedPng: vi.fn(),
  addPage: vi.fn(),
  save: vi.fn(),
}))

vi.mock('pdf-lib', () => ({
  PDFDocument: { create: vi.fn() },
}))

import { PDFDocument } from 'pdf-lib'
import { imagesToPdf } from './imagesToPdf'

beforeEach(() => {
  vi.clearAllMocks()
  mockImage.width = 800
  mockImage.height = 600
  mockPdfDoc.embedJpg.mockResolvedValue(mockImage)
  mockPdfDoc.embedPng.mockResolvedValue(mockImage)
  mockPdfDoc.addPage.mockReturnValue(mockPage)
  mockPdfDoc.save.mockResolvedValue(new Uint8Array([1, 2, 3]))
  vi.mocked(PDFDocument.create).mockResolvedValue(mockPdfDoc as any)
})

function makeJpeg(name = 'photo.jpg', size = 1024) {
  return new File([new ArrayBuffer(size)], name, { type: 'image/jpeg' })
}

function makePng(name = 'photo.png', size = 1024) {
  return new File([new ArrayBuffer(size)], name, { type: 'image/png' })
}

describe('imagesToPdf', () => {
  it('returns a Uint8Array', async () => {
    expect(await imagesToPdf([makeJpeg()], 'a4')).toBeInstanceOf(Uint8Array)
  })

  it('calls embedJpg for JPEG files', async () => {
    await imagesToPdf([makeJpeg()], 'a4')
    expect(mockPdfDoc.embedJpg).toHaveBeenCalledTimes(1)
    expect(mockPdfDoc.embedPng).not.toHaveBeenCalled()
  })

  it('calls embedPng for PNG files', async () => {
    await imagesToPdf([makePng()], 'a4')
    expect(mockPdfDoc.embedPng).toHaveBeenCalledTimes(1)
    expect(mockPdfDoc.embedJpg).not.toHaveBeenCalled()
  })

  it('creates A4 page with dimensions 595 × 842', async () => {
    await imagesToPdf([makeJpeg()], 'a4')
    expect(mockPdfDoc.addPage).toHaveBeenCalledWith([595, 842])
  })

  it('creates Letter page with dimensions 612 × 792', async () => {
    await imagesToPdf([makeJpeg()], 'letter')
    expect(mockPdfDoc.addPage).toHaveBeenCalledWith([612, 792])
  })

  it('creates page matching image dimensions for image page size', async () => {
    mockImage.width = 1200
    mockImage.height = 900
    await imagesToPdf([makeJpeg()], 'image')
    expect(mockPdfDoc.addPage).toHaveBeenCalledWith([1200, 900])
  })

  it('fits image within A4 preserving aspect ratio and centres it', async () => {
    // image 800×600, A4 595×842: scale = min(595/800, 842/600) = 0.74375
    mockImage.width = 800
    mockImage.height = 600
    await imagesToPdf([makeJpeg()], 'a4')
    const opts = mockPage.drawImage.mock.calls[0][1]
    expect(opts.width).toBeCloseTo(595, 0)
    expect(opts.height).toBeCloseTo(446, 0)
    expect(opts.x).toBeCloseTo(0, 0)
    expect(opts.y).toBeCloseTo(198, 0)
  })

  it('draws image at full page for image page size (no scaling)', async () => {
    mockImage.width = 1200
    mockImage.height = 900
    await imagesToPdf([makeJpeg()], 'image')
    const opts = mockPage.drawImage.mock.calls[0][1]
    expect(opts.x).toBe(0)
    expect(opts.y).toBe(0)
    expect(opts.width).toBe(1200)
    expect(opts.height).toBe(900)
  })

  it('throws when more than 20 files are provided', async () => {
    const files = Array.from({ length: 21 }, (_, i) => makeJpeg(`img${i}.jpg`))
    await expect(imagesToPdf(files, 'a4')).rejects.toThrow('Maximum 20 images allowed.')
  })

  it('throws when total size exceeds 50 MB', async () => {
    const big = new File([new ArrayBuffer(51 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' })
    await expect(imagesToPdf([big], 'a4')).rejects.toThrow('Total size exceeds 50 MB limit.')
  })

  it('throws for non-image files', async () => {
    const pdf = new File([new ArrayBuffer(1024)], 'doc.pdf', { type: 'application/pdf' })
    await expect(imagesToPdf([pdf], 'a4')).rejects.toThrow('Only JPG and PNG images are supported.')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```
npm test src/tools/imagesToPdf.test.ts
```

Expected: all tests fail with "Cannot find module './imagesToPdf'"

---

- [ ] **Step 3: Implement the tool**

Create `src/tools/imagesToPdf.ts`:

```ts
import { PDFDocument } from 'pdf-lib'

export type PageSize = 'a4' | 'letter' | 'image'

const PAGE_DIMENSIONS: Record<'a4' | 'letter', { width: number; height: number }> = {
  a4:     { width: 595, height: 842 },
  letter: { width: 612, height: 792 },
}

function isJpeg(file: File): boolean {
  return file.type === 'image/jpeg' || /\.(jpg|jpeg)$/i.test(file.name)
}

function isPng(file: File): boolean {
  return file.type === 'image/png' || /\.png$/i.test(file.name)
}

export async function imagesToPdf(
  files: File[],
  pageSize: PageSize,
): Promise<Uint8Array> {
  if (files.length < 1 || files.length > 20) {
    throw new Error('Maximum 20 images allowed.')
  }

  const totalSize = files.reduce((sum, f) => sum + f.size, 0)
  if (totalSize > 50 * 1024 * 1024) {
    throw new Error('Total size exceeds 50 MB limit.')
  }

  for (const f of files) {
    if (!isJpeg(f) && !isPng(f)) {
      throw new Error('Only JPG and PNG images are supported.')
    }
  }

  const pdfDoc = await PDFDocument.create()

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer()
    const image = isJpeg(file)
      ? await pdfDoc.embedJpg(arrayBuffer)
      : await pdfDoc.embedPng(arrayBuffer)

    let pageWidth: number
    let pageHeight: number

    if (pageSize === 'image') {
      pageWidth = image.width
      pageHeight = image.height
    } else {
      const dims = PAGE_DIMENSIONS[pageSize]
      pageWidth = dims.width
      pageHeight = dims.height
    }

    const page = pdfDoc.addPage([pageWidth, pageHeight])

    if (pageSize === 'image') {
      page.drawImage(image, { x: 0, y: 0, width: pageWidth, height: pageHeight })
    } else {
      const scale = Math.min(pageWidth / image.width, pageHeight / image.height)
      const drawWidth = image.width * scale
      const drawHeight = image.height * scale
      const x = (pageWidth - drawWidth) / 2
      const y = (pageHeight - drawHeight) / 2
      page.drawImage(image, { x, y, width: drawWidth, height: drawHeight })
    }
  }

  return pdfDoc.save()
}
```

- [ ] **Step 4: Run tests to verify they pass**

```
npm test src/tools/imagesToPdf.test.ts
```

Expected: all 11 tests pass

- [ ] **Step 5: Run typecheck**

```
npm run typecheck
```

Expected: no errors

- [ ] **Step 6: Commit**

```
git add src/tools/imagesToPdf.ts src/tools/imagesToPdf.test.ts
git commit -m "feat: imagesToPdf tool — embed JPG/PNG into PDF via pdf-lib"
```

---

## Task 2: Page UI — `src/pages/ImagesToPdf.tsx`

**Files:**
- Create: `src/pages/ImagesToPdf.tsx`
- Create: `src/pages/ImagesToPdf.test.tsx`

---

- [ ] **Step 1: Write the failing tests**

Create `src/pages/ImagesToPdf.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, beforeEach } from 'vitest'

vi.mock('../tools/imagesToPdf', () => ({
  imagesToPdf: vi.fn(),
}))

import { imagesToPdf } from '../tools/imagesToPdf'
import ImagesToPdf from './ImagesToPdf'

const mockImagesToPdf = vi.mocked(imagesToPdf)

beforeEach(() => {
  mockImagesToPdf.mockReset()
  mockImagesToPdf.mockResolvedValue(new Uint8Array(4096))
})

function makeJpeg(name = 'photo.jpg', size = 1024) {
  return new File([new ArrayBuffer(size)], name, { type: 'image/jpeg' })
}

function makePng(name = 'photo.png', size = 1024) {
  return new File([new ArrayBuffer(size)], name, { type: 'image/png' })
}

function dropFiles(files: File[]) {
  const dropArea = screen.getByTestId('dropzone')
  fireEvent.drop(dropArea, { dataTransfer: { files } })
}

it('renders idle state with DropZone and privacy note', () => {
  render(<ImagesToPdf />)
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
  expect(screen.getByText(/never leave your browser/i)).toBeInTheDocument()
})

it('transitions to ready state after dropping valid images', () => {
  render(<ImagesToPdf />)
  dropFiles([makeJpeg('a.jpg'), makePng('b.png')])
  expect(screen.getByText('a.jpg')).toBeInTheDocument()
  expect(screen.getByText('b.png')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /convert to pdf/i })).toBeInTheDocument()
})

it('shows error for non-image file', () => {
  render(<ImagesToPdf />)
  dropFiles([new File(['text'], 'doc.txt', { type: 'text/plain' })])
  expect(screen.getByText('Only JPG and PNG images are supported.')).toBeInTheDocument()
})

it('shows error when more than 20 images are dropped', () => {
  render(<ImagesToPdf />)
  const files = Array.from({ length: 21 }, (_, i) => makeJpeg(`img${i}.jpg`))
  dropFiles(files)
  expect(screen.getByText('Maximum 20 images allowed.')).toBeInTheDocument()
})

it('shows error when total size exceeds 50 MB', () => {
  render(<ImagesToPdf />)
  const big = new File([new ArrayBuffer(51 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' })
  dropFiles([big])
  expect(screen.getByText('Total size exceeds 50 MB limit.')).toBeInTheDocument()
})

it('has A4 selected by default', () => {
  render(<ImagesToPdf />)
  dropFiles([makeJpeg()])
  expect(screen.getByRole('button', { name: 'A4' })).toHaveClass('bg-primary')
})

it('shows page size selector with A4, Letter, and Match image size options', () => {
  render(<ImagesToPdf />)
  dropFiles([makeJpeg()])
  expect(screen.getByRole('button', { name: 'A4' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Letter' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /match image size/i })).toBeInTheDocument()
})

it('remove button removes a file from the list', () => {
  render(<ImagesToPdf />)
  dropFiles([makeJpeg('a.jpg'), makePng('b.png'), makeJpeg('c.jpg')])
  fireEvent.click(screen.getByRole('button', { name: /remove a\.jpg/i }))
  expect(screen.queryByText('a.jpg')).not.toBeInTheDocument()
  expect(screen.getByText('b.png')).toBeInTheDocument()
})

it('removing all files resets to idle', () => {
  render(<ImagesToPdf />)
  dropFiles([makeJpeg('a.jpg')])
  fireEvent.click(screen.getByRole('button', { name: /remove a\.jpg/i }))
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
})

it('drag-and-drop reorder updates file order', () => {
  render(<ImagesToPdf />)
  dropFiles([makeJpeg('a.jpg'), makePng('b.png'), makeJpeg('c.jpg')])
  const items = screen.getAllByRole('listitem')
  fireEvent.dragStart(items[0])
  fireEvent.dragOver(items[2])
  fireEvent.drop(items[2])
  const updated = screen.getAllByRole('listitem')
  expect(updated[0]).toHaveTextContent('b.png')
  expect(updated[2]).toHaveTextContent('a.jpg')
})

it('shows loading state while converting', async () => {
  mockImagesToPdf.mockImplementation(() => new Promise(() => {}))
  render(<ImagesToPdf />)
  dropFiles([makeJpeg()])
  fireEvent.click(screen.getByRole('button', { name: /convert to pdf/i }))
  await waitFor(() => expect(screen.getByText(/converting/i)).toBeInTheDocument())
})

it('shows download button in done state', async () => {
  render(<ImagesToPdf />)
  dropFiles([makeJpeg()])
  fireEvent.click(screen.getByRole('button', { name: /convert to pdf/i }))
  await waitFor(() => screen.getByText('Download'))
  expect(screen.getByRole('link', { name: 'Download' })).toBeInTheDocument()
})

it('download link has filename images.pdf', async () => {
  render(<ImagesToPdf />)
  dropFiles([makeJpeg()])
  fireEvent.click(screen.getByRole('button', { name: /convert to pdf/i }))
  await waitFor(() => screen.getByText('Download'))
  expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute('download', 'images.pdf')
})

it('"Convert more images" resets to idle', async () => {
  render(<ImagesToPdf />)
  dropFiles([makeJpeg()])
  fireEvent.click(screen.getByRole('button', { name: /convert to pdf/i }))
  await waitFor(() => screen.getByText('Download'))
  fireEvent.click(screen.getByRole('button', { name: /convert more images/i }))
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
})

it('shows error when conversion fails', async () => {
  mockImagesToPdf.mockRejectedValue(new Error('boom'))
  render(<ImagesToPdf />)
  dropFiles([makeJpeg()])
  fireEvent.click(screen.getByRole('button', { name: /convert to pdf/i }))
  await waitFor(() =>
    expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument(),
  )
})

it('passes selected page size to imagesToPdf', async () => {
  render(<ImagesToPdf />)
  dropFiles([makeJpeg()])
  fireEvent.click(screen.getByRole('button', { name: 'Letter' }))
  fireEvent.click(screen.getByRole('button', { name: /convert to pdf/i }))
  await waitFor(() => screen.getByText('Download'))
  expect(mockImagesToPdf).toHaveBeenCalledWith(expect.any(Array), 'letter')
})
```

- [ ] **Step 2: Run tests to verify they fail**

```
npm test src/pages/ImagesToPdf.test.tsx
```

Expected: all tests fail with "Cannot find module './ImagesToPdf'"

---

- [ ] **Step 3: Implement the page**

Create `src/pages/ImagesToPdf.tsx`:

```tsx
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
  return file.type === 'image/jpeg' || /\.(jpg|jpeg)$/i.test(file.name)
}

function isPng(file: File) {
  return file.type === 'image/png' || /\.png$/i.test(file.name)
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
    return URL.createObjectURL(new Blob([result as BlobPart], { type: 'application/pdf' }))
  }, [result])

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    }
  }, [downloadUrl])

  function handleFiles(incoming: File[]) {
    const all = [...files.map((f) => f.file), ...incoming]

    for (const f of incoming) {
      if (!isJpeg(f) && !isPng(f)) {
        setError('Only JPG and PNG images are supported.')
        setStatus('error')
        return
      }
    }

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
```

- [ ] **Step 4: Run tests to verify they pass**

```
npm test src/pages/ImagesToPdf.test.tsx
```

Expected: all 16 tests pass

- [ ] **Step 5: Run typecheck**

```
npm run typecheck
```

Expected: no errors

- [ ] **Step 6: Commit**

```
git add src/pages/ImagesToPdf.tsx src/pages/ImagesToPdf.test.tsx
git commit -m "feat: Images to PDF page UI with drag-to-reorder and page size selector"
```

---

## Task 3: Wiring — route, Home card, Navbar link

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/pages/Home.tsx`
- Modify: `src/components/Navbar.tsx`

---

- [ ] **Step 1: Add route to `src/App.tsx`**

Add the import after the `PdfToImages` import (line 9):

```ts
import ImagesToPdf from './pages/ImagesToPdf'
```

Add the route after the `pdf-to-images` route (line 24):

```ts
{ path: 'images-to-pdf', element: <ImagesToPdf /> },
```

The `children` array in App.tsx should now look like:

```ts
children: [
  { index: true, element: <Home /> },
  { path: 'compress', element: <Compress /> },
  { path: 'merge', element: <Merge /> },
  { path: 'split', element: <Split /> },
  { path: 'extract', element: <Extract /> },
  { path: 'rotate', element: <Rotate /> },
  { path: 'pdf-to-images', element: <PdfToImages /> },
  { path: 'images-to-pdf', element: <ImagesToPdf /> },
  { path: 'privacy', element: <PrivacyPolicy /> },
  { path: 'terms', element: <Terms /> },
],
```

- [ ] **Step 2: Add card to `src/pages/Home.tsx`**

Add `FileImage` to the lucide-react import (line 1). The current import is:

```ts
import { FileDown, GitMerge, Scissors, FileOutput, RotateCw, ImageDown } from 'lucide-react'
```

Change to:

```ts
import { FileDown, GitMerge, Scissors, FileOutput, RotateCw, ImageDown, FileImage } from 'lucide-react'
```

Add a seventh entry to the `TOOLS` array after the `PDF to Images` entry:

```ts
{
  title: 'Images to PDF',
  description: 'Convert JPG and PNG images to a PDF',
  detail: '1–20 images · A4, Letter, or match size',
  icon: <FileImage size={32} />,
  href: '/images-to-pdf',
},
```

- [ ] **Step 3: Add nav link to `src/components/Navbar.tsx`**

Add an entry to the `NAV_LINKS` array after the `PDF to Images` entry (line 11):

```ts
{ to: '/images-to-pdf', label: 'Images to PDF' },
```

The full `NAV_LINKS` array should now be:

```ts
const NAV_LINKS = [
  { to: '/compress', label: 'Compress' },
  { to: '/merge', label: 'Merge' },
  { to: '/split', label: 'Split' },
  { to: '/extract', label: 'Extract' },
  { to: '/rotate', label: 'Rotate' },
  { to: '/pdf-to-images', label: 'PDF to Images' },
  { to: '/images-to-pdf', label: 'Images to PDF' },
]
```

- [ ] **Step 4: Run the full test suite**

```
npm test
```

Expected: all tests pass (no regressions)

- [ ] **Step 5: Run typecheck and build**

```
npm run typecheck && npm run build
```

Expected: no type errors, build succeeds

- [ ] **Step 6: Commit**

```
git add src/App.tsx src/pages/Home.tsx src/components/Navbar.tsx
git commit -m "feat: wire /images-to-pdf route, Home card, and Navbar link"
```

---

## Done

After all three tasks pass, the Images to PDF tool is fully functional. Update `progress.md` to mark Step 9 complete with the final test count, then merge to main and push.
