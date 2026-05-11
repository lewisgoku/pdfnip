# PDFNip Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold PDFNip — Vite + React 18 + TypeScript + Tailwind CSS v3, React Router v6 nested layout, shared components (Navbar, ToolCard, DropZone stub), Home page, and Compress/Merge/Split shell pages.

**Architecture:** A root `Layout` component renders `<Navbar>` and `<Outlet>`. All four pages nest under it via React Router v6. No PDF logic in this step — tool pages are stubs with a DropZone placeholder.

**Tech Stack:** Vite, React 18, TypeScript (strict), Tailwind CSS v3, React Router v6, lucide-react (icons), Vitest + @testing-library/react (tests)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `package.json` | Modify | Add deps + scripts |
| `vite.config.ts` | Modify | Add Vitest test config |
| `tailwind.config.ts` | Create | Brand tokens + content paths |
| `postcss.config.js` | Create | Tailwind + autoprefixer plugins |
| `index.html` | Modify | Google Fonts, page title |
| `src/main.tsx` | Modify | Import global CSS |
| `src/styles/index.css` | Create | Tailwind directives + base body styles |
| `src/test/setup.ts` | Create | jest-dom matchers |
| `src/utils/formatBytes.ts` | Create | Byte → human-readable string |
| `src/utils/formatBytes.test.ts` | Create | Unit tests for formatBytes |
| `src/components/DropZone.tsx` | Create | Typed stub, visual placeholder only |
| `src/components/DropZone.test.tsx` | Create | Render smoke test |
| `src/components/ToolCard.tsx` | Create | Card linking to a tool route |
| `src/components/ToolCard.test.tsx` | Create | Render + content test |
| `src/components/Navbar.tsx` | Create | Wordmark + nav links with active state |
| `src/components/Navbar.test.tsx` | Create | Render + link presence test |
| `src/components/Layout.tsx` | Create | Navbar + Outlet wrapper |
| `src/components/Layout.test.tsx` | Create | Renders navbar + outlet content |
| `src/pages/Home.tsx` | Create | Three ToolCards grid |
| `src/pages/Home.test.tsx` | Create | Renders all three tool titles |
| `src/pages/Compress.tsx` | Create | Shell: heading + DropZone |
| `src/pages/Merge.tsx` | Create | Shell: heading + DropZone |
| `src/pages/Split.tsx` | Create | Shell: heading + DropZone |
| `src/pages/shells.test.tsx` | Create | All three shells render |
| `src/App.tsx` | Modify | RouterProvider with route tree |
| `src/App.test.tsx` | Create | Routing smoke test |

---

## Task 1: Scaffold project and install dependencies

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`

- [ ] **Step 1: Create Vite project in the existing directory**

Run in `e:\vscode projects\pdfnip`:
```powershell
npm create vite@latest . -- --template react-ts
```
When prompted about existing files, select **"Ignore files and continue"**. This adds `index.html`, `src/`, `tsconfig*.json`, `vite.config.ts`, `eslint.config.js`, and the default `package.json`.

- [ ] **Step 2: Install runtime dependencies**

```powershell
npm install react-router-dom lucide-react
```

- [ ] **Step 3: Install Tailwind CSS and its peer deps**

```powershell
npm install -D tailwindcss postcss autoprefixer
```

- [ ] **Step 4: Install Vitest and Testing Library**

```powershell
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 5: Add scripts to `package.json`**

Open `package.json`. Replace the `scripts` block with:
```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "typecheck": "tsc -b --noEmit",
  "lint": "eslint .",
  "test": "vitest",
  "test:run": "vitest run"
},
```

- [ ] **Step 6: Delete generated boilerplate files that we will replace**

```powershell
Remove-Item src\App.css -ErrorAction SilentlyContinue
Remove-Item src\index.css -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force src\assets -ErrorAction SilentlyContinue
```

- [ ] **Step 7: Commit**

```powershell
git init
git add .
git commit -m "chore: scaffold vite react-ts project"
```

---

## Task 2: Configure Tailwind CSS and Vitest

**Files:**
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Modify: `vite.config.ts`

- [ ] **Step 1: Create `tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#00D2B9',
        bg: '#0A1028',
        surface: '#111827',
      },
      fontFamily: {
        display: ['Bricolage Grotesque', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
```

