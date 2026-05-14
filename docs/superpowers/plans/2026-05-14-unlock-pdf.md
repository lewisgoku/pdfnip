# Unlock PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an in-browser "Unlock PDF" tool that strips password protection and owner restrictions using pdf-lib.

**Architecture:** A pure `unlockPdf(file, password?)` function in `src/tools/unlockPdf.ts` catches `EncryptedPDFError` from pdf-lib and re-throws typed errors (`PasswordRequiredError`, `IncorrectPasswordError`). The page `src/pages/UnlockPdf.tsx` drives a state machine (`idle → unlocking → needs_password | done | error`) — dropping a PDF immediately triggers the unlock attempt with no extra button click.

**Tech Stack:** pdf-lib (already installed, exports `EncryptedPDFError`), React 18, TypeScript strict, Tailwind CSS v3, Vitest + Testing Library.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/tools/unlockPdf.ts` | Pure unlock logic, custom error classes |
| Create | `src/tools/unlockPdf.test.ts` | Unit tests for unlock logic |
| Create | `src/pages/UnlockPdf.tsx` | Page UI — full state machine |
| Create | `src/pages/UnlockPdf.test.tsx` | UI tests |
| Modify | `src/App.tsx` | Add `/unlock-pdf` route |
| Modify | `src/pages/Home.tsx` | Add Unlock card (LockOpen icon) |
| Modify | `src/components/Navbar.tsx` | Add "Unlock" nav link |
| Modify | `public/sitemap.xml` | Add `/unlock-pdf` URL entry |

---

## Task 1: Tool function — `src/tools/unlockPdf.ts`

**Files:**
- Create: `src/tools/unlockPdf.ts`
- Create: `src/tools/unlockPdf.test.ts`

### Step 1 — Write the failing tests

Create `src/tools/unlockPdf.test.ts`:

```ts
import { vi, describe, it, expect, beforeEach } from 'vitest'

// Hoist a reusable EncryptedPDFError mock class so it's available
// before the vi.mock() factory runs and also throwable in tests.
const MockEncryptedPDFError = vi.hoisted(() => class EncryptedPDFError extends Error {})

const mockPdfDoc = vi.hoisted(() => ({
  save: vi.fn(),
}))

vi.mock('pdf-lib', () => ({
  PDFDocument: { load: vi.fn() },
  EncryptedPDFError: MockEncryptedPDFError,
}))

import { PDFDocument } from 'pdf-lib'
import { unlockPdf, PasswordRequiredError, IncorrectPasswordError } from './unlockPdf'

beforeEach(() => {
  vi.clearAllMocks()
  mockPdfDoc.save.mockResolvedValue(new Uint8Array([1, 2, 3]))
  vi.mocked(PDFDocument.load).mockResolvedValue(mockPdfDoc as unknown as PDFDocument)
})

function makePdf(name = 'doc.pdf', size = 1024) {
  return new File([new ArrayBuffer(size)], name, { type: 'application/pdf' })
}

describe('unlockPdf', () => {
  it('returns a Uint8Array for an unprotected PDF', async () => {
    expect(await unlockPdf(makePdf())).toBeInstanceOf(Uint8Array)
  })

  it('passes no options to PDFDocument.load when no password given', async () => {
    await unlockPdf(makePdf())
    expect(PDFDocument.load).toHaveBeenCalledWith(expect.any(ArrayBuffer), undefined)
  })

  it('passes { password } to PDFDocument.load when password is supplied', async () => {
    await unlockPdf(makePdf(), 'secret')
    expect(PDFDocument.load).toHaveBeenCalledWith(expect.any(ArrayBuffer), { password: 'secret' })
  })

  it('throws PasswordRequiredError when PDF is encrypted and no password given', async () => {
    vi.mocked(PDFDocument.load).mockRejectedValue(new MockEncryptedPDFError())
    await expect(unlockPdf(makePdf())).rejects.toBeInstanceOf(PasswordRequiredError)
  })

  it('throws IncorrectPasswordError when PDF is encrypted and wrong password given', async () => {
    vi.mocked(PDFDocument.load).mockRejectedValue(new MockEncryptedPDFError())
    await expect(unlockPdf(makePdf(), 'wrong')).rejects.toBeInstanceOf(IncorrectPasswordError)
  })

  it('returns Uint8Array when correct password unlocks the PDF', async () => {
    // PDFDocument.load succeeds (no throw) when password is correct
    expect(await unlockPdf(makePdf(), 'correct')).toBeInstanceOf(Uint8Array)
  })

  it('throws file-too-large error for files over 100 MB', async () => {
    const big = new File([new ArrayBuffer(101 * 1024 * 1024)], 'big.pdf', { type: 'application/pdf' })
    await expect(unlockPdf(big)).rejects.toThrow('File is too large (max 100MB).')
  })
})
```

### Step 2 — Run the tests to verify they fail

```
npx vitest run src/tools/unlockPdf.test.ts
```

Expected: all tests fail with `Cannot find module './unlockPdf'`.

### Step 3 — Implement `src/tools/unlockPdf.ts`

```ts
import { PDFDocument, EncryptedPDFError } from 'pdf-lib'

