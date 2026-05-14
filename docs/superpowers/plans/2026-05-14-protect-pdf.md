# Protect PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Protect PDF" page at `/protect-pdf` that lets users password-protect a PDF and optionally restrict printing, copying, and editing — all in-browser via pdf-lib.

**Architecture:** A pure tool function (`protectPdf.ts`) loads the PDF, saves it with pdf-lib's built-in encryption options, and returns a `Uint8Array`. The page (`ProtectPdf.tsx`) is a four-state machine (`idle → ready → protecting → done`) mirroring the existing UnlockPdf page pattern. Wiring adds the route, home card, nav link, and sitemap entry.

**Tech Stack:** React 18, TypeScript strict, Tailwind CSS v3, pdf-lib (encryption), Vitest + Testing Library.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/tools/protectPdf.ts` | Pure encrypt function + exported types |
| Create | `src/tools/protectPdf.test.ts` | Tool unit tests |
| Create | `src/pages/ProtectPdf.tsx` | Page UI — four-state machine |
| Create | `src/pages/ProtectPdf.test.tsx` | Page UI tests |
| Modify | `src/App.tsx` | Add `/protect-pdf` route |
| Modify | `src/pages/Home.tsx` | Add Protect PDF tool card |
| Modify | `src/components/Navbar.tsx` | Add Protect nav link |
| Modify | `public/sitemap.xml` | Add `/protect-pdf` entry |
| Modify | `progress.md` | Mark Step 11 tasks complete |

---

## Task 1: Tool function — `src/tools/protectPdf.ts`

**Files:**
- Create: `src/tools/protectPdf.ts`
- Create: `src/tools/protectPdf.test.ts`

### Step 1 — Write the failing tests

Create `src/tools/protectPdf.test.ts`:

```ts
import { vi, it, expect, beforeEach } from 'vitest'

const mockSave = vi.fn()

vi.mock('pdf-lib', () => ({
  PDFDocument: {
    load: vi.fn(),
  },
}))

import { PDFDocument } from 'pdf-lib'
import { protectPdf, MAX_BYTES } from './protectPdf'

const mockLoad = vi.mocked(PDFDocument.load)

beforeEach(() => {
  mockSave.mockReset()
  mockSave.mockResolvedValue(new Uint8Array(512))
  mockLoad.mockReset()
  mockLoad.mockResolvedValue({ save: mockSave } as never)
})

function makeFile(size = 1024) {
  return new File([new ArrayBuffer(size)], 'test.pdf', { type: 'application/pdf' })
}

it('returns Uint8Array on valid input', async () => {
  const result = await protectPdf(makeFile(), 'secret', {
    printing: true,
    copying: true,
    editing: true,
  })
  expect(result).toBeInstanceOf(Uint8Array)
})

it('throws on file over 100MB', async () => {
  const file = new File([new ArrayBuffer(MAX_BYTES + 1)], 'big.pdf', { type: 'application/pdf' })
  await expect(
    protectPdf(file, 'secret', { printing: true, copying: true, editing: true }),
  ).rejects.toThrow('File is too large')
})

it('passes userPassword and ownerPassword to save', async () => {
  await protectPdf(makeFile(), 'mypass', { printing: true, copying: true, editing: true })
  expect(mockSave).toHaveBeenCalledWith(
    expect.objectContaining({ userPassword: 'mypass', ownerPassword: 'mypass' }),
  )
})

it('maps printing:true to highResolution', async () => {
  await protectPdf(makeFile(), 'p', { printing: true, copying: true, editing: true })
  const call = mockSave.mock.calls[0][0] as { permissions: Record<string, unknown> }
  expect(call.permissions.printing).toBe('highResolution')
})

it('maps printing:false to undefined', async () => {
  await protectPdf(makeFile(), 'p', { printing: false, copying: true, editing: true })
  const call = mockSave.mock.calls[0][0] as { permissions: Record<string, unknown> }
  expect(call.permissions.printing).toBeUndefined()
})

it('maps editing:false to modifying:false', async () => {
  await protectPdf(makeFile(), 'p', { printing: true, copying: true, editing: false })
  expect(mockSave).toHaveBeenCalledWith(
    expect.objectContaining({ permissions: expect.objectContaining({ modifying: false }) }),
  )
})

