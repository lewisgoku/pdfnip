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

## Step 2: Compress Tool ⬜

Implement in-browser PDF compression using canvas re-render approach.

### Tasks
- [ ] Install PDF.js for rendering PDF pages to canvas
- [ ] Implement `src/tools/compress.ts` — canvas re-render compression logic
  - [ ] Render each PDF page via PDF.js to an off-screen canvas
  - [ ] Export canvas frames back to a new PDF via pdf-lib
  - [ ] Support three quality levels: Low (screen), Medium (balanced), High (max compression)
- [ ] Wire up real `DropZone` on the Compress page (single file, PDF only)
- [ ] Build Compress page UI
  - [ ] File drop / selection (PDF, max 100MB)
  - [ ] Quality level selector (Low / Medium / High)
  - [ ] "Compress" action button
  - [ ] Processing / loading state
  - [ ] Before/after file size display
  - [ ] Download button for compressed PDF
  - [ ] Error state (invalid file, oversized file)
- [ ] Mobile responsive layout (375px min-width)
- [ ] Tests for compression tool logic
- [ ] Tests for Compress page UI states
- [ ] Typecheck and build verify
- [ ] Merged to master

---

## Step 3: Merge Tool ⬜

Implement in-browser PDF merging with drag-to-reorder.

### Tasks
- [ ] Install pdf-lib
- [ ] Implement `src/tools/merge.ts` — multi-file merge logic using pdf-lib
- [ ] Wire up real `DropZone` on the Merge page (multiple files, PDF only, 2–10 files)
- [ ] Build Merge page UI
  - [ ] Multi-file drop / selection (2–10 PDFs, max 100MB each)
  - [ ] File list with drag-to-reorder
  - [ ] File removal per item
  - [ ] "Merge" action button
  - [ ] Processing / loading state
  - [ ] Download button for merged PDF
  - [ ] Error state (invalid file, too few / too many files, oversized)
- [ ] Mobile responsive layout (375px min-width)
- [ ] Tests for merge tool logic
- [ ] Tests for Merge page UI states
- [ ] Typecheck and build verify
- [ ] Merged to master

---

## Step 4: Split Tool ⬜

Implement in-browser PDF splitting with multiple split modes and ZIP output.

### Tasks
- [ ] Install JSZip
- [ ] Implement `src/tools/split.ts` — split logic using pdf-lib
  - [ ] Mode: by page range (e.g. "1-3, 5")
  - [ ] Mode: every N pages
  - [ ] Mode: extract single pages (all pages as individual PDFs)
- [ ] Wire up real `DropZone` on the Split page (single file, PDF only)
- [ ] Build Split page UI
  - [ ] File drop / selection (single PDF, max 100MB)
  - [ ] Split mode selector (Page range / Every N pages / All pages)
  - [ ] Mode-specific input (range string, N value)
  - [ ] "Split" action button
  - [ ] Processing / loading state
  - [ ] Download button for ZIP file containing split PDFs
  - [ ] Error state (invalid file, invalid range, oversized)
- [ ] Mobile responsive layout (375px min-width)
- [ ] Tests for split tool logic
- [ ] Tests for Split page UI states
- [ ] Typecheck and build verify
- [ ] Merged to master

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Step complete |
| ⬜ | Step pending |
| [x] | Task complete |
| [ ] | Task pending |
