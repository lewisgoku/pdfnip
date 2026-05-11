# PDFNip

Free, browser-based PDF utility — compress, merge, and split PDF files with zero uploads and zero signup.

## What This Is

PDFNip is a privacy-first PDF tool where all file processing happens 100% in the browser using `pdf-lib`. Files never touch a server. The product is a single-page React app deployed on Vercel at `pdfnip.com`.

## Tech Stack

- **Framework:** Vite + React 18 (TypeScript)
- **Styling:** Tailwind CSS v3
- **PDF Engine:** `pdf-lib` (merge, split) + canvas re-render trick (compress)
- **Font:** BricolageGrotesque (wordmark) via Google Fonts, Inter (UI)
- **Deployment:** Vercel (auto-deploy from `main` branch)
- **Package manager:** npm

## Project Structure

```
pdfnip/
├── public/
│   └── favicon.ico
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── DropZone.tsx
│   │   ├── ToolCard.tsx
│   │   └── Navbar.tsx
│   ├── tools/            # One file per tool (compress, merge, split)
│   │   ├── compress.ts
│   │   ├── merge.ts
│   │   └── split.ts
│   ├── pages/            # Route-level components
│   │   ├── Home.tsx
│   │   ├── Compress.tsx
│   │   ├── Merge.tsx
│   │   └── Split.tsx
│   ├── hooks/            # Custom React hooks
│   ├── utils/            # Shared helpers (file size formatting, etc.)
│   ├── styles/           # Global CSS / Tailwind config
│   ├── App.tsx
│   └── main.tsx
├── CLAUDE.md
├── package.json
├── tailwind.config.ts
├── vite.config.ts
└── tsconfig.json
```

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server at localhost:5173
npm run build        # Production build → dist/
npm run preview      # Preview production build locally
npm run typecheck    # Run tsc --noEmit (run after changes)
npm run lint         # ESLint check
```

Always run `npm run typecheck` after a series of changes before considering a task complete.

## Brand & Design

| Token        | Value                          |
|--------------|-------------------------------|
| Primary      | `#00D2B9` (teal)              |
| Background   | `#0A1028` (deep navy)         |
| Surface      | `#111827` (card bg)           |
| Text         | `#F9FAFB` (primary), `#9CA3AF` (muted) |
| Wordmark     | `pdf` white + `nip` teal, BricolageGrotesque Bold |
| Tagline      | *"Trim. Merge. Split."*       |
| Radius       | `rounded-xl` (cards), `rounded-full` (buttons) |

Design is clean, dark, minimal. No gradients on backgrounds. Teal is used sparingly as an accent only — not as a fill colour on large surfaces.

## Code Style

- Use ES modules (`import/export`), never CommonJS (`require`)
- TypeScript strict mode — no `any` types
- Functional components only, use hooks
- Named exports for components, default export for pages
- File processing logic lives in `src/tools/` — keep it pure (no React imports)
- Components handle UI state only; call tool functions for PDF logic
- Tailwind utility classes only — no inline `style={}` except for dynamic values
- Keep components under 150 lines; split if larger

## Core Constraints

- **No file uploads to any server, ever.** All processing must use browser APIs (`FileReader`, `ArrayBuffer`, `Blob`, `URL.createObjectURL`)
- **No authentication required** — zero login walls
- **No external API calls** for PDF processing
- PDF output must always be downloadable via a generated `<a>` tag with `download` attribute
- Support PDF files up to 100MB (warn user beyond this)
- Must work on Chrome, Firefox, Safari (latest 2 versions)
- Mobile responsive — tools must be fully usable on 375px wide screens

## Tool Behaviour

### Compress
- Use canvas re-render approach: render each page via PDF.js → draw to canvas → export back to PDF
- Offer three levels: Low (screen quality), Medium (balanced), High (max compression)
- Show before/after file size after processing

### Merge
- Accept 2–10 PDF files via drag-and-drop or file picker
- Allow drag-to-reorder before merging
- Output: single merged PDF

### Split
- Accept one PDF
- Modes: by page range (e.g. 1-3, 5), every N pages, extract single pages
- Output: ZIP file containing individual PDFs (use JSZip)

## Workflow

- Work on feature branches: `feat/compress`, `feat/merge`, `feat/split`
- Keep `main` always deployable
- Commit messages: conventional commits (`feat:`, `fix:`, `chore:`, `style:`)
- Do not commit `dist/` — it's in `.gitignore`
- When adding a new dependency, confirm it is browser-compatible (no Node.js built-ins)
