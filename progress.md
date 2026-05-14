# PDFNip — Project Progress

Free, browser-based PDF utility — compress, merge, and split PDF files with zero uploads and zero signup.

---

## Step 1: Foundation ✅

Scaffold the project base — routing, shared components, and Home page.

### Tasks
- [x] Scaffold Vite + React + TypeScript project
- [x] Install dependencies (react-router-dom, lucide-react, tailwindcss v3, vitest, testing-library)
- [x] Configure Tailwind CSS v3 with brand tokens (primary, bg, surface)
- [x] Configure Vitest with jsdom environment and jest-dom setup
- [x] Set up base HTML (Google Fonts: Bricolage Grotesque + Inter, page title)
- [x] Set up global CSS (Tailwind directives, base body styles)
- [x] `formatBytes` utility — human-readable file size strings
- [x] `DropZone` stub component — typed interface, visual placeholder
- [x] `ToolCard` component — card linking to a tool route with icon/title/description
- [x] `Navbar` component — wordmark (pdf + nip) + active nav links
- [x] `Layout` component — Navbar + Outlet wrapper
- [x] `Home` page — "What do you need to do?" heading + 3 ToolCards grid
- [x] `Compress` shell page — heading + DropZone stub
- [x] `Merge` shell page — heading + DropZone stub
- [x] `Split` shell page — heading + DropZone stub
- [x] Wire up React Router v6 routing in App.tsx
- [x] 24 tests passing across 8 test files
- [x] Production build verified
- [x] Merged to master

---

## Extras ✅

Small improvements added outside of the main steps.

### Tasks
- [x] Donate button — Buy Me a Coffee link in Navbar (right side, teal outline style)
- [x] Favicon — SVG favicon matching brand (dark navy bg, `pdf` white + `nip` teal)

---

## Step 2: Compress Tool ✅

Implement in-browser PDF compression using canvas re-render approach.

### Tasks
- [x] Install PDF.js for rendering PDF pages to canvas
- [x] Implement `src/tools/compress.ts` — canvas re-render compression logic
  - [x] Render each PDF page via PDF.js to an off-screen canvas
  - [x] Export canvas frames back to a new PDF via pdf-lib
  - [x] Support three quality levels: Low (screen), Medium (balanced), High (max compression)
- [x] Wire up real `DropZone` on the Compress page (single file, PDF only)
- [x] Build Compress page UI
  - [x] File drop / selection (PDF, max 100MB)
  - [x] Quality level selector (Low / Medium / High)
  - [x] "Compress" action button
  - [x] Processing / loading state
  - [x] Before/after file size display
  - [x] Download button for compressed PDF
  - [x] Error state (invalid file, oversized file)
- [x] Mobile responsive layout (375px min-width)
- [x] Tests for compression tool logic
- [x] Tests for Compress page UI states
- [x] Typecheck and build verify
- [x] 84 tests passing across 20 test files
- [x] Merged to main

---

## Step 3: Merge Tool ✅

Implement in-browser PDF merging with drag-to-reorder.

### Tasks
- [x] Install pdf-lib
- [x] Implement `src/tools/merge.ts` — multi-file merge logic using pdf-lib
- [x] Wire up real `DropZone` on the Merge page (multiple files, PDF only, 2–10 files)
- [x] Build Merge page UI
  - [x] Multi-file drop / selection (2–10 PDFs, max 100MB each)
  - [x] File list with drag-to-reorder
  - [x] File removal per item
  - [x] "Merge" action button
  - [x] Processing / loading state
  - [x] Download button for merged PDF
  - [x] Error state (invalid file, too few / too many files, oversized)
- [x] Mobile responsive layout (375px min-width)
- [x] Tests for merge tool logic
- [x] Tests for Merge page UI states
- [x] Typecheck and build verify
- [x] 60 tests passing across 12 test files
- [x] Merged to main

---

## Step 4: Split Tool ✅

Implement in-browser PDF splitting with multiple split modes and ZIP output.

### Tasks
- [x] Install JSZip
- [x] Implement `src/tools/split.ts` — split logic using pdf-lib
  - [x] Mode: by page range (e.g. "1-3, 5")
  - [x] Mode: every N pages
  - [x] Mode: extract single pages (all pages as individual PDFs)