- [ ] **Step 2: Create `postcss.config.js`**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 3: Replace `vite.config.ts` with Vitest config included**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

- [ ] **Step 4: Commit**

```powershell
git add tailwind.config.ts postcss.config.js vite.config.ts
git commit -m "chore: configure tailwind css and vitest"
```

---

## Task 3: Set up base HTML and global styles

**Files:**
- Modify: `index.html`
- Create: `src/styles/index.css`
- Modify: `src/main.tsx`
- Create: `src/test/setup.ts`

- [ ] **Step 1: Replace `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PDFNip — Trim. Merge. Split.</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700&family=Inter:wght@400;500;600&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Create `src/styles/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-bg text-gray-50 font-sans;
  }
}
```

- [ ] **Step 3: Replace `src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 4: Create `src/test/setup.ts`**

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Verify setup compiles**

```powershell
npm run typecheck
```
Expected: no errors.

- [ ] **Step 6: Commit**

```powershell
git add index.html src/styles/index.css src/main.tsx src/test/setup.ts
git commit -m "chore: set up base html, global styles, and vitest setup file"
```

---

## Task 4: formatBytes utility (TDD)

**Files:**
- Create: `src/utils/formatBytes.ts`
- Create: `src/utils/formatBytes.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/formatBytes.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { formatBytes } from './formatBytes'

describe('formatBytes', () => {
  it('returns "0 B" for zero', () => {
    expect(formatBytes(0)).toBe('0 B')
  })

  it('formats bytes under 1 KB', () => {
    expect(formatBytes(500)).toBe('500 B')
  })

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB')
  })

  it('formats megabytes', () => {
    expect(formatBytes(1048576)).toBe('1 MB')
  })

  it('formats with custom decimal places', () => {
    expect(formatBytes(1234567, 1)).toBe('1.2 MB')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```powershell
npm run test:run -- src/utils/formatBytes.test.ts
```
Expected: 5 failures with "Cannot find module './formatBytes'".

- [ ] **Step 3: Implement `src/utils/formatBytes.ts`**

```ts
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`
}
```

- [ ] **Step 4: Run tests to verify they pass**

```powershell
npm run test:run -- src/utils/formatBytes.test.ts
```
Expected: 5 passed.

- [ ] **Step 5: Commit**

```powershell
git add src/utils/formatBytes.ts src/utils/formatBytes.test.ts
git commit -m "feat: add formatBytes utility"
```

---

## Task 5: DropZone stub component

**Files:**
- Create: `src/components/DropZone.tsx`
- Create: `src/components/DropZone.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/DropZone.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import DropZone from './DropZone'

it('renders the drop label', () => {
  render(<DropZone onFiles={() => {}} />)
  expect(screen.getByText(/drop your pdf/i)).toBeInTheDocument()
})

it('renders a custom label when provided', () => {
  render(<DropZone onFiles={() => {}} label="Drop files here" />)
  expect(screen.getByText('Drop files here')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run to verify failure**

```powershell
npm run test:run -- src/components/DropZone.test.tsx
```
Expected: fail with "Cannot find module './DropZone'".

- [ ] **Step 3: Implement `src/components/DropZone.tsx`**

```tsx
export interface DropZoneProps {
  accept?: string
  multiple?: boolean
  onFiles: (files: File[]) => void
  label?: string
}