const MAX_BYTES = 100 * 1024 * 1024

export class PasswordRequiredError extends Error {}
export class IncorrectPasswordError extends Error {}

export async function unlockPdf(file: File, password?: string): Promise<Uint8Array> {
  if (file.size > MAX_BYTES) {
    throw new Error('File is too large (max 100MB).')
  }
  const arrayBuffer = await file.arrayBuffer()
  try {
    const pdfDoc = await PDFDocument.load(
      arrayBuffer,
      password ? { password } : undefined,
    )
    return pdfDoc.save()
  } catch (e) {
    if (e instanceof EncryptedPDFError) {
      if (!password) throw new PasswordRequiredError()
      throw new IncorrectPasswordError()
    }
    throw e
  }
}
```

### Step 4 — Run the tests to verify they pass

```
npx vitest run src/tools/unlockPdf.test.ts
```

Expected: 7 tests passing, 0 failing.

### Step 5 — Typecheck

```
npm run typecheck
```

Expected: no errors.

### Step 6 — Commit

```
git add src/tools/unlockPdf.ts src/tools/unlockPdf.test.ts
git commit -m "feat: add unlockPdf tool with PasswordRequiredError and IncorrectPasswordError"
```

---

## Task 2: Page — `src/pages/UnlockPdf.tsx`

**Files:**
- Create: `src/pages/UnlockPdf.tsx`
- Create: `src/pages/UnlockPdf.test.tsx`

### Step 1 — Write the failing tests

Create `src/pages/UnlockPdf.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, beforeEach } from 'vitest'

// Preserve the real PasswordRequiredError / IncorrectPasswordError classes
// so instanceof checks in the page work, but mock unlockPdf itself.
vi.mock('../tools/unlockPdf', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../tools/unlockPdf')>()
  return { ...actual, unlockPdf: vi.fn() }
})

import { unlockPdf, PasswordRequiredError, IncorrectPasswordError } from '../tools/unlockPdf'
import UnlockPdf from './UnlockPdf'

const mockUnlockPdf = vi.mocked(unlockPdf)

beforeEach(() => {
  mockUnlockPdf.mockReset()
  mockUnlockPdf.mockResolvedValue(new Uint8Array(4096))
})

function makePdf(name = 'report.pdf', size = 1024) {
  return new File([new ArrayBuffer(size)], name, { type: 'application/pdf' })
}

function dropFile(file: File) {
  const zone = screen.getByTestId('dropzone')
  fireEvent.drop(zone, { dataTransfer: { files: [file] } })
}

// ── Idle state ─────────────────────────────────────────────────────────────

it('renders idle state with DropZone and privacy note', () => {
  render(<UnlockPdf />)
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
  expect(screen.getByText(/never leave your browser/i)).toBeInTheDocument()
})

// ── File validation (stays idle) ────────────────────────────────────────────

it('shows error and stays idle for non-PDF file', () => {
  render(<UnlockPdf />)
  fireEvent.drop(screen.getByTestId('dropzone'), {
    dataTransfer: { files: [new File(['txt'], 'doc.txt', { type: 'text/plain' })] },
  })
  expect(screen.getByText('Please select a valid PDF file.')).toBeInTheDocument()
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
})

it('shows error and stays idle for file over 100 MB', () => {
  render(<UnlockPdf />)
  const big = new File([new ArrayBuffer(101 * 1024 * 1024)], 'big.pdf', { type: 'application/pdf' })
  dropFile(big)
  expect(screen.getByText('File is too large (max 100MB).')).toBeInTheDocument()
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
})

// ── Unlocking state ─────────────────────────────────────────────────────────

it('immediately triggers unlock attempt on valid PDF drop (no button click needed)', async () => {
  render(<UnlockPdf />)
  dropFile(makePdf())
  await waitFor(() => expect(mockUnlockPdf).toHaveBeenCalledTimes(1))
})

