# PDF to Images Design

## Goal

Add a "PDF to Images" tool that converts every page of a PDF into a JPG or PNG image and delivers them as a ZIP download — fully in-browser, no uploads.

## User Flow

1. User drops a PDF (up to 100 MB)
2. Selects output format: JPG or PNG
3. If JPG: selects quality — Low / Medium / High
4. Clicks "Convert"
5. Downloads a ZIP containing one image per page (`page-1.jpg`, `page-2.jpg`, …)

## Architecture

### `src/tools/pdfToImages.ts`

Pure function, no React imports. Signature:

```ts
export type ImageFormat = 'jpg' | 'png'
export type ImageQuality = 'low' | 'medium' | 'high'

export async function pdfToImages(
  file: File,
  format: ImageFormat,
  quality: ImageQuality,
): Promise<Uint8Array>  // ZIP bytes
```

**Implementation:**
- Load the PDF with PDF.js (`pdfjsLib.getDocument`)
- For each page: render to an off-screen `<canvas>` at a scale factor derived from quality (`low = 1.0`, `medium = 1.5`, `high = 2.0`)
- Export canvas via `canvas.toBlob()` with MIME type `image/jpeg` (quality 0.6 / 0.82 / 0.95) or `image/png`
- Pack all blobs into a ZIP via JSZip, named `page-1.jpg` / `page-1.png` etc.
- Return `zip.generateAsync({ type: 'uint8array' })`

**Dependencies:** `pdfjs-dist` (already installed), `jszip` (already installed)

### `src/pages/PdfToImages.tsx`

State machine: `idle | ready | converting | done | error`

- **idle/error:** DropZone + privacy note + how-it-works cards
- **ready:** file info card + format toggle (JPG / PNG) + quality selector (Low / Medium / High, hidden when PNG selected) + "Convert" button
- **converting:** loading text
- **done:** ZIP size display + Download link + "Convert another PDF" reset

Download filename: `originalname-images.zip`

PageMeta: `title="PDFNip | PDF to Images"`, `path="/pdf-to-images"`

### Wiring

- Route `/pdf-to-images` added to `src/App.tsx`
- "PDF to Images" card added to `src/pages/Home.tsx` TOOLS array with `ImageDown` icon from lucide-react
- Navbar: add "PDF to Images" link to `NAV_LINKS` in `src/components/Navbar.tsx`

## Error Handling

- Non-PDF file: "Please select a valid PDF file."
- File > 100 MB: "File is too large (max 100MB)."
- Conversion failure: "Something went wrong. Please try again." (status resets to `ready`)

## Testing

- `src/tools/pdfToImages.test.ts` — unit tests: mock PDF.js + JSZip, assert returns `Uint8Array`, assert correct MIME type per format, assert scale factor per quality level
- `src/pages/PdfToImages.test.tsx` — UI tests: idle render, file validation, format toggle, quality selector visibility (shown for JPG, hidden for PNG), loading state, done state, correct download filename, reset flow, error on conversion failure

## Quality / Scale Map

| Quality | Canvas scale | JPG quality |
|---------|-------------|-------------|
| Low     | 1.0×        | 0.60        |
| Medium  | 1.5×        | 0.82        |
| High    | 2.0×        | 0.95        |

PNG is always lossless; scale factor still applies (Low/Medium/High → 1.0×/1.5×/2.0×).

## Constraints

- All processing in-browser — no server calls
- Single PDF input, max 100 MB
- Output: ZIP containing one image per page
- Must work on Chrome, Firefox, Safari (latest 2 versions)
- Mobile responsive (375px min-width)
