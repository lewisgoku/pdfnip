# PDFNip — Step 4: Split Tool Design

**Date:** 2026-05-12
**Scope:** In-browser PDF splitting — split tool logic, three split modes, ZIP output, Split page UI
**Status:** Approved

---

## Overview

Implement the Split tool using pdf-lib to extract pages from a single PDF into multiple output files, packed into a ZIP using JSZip. Users drop one PDF, choose a split mode (page range, every N pages, or all pages), and download a ZIP containing the split PDFs. All processing happens in the browser — no uploads.

**UX flow:** Drop file → choose mode → configure → split → see summary → download ZIP or split another.

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `jszip` | Pack split PDFs into a ZIP archive |
| `pdf-lib` | Extract and assemble pages into new PDFs (already installed) |

New dependency to install: `jszip`

---

## Architecture

### Files

```
src/tools/split.ts          ← core split logic (pure, no React)
src/tools/split.test.ts     ← unit tests
src/pages/Split.tsx         ← full page UI (replaces shell)
src/pages/Split.test.tsx    ← page state tests
```

### Data Flow

```
User drops PDF
  → Split page: validates file
  → User selects mode + configures input
  → User clicks Split
  → Page calls helper to compute groups:
      parsePageRanges(input, totalPages)  ← range mode
      groupsEveryN(totalPages, n)         ← every-n mode
      allPagesGroups(totalPages)          ← all-pages mode
  → splitPDF(file, groups, onProgress) → Uint8Array (ZIP)
  → status = 'done', shows summary + download
  → "Split another PDF" resets to status = 'idle'
```

---

## Split Tool (`src/tools/split.ts`)

### Exports

```ts
export type SplitMode = 'range' | 'every-n' | 'all'

export function parsePageRanges(input: string, totalPages: number): number[][]
export function groupsEveryN(totalPages: number, n: number): number[][]
export function allPagesGroups(totalPages: number): number[][]
export async function splitPDF(
  file: File,
  groups: number[][],
  onProgress?: (current: number, total: number) => void,
): Promise<Uint8Array>
```

### `parsePageRanges`

Parses a user-supplied string like `"1-3, 5, 8-10"` into page groups.

1. Throw `"Empty input"` if the trimmed string is blank
2. Split on commas, trim each token
3. For each token:
   - If `"N"`: single-page group `[N]`
   - If `"N-M"`: range group `[N, N+1, ..., M]`
   - Throw `"Invalid range: N-M"` if start > end
   - Throw `"Page N out of range"` if any page < 1 or > totalPages
4. Return array of groups (1-indexed)

### `groupsEveryN`

Splits into consecutive chunks of N pages.

1. Throw `"N must be at least 1"` if n < 1
2. Throw `"N exceeds page count"` if n >= totalPages
3. Walk pages 1..totalPages in steps of N
4. Return groups — last group may be smaller than N

### `allPagesGroups`

Returns one group per page: `[[1], [2], ..., [totalPages]]`

### `splitPDF`

1. Read file as `ArrayBuffer` via `file.arrayBuffer()`
2. Load with `PDFDocument.load(arrayBuffer)`
3. Derive base name: strip `.pdf` from `file.name`
4. For each group at index `i`:
   a. Create new `PDFDocument` via `PDFDocument.create()`
   b. Copy pages (convert 1-indexed group to 0-indexed) via `copyPages` + `addPage`
   c. Save to `Uint8Array` via `doc.save()`
   d. Derive filename:
      - Single page `[N]` → `{base}-p{N}.pdf`
      - Range `[N, ..., M]` → `{base}-p{N}-{M}.pdf`
   e. Add to JSZip: `zip.file(filename, bytes)`
   f. Call `onProgress(i + 1, groups.length)`
5. Generate ZIP: `zip.generateAsync({ type: 'uint8array' })`
6. Return ZIP `Uint8Array`

### ZIP Filename

Shown to the user as the download name: `{base}-split.zip`

### Error Handling

- File exceeds 100MB → validated on page before calling `splitPDF`
- Invalid range string → `parsePageRanges` throws; page catches and shows inline
- N out of range → validated on page before calling `splitPDF`
- Corrupt/non-PDF → propagate pdf-lib parse error; page catches as generic failure

---

## Split Page (`src/pages/Split.tsx`)

### State