- [x] Wire up real `DropZone` on the Split page (single file, PDF only)
- [x] Build Split page UI
  - [x] File drop / selection (single PDF, max 100MB)
  - [x] Split mode selector (Page range / Every N pages / All pages)
  - [x] Mode-specific input (range string, N value)
  - [x] "Split" action button
  - [x] Processing / loading state
  - [x] Download button for ZIP file containing split PDFs
  - [x] Error state (invalid file, invalid range, oversized)
- [x] Mobile responsive layout (375px min-width)
- [x] Tests for split tool logic
- [x] Tests for Split page UI states
- [x] 90 tests passing across 14 test files
- [x] Typecheck and build verify
- [x] Merged to main

---

---

## Step 5: Home Page & Trust Improvements ✅

Polish the home page and footer to compete on trust and first impressions.
Sourced from competitive analysis of iLovePDF (May 2026).

### Tasks

**Hero & trust badges**
- [x] Add a trust badge row below the stats strip: "🔒 Files never uploaded · ✓ No account · ✓ Free forever"
- [x] Review hero copy — ensure the privacy differentiator is the dominant message

**Home page "How it works" section**
- [x] Add a 3-step explainer below the tool cards: Drop file → Choose options → Download instantly
- [x] Keep it visual (icon + short label per step), consistent with existing how-it-works cards on tool pages

**Tool card descriptions**
- [x] Compress card: add detail line "3 quality levels · No file size limit"
- [x] Merge card: add detail line "2–10 files · Drag to reorder"
- [x] Split card: add detail line "By range, every N pages, or all · ZIP output"

**Footer social & counter**
- [x] Add social media link(s) to footer (at minimum Twitter/X)
- [x] Add a static "X PDFs processed" counter to the home page (can be hardcoded/estimated initially)
- [x] 198 tests passing across 30 test files
- [x] Merged to main

---

## Step 6: Extract Pages Tool ✅

Add a dedicated "Extract Pages" tool — the most common iLovePDF feature not yet in PDFNip.
Extracts a user-defined subset of pages from a PDF into a new PDF (single output, not ZIP).

### Tasks
- [x] Implement `src/tools/extract.ts` — extract specific pages using pdf-lib
  - [x] Accept page range input (e.g. "1-3, 5")
  - [x] Return a single merged PDF containing only those pages
- [x] Refactor `src/tools/pdfUtils.ts` — shared `parsePageRanges` and `getPageCount` (DRY)
- [x] Build Extract page UI (mirrors Compress page structure)
  - [x] File drop / selection (single PDF, max 100MB)
  - [x] Page range input with page count display
  - [x] "Extract" action button
  - [x] Processing / loading state
  - [x] Download button for extracted PDF
  - [x] Error state (invalid file, invalid range, out-of-range pages)
- [x] Add route `/extract` in `App.tsx`
- [x] Add Extract card to home page tool grid (updated to 2-col sm / 4-col lg)
- [x] Mobile responsive layout (375px min-width)
- [x] Tests for extract tool logic (9 tests)
- [x] Tests for Extract page UI states (13 tests)
- [x] 242 tests passing across 17 test files
- [x] Typecheck, build verify, merge to main

---

## Step 7: Rotate PDF Tool ✅

Add a "Rotate PDF" tool — simple, high-demand, fully doable in-browser with pdf-lib.
Lets users rotate all pages by 90°/180°/270°.

### Tasks
- [x] Implement `src/tools/rotate.ts` — page rotation using pdf-lib
  - [x] Support per-page rotation: 90°, 180°, 270° (clockwise)
  - [x] Support "rotate all pages" shortcut
  - [x] Return a new PDF with updated page rotations
- [x] Build Rotate page UI
  - [x] File drop / selection (single PDF, max 100MB)
  - [x] "Rotate all" shortcut buttons (90° CW, 180°, 90° CCW)
  - [x] "Apply & Download" action button
  - [x] Processing / loading state
  - [x] Download button for rotated PDF
  - [x] Error state (invalid file, oversized)