it('shows loading text while unlocking', async () => {
  mockUnlockPdf.mockImplementation(() => new Promise(() => {}))
  render(<UnlockPdf />)
  dropFile(makePdf())
  await waitFor(() => expect(screen.getByText(/unlocking/i)).toBeInTheDocument())
})

// ── Done state ──────────────────────────────────────────────────────────────

it('shows Download link in done state', async () => {
  render(<UnlockPdf />)
  dropFile(makePdf())
  await waitFor(() => screen.getByRole('link', { name: /download/i }))
  expect(screen.getByRole('link', { name: /download/i })).toBeInTheDocument()
})

it('download filename is <basename>-unlocked.pdf', async () => {
  render(<UnlockPdf />)
  dropFile(makePdf('report.pdf'))
  await waitFor(() => screen.getByRole('link', { name: /download/i }))
  expect(screen.getByRole('link', { name: /download/i })).toHaveAttribute(
    'download',
    'report-unlocked.pdf',
  )
})

it('"Unlock another PDF" resets to idle', async () => {
  render(<UnlockPdf />)
  dropFile(makePdf())
  await waitFor(() => screen.getByRole('link', { name: /download/i }))
  fireEvent.click(screen.getByRole('button', { name: /unlock another pdf/i }))
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
})

// ── needs_password state ────────────────────────────────────────────────────

it('shows password input when PDF requires a password', async () => {
  mockUnlockPdf.mockRejectedValue(new PasswordRequiredError())
  render(<UnlockPdf />)
  dropFile(makePdf())
  await waitFor(() =>
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument(),
  )
})

it('shows Unlock button and Use-a-different-file button in needs_password state', async () => {
  mockUnlockPdf.mockRejectedValue(new PasswordRequiredError())
  render(<UnlockPdf />)
  dropFile(makePdf())
  await waitFor(() => screen.getByPlaceholderText(/password/i))
  expect(screen.getByRole('button', { name: /^unlock$/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /use a different file/i })).toBeInTheDocument()
})

it('shows inline error on wrong password and stays in needs_password state', async () => {
  mockUnlockPdf
    .mockRejectedValueOnce(new PasswordRequiredError())
    .mockRejectedValueOnce(new IncorrectPasswordError())
  render(<UnlockPdf />)
  dropFile(makePdf())
  await waitFor(() => screen.getByPlaceholderText(/password/i))
  fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'wrong' } })
  fireEvent.click(screen.getByRole('button', { name: /^unlock$/i }))
  await waitFor(() =>
    expect(
      screen.getByText('Incorrect password. Please try again.'),
    ).toBeInTheDocument(),
  )
  expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument()
})

it('transitions to done state after correct password', async () => {
  mockUnlockPdf
    .mockRejectedValueOnce(new PasswordRequiredError())
    .mockResolvedValueOnce(new Uint8Array(4096))
  render(<UnlockPdf />)
  dropFile(makePdf())
  await waitFor(() => screen.getByPlaceholderText(/password/i))
  fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'correct' } })
  fireEvent.click(screen.getByRole('button', { name: /^unlock$/i }))
  await waitFor(() => screen.getByRole('link', { name: /download/i }))
})

it('"Use a different file" resets to idle', async () => {
  mockUnlockPdf.mockRejectedValue(new PasswordRequiredError())
  render(<UnlockPdf />)
  dropFile(makePdf())
  await waitFor(() => screen.getByPlaceholderText(/password/i))
  fireEvent.click(screen.getByRole('button', { name: /use a different file/i }))
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
})

// ── Error state ─────────────────────────────────────────────────────────────

it('shows error state with message and DropZone for unexpected failure', async () => {
  mockUnlockPdf.mockRejectedValue(new Error('boom'))
  render(<UnlockPdf />)
  dropFile(makePdf())
  await waitFor(() =>
    expect(
      screen.getByText('Something went wrong. Please try again.'),
    ).toBeInTheDocument(),
  )
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
})
```

### Step 2 — Run the tests to verify they fail

```
npx vitest run src/pages/UnlockPdf.test.tsx
```

Expected: all tests fail with `Cannot find module './UnlockPdf'`.

### Step 3 — Implement `src/pages/UnlockPdf.tsx`

```tsx
import { useState, useEffect, useMemo } from 'react'
import DropZone from '../components/DropZone'
import PageMeta from '../components/PageMeta'
import { unlockPdf, PasswordRequiredError, IncorrectPasswordError } from '../tools/unlockPdf'
import { formatBytes } from '../utils/formatBytes'

type Status = 'idle' | 'unlocking' | 'needs_password' | 'done' | 'error'

const MAX_BYTES = 100 * 1024 * 1024

