# Convert PDF & Images Design

## Goal

Merge the existing "PDF to Images" and "Images to PDF" tools into a single combined page at `/convert`. Users pick their direction from a two-button picker; the relevant flow renders inline. The old routes redirect to `/convert`. Existing tool functions are untouched.

## User Flow

1. User lands on `/convert` — sees two direction buttons: "PDF → Images" and "Images → PDF"
2. User clicks a direction — picker hides, relevant DropZone and controls appear
3. User completes the flow (identical to the existing individual tools)
4. "← Change direction" at any point resets everything back to the picker

## Architecture

### State

```ts
type Direction = 'pdf-to-images' | 'images-to-pdf' | null
type Status = 'idle' | 'ready' | 'converting' | 'done' | 'error'
```

`direction === null` shows the picker. Picking a direction sets `direction` and reveals the form. `status` drives the form state within each direction.

### `src/pages/Convert.tsx`

Single page component. Imports from both existing tool functions:
- `pdfToImages` from `../tools/pdfToImages`
- `imagesToPdf` from `../tools/imagesToPdf`

Both tool files (`src/tools/pdfToImages.ts`, `src/tools/imagesToPdf.ts`) are **unchanged**.

**Deleted files:**
- `src/pages/PdfToImages.tsx`
- `src/pages/PdfToImages.test.tsx`
- `src/pages/ImagesToPdf.tsx`
- `src/pages/ImagesToPdf.test.tsx`

**Created files:**
- `src/pages/Convert.tsx`
- `src/pages/Convert.test.tsx`

### Direction Picker UI (`direction === null`)

- Heading: "Convert PDF & Images"
- Subheading: "Convert PDFs to images or build a PDF from your images — all in your browser."
- Two large clickable cards side by side:
  - **PDF → Images** (`ImageDown` icon) — "Convert every page to JPG or PNG · ZIP output"
  - **Images → PDF** (`FileImage` icon) — "Combine JPG and PNG images into one PDF"
- Privacy note: "Your files never leave your browser · Ads keep this tool free."
- 3 how-it-works cards: "Pick a direction" → "Configure options" → "Download instantly"

### PDF → Images Flow (`direction === 'pdf-to-images'`)

"← Change direction" link at top (resets all state, sets `direction` to `null`).

States:
- **idle:** DropZone (single PDF, `application/pdf`, max 100MB)
- **ready:** file card (name + size) + Format selector (JPG / PNG) + Quality selector (Low / Medium / High, shown for JPG only) + "Convert" button
- **converting:** "Converting…"
- **done:** filename + size card + Download link (`<name>-images.zip`) + "Convert another PDF" button (resets to idle, keeps direction)
- **error:** error message + DropZone

### Images → PDF Flow (`direction === 'images-to-pdf'`)

"← Change direction" link at top (resets all state, sets `direction` to `null`).

States:
- **idle/error:** DropZone (multi-file, `image/jpeg,image/png`, max 20 files, 50MB total) + error message if present
- **ready:** file count + total size + drag-to-reorder list + remove-per-item button + Page size selector (A4 / Letter / Match image size, default A4) + "Convert to PDF" button
- **converting:** "Converting…"
- **done:** output size card + Download link (`images.pdf`) + "Convert more images" button (resets to idle, keeps direction)

### Reset Behaviour

| Trigger | Effect |
|---------|--------|
| "← Change direction" | `direction → null`, all other state cleared |
| "Convert another PDF" | `status → idle`, file/result cleared, direction stays `pdf-to-images` |
| "Convert more images" | `status → idle`, files/result cleared, direction stays `images-to-pdf` |

### Wiring

| File | Change |
|------|--------|
| `src/App.tsx` | Add `/convert` route; change `/pdf-to-images` and `/images-to-pdf` to `<Navigate to="/convert" replace />` |
| `src/pages/Home.tsx` | Replace two tool cards with one "Convert" card (`ArrowLeftRight` icon, href `/convert`) |
| `src/components/Navbar.tsx` | Replace "PDF to Images" + "Images to PDF" links with one `{ to: '/convert', label: 'Convert' }` |
| `public/sitemap.xml` | Replace `/pdf-to-images` and `/images-to-pdf` entries with one `/convert` entry |

PageMeta: `title="PDFNip | Convert PDF & Images"`, `path="/convert"`

## Error Handling

| Condition | Message | State |
|-----------|---------|-------|
| Non-PDF dropped (PDF→Images) | "Please select a valid PDF file." | stays idle |
| File > 100MB (PDF→Images) | "File is too large (max 100MB)." | stays idle |
| Non-image dropped (Images→PDF) | "Only JPG and PNG images are supported." | stays idle |
| > 20 images (Images→PDF) | "Maximum 20 images allowed." | stays idle |
| Total > 50MB (Images→PDF) | "Total size exceeds 50 MB limit." | stays idle |
| Conversion failure | "Something went wrong. Please try again." | stays ready |

## Testing

### `src/pages/Convert.test.tsx`

**Direction picker:**
- Renders two direction buttons (PDF→Images, Images→PDF)
- Clicking PDF→Images hides picker and shows DropZone
- Clicking Images→PDF hides picker and shows DropZone
- "← Change direction" from PDF→Images flow resets to picker
- "← Change direction" from Images→PDF flow resets to picker

**PDF→Images flow** (all ported from `PdfToImages.test.tsx`):
- Idle: DropZone visible
- Non-PDF shows error, stays idle
- File >100MB shows error, stays idle
- Valid PDF → ready state (file card + Convert button)
- Format selector: JPG / PNG
- Quality selector visible for JPG, hidden for PNG
- Loading state shown while converting
- Done: download link visible, filename is `report-images.zip`
- "Convert another PDF" resets to idle (direction stays pdf-to-images)
- Conversion failure shows error, stays ready

**Images→PDF flow** (all ported from `ImagesToPdf.test.tsx`):
- Idle: DropZone visible
- Non-image shows error
- > 20 images shows error
- Total > 50MB shows error
- Valid images → ready state (file list + Convert to PDF button)
- A4 selected by default
- Page size selector visible
- Remove button removes file
- Removing all files resets to idle
- Drag-to-reorder changes file order
- Loading state shown while converting
- Done: download link visible, filename is `images.pdf`
- "Convert more images" resets to idle (direction stays images-to-pdf)
- Conversion failure shows error, stays ready

## Constraints

- All processing in-browser — no server calls
- Tool functions (`pdfToImages.ts`, `imagesToPdf.ts`) unchanged
- Old routes `/pdf-to-images` and `/images-to-pdf` redirect to `/convert` (not removed)
- Must work on Chrome, Firefox, Safari (latest 2 versions)
- Mobile responsive (375px min-width)