it('maps copying:false correctly', async () => {
  await protectPdf(makeFile(), 'p', { printing: true, copying: false, editing: true })
  expect(mockSave).toHaveBeenCalledWith(
    expect.objectContaining({ permissions: expect.objectContaining({ copying: false }) }),
  )
})
```

### Step 2 — Run tests to verify they fail

```
npx vitest run src/tools/protectPdf.test.ts
```

Expected: all 7 tests fail with `Cannot find module './protectPdf'`.

### Step 3 — Implement `src/tools/protectPdf.ts`

```ts
import { PDFDocument } from 'pdf-lib'

export type ProtectPermissions = {
  printing: boolean
  copying: boolean
  editing: boolean
}

export const MAX_BYTES = 100 * 1024 * 1024

export async function protectPdf(
  file: File,
  password: string,
  permissions: ProtectPermissions,
): Promise<Uint8Array> {
  if (file.size > MAX_BYTES) throw new Error('File is too large (max 100MB).')
  const arrayBuffer = await file.arrayBuffer()
  const pdfDoc = await PDFDocument.load(arrayBuffer)
  return pdfDoc.save({
    userPassword: password,
    ownerPassword: password,
    permissions: {
      printing: permissions.printing ? 'highResolution' : undefined,
      modifying: permissions.editing,
      copying: permissions.copying,
      annotating: true,
      fillingForms: true,
      contentAccessibility: true,
      documentAssembly: true,
    },
  })
}
```

### Step 4 — Run tests to verify they pass

```
npx vitest run src/tools/protectPdf.test.ts
```

Expected: 7 tests passing, 0 failing.

### Step 5 — Typecheck

```
npm run typecheck
```

Expected: no errors. If `pdfDoc.save()` options cause a type error, cast the options object: `pdfDoc.save({ ... } as Parameters<typeof pdfDoc.save>[0])`.

### Step 6 — Commit

```
git add src/tools/protectPdf.ts src/tools/protectPdf.test.ts
git commit -m "feat: add protectPdf tool with password and permission options"
```

---

## Task 2: Page UI — `src/pages/ProtectPdf.tsx`

**Files:**
- Create: `src/pages/ProtectPdf.tsx`
- Create: `src/pages/ProtectPdf.test.tsx`

### Step 1 — Write the failing tests

Create `src/pages/ProtectPdf.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, beforeEach } from 'vitest'

vi.mock('../tools/protectPdf', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../tools/protectPdf')>()
  return { ...actual, protectPdf: vi.fn() }
})

import { protectPdf } from '../tools/protectPdf'
import ProtectPdf from './ProtectPdf'

const mockProtectPdf = vi.mocked(protectPdf)

beforeEach(() => {
  mockProtectPdf.mockReset()
  mockProtectPdf.mockResolvedValue(new Uint8Array(2048))
})

function makePDF(name = 'doc.pdf', size = 1024) {
  return new File([new ArrayBuffer(size)], name, { type: 'application/pdf' })
}

function dropFile(file: File) {
  fireEvent.drop(screen.getByTestId('dropzone'), { dataTransfer: { files: [file] } })
}

function fillPasswords(password: string, confirm: string) {
  fireEvent.change(screen.getByPlaceholderText('Enter password'), {
    target: { value: password },
  })
  fireEvent.change(screen.getByPlaceholderText('Confirm password'), {
    target: { value: confirm },
  })
}

// ── Idle & validation ────────────────────────────────────────────────────────

it('idle: shows DropZone', () => {
  render(<ProtectPdf />)
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
})

it('non-PDF shows error, stays idle', () => {
  render(<ProtectPdf />)
  dropFile(new File(['txt'], 'doc.txt', { type: 'text/plain' }))
  expect(screen.getByText('Please select a valid PDF file.')).toBeInTheDocument()
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
})

it('file over 100MB shows error, stays idle', () => {
  render(<ProtectPdf />)
  dropFile(new File([new ArrayBuffer(101 * 1024 * 1024)], 'big.pdf', { type: 'application/pdf' }))
  expect(screen.getByText('File is too large (max 100MB).')).toBeInTheDocument()
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
})

// ── Ready state ──────────────────────────────────────────────────────────────

it('valid PDF shows ready state with password inputs and protect button', () => {
  render(<ProtectPdf />)
  dropFile(makePDF('report.pdf'))
  expect(screen.getByText('report.pdf')).toBeInTheDocument()
  expect(screen.getByPlaceholderText('Enter password')).toBeInTheDocument()
  expect(screen.getByPlaceholderText('Confirm password')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /protect pdf/i })).toBeInTheDocument()
})

it('all 3 permissions are checked by default', () => {
  render(<ProtectPdf />)
  dropFile(makePDF())
  const checkboxes = screen.getAllByRole('checkbox')
  expect(checkboxes).toHaveLength(3)
  checkboxes.forEach((cb) => expect(cb).toBeChecked())
})