function getDownloadName(file: File): string {
  const dotIndex = file.name.lastIndexOf('.')
  const base = dotIndex >= 0 ? file.name.slice(0, dotIndex) : file.name
  return `${base}-unlocked.pdf`
}

export default function UnlockPdf() {
  const [status, setStatus] = useState<Status>('idle')
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [result, setResult] = useState<Uint8Array | null>(null)
  const [error, setError] = useState<string | null>(null)

  const downloadUrl = useMemo(() => {
    if (!result) return null
    return URL.createObjectURL(new Blob([result as BufferSource], { type: 'application/pdf' }))
  }, [result])

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    }
  }, [downloadUrl])

  async function attemptUnlock(file: File, pwd?: string) {
    setStatus('unlocking')
    setPasswordError(null)
    try {
      const output = await unlockPdf(file, pwd)
      setResult(output)
      setStatus('done')
    } catch (e) {
      if (e instanceof PasswordRequiredError) {
        setStatus('needs_password')
      } else if (e instanceof IncorrectPasswordError) {
        setPasswordError('Incorrect password. Please try again.')
        setStatus('needs_password')
      } else {
        setError('Something went wrong. Please try again.')
        setStatus('error')
      }
    }
  }

  function handleFiles(incoming: File[]) {
    const file = incoming[0]
    if (!file || file.type !== 'application/pdf') {
      setError('Please select a valid PDF file.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('File is too large (max 100MB).')
      return
    }
    setError(null)
    setCurrentFile(file)
    setPassword('')
    void attemptUnlock(file)
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!currentFile) return
    void attemptUnlock(currentFile, password)
  }

  function handleReset() {
    setStatus('idle')
    setCurrentFile(null)
    setPassword('')
    setPasswordError(null)
    setResult(null)
    setError(null)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <PageMeta
        title="PDFNip | Unlock PDF"
        description="Remove password protection and restrictions from a PDF for free, right in your browser. No uploads, no account needed."
        path="/unlock-pdf"
      />
      <h1 className="text-2xl font-semibold text-white mb-2">Unlock PDF</h1>
      <p className="text-gray-400 mb-8">
        Remove password protection and owner restrictions — all processing happens in your browser.
      </p>

      {(status === 'idle' || status === 'error') && (
        <>
          <DropZone
            accept="application/pdf"
            multiple={false}
            onFiles={handleFiles}
            label="Drop your PDF here or click to browse"
          />
          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
          <p className="text-gray-600 text-xs mt-3">
            Your files never leave your browser · Ads keep this tool free.
          </p>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="bg-surface rounded-xl p-4">
              <p className="text-2xl mb-2">📄</p>
              <p className="text-white text-xs font-medium mb-1">Drop your PDF</p>
              <p className="text-gray-500 text-xs">Up to 100 MB</p>
            </div>
            <div className="bg-surface rounded-xl p-4">
              <p className="text-2xl mb-2">🔓</p>
              <p className="text-white text-xs font-medium mb-1">Instant unlock</p>
              <p className="text-gray-500 text-xs">Enter password if prompted</p>
            </div>
            <div className="bg-surface rounded-xl p-4">
              <p className="text-2xl mb-2">⬇️</p>
              <p className="text-white text-xs font-medium mb-1">Download</p>
              <p className="text-gray-500 text-xs">Restrictions-free PDF ready</p>
            </div>
          </div>
        </>
      )}

      {status === 'unlocking' && (
        <p className="text-gray-400 text-sm text-center">Unlocking…</p>
      )}

      {status === 'needs_password' && (
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <p className="text-gray-300 text-sm">
            This PDF is password-protected. Enter the password to unlock it.
          </p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="w-full bg-surface text-white text-sm rounded-xl px-4 py-3 border border-white/10 focus:outline-none focus:border-primary"
            autoFocus
          />
          {passwordError && <p className="text-red-400 text-sm">{passwordError}</p>}
          <button
            type="submit"
            className="w-full py-3 rounded-full bg-primary text-bg font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Unlock
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="w-full py-2 text-gray-400 text-sm hover:text-white transition-colors"
          >
            Use a different file
          </button>
        </form>
      )}

      {status === 'done' && result && downloadUrl && currentFile && (
        <div className="space-y-6">
          <div className="bg-surface rounded-xl p-6 text-center">
            <p className="text-white font-semibold">{formatBytes(result.byteLength)}</p>
            <p className="text-gray-500 text-xs mt-1">Unlocked PDF</p>
          </div>
          <a
            href={downloadUrl}
            download={getDownloadName(currentFile)}
            className="block w-full py-3 rounded-full bg-primary text-bg font-semibold text-sm text-center hover:opacity-90 transition-opacity"
          >
            Download
          </a>
          <button
            onClick={handleReset}
            className="w-full py-2 text-gray-400 text-sm hover:text-white transition-colors"
          >
            Unlock another PDF
          </button>
        </div>
      )}
    </div>
  )
}
```

### Step 4 — Run the tests to verify they pass

```
npx vitest run src/pages/UnlockPdf.test.tsx
```

Expected: 14 tests passing, 0 failing.

### Step 5 — Typecheck

```
npm run typecheck
```

Expected: no errors.

### Step 6 — Commit

```
git add src/pages/UnlockPdf.tsx src/pages/UnlockPdf.test.tsx
git commit -m "feat: add UnlockPdf page with idle/unlocking/needs_password/done/error states"
```

---

## Task 3: Wiring — route, home card, navbar, sitemap

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/pages/Home.tsx`
- Modify: `src/components/Navbar.tsx`
- Modify: `public/sitemap.xml`

