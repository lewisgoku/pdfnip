# PDFNip — Step 3: Merge Tool Design

**Date:** 2026-05-12
**Scope:** In-browser PDF merging — merge tool logic, file list with drag-to-reorder, Merge page UI
**Status:** Approved

---

## Overview

Implement the Merge tool using pdf-lib to copy pages from multiple PDFs into a single output document. Users drop 2–10 PDF files, reorder them via drag-and-drop, and download the merged result. All processing happens in the browser — no uploads.

**UX flow:** Drop files → see file list with page counts → reorder/remove → merge → see summary → download or merge another.

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `pdf-lib` | Merge PDF pages into a single document (already installed) |

No new dependencies required.

---

## Architecture

### Files

```
src/tools/merge.ts          ← core merge logic (pure, no React)
src/tools/merge.test.ts     ← unit tests
src/pages/Merge.tsx         ← full page UI (replaces shell)
src/pages/Merge.test.tsx    ← page state tests
```

### Data Flow

```
User drops/selects PDFs
  → Merge page: validates files, adds to list
  → getPageCount(file) called per file → page count shown in list
  → User reorders (drag-and-drop) or removes files
  → User clicks Merge
  → mergePDFs(files, onProgress) → ArrayBuffer
  → status = 'done', shows summary + download
  → "Merge another" resets to status = 'idle'
```

---

## Merge Tool (`src/tools/merge.ts`)

### Functions

```ts
export async function mergePDFs(
  files: File[],
  onProgress?: (current: number, total: number) => void,
): Promise<ArrayBuffer>

export async function getPageCount(file: File): Promise<number>
```

### mergePDFs Algorithm

1. Guard: throw if any file exceeds 100MB → `'File exceeds 100MB limit'`
2. Guard: throw if fewer than 2 files → `'At least 2 files required'`
3. Create empty `PDFDocument` via `PDFDocument.create()`
4. For each file (index `i`):
   a. Read as `ArrayBuffer` via `file.arrayBuffer()`
   b. Load with `PDFDocument.load(arrayBuffer)`
   c. Copy all pages into output doc via `outputDoc.copyPages(srcDoc, srcDoc.getPageIndices())`
   d. Add each copied page via `outputDoc.addPage(page)`
   e. Call `onProgress(i + 1, files.length)`
5. Return `outputDoc.save()` as `ArrayBuffer`

### getPageCount Algorithm

1. Read file as `ArrayBuffer`
2. Load with `PDFDocument.load(arrayBuffer, { ignoreEncryption: true })`
3. Return `doc.getPageCount()`

### Error Handling

- File exceeds 100MB → throw `new Error('File exceeds 100MB limit')`
- Fewer than 2 files → throw `new Error('At least 2 files required')`
- Corrupt/non-PDF → propagate pdf-lib parse error as-is

---

## Merge Page (`src/pages/Merge.tsx`)

### State

```ts
type Status = 'idle' | 'ready' | 'merging' | 'done' | 'error'

type MergeFile = {
  file: File
  id: string          // crypto.randomUUID() — stable key for drag-and-drop
  pageCount: number | null  // null while loading
}

const [status, setStatus] = useState<Status>('idle')
const [files, setFiles] = useState<MergeFile[]>([])
const [progress, setProgress] = useState({ current: 0, total: 0 })
const [result, setResult] = useState<ArrayBuffer | null>(null)
const [error, setError] = useState<string | null>(null)
```

### Status → UI Mapping

| Status | Renders |
|--------|---------|
| `idle` | DropZone (multiple, PDF only) + privacy note |
| `ready` | File list + Add more button + Merge button |
| `merging` | Progress bar (`Merging file X of Y…`), no interaction |
| `done` | Summary (N files merged → P pages · S KB) + Download + "Merge another PDFs" |
| `error` | Error message inline + reset to idle |

### File List Item

Each row in the ready state renders:
- Drag handle (`⠿`) — triggers HTML5 drag-and-drop reorder
- Filename (truncated if long)
- File size (formatted with `formatBytes`)
- Page count — shows `"— pages"` while `pageCount === null`, then `"N pages"` once resolved
- Remove button (✕) — always enabled; if removal drops below 2 files, status returns to `idle`

### Drag-to-Reorder

HTML5 native drag-and-drop on each row:
- `draggable={true}` on each file row
- `onDragStart` — stores dragged item index in a `useRef`
- `onDragOver` — `e.preventDefault()` to allow drop
- `onDrop` — swaps dragged index with drop target index in `files` array

### handleFiles (called from DropZone and "Add more")

For each incoming file:
1. Check MIME type or extension — skip non-PDFs, show inline error
2. Check size — skip files over 100MB, show inline error
3. Check total count — if adding would exceed 10, ignore extras + show warning
4. Add to `files` array with `pageCount: null`
5. Call `getPageCount(file)` async → update `pageCount` in state once resolved
6. Set `status = 'ready'`

### Add More Button

Shown in `ready` state. Clicking opens a file picker (hidden `<input type="file" multiple accept="application/pdf">`). Calls `handleFiles` with new selection — merges with existing list.

### Progress Bar

Full-width teal bar: `width: ${(progress.current / progress.total) * 100}%`
Label: `"Merging file {current} of {total}…"`

### Done State Summary

```
3 files merged · 28 pages · 1.2 MB
```

- File count from `files.length`
- Total pages: sum of all `pageCount` values
- Output size: `formatBytes(result.byteLength)`

### Download

```ts
const url = URL.createObjectURL(new Blob([result], { type: 'application/pdf' }))
// <a href={url} download="merged.pdf">Download</a>
// Revoke URL on unmount via useEffect
```

Output filename is always `merged.pdf`.

### Error Messages

| Scenario | Message |
|----------|---------|
| Non-PDF file dropped | "Please select valid PDF files only." |
| File over 100MB | "One or more files exceed the 100MB limit." |
| Merge failure | "Something went wrong. Please try again." |
| Over 10 files | "Maximum 10 files supported. Extra files were ignored." |

### Mobile

Single column at all sizes. File list rows stack naturally. Container `max-w-2xl mx-auto px-4 py-12`.

---

## Testing

### `src/tools/merge.test.ts`

- Returns an `ArrayBuffer` for 2 valid files
- Calls `onProgress` once per file
- Throws for a file over 100MB
- Throws for fewer than 2 files
- `getPageCount` returns correct count for a valid PDF

### `src/pages/Merge.test.tsx`

- Renders idle state (DropZone visible, privacy note)
- Transitions to ready state after valid file drop (file list visible)
- Shows page count per file after `getPageCount` resolves (mock `getPageCount`)
- Shows "— pages" while page count is loading
- Remove button removes a file from the list
- Removing last file above minimum resets to idle (below 2 files → idle)
- Drag-and-drop reorder updates file order
- Shows error for non-PDF file
- Shows progress bar while merging (mock `mergePDFs`)
- Shows summary (files merged, pages, size) in done state
- Download link has `download="merged.pdf"` attribute
- "Merge another" resets to idle
- Shows error when merge fails

---

## Out of Scope

- Preview of individual pages before merging
- Selective page extraction from each file
- Password-protected PDFs
- Batch rename of output file
