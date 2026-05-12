# Home Page & Trust Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a social proof counter, a how-it-works section, tool card detail lines, and a social media link to the footer to strengthen trust and first impressions on the home page.

**Architecture:** All changes are isolated to three existing files (Home.tsx, ToolCard.tsx, Footer.tsx) plus additions to two existing test files (Home.test.tsx, ToolCard.test.tsx) and one new test file (Footer.test.tsx). No new routes, no new dependencies.

**Tech Stack:** React 18 (TypeScript), Tailwind CSS v3, Vitest + @testing-library/react, react-router-dom (MemoryRouter for tests)

---

## File Map

| File | Action | What changes |
|------|--------|--------------|
| `src/components/ToolCard.tsx` | Modify | Add optional `detail` prop, render below description |
| `src/components/ToolCard.test.tsx` | Modify | Add tests for `detail` prop |
| `src/pages/Home.tsx` | Modify | Add `detail` to TOOLS array; add counter; add how-it-works section |
| `src/pages/Home.test.tsx` | Modify | Add tests for counter and how-it-works content |
| `src/components/Footer.tsx` | Modify | Add Twitter/X social link |
| `src/components/Footer.test.tsx` | Create | Tests for footer links including social |

---

## Task 1: ToolCard detail line

**Files:**
- Modify: `src/components/ToolCard.tsx`
- Modify: `src/components/ToolCard.test.tsx`

- [ ] **Step 1: Add failing tests for the `detail` prop**

Open `src/components/ToolCard.test.tsx`. Add these two tests after the existing four:

```tsx
it('renders detail line when provided', () => {
  render(
    <MemoryRouter>
      <ToolCard
        title="Compress"
        description="Reduce PDF file size"
        detail="3 quality levels · No file size limit"
        icon={<span data-testid="icon">icon</span>}
        href="/compress"
      />
    </MemoryRouter>,
  )
  expect(screen.getByText('3 quality levels · No file size limit')).toBeInTheDocument()
})

it('does not render detail line when omitted', () => {
  render(
    <MemoryRouter>
      <ToolCard
        title="Compress"
        description="Reduce PDF file size"
        icon={<span data-testid="icon">icon</span>}
        href="/compress"
      />
    </MemoryRouter>,
  )
  expect(screen.queryByText(/quality levels/i)).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --run src/components/ToolCard.test.tsx
```

Expected: 2 failures — `detail` prop doesn't exist yet.

- [ ] **Step 3: Add `detail` prop to ToolCard**

Replace the full contents of `src/components/ToolCard.tsx`:

```tsx
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export interface ToolCardProps {
  title: string
  description: string
  detail?: string
  icon: ReactNode
  href: string
}

export default function ToolCard({ title, description, detail, icon, href }: ToolCardProps) {
  return (
    <Link
      to={href}
      className="group block bg-surface rounded-xl p-6 border-l-2 border-transparent hover:border-primary hover:scale-[1.02] transition-all duration-200"
    >
      <div className="text-primary mb-3">{icon}</div>
      <h3 className="text-white font-semibold text-lg mb-1">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
      {detail && <p className="text-gray-500 text-xs mt-2">{detail}</p>}
      <div className="mt-4 flex justify-end">
        <span className="text-primary text-sm">Open →</span>
      </div>
    </Link>
  )
}
```

- [ ] **Step 4: Update TOOLS array in Home.tsx to include detail lines**

In `src/pages/Home.tsx`, replace the TOOLS array:

```tsx
const TOOLS = [
  {
    title: 'Compress',
    description: 'Reduce PDF file size without losing quality',
    detail: '3 quality levels · No file size limit',
    icon: <FileDown size={32} />,
    href: '/compress',
  },
  {
    title: 'Merge',
    description: 'Join multiple PDFs into one document',
    detail: '2–10 files · Drag to reorder',
    icon: <GitMerge size={32} />,
    href: '/merge',
  },
  {
    title: 'Split',
    description: 'Extract pages or split into parts',
    detail: 'By range, every N pages, or all · ZIP output',
    icon: <Scissors size={32} />,
    href: '/split',
  },
]
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- --run src/components/ToolCard.test.tsx
```

Expected: 6/6 passing.

- [ ] **Step 6: Commit**

```bash
git add src/components/ToolCard.tsx src/components/ToolCard.test.tsx src/pages/Home.tsx
git commit -m "feat: add detail line to ToolCard and update home tool descriptions"
```

---

## Task 2: Home page social proof counter

**Files:**
- Modify: `src/pages/Home.tsx`
- Modify: `src/pages/Home.test.tsx`

- [ ] **Step 1: Add failing test for the counter**

Open `src/pages/Home.test.tsx`. Add after the existing tests:

```tsx
it('renders the pdfs processed counter', () => {
  renderHome()
  expect(screen.getByText(/pdfs processed/i)).toBeInTheDocument()
  expect(screen.getByText(/250,000\+/)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --run src/pages/Home.test.tsx
```

Expected: 1 failure — counter text not in the DOM yet.

- [ ] **Step 3: Add counter to Home.tsx**

In `src/pages/Home.tsx`, find the closing `</div>` of the hero section (the one with `mb-14`). It ends after the stats strip div. Add the counter just before that closing `</div>`:

```tsx
        <p className="text-gray-500 text-xs mt-5">
          <span className="text-white font-semibold">250,000+</span> PDFs processed
        </p>
```