### Step 1 — Add route to `src/App.tsx`

Find the existing imports block (last import is `ImagesToPdf`). Add after it:

```ts
import UnlockPdf from './pages/UnlockPdf'
```

Find the children array. After `{ path: 'images-to-pdf', element: <ImagesToPdf /> }`, add:

```ts
{ path: 'unlock-pdf', element: <UnlockPdf /> },
```

Full updated `src/App.tsx`:

```tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Compress from './pages/Compress'
import Merge from './pages/Merge'
import Split from './pages/Split'
import Extract from './pages/Extract'
import Rotate from './pages/Rotate'
import PdfToImages from './pages/PdfToImages'
import ImagesToPdf from './pages/ImagesToPdf'
import UnlockPdf from './pages/UnlockPdf'
import PrivacyPolicy from './pages/PrivacyPolicy'
import Terms from './pages/Terms'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'compress', element: <Compress /> },
      { path: 'merge', element: <Merge /> },
      { path: 'split', element: <Split /> },
      { path: 'extract', element: <Extract /> },
      { path: 'rotate', element: <Rotate /> },
      { path: 'pdf-to-images', element: <PdfToImages /> },
      { path: 'images-to-pdf', element: <ImagesToPdf /> },
      { path: 'unlock-pdf', element: <UnlockPdf /> },
      { path: 'privacy', element: <PrivacyPolicy /> },
      { path: 'terms', element: <Terms /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
```

### Step 2 — Add Unlock card to `src/pages/Home.tsx`

Add `LockOpen` to the lucide-react import (existing import line):

```ts
import { FileDown, GitMerge, Scissors, FileOutput, RotateCw, ImageDown, FileImage, LockOpen } from 'lucide-react'
```

Add to the `TOOLS` array after the `Images to PDF` entry:

```ts
{
  title: 'Unlock PDF',
  description: 'Remove password protection and owner restrictions',
  detail: 'No password? Auto-detected · No uploads',
  icon: <LockOpen size={32} />,
  href: '/unlock-pdf',
},
```

### Step 3 — Add nav link to `src/components/Navbar.tsx`

Add to the `NAV_LINKS` array after `Images to PDF`:

```ts
{ to: '/unlock-pdf', label: 'Unlock' },
```

Full updated `NAV_LINKS`:

```ts
const NAV_LINKS = [
  { to: '/compress', label: 'Compress' },
  { to: '/merge', label: 'Merge' },
  { to: '/split', label: 'Split' },
  { to: '/extract', label: 'Extract' },
  { to: '/rotate', label: 'Rotate' },
  { to: '/pdf-to-images', label: 'PDF to Images' },
  { to: '/images-to-pdf', label: 'Images to PDF' },
  { to: '/unlock-pdf', label: 'Unlock' },
]
```

### Step 4 — Add sitemap entry to `public/sitemap.xml`

Find the last `<url>` entry (currently `images-to-pdf`). Add immediately after it:

```xml
<url>
  <loc>https://pdfnip.com/unlock-pdf</loc>
  <lastmod>2026-05-14</lastmod>
  <changefreq>monthly</changefreq>
  <priority>0.9</priority>
</url>
```

### Step 5 — Run all tests

```
npx vitest run
```

Expected: all tests passing (previous count + 21 new tests).

### Step 6 — Typecheck and build

```
npm run typecheck && npm run build
```

Expected: no errors, build succeeds.

### Step 7 — Commit

```
git add src/App.tsx src/pages/Home.tsx src/components/Navbar.tsx public/sitemap.xml
git commit -m "feat: wire unlock-pdf route, home card, and navbar link"
```