- [x] Add route `/rotate` in `App.tsx`
- [x] Add Rotate card to home page tool grid
- [x] Add Extract and Rotate links to Navbar
- [x] Mobile responsive layout (375px min-width)
- [x] Tests for rotate tool logic (5 tests)
- [x] Tests for Rotate page UI states (12 tests)
- [x] 280 tests passing across 38 test files
- [x] Typecheck, build verify, merge to main

---

## Step 8: PDF to Images ✅

Convert every PDF page to JPG or PNG and download as a ZIP — fully in-browser.

### Tasks
- [x] Implement `src/tools/pdfToImages.ts` — PDF.js canvas render → JSZip
  - [x] JPG output with Low / Medium / High quality (0.60 / 0.82 / 0.95)
  - [x] PNG output (lossless, always medium scale)
  - [x] Scale: 1.0× / 1.5× / 2.0× for Low / Medium / High
  - [x] ZIP output with `page-1.jpg` / `page-1.png` naming
  - [x] 100 MB file size guard
- [x] Build PDF to Images page UI
  - [x] File drop / selection (single PDF, max 100MB)
  - [x] Format toggle: JPG / PNG
  - [x] Quality selector: Low / Medium / High (shown for JPG only)
  - [x] "Convert" action button
  - [x] Processing / loading state
  - [x] Download button for ZIP file
  - [x] Error state (invalid file, oversized, conversion failure)
- [x] Add route `/pdf-to-images` in `src/App.tsx`
- [x] Add PDF to Images card to home page tool grid
- [x] Add PDF to Images link to Navbar
- [x] Mobile responsive layout (375px min-width)
- [x] Tests for tool logic (11 tests)
- [x] Tests for page UI states (14 tests)
- [x] 474 tests passing across 61 test files
- [x] Typecheck, build verify, merge to main

---

## Step 9: Images to PDF ✅

Convert JPG/PNG images to a single PDF — fully in-browser via pdf-lib.

### Tasks
- [x] Implement `src/tools/imagesToPdf.ts` — embed JPG/PNG into PDF via pdf-lib
  - [x] Page size options: A4 (595×842), Letter (612×792), match image dimensions
  - [x] Aspect-ratio fit + centre for A4/Letter; pixel-perfect for image size
  - [x] 1–20 images, 50 MB total cap
- [x] Build Images to PDF page UI
  - [x] Multi-file drop (JPG + PNG only)
  - [x] Drag-to-reorder file list
  - [x] Page size selector (A4 default)
  - [x] "Convert to PDF" action button
  - [x] Processing / loading state
  - [x] Download button (`images.pdf`)
  - [x] Error states (invalid file, too many, oversized, conversion failure)
- [x] Add route `/images-to-pdf` in `src/App.tsx`
- [x] Add Images to PDF card to home page tool grid
- [x] Add Images to PDF link to Navbar
- [x] Mobile responsive layout (375px min-width)
- [x] Tests for tool logic (11 tests)
- [x] Tests for page UI states (16 tests)
- [x] 194 tests passing across 23 test files
- [x] Typecheck, build verify, merge to main

---

## Step 10: Unlock PDF ✅

Remove password protection and owner restrictions from a PDF — fully in-browser via pdf-lib.

### Tasks
- [x] Implement `src/tools/unlockPdf.ts` — pdf-lib `PDFDocument.load` with `EncryptedPDFError` handling
  - [x] `PasswordRequiredError` when encrypted + no password
  - [x] `IncorrectPasswordError` when encrypted + wrong password
  - [x] 100 MB file size guard
- [x] Build Unlock PDF page UI
  - [x] File drop / selection (single PDF, max 100MB)
  - [x] Auto-unlock on drop (no button needed for unprotected PDFs)
  - [x] Password input (appears only when needed)
  - [x] Inline error on wrong password
  - [x] Download button (`<basename>-unlocked.pdf`)
  - [x] "Use a different file" + "Unlock another PDF" reset paths
  - [x] Error state (unexpected failures)