export default function DropZone({
  label = 'Drop your PDF here or click to browse',
}: DropZoneProps) {
  return (
    <div className="flex items-center justify-center w-full h-48 border-2 border-dashed border-gray-600 rounded-xl cursor-pointer hover:border-primary transition-colors">
      <p className="text-gray-400 text-sm">{label}</p>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```powershell
npm run test:run -- src/components/DropZone.test.tsx
```
Expected: 2 passed.

- [ ] **Step 5: Commit**

```powershell
git add src/components/DropZone.tsx src/components/DropZone.test.tsx
git commit -m "feat: add DropZone stub component"
```

---

## Task 6: ToolCard component

**Files:**
- Create: `src/components/ToolCard.tsx`
- Create: `src/components/ToolCard.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/ToolCard.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ToolCard from './ToolCard'

function renderCard() {
  return render(
    <MemoryRouter>
      <ToolCard
        title="Compress"
        description="Reduce PDF file size"
        icon={<span data-testid="icon">icon</span>}
        href="/compress"
      />
    </MemoryRouter>,
  )
}

it('renders the title', () => {
  renderCard()
  expect(screen.getByText('Compress')).toBeInTheDocument()
})

it('renders the description', () => {
  renderCard()
  expect(screen.getByText('Reduce PDF file size')).toBeInTheDocument()
})

it('renders the icon', () => {
  renderCard()
  expect(screen.getByTestId('icon')).toBeInTheDocument()
})

it('links to the correct href', () => {
  renderCard()
  expect(screen.getByRole('link')).toHaveAttribute('href', '/compress')
})
```

- [ ] **Step 2: Run to verify failure**

```powershell
npm run test:run -- src/components/ToolCard.test.tsx
```
Expected: fail with "Cannot find module './ToolCard'".

- [ ] **Step 3: Implement `src/components/ToolCard.tsx`**

```tsx
import { Link } from 'react-router-dom'

export interface ToolCardProps {
  title: string
  description: string
  icon: React.ReactNode
  href: string
}

export default function ToolCard({ title, description, icon, href }: ToolCardProps) {
  return (
    <Link
      to={href}
      className="group block bg-surface rounded-xl p-6 border-l-2 border-transparent hover:border-primary hover:scale-[1.02] transition-all duration-200"
    >
      <div className="text-primary mb-3">{icon}</div>
      <h3 className="text-white font-semibold text-lg mb-1">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
      <div className="mt-4 flex justify-end">
        <span className="text-primary text-sm">Open →</span>
      </div>
    </Link>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```powershell
npm run test:run -- src/components/ToolCard.test.tsx
```
Expected: 4 passed.

- [ ] **Step 5: Commit**

```powershell
git add src/components/ToolCard.tsx src/components/ToolCard.test.tsx
git commit -m "feat: add ToolCard component"
```

---

## Task 7: Navbar component

**Files:**
- Create: `src/components/Navbar.tsx`
- Create: `src/components/Navbar.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/Navbar.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Navbar from './Navbar'

function renderNavbar(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Navbar />
    </MemoryRouter>,
  )
}

it('renders the pdfnip wordmark', () => {
  renderNavbar()
  expect(screen.getByText('pdf')).toBeInTheDocument()
  expect(screen.getByText('nip')).toBeInTheDocument()
})

it('renders all three nav links', () => {
  renderNavbar()
  expect(screen.getByRole('link', { name: 'Compress' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Merge' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Split' })).toBeInTheDocument()
})

it('nav links point to correct routes', () => {
  renderNavbar()
  expect(screen.getByRole('link', { name: 'Compress' })).toHaveAttribute('href', '/compress')
  expect(screen.getByRole('link', { name: 'Merge' })).toHaveAttribute('href', '/merge')
  expect(screen.getByRole('link', { name: 'Split' })).toHaveAttribute('href', '/split')
})
```

- [ ] **Step 2: Run to verify failure**

```powershell
npm run test:run -- src/components/Navbar.test.tsx
```
Expected: fail with "Cannot find module './Navbar'".

- [ ] **Step 3: Implement `src/components/Navbar.tsx`**

```tsx
import { Link, NavLink } from 'react-router-dom'

const NAV_LINKS = [
  { to: '/compress', label: 'Compress' },
  { to: '/merge', label: 'Merge' },
  { to: '/split', label: 'Split' },
]

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-10 bg-bg px-6 py-4 flex items-center justify-between">
      <Link to="/" className="font-display font-bold text-2xl leading-none">
        <span className="text-white">pdf</span>
        <span className="text-primary">nip</span>
      </Link>
      <div className="flex items-center gap-6">
        {NAV_LINKS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `text-sm font-medium transition-colors ${
                isActive
                  ? 'text-white border-b border-primary pb-0.5'
                  : 'text-gray-400 hover:text-white'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```powershell
npm run test:run -- src/components/Navbar.test.tsx
```
Expected: 3 passed.

- [ ] **Step 5: Commit**

```powershell
git add src/components/Navbar.tsx src/components/Navbar.test.tsx
git commit -m "feat: add Navbar component"
```

---

## Task 8: Layout component

**Files:**
- Create: `src/components/Layout.tsx`
- Create: `src/components/Layout.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/Layout.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import Layout from './Layout'

function renderLayout() {
  const router = createMemoryRouter([
    {
      path: '/',
      element: <Layout />,
      children: [{ index: true, element: <div>page content</div> }],
    },
  ])
  return render(<RouterProvider router={router} />)
}

it('renders the navbar', () => {
  renderLayout()
  expect(screen.getByText('pdf')).toBeInTheDocument()
})

it('renders outlet content', () => {
  renderLayout()
  expect(screen.getByText('page content')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run to verify failure**

```powershell
npm run test:run -- src/components/Layout.test.tsx
```
Expected: fail with "Cannot find module './Layout'".

- [ ] **Step 3: Implement `src/components/Layout.tsx`**

```tsx
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'

export default function Layout() {
  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <main>
        <Outlet />
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```powershell
npm run test:run -- src/components/Layout.test.tsx
```
Expected: 2 passed.

- [ ] **Step 5: Commit**

```powershell
git add src/components/Layout.tsx src/components/Layout.test.tsx
git commit -m "feat: add Layout component"
```

---

## Task 9: Home page

**Files:**
- Create: `src/pages/Home.tsx`
- Create: `src/pages/Home.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/pages/Home.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Home from './Home'

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  )
}

it('renders the page heading', () => {
  renderHome()
  expect(screen.getByText('What do you need to do?')).toBeInTheDocument()
})

it('renders all three tool cards', () => {
  renderHome()
  expect(screen.getByText('Compress')).toBeInTheDocument()
  expect(screen.getByText('Merge')).toBeInTheDocument()
  expect(screen.getByText('Split')).toBeInTheDocument()
})

it('tool cards link to correct routes', () => {
  renderHome()
  expect(screen.getByRole('link', { name: /compress/i })).toHaveAttribute('href', '/compress')
  expect(screen.getByRole('link', { name: /merge/i })).toHaveAttribute('href', '/merge')
  expect(screen.getByRole('link', { name: /split/i })).toHaveAttribute('href', '/split')
})
```

- [ ] **Step 2: Run to verify failure**

```powershell
npm run test:run -- src/pages/Home.test.tsx
```
Expected: fail with "Cannot find module './Home'".

- [ ] **Step 3: Implement `src/pages/Home.tsx`**

```tsx
import { FileDown, GitMerge, Scissors } from 'lucide-react'
import ToolCard from '../components/ToolCard'

const TOOLS = [
  {
    title: 'Compress',
    description: 'Reduce PDF file size without losing quality',
    icon: <FileDown size={32} />,
    href: '/compress',
  },
  {
    title: 'Merge',
    description: 'Join multiple PDFs into one document',
    icon: <GitMerge size={32} />,
    href: '/merge',
  },
  {
    title: 'Split',
    description: 'Extract pages or split into parts',
    icon: <Scissors size={32} />,
    href: '/split',
  },
]

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-semibold text-white mb-8">What do you need to do?</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TOOLS.map((tool) => (
          <ToolCard key={tool.href} {...tool} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```powershell
npm run test:run -- src/pages/Home.test.tsx
```
Expected: 3 passed.

- [ ] **Step 5: Commit**

```powershell
git add src/pages/Home.tsx src/pages/Home.test.tsx
git commit -m "feat: add Home page"
```

---

## Task 10: Shell pages (Compress, Merge, Split)

**Files:**
- Create: `src/pages/Compress.tsx`
- Create: `src/pages/Merge.tsx`
- Create: `src/pages/Split.tsx`
- Create: `src/pages/shells.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/pages/shells.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import Compress from './Compress'
import Merge from './Merge'
import Split from './Split'

it('Compress page renders heading and drop zone', () => {
  render(<Compress />)
  expect(screen.getByText('Compress PDF')).toBeInTheDocument()
  expect(screen.getByText(/drop your pdf/i)).toBeInTheDocument()
})

it('Merge page renders heading and drop zone', () => {
  render(<Merge />)
  expect(screen.getByText('Merge PDFs')).toBeInTheDocument()
  expect(screen.getByText(/drop your pdf/i)).toBeInTheDocument()
})

it('Split page renders heading and drop zone', () => {
  render(<Split />)
  expect(screen.getByText('Split PDF')).toBeInTheDocument()
  expect(screen.getByText(/drop your pdf/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run to verify failure**

```powershell
npm run test:run -- src/pages/shells.test.tsx
```
Expected: fail with "Cannot find module './Compress'".

- [ ] **Step 3: Implement `src/pages/Compress.tsx`**

```tsx
import DropZone from '../components/DropZone'

export default function Compress() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-semibold text-white mb-2">Compress PDF</h1>
      <p className="text-gray-400 mb-8">
        Reduce your PDF file size — all processing happens in your browser.
      </p>
      <DropZone onFiles={() => {}} />
    </div>
  )
}
```

- [ ] **Step 4: Implement `src/pages/Merge.tsx`**

```tsx
import DropZone from '../components/DropZone'

export default function Merge() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-semibold text-white mb-2">Merge PDFs</h1>
      <p className="text-gray-400 mb-8">
        Combine multiple PDF files into one — all processing happens in your browser.
      </p>
      <DropZone onFiles={() => {}} multiple label="Drop your PDFs here or click to browse" />
    </div>
  )
}
```

- [ ] **Step 5: Implement `src/pages/Split.tsx`**

```tsx
import DropZone from '../components/DropZone'