it('Protect PDF button is disabled when password is empty', () => {
  render(<ProtectPdf />)
  dropFile(makePDF())
  expect(screen.getByRole('button', { name: /protect pdf/i })).toBeDisabled()
})

it('Protect PDF button is disabled when passwords do not match', () => {
  render(<ProtectPdf />)
  dropFile(makePDF())
  fillPasswords('abc', 'xyz')
  expect(screen.getByRole('button', { name: /protect pdf/i })).toBeDisabled()
  expect(screen.getByText('Passwords do not match.')).toBeInTheDocument()
})

it('Protect PDF button is enabled when passwords match and non-empty', () => {
  render(<ProtectPdf />)
  dropFile(makePDF())
  fillPasswords('secret', 'secret')
  expect(screen.getByRole('button', { name: /protect pdf/i })).toBeEnabled()
})

// ── Converting & done ────────────────────────────────────────────────────────

it('shows loading state while protecting', async () => {
  mockProtectPdf.mockImplementation(() => new Promise(() => {}))
  render(<ProtectPdf />)
  dropFile(makePDF())
  fillPasswords('secret', 'secret')
  fireEvent.click(screen.getByRole('button', { name: /protect pdf/i }))
  await waitFor(() => expect(screen.getByText(/protecting/i)).toBeInTheDocument())
})

it('done state shows download link with correct filename', async () => {
  render(<ProtectPdf />)
  dropFile(makePDF('report.pdf'))
  fillPasswords('secret', 'secret')
  fireEvent.click(screen.getByRole('button', { name: /protect pdf/i }))
  await waitFor(() => screen.getByRole('link', { name: 'Download' }))
  expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute(
    'download',
    'report-protected.pdf',
  )
})

it('"Protect another PDF" resets to idle', async () => {
  render(<ProtectPdf />)
  dropFile(makePDF())
  fillPasswords('secret', 'secret')
  fireEvent.click(screen.getByRole('button', { name: /protect pdf/i }))
  await waitFor(() => screen.getByRole('link', { name: 'Download' }))
  fireEvent.click(screen.getByRole('button', { name: /protect another/i }))
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
})

// ── Error & permissions ──────────────────────────────────────────────────────

it('conversion failure shows error and Protect button stays visible', async () => {
  mockProtectPdf.mockRejectedValue(new Error('boom'))
  render(<ProtectPdf />)
  dropFile(makePDF())
  fillPasswords('secret', 'secret')
  fireEvent.click(screen.getByRole('button', { name: /protect pdf/i }))
  await waitFor(() =>
    expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument(),
  )
  expect(screen.getByRole('button', { name: /protect pdf/i })).toBeInTheDocument()
})

it('unchecking a permission passes correct flags to protectPdf', async () => {
  render(<ProtectPdf />)
  dropFile(makePDF())
  fillPasswords('secret', 'secret')
  // Uncheck "Allow printing" — first checkbox
  fireEvent.click(screen.getAllByRole('checkbox')[0])
  fireEvent.click(screen.getByRole('button', { name: /protect pdf/i }))
  await waitFor(() => screen.getByRole('link', { name: 'Download' }))
  expect(mockProtectPdf).toHaveBeenCalledWith(expect.any(File), 'secret', {
    printing: false,
    copying: true,
    editing: true,
  })
})
```

### Step 2 — Run tests to verify they fail

```
npx vitest run src/pages/ProtectPdf.test.tsx
```

Expected: all 13 tests fail with `Cannot find module './ProtectPdf'`.

### Step 3 — Implement `src/pages/ProtectPdf.tsx`

```tsx
import { useState, useEffect, useMemo } from 'react'
import DropZone from '../components/DropZone'
import PageMeta from '../components/PageMeta'
import { protectPdf, MAX_BYTES, type ProtectPermissions } from '../tools/protectPdf'
import { formatBytes } from '../utils/formatBytes'

type Status = 'idle' | 'ready' | 'protecting' | 'done'

function getDownloadName(file: File): string {
  const dotIndex = file.name.lastIndexOf('.')
  const base = dotIndex >= 0 ? file.name.slice(0, dotIndex) : file.name
  return `${base}-protected.pdf`
}