```ts
type Status = 'idle' | 'ready' | 'splitting' | 'done' | 'error'
type SplitMode = 'range' | 'every-n' | 'all'

const [status, setStatus] = useState<Status>('idle')
const [file, setFile] = useState<File | null>(null)
const [mode, setMode] = useState<SplitMode>('range')
const [rangeInput, setRangeInput] = useState('')
const [everyN, setEveryN] = useState(1)
const [progress, setProgress] = useState({ current: 0, total: 0 })
const [result, setResult] = useState<Uint8Array | null>(null)
const [error, setError] = useState<string | null>(null)
```

### Status → UI Mapping

| Status | Renders |
|--------|---------|
| `idle` | DropZone (single PDF) + how-it-works 3-step guide + privacy note |
| `ready` | File info + mode selector + mode input + Split button |
| `splitting` | Progress bar (`Extracting part X of Y…`) |
| `done` | Summary (parts, filename, size) + Download ZIP + "Split another PDF" |
| `error` | Inline error + reset to idle |

### Mode Selector

Three pill buttons (same style as quality selector on Compress):
- `Page range` — default
- `Every N pages`
- `All pages`

### Mode-Specific Input

| Mode | Input |
|------|-------|
| `range` | Text input, placeholder `"e.g. 1-3, 5, 8-10"` |
| `every-n` | Number input, min 1, label "Every N pages" |
| `all` | No input |

### handleSplit

1. For `range`: call `parsePageRanges(rangeInput, pageCount)` — catch and show thrown error inline, return early
2. For `every-n`: validate `everyN >= 1` and `everyN < pageCount` — show inline error if not
3. For `all`: call `allPagesGroups(pageCount)` — no validation
4. Set `status = 'splitting'`
5. Call `splitPDF(file, groups, (current, total) => setProgress({ current, total }))`
6. On success: `setResult(output)`, `setStatus('done')`
7. On failure: `setError('Something went wrong. Please try again.')`, `setStatus('error')`

Note: `pageCount` is read once when the file is dropped using `PDFDocument.load` + `getPageCount()` from pdf-lib, stored in state.

### Progress Bar

Full-width teal bar: `width: ${(progress.current / progress.total) * 100}%`
Label: `"Extracting part {current} of {total}…"`

### Done State

```
Split into 4 parts · report-split.zip · 2.1 MB
```

Download button: `<a href={url} download="{base}-split.zip">Download ZIP</a>`
Blob URL created via `useMemo`, revoked on unmount via `useEffect`.

### Error Messages

| Scenario | Message |
|----------|---------|
| Non-PDF dropped | "Please select a valid PDF file." |
| File > 100MB | "File is too large (max 100MB)." |
| Invalid range string | Error thrown by `parsePageRanges` (e.g. "Invalid range: 5-3") |
| N ≥ page count | "N must be less than the total number of pages." |
| Split failure | "Something went wrong. Please try again." |

### How-It-Works Guide (idle state)

Three cards matching Compress and Merge style:
- 📄 Drop your PDF / Upload any PDF up to 100 MB
- ✂️ Choose how to split / Page range, every N pages, or all pages
- ⬇️ Download / Get a ZIP with your split PDFs instantly

### Mobile

Single column at all sizes. Container `max-w-2xl mx-auto px-4 py-12`.

---

## Testing

### `src/tools/split.test.ts`

- `parsePageRanges`: valid single page, valid range, mixed input (`"1-3, 5"`)
- `parsePageRanges`: throws on invalid range (start > end)
- `parsePageRanges`: throws on out-of-range page (> totalPages)
- `parsePageRanges`: throws on empty input
- `groupsEveryN`: even split
- `groupsEveryN`: uneven last group
- `groupsEveryN`: throws for n < 1
- `groupsEveryN`: throws for n >= totalPages
- `allPagesGroups`: returns one group per page
- `splitPDF`: returns a `Uint8Array` for valid groups
- `splitPDF`: calls `onProgress` once per group

### `src/pages/Split.test.tsx`

- Renders idle state (DropZone visible, how-it-works guide)
- Transitions to ready state after valid file drop
- Mode selector switches between the three modes
- Shows text input for page range mode
- Shows number input for every-N mode
- No extra input shown for all-pages mode
- Shows inline error for invalid range string (mock `parsePageRanges` throw)
- Shows inline error for N ≥ page count
- Shows progress bar while splitting (mock `splitPDF`)
- Shows done state summary (part count, filename, size)
- Download link has correct `download` attribute (`*-split.zip`)
- "Split another PDF" resets to idle
- Shows error when split fails

---

## Out of Scope

- Preview of pages before splitting
- Password-protected PDFs
- Custom output filenames
- Merging split output back together
