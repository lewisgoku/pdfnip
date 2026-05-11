# PDFNip — Step 1: Foundation Design

**Date:** 2026-05-11  
**Scope:** Project scaffold, routing, shared components, Home page  
**Status:** Approved

---

## Overview

Scaffold the PDFNip web app from zero. This step produces a fully deployable base: Vite + React 18 + TypeScript + Tailwind CSS v3, React Router v6 with a nested layout, a Navbar, the Home page (three tool cards), a reusable DropZone stub, and shell pages for the three tools. No PDF processing logic is included — that belongs to Steps 2–4.

---

## Architecture

### Stack

| Concern       | Choice                              |
|---------------|-------------------------------------|
| Bundler       | Vite                                |
| Framework     | React 18, TypeScript (strict)       |
| Styling       | Tailwind CSS v3                     |
| Routing       | React Router v6                     |
| Fonts         | BricolageGrotesque (wordmark), Inter (UI) via Google Fonts in `index.html` |
| Package mgr   | npm                                 |

### Routing

React Router v6 nested layout pattern. A root `Layout` component renders `<Navbar>` and `<Outlet>`. All pages nest under it.

```
/           → Home
/compress   → Compress (shell)
/merge      → Merge (shell)
/split      → Split (shell)
```

### File Structure

```
src/
├── components/
│   ├── Layout.tsx       # Navbar + Outlet wrapper
│   ├── Navbar.tsx       # Logo + nav links
│   ├── ToolCard.tsx     # Card for each tool on Home
│   └── DropZone.tsx     # Shared drop target (stub — interface only)
├── pages/
│   ├── Home.tsx         # Three ToolCards grid
│   ├── Compress.tsx     # Shell page
│   ├── Merge.tsx        # Shell page
│   └── Split.tsx        # Shell page
├── utils/
│   └── formatBytes.ts   # File size formatter (e.g. "1.2 MB")
├── styles/
│   └── index.css        # Tailwind directives + base styles
├── App.tsx              # Router + route tree
└── main.tsx             # Entry point
```

---

## Components

### Layout (`src/components/Layout.tsx`)

Renders `<Navbar>` followed by `<Outlet>`. Wraps content in a `min-h-screen` div with the navy background (`#0A1028`).

### Navbar (`src/components/Navbar.tsx`)

- **Left:** wordmark — `pdf` in white + `nip` in teal (`#00D2B9`), BricolageGrotesque Bold, `<Link to="/">`
- **Right:** three nav links — Compress · Merge · Split — in Inter; muted (`#9CA3AF`) default, white on hover, teal underline on active route (React Router `useMatch`)
- **Background:** `#0A1028`, no border, sticky top-0, full-width, `px-6 py-4`

### ToolCard (`src/components/ToolCard.tsx`)

Props:
```ts
interface ToolCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
}
```

- Surface: `#111827`, `rounded-xl`, `p-6`
- Icon (teal, 32px) → title (white) → description (muted `#9CA3AF`) → arrow CTA (bottom-right)
- Hover: teal left-border accent + `scale-[1.02]` transition
- Wraps in React Router `<Link>`

### DropZone (`src/components/DropZone.tsx`)

Stub only. Establishes the typed interface for use in Steps 2–4.

```ts
interface DropZoneProps {
  accept?: string;         // e.g. "application/pdf"
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  label?: string;
}
```

Renders a dashed-border drop area placeholder with label text. No drag-and-drop logic yet.

---

## Pages

### Home (`src/pages/Home.tsx`)

- Centred container, `max-w-4xl`, `mx-auto`, `px-4 py-12`
- Heading: `"What do you need to do?"` — white, `text-2xl font-semibold`
- Responsive grid: 1 col mobile → 3 cols `md:` breakpoint
- One `<ToolCard>` per tool with appropriate icon, title, description, and `href`

| Tool     | Icon          | Description                        | href        |
|----------|---------------|------------------------------------|-------------|
| Compress | FileDown icon | Reduce PDF file size               | /compress   |
| Merge    | Combine icon  | Join multiple PDFs into one        | /merge      |
| Split    | Scissors icon | Extract pages or split into parts  | /split      |

### Compress / Merge / Split shells (`src/pages/`)

Each renders:
1. Page heading (tool name)
2. Short descriptor line
3. `<DropZone>` stub (wired to a no-op handler)

Enough to confirm routing and shared layout work end-to-end.

---

## Utilities

### `formatBytes(bytes: number, decimals?: number): string`

Converts raw byte count to human-readable string (e.g. `1234567 → "1.18 MB"`). Used across Compress/Merge/Split pages in later steps.

---

## Brand Tokens (Tailwind config)

Extend `tailwind.config.ts` with:

```ts
colors: {
  primary: '#00D2B9',   // teal accent
  bg: '#0A1028',        // deep navy
  surface: '#111827',   // card background
}
```

---

## Out of Scope (Steps 2–4)

- PDF processing logic (compress, merge, split)
- Drag-to-reorder (merge)
- ZIP output (split)
- Real DropZone drag-and-drop behaviour
- Error/loading states on tool pages