export default function ProtectPdf() {
  const [status, setStatus] = useState<Status>('idle')
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [permissions, setPermissions] = useState<ProtectPermissions>({
    printing: true,
    copying: true,
    editing: true,
  })
  const [result, setResult] = useState<Uint8Array | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dropError, setDropError] = useState<string | null>(null)

  const downloadUrl = useMemo(() => {
    if (!result) return null
    return URL.createObjectURL(new Blob([result as BufferSource], { type: 'application/pdf' }))
  }, [result])

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    }
  }, [downloadUrl])

  function handleFiles(incoming: File[]) {
    const file = incoming[0]
    if (!file || file.type !== 'application/pdf') {
      setDropError('Please select a valid PDF file.')
      return
    }
    if (file.size > MAX_BYTES) {
      setDropError('File is too large (max 100MB).')
      return
    }
    setDropError(null)
    setCurrentFile(file)
    setPassword('')
    setConfirmPassword('')
    setError(null)
    setStatus('ready')
  }

  const passwordError =
    password === ''
      ? 'Please enter a password.'
      : password !== confirmPassword
        ? 'Passwords do not match.'
        : null

  const canSubmit = passwordError === null

  async function handleProtect() {
    if (!currentFile || !canSubmit) return
    setError(null)
    setStatus('protecting')
    try {
      const output = await protectPdf(currentFile, password, permissions)
      setResult(output)
      setStatus('done')
    } catch {
      setError('Something went wrong. Please try again.')
      setStatus('ready')
    }
  }

  function handleReset() {
    setStatus('idle')
    setCurrentFile(null)
    setPassword('')
    setConfirmPassword('')
    setPermissions({ printing: true, copying: true, editing: true })
    setResult(null)
    setError(null)
    setDropError(null)
  }

  function togglePermission(key: keyof ProtectPermissions) {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const PERMISSION_LABELS: { key: keyof ProtectPermissions; label: string }[] = [
    { key: 'printing', label: 'Allow printing' },
    { key: 'copying', label: 'Allow copying text' },
    { key: 'editing', label: 'Allow editing' },
  ]

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <PageMeta
        title="PDFNip | Protect PDF"
        description="Add a password to your PDF for free, right in your browser. No uploads, no account needed."
        path="/protect-pdf"
      />
      <h1 className="text-2xl font-semibold text-white mb-2">Protect PDF</h1>
      <p className="text-gray-400 mb-8">
        Add a password and restrict permissions — all processing happens in your browser.
      </p>

      {status === 'idle' && (
        <>
          <DropZone
            accept="application/pdf"
            multiple={false}
            onFiles={handleFiles}
            label="Drop your PDF here or click to browse"
          />
          {dropError && <p className="text-red-400 text-sm mt-3">{dropError}</p>}
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
              <p className="text-2xl mb-2">🔒</p>
              <p className="text-white text-xs font-medium mb-1">Set a password</p>
              <p className="text-gray-500 text-xs">Choose permissions too</p>
            </div>
            <div className="bg-surface rounded-xl p-4">
              <p className="text-2xl mb-2">⬇️</p>
              <p className="text-white text-xs font-medium mb-1">Download</p>
              <p className="text-gray-500 text-xs">Password-protected PDF ready</p>
            </div>
          </div>
        </>
      )}

      {status === 'ready' && currentFile && (
        <div className="space-y-6">
          <div className="bg-surface rounded-xl p-4">
            <p className="text-white text-sm font-medium">{currentFile.name}</p>
            <p className="text-gray-400 text-xs mt-0.5">{formatBytes(currentFile.size)}</p>
          </div>
          <div className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full bg-surface text-white text-sm rounded-xl px-4 py-3 border border-white/10 focus:outline-none focus:border-primary"
              autoFocus
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              className="w-full bg-surface text-white text-sm rounded-xl px-4 py-3 border border-white/10 focus:outline-none focus:border-primary"
            />
            {(password !== '' || confirmPassword !== '') && passwordError && (
              <p className="text-red-400 text-sm">{passwordError}</p>
            )}
          </div>
          <div>
            <p className="text-gray-400 text-sm mb-3">Restrict actions (optional)</p>
            <div className="space-y-2">
              {PERMISSION_LABELS.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permissions[key]}
                    onChange={() => togglePermission(key)}
                    className="accent-primary w-4 h-4"
                  />
                  <span className="text-gray-300 text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            onClick={handleProtect}
            disabled={!canSubmit}
            className="w-full py-3 rounded-full bg-primary text-bg font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Protect PDF
          </button>
        </div>
      )}

      {status === 'protecting' && (
        <p className="text-gray-400 text-sm text-center">Protecting…</p>
      )}

      {status === 'done' && result && downloadUrl && currentFile && (
        <div className="space-y-6">
          <div className="bg-surface rounded-xl p-6 text-center">
            <p className="text-white font-semibold">{formatBytes(result.byteLength)}</p>
            <p className="text-gray-500 text-xs mt-1">Password-protected PDF</p>
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
            Protect another PDF
          </button>
        </div>
      )}
    </div>
  )
}
```

### Step 4 — Run tests to verify they pass

```
npx vitest run src/pages/ProtectPdf.test.tsx
```

Expected: 13 tests passing, 0 failing. If any fail, fix the implementation (not the tests).

### Step 5 — Typecheck

```
npm run typecheck
```

Expected: no errors.

### Step 6 — Commit

```
git add src/pages/ProtectPdf.tsx src/pages/ProtectPdf.test.tsx
git commit -m "feat: add Protect PDF page UI"
```

---

## Task 3: Wiring

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/pages/Home.tsx`
- Modify: `src/components/Navbar.tsx`
- Modify: `public/sitemap.xml`
- Modify: `progress.md`