export default function Split() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-semibold text-white mb-2">Split PDF</h1>
      <p className="text-gray-400 mb-8">
        Extract pages or split into parts — all processing happens in your browser.
      </p>
      <DropZone onFiles={() => {}} />
    </div>
  )
}
```

- [ ] **Step 6: Run tests to verify they pass**

```powershell
npm run test:run -- src/pages/shells.test.tsx
```
Expected: 3 passed.

- [ ] **Step 7: Commit**

```powershell
git add src/pages/Compress.tsx src/pages/Merge.tsx src/pages/Split.tsx src/pages/shells.test.tsx
git commit -m "feat: add Compress, Merge, Split shell pages"
```

---

## Task 11: Wire up routing in App.tsx

**Files:**
- Modify: `src/App.tsx`
- Create: `src/App.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/App.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import App from './App'

it('renders Home page at root route', () => {
  render(<App />)
  expect(screen.getByText('What do you need to do?')).toBeInTheDocument()
})

it('renders Navbar on Home', () => {
  render(<App />)
  expect(screen.getByText('pdf')).toBeInTheDocument()
  expect(screen.getByText('nip')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run to verify failure**

```powershell
npm run test:run -- src/App.test.tsx
```
Expected: fail (current App.tsx has Vite boilerplate, not our router).

- [ ] **Step 3: Replace `src/App.tsx`**

```tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Compress from './pages/Compress'
import Merge from './pages/Merge'
import Split from './pages/Split'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'compress', element: <Compress /> },
      { path: 'merge', element: <Merge /> },
      { path: 'split', element: <Split /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
```

- [ ] **Step 4: Run tests to verify they pass**

```powershell
npm run test:run -- src/App.test.tsx
```
Expected: 2 passed.

- [ ] **Step 5: Commit**

```powershell
git add src/App.tsx src/App.test.tsx
git commit -m "feat: wire up react-router-v6 routing"
```

---

## Task 12: Final typecheck and build verify

**Files:** none new — verification only

- [ ] **Step 1: Run full test suite**

```powershell
npm run test:run
```
Expected: all tests pass (≥ 19 tests across all files).

- [ ] **Step 2: Run typecheck**

```powershell
npm run typecheck
```
Expected: no errors.

- [ ] **Step 3: Run production build**

```powershell
npm run build
```
Expected: build succeeds, `dist/` is created.

- [ ] **Step 4: Start dev server and verify visually**

```powershell
npm run dev
```
Open `http://localhost:5173` and verify:
- Home page shows "What do you need to do?" with 3 tool cards
- Navbar shows wordmark + 3 nav links
- Navigating to `/compress`, `/merge`, `/split` shows each shell page
- Active nav link shows teal underline
- Page background is deep navy, cards are dark surface

- [ ] **Step 5: Final commit**

```powershell
git add .
git commit -m "chore: verify build and typecheck pass for foundation"
```