- [x] Add route `/unlock-pdf` in `src/App.tsx`
- [x] Add Unlock PDF card to home page tool grid (LockOpen icon)
- [x] Add Unlock link to Navbar
- [x] Mobile responsive layout (375px min-width)
- [x] Tests for tool logic (7 tests)
- [x] Tests for page UI states (14 tests)
- [x] 215 tests passing across 25 test files
- [x] Typecheck, build verify, merged and pushed to main

---

## Step 11: Protect PDF ✅

Add a password to a PDF — fully in-browser via pdf-lib encryption.

### Tasks
- [x] Implement `src/tools/protectPdf.ts` — pdf-lib `PDFDocument.save` with encryption options
  - [x] Set user password (open password) and owner password
  - [x] 100 MB file size guard
- [x] Build Protect PDF page UI
  - [x] File drop / selection (single PDF, max 100MB)
  - [x] Password input + confirm password input
  - [x] "Protect" action button
  - [x] Processing / loading state
  - [x] Download button (`<basename>-protected.pdf`)
  - [x] Error state (invalid file, oversized, password mismatch, conversion failure)
- [x] Add route `/protect-pdf` in `src/App.tsx`
- [x] Add Protect PDF card to home page tool grid (Lock icon)
- [x] Add Protect link to Navbar
- [x] Mobile responsive layout (375px min-width)
- [x] Tests for tool logic
- [x] Tests for page UI states
- [x] Typecheck, build verify, merge to main

---

## Step 12: Add Page Numbers ⬜

Stamp page numbers onto every page of a PDF — fully in-browser via pdf-lib.

### Tasks
- [ ] Implement `src/tools/addPageNumbers.ts` — pdf-lib text stamping on each page
  - [ ] Position options: bottom-centre, bottom-left, bottom-right
  - [ ] Format options: "1", "Page 1", "1 / N"
  - [ ] Starting number option
- [ ] Build Add Page Numbers page UI
- [ ] Add route `/page-numbers` in `src/App.tsx`
- [ ] Add Page Numbers card to home page
- [ ] Tests for tool logic and page UI
- [ ] Typecheck, build verify, merge to main

---

## Step 13: Watermark PDF ⬜

Add a text watermark to every page of a PDF — fully in-browser via pdf-lib.

### Tasks
- [ ] Implement `src/tools/watermark.ts` — pdf-lib diagonal text stamp on each page
  - [ ] Custom watermark text
  - [ ] Opacity control
  - [ ] Font size option
- [ ] Build Watermark PDF page UI
- [ ] Add route `/watermark` in `src/App.tsx`
- [ ] Add Watermark card to home page
- [ ] Tests for tool logic and page UI
- [ ] Typecheck, build verify, merge to main

---

## Step 14: Delete & Reorder Pages ⬜

Remove individual pages and drag-to-reorder pages within a PDF — fully in-browser via pdf-lib.

### Tasks
- [ ] Implement `src/tools/organizePages.ts` — pdf-lib page selection and reorder
  - [ ] Delete individual pages
  - [ ] Reorder pages via drag-and-drop
- [ ] Build Organize Pages page UI
  - [ ] Page thumbnail grid (canvas-rendered via PDF.js)
  - [ ] Per-page delete button
  - [ ] Drag-to-reorder
- [ ] Add route `/organize` in `src/App.tsx`
- [ ] Add Organize Pages card to home page
- [ ] Tests for tool logic and page UI
- [ ] Typecheck, build verify, merge to main

---

## Step 15: Crop PDF ⬜

Crop the visible area of every page in a PDF — fully in-browser via pdf-lib mediaBox/cropBox manipulation.

### Tasks
- [ ] Implement `src/tools/cropPdf.ts` — pdf-lib cropBox adjustment
  - [ ] Set margin crop (top/bottom/left/right in mm)
  - [ ] Apply to all pages
- [ ] Build Crop PDF page UI
- [ ] Add route `/crop` in `src/App.tsx`
- [ ] Add Crop card to home page
- [ ] Tests for tool logic and page UI
- [ ] Typecheck, build verify, merge to main

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Step complete |
| ⬜ | Step pending |
| [x] | Task complete |
| [ ] | Task pending |