After the change, the bottom of the hero div should look like:

```tsx
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-6 text-sm text-gray-500">
          <span>0 uploads</span>
          <span className="w-1 h-1 rounded-full bg-gray-600" />
          <span>0 accounts</span>
          <span className="w-1 h-1 rounded-full bg-gray-600" />
          <span className="text-primary font-medium">100% private</span>
        </div>
        <p className="text-gray-500 text-xs mt-5">
          <span className="text-white font-semibold">250,000+</span> PDFs processed
        </p>
      </div>
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --run src/pages/Home.test.tsx
```

Expected: all passing.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Home.tsx src/pages/Home.test.tsx
git commit -m "feat: add pdfs processed counter to home hero"
```

---

## Task 3: How-it-works section on home page

**Files:**
- Modify: `src/pages/Home.tsx`
- Modify: `src/pages/Home.test.tsx`

- [ ] **Step 1: Add failing tests for how-it-works section**

Open `src/pages/Home.test.tsx`. Add after the existing tests:

```tsx
it('renders the how-it-works section heading', () => {
  renderHome()
  expect(screen.getByText(/how it works/i)).toBeInTheDocument()
})

it('renders all three how-it-works steps', () => {
  renderHome()
  expect(screen.getByText('Drop your file')).toBeInTheDocument()
  expect(screen.getByText('Choose your options')).toBeInTheDocument()
  expect(screen.getByText('Download instantly')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --run src/pages/Home.test.tsx
```

Expected: 2 failures — how-it-works section doesn't exist yet.

- [ ] **Step 3: Add how-it-works section to Home.tsx**

In `src/pages/Home.tsx`, add this section after the closing `</div>` of the tool cards grid (after `{TOOLS.map(...)}`), before the final closing `</div>` of the page wrapper:

```tsx
      <section className="mt-14">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-6">
          How it works
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="flex items-start gap-4">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-surface flex items-center justify-center text-primary font-bold text-sm">
              1
            </span>
            <div>
              <p className="text-white text-sm font-medium">Drop your file</p>
              <p className="text-gray-500 text-xs mt-1">
                Select any PDF up to 100 MB — drag and drop or click to browse
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-surface flex items-center justify-center text-primary font-bold text-sm">
              2
            </span>
            <div>
              <p className="text-white text-sm font-medium">Choose your options</p>
              <p className="text-gray-500 text-xs mt-1">
                Pick compression level, set a page range, or arrange file order
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-surface flex items-center justify-center text-primary font-bold text-sm">
              3
            </span>
            <div>
              <p className="text-white text-sm font-medium">Download instantly</p>
              <p className="text-gray-500 text-xs mt-1">
                Your processed PDF is ready immediately — no uploads, no waiting
              </p>
            </div>
          </div>
        </div>
      </section>
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --run src/pages/Home.test.tsx
```

Expected: all passing.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Home.tsx src/pages/Home.test.tsx
git commit -m "feat: add how-it-works section to home page"
```

---

## Task 4: Footer social media link

**Files:**
- Modify: `src/components/Footer.tsx`
- Create: `src/components/Footer.test.tsx`

- [ ] **Step 1: Create failing test file**

Create `src/components/Footer.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Footer from './Footer'

function renderFooter() {
  return render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>,
  )
}

it('renders copyright notice', () => {
  renderFooter()
  expect(screen.getByText(/pdfnip\. all rights reserved/i)).toBeInTheDocument()
})

it('renders privacy policy link', () => {
  renderFooter()
  expect(screen.getByRole('link', { name: 'Privacy Policy' })).toBeInTheDocument()
})

it('renders terms of use link', () => {
  renderFooter()
  expect(screen.getByRole('link', { name: 'Terms of Use' })).toBeInTheDocument()
})

it('renders twitter/x social link', () => {
  renderFooter()
  expect(screen.getByRole('link', { name: /twitter|x/i })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests to verify the social link test fails**

```bash
npm test -- --run src/components/Footer.test.tsx
```

Expected: 3 pass (copyright, privacy, terms already exist), 1 fails (twitter link missing).

- [ ] **Step 3: Add Twitter/X link to Footer**

Replace the full contents of `src/components/Footer.tsx`:

```tsx
import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="border-t border-white/5 mt-16">
      <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500">
        <span>© {new Date().getFullYear()} PDFNip. All rights reserved.</span>
        <nav className="flex items-center gap-5">
          <Link to="/privacy" className="hover:text-gray-300 transition-colors">
            Privacy Policy
          </Link>
          <Link to="/terms" className="hover:text-gray-300 transition-colors">
            Terms of Use
          </Link>
          <a
            href="https://x.com/pdfnip"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Twitter / X"
            className="hover:text-gray-300 transition-colors"
          >
            𝕏
          </a>
        </nav>
      </div>
    </footer>
  )
}
```

- [ ] **Step 4: Run tests to verify all pass**

```bash
npm test -- --run src/components/Footer.test.tsx
```

Expected: 4/4 passing.

- [ ] **Step 5: Run full test suite**

```bash
npm test -- --run
```

Expected: all tests passing (no regressions).

- [ ] **Step 6: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/Footer.tsx src/components/Footer.test.tsx
git commit -m "feat: add twitter/x social link to footer"
```