### Step 1 — Read all files before editing

Read `src/App.tsx`, `src/pages/Home.tsx`, `src/components/Navbar.tsx`, `public/sitemap.xml` before making any edits.

### Step 2 — Update `src/App.tsx`

Add `ProtectPdf` import and route. Insert after the `UnlockPdf` import and route:

```tsx
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Compress from './pages/Compress'
import Merge from './pages/Merge'
import Split from './pages/Split'
import Extract from './pages/Extract'
import Rotate from './pages/Rotate'
import Convert from './pages/Convert'
import UnlockPdf from './pages/UnlockPdf'
import ProtectPdf from './pages/ProtectPdf'
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
      { path: 'convert', element: <Convert /> },
      { path: 'pdf-to-images', element: <Navigate to="/convert" replace /> },
      { path: 'images-to-pdf', element: <Navigate to="/convert" replace /> },
      { path: 'unlock-pdf', element: <UnlockPdf /> },
      { path: 'protect-pdf', element: <ProtectPdf /> },
      { path: 'privacy', element: <PrivacyPolicy /> },
      { path: 'terms', element: <Terms /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
```

### Step 3 — Update `src/pages/Home.tsx`

Add `Lock` to the lucide-react import (keep all existing icons), then add a Protect PDF entry to the second grid row (the `TOOLS.slice(4)` section currently has 3 items: Rotate, Convert, Unlock PDF — add Protect PDF as the 4th, making it a row of 4 on desktop).

Update the import line:

```ts
import { FileDown, GitMerge, Scissors, FileOutput, RotateCw, ArrowLeftRight, LockOpen, Lock } from 'lucide-react'
```

Add Protect PDF entry to the TOOLS array after Unlock PDF:

```ts
  {
    title: 'Protect PDF',
    description: 'Add a password to your PDF',
    detail: 'Set permissions · All in-browser',
    icon: <Lock size={32} />,
    href: '/protect-pdf',
  },
```

The full TOOLS array becomes 8 items. The two grids (`TOOLS.slice(0, 4)` and `TOOLS.slice(4)`) naturally produce a row of 4 and a row of 4, which is clean.

### Step 4 — Update `src/components/Navbar.tsx`

Add `{ to: '/protect-pdf', label: 'Protect' }` after the Unlock entry:

```ts
const NAV_LINKS = [
  { to: '/compress', label: 'Compress' },
  { to: '/merge', label: 'Merge' },
  { to: '/split', label: 'Split' },
  { to: '/extract', label: 'Extract' },
  { to: '/rotate', label: 'Rotate' },
  { to: '/convert', label: 'Convert' },
  { to: '/unlock-pdf', label: 'Unlock' },
  { to: '/protect-pdf', label: 'Protect' },
]
```

### Step 5 — Update `public/sitemap.xml`

Add `/protect-pdf` entry after `/unlock-pdf`:

```xml
  <url>
    <loc>https://pdfnip.com/protect-pdf</loc>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
```

### Step 6 — Update `progress.md`

Mark all Step 11 tasks as complete — change all `- [ ]` to `- [x]` in the Step 11 section and change `⬜` to `✅` in the heading.

### Step 7 — Run all tests

```
npx vitest run
```

Expected: all tests pass. Count should be around 229 (216 existing + 7 tool tests + 13 page tests — minor variance possible).

### Step 8 — Typecheck and build

```
npm run typecheck && npm run build
```

Expected: no errors, build succeeds.

### Step 9 — Commit

```
git add src/App.tsx src/pages/Home.tsx src/components/Navbar.tsx public/sitemap.xml progress.md
git commit -m "feat: wire /protect-pdf route, home card, navbar link, sitemap"
```
