# Images to PDF Design

## Goal

Add an "Images to PDF" tool that converts one or more JPG/PNG images into a single PDF — fully in-browser via pdf-lib (already installed). No uploads, no dependencies to add.

## User Flow

1. User drops 1–20 JPG or PNG images (total ≤ 50 MB)
2. Reorders images by dragging (sets page order)
3. Picks output page size: A4 / Letter / Match image size
4. Clicks "Convert to PDF"
5. Downloads `images.pdf`

## Architecture

### `src/tools/imagesToPdf.ts`

Pure function, no React imports. Signature:

```ts
export type PageSize = 'a4' | 'letter' | 'image'

export async function imagesToPdf(
  files: File[],
  pageSize: PageSize,
): Promise<Uint8Array>
```

**Validation (throws on failure):**
- 0 or > 20 files → `"Maximum 20 images allowed."`
- Total size > 50 MB → `"Total size exceeds 50 MB limit."`
- Any file not JPG or PNG → `"Only JPG and PNG images are supported."`

**Per-image logic:**
- Read file as `ArrayBuffer`
- Detect type by MIME: `image/jpeg` → `pdfDoc.embedJpg()`, `image/png` → `pdfDoc.embedPng()`
- Page dimensions:
  - `a4` → 595 × 842 pts
  - `letter` → 612 × 792 pts
  - `image` → image's natural pixel dimensions (1px = 1pt at 72 DPI)
- For A4/Letter: scale image to fit within the page preserving aspect ratio, center it (letterbox/pillarbox, white background)
- For `image`: page is exactly the image's pixel dimensions, no scaling
- Append page to `PDFDocument`
- Return `pdfDoc.save()` as `Uint8Array`

**Dependencies:** `pdf-lib` (already installed)

### `src/pages/ImagesToPdf.tsx`

State machine: `idle | ready | converting | done | error`

- **idle/error:** DropZone (multi-file, JPG + PNG only) + privacy note + how-it-works cards
- **ready:** file list with drag-to-reorder + remove button per item + total size display (e.g. "3 files · 4.2 MB") + page size selector (A4 / Letter / Match image size, default A4) + "Convert to PDF" button
- **converting:** loading text ("Converting…")
- **done:** output PDF size + Download button + "Convert more images" reset link

Download filename: `images.pdf`

PageMeta: `title="PDFNip | Images to PDF"`, `path="/images-to-pdf"`

### Wiring

- Route `/images-to-pdf` added to `src/App.tsx`
- "Images to PDF" card added to `src/pages/Home.tsx` with `FileImage` icon from lucide-react
- Navbar: add "Images to PDF" link to `NAV_LINKS` in `src/components/Navbar.tsx`

## Error Handling

| Condition | Message |
|-----------|---------|
| Non-image file dropped | "Only JPG and PNG images are supported." |
| More than 20 files | "Maximum 20 images allowed." |
| Total size > 50 MB | "Total size exceeds 50 MB limit." |
| Conversion failure | "Something went wrong. Please try again." (resets to `ready`) |

## Testing

### `src/tools/imagesToPdf.test.ts`
- Returns `Uint8Array`
- Calls `embedJpg` for JPEG files, `embedPng` for PNG files
- A4 page dimensions: 595 × 842 pts
- Letter page dimensions: 612 × 792 pts
- `image` page size uses image's natural pixel dimensions
- Image scaled and centered for A4/Letter (aspect ratio preserved)
- Rejects > 20 files with correct message
- Rejects total > 50 MB with correct message
- Rejects non-image files with correct message

### `src/pages/ImagesToPdf.test.tsx`
- Idle state renders DropZone
- Rejects non-image files (shows error)
- Rejects > 20 files (shows error)
- Rejects total > 50 MB (shows error)
- Ready state: file list, page size selector, convert button visible
- Drag-to-reorder changes file order
- Remove button removes a file from the list
- A4 selected by default
- Loading state shown during conversion
- Done state: download button present, filename is `images.pdf`
- Reset returns to idle
- Conversion failure shows error, stays on ready state

## Page Size Reference

| Size | Width (pts) | Height (pts) |
|------|-------------|--------------|
| A4 | 595 | 842 |
| Letter | 612 | 792 |
| Match image | image width px | image height px |

## Constraints

- All processing in-browser — no server calls
- 1–20 images, total ≤ 50 MB
- JPG and PNG only
- Output: single PDF download (`images.pdf`)
- Must work on Chrome, Firefox, Safari (latest 2 versions)
- Mobile responsive (375px min-width)
