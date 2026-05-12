# PDFNip — Step 2: Compress Tool Design

**Date:** 2026-05-12
**Scope:** In-browser PDF compression — tool logic, DropZone upgrade, Compress page UI
**Status:** Approved

---

## Overview

Implement the Compress tool using a PDF.js canvas re-render approach. Each page is rendered to an off-screen canvas and exported as a JPEG at a configurable quality, then assembled into a new PDF via pdf-lib. All processing happens in the browser — no uploads.

**UX flow:** Drop file → pick quality → compress → see before/after sizes → download or compress another.

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `pdfjs-dist` | Render PDF pages to canvas |
| `pdf-lib` | Assemble JPEG frames into output PDF |

Both are browser-compatible npm packages. PDF.js requires its web worker to be configured via `GlobalWorkerOptions.workerSrc` pointing to the bundled worker.

---

## Architecture

### Files

```
src/tools/compress.ts          ← core compression logic (pure, no React)
src/tools/compress.test.ts     ← unit tests
src/pages/Compress.tsx         ← full page UI (replaces shell)
src/components/DropZone.tsx    ← upgraded from stub to real drag-and-drop
src/components/DropZone.test.tsx ← updated tests
```

### Data Flow

```
User drops/selects PDF
  → DropZone calls onFiles([file])
  → Compress page: status = 'ready', stores file
  → User selects quality, clicks Compress
  → compress(file, quality, onProgress) → ArrayBuffer
  → status = 'done', shows before/after + download
  → "Compress another" resets to status = 'idle'
```

---

## Compression Tool (`src/tools/compress.ts`)

### Types

```ts
export type Quality = 'low' | 'medium' | 'high'
```

### Function Signature

```ts
export async function compressPDF(
  file: File,
  quality: Quality,
  onProgress?: (page: number, total: number) => void
): Promise<ArrayBuffer>
```

### Quality Settings

| Level | JPEG quality | Canvas scale | Use case |
|-------|-------------|--------------|---------|
| `low` | 0.5 | 1.0x | Smallest file, screen viewing |
| `medium` | 0.75 | 1.5x | Balanced — recommended default |
| `high` | 0.92 | 2.0x | Near-original visual quality |

### Algorithm

1. Guard: throw if `file.size > 100 * 1024 * 1024` (100MB limit)
2. Read file as `ArrayBuffer` via `FileReader`
3. Load with `pdfjsLib.getDocument({ data: arrayBuffer })`
4. Create empty `PDFDocument` with pdf-lib
5. For each page index `i` from `0` to `numPages - 1`:
   a. Get PDF.js page object
   b. Get viewport at `{ scale: canvasScale }`
   c. Create off-screen `<canvas>` sized to viewport
   d. Render page to canvas via `page.render({ canvasContext, viewport })`
   e. Export canvas as JPEG: `canvas.toDataURL('image/jpeg', jpegQuality)`
   f. Embed JPEG into pdf-lib doc: `pdfDoc.embedJpg(jpegBytes)`
   g. Add page sized to the JPEG dimensions, draw image full-page
   h. Call `onProgress(i + 1, numPages)`
6. Return `pdfDoc.save()`

### Error Handling

- File exceeds 100MB → throw `new Error('File exceeds 100MB limit')`
- PDF.js load failure (corrupt/non-PDF) → propagate the PDF.js error as-is
- Canvas export failure → throw `new Error('Failed to process page')`

---

## DropZone Upgrade (`src/components/DropZone.tsx`)

### Props (unchanged interface)

```ts
export interface DropZoneProps {
  accept?: string        // e.g. 'application/pdf'
  multiple?: boolean
  onFiles: (files: File[]) => void
  label?: string
}
```

### Behaviour

- Renders a dashed-border drop area
- Click opens a hidden `<input type="file">` with the `accept` prop applied
- Drag-and-drop: `onDragOver` prevents default + sets `isDragging` state (teal border); `onDrop` extracts files and calls `onFiles`
- Once a file is selected, shows filename + formatted size inside the drop area (replaces label text)
- `isDragging` state: `border-primary` replaces `border-gray-600`

### Tests

- Renders default label
- Renders custom label
- Shows filename + size after file selected (via simulated drop)
- Calls `onFiles` with correct files on drop

---

## Compress Page (`src/pages/Compress.tsx`)

### State

```ts
type Status = 'idle' | 'ready' | 'compressing' | 'done' | 'error'

const [status, setStatus] = useState<Status>('idle')
const [file, setFile] = useState<File | null>(null)
const [quality, setQuality] = useState<Quality>('medium')
const [progress, setProgress] = useState({ page: 0, total: 0 })
const [result, setResult] = useState<ArrayBuffer | null>(null)
const [error, setError] = useState<string | null>(null)
```

### Status → UI Mapping

| Status | Renders |
|--------|---------|
| `idle` | DropZone + privacy note ("Your file never leaves your browser") |
| `ready` | Filename + size, quality selector (Low / Medium / High), Compress button |
| `compressing` | Progress bar (`Processing page X of Y…`), no interaction |
| `done` | Before size → After size + % saving, Download button, "Compress another PDF" link |
| `error` | Error message inline, DropZone shown again |

### Quality Selector

Three toggle buttons: Low / Medium / High. Active button: teal background + dark text. Inactive: surface background + muted text. Clicking sets `quality` state.

### Progress Bar

A full-width teal bar that fills proportionally: `width: ${(progress.page / progress.total) * 100}%`. Shows `"Processing page {page} of {total}…"` below.

### Before/After Display

```
Original    →    Compressed
1.8 MB      →    420 KB   (77% smaller)
```

Formatted with `formatBytes`. Percentage calculated as `Math.round((1 - after / before) * 100)`.

### Download

```ts
const url = URL.createObjectURL(new Blob([result], { type: 'application/pdf' }))
// <a href={url} download={`${filename}-compressed.pdf`}>Download</a>
// Revoke URL on unmount
```

### Error Messages

| Scenario | Message |
|----------|---------|
| Not a PDF | "Please select a valid PDF file." |
| Over 100MB | "File is too large (max 100MB)." |
| Compression failure | "Something went wrong. Please try again." |

### Mobile

Single column at all sizes. Quality buttons full-width on small screens. Container `max-w-2xl mx-auto px-4 py-12`.

---

## Testing

### `src/tools/compress.test.ts`

- Returns an `ArrayBuffer` for a valid minimal PDF at each quality level
- Calls `onProgress` once per page
- Throws for files over 100MB
- Throws for non-PDF input

### `src/components/DropZone.test.tsx`

- Renders default label (existing)
- Renders custom label (existing)
- Shows filename + size after file drop
- Calls `onFiles` with correct file on drop

### `src/pages/Compress.test.tsx`

- Renders idle state (DropZone visible)
- Transitions to ready state after file drop (quality selector + Compress button visible)
- Shows progress bar during compression (mock `compressPDF`)
- Shows before/after sizes in done state
- Download link has correct `download` attribute
- "Compress another" resets to idle
- Shows error message on compression failure

---

## Out of Scope

- OCR or text-layer preservation (canvas re-render produces image-only PDF — by design)
- Batch compression (multiple files at once)
- Custom DPI input
- Preview of compressed pages
