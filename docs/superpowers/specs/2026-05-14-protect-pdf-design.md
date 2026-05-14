# Protect PDF Design

## Goal

Add a password to a PDF with optional permission restrictions — fully in-browser via pdf-lib. Users set a password and choose which actions (printing, copying, editing) to allow. The old PDF is unchanged; a new protected copy is downloaded.

## User Flow

1. User drops a PDF → file card appears with password fields and permission checkboxes
2. User enters password + confirm password, adjusts permissions
3. User clicks "Protect PDF" → brief processing state
4. Download link appears for `<basename>-protected.pdf`
5. "Protect another PDF" resets to idle

## Architecture

### `src/tools/protectPdf.ts`

Pure function, no React imports.

```ts
export type ProtectPermissions = {
  printing: boolean  // maps to pdf-lib 'highResolution'
  copying: boolean
  editing: boolean   // maps to pdf-lib 'modifying'
}

export const MAX_BYTES = 100 * 1024 * 1024

export async function protectPdf(
  file: File,
  password: string,
  permissions: ProtectPermissions,
): Promise<Uint8Array>
```

- Throws if `file.size > MAX_BYTES`
- Loads the PDF with `PDFDocument.load(arrayBuffer)`
- Saves with `pdfDoc.save({ userPassword: password, ownerPassword: password, permissions: { printing: permissions.printing ? 'highResolution' : undefined, modifying: permissions.editing, copying: permissions.copying } })`
- All other errors bubble up as-is

### `src/pages/ProtectPdf.tsx`

State machine:

```ts
type Status = 'idle' | 'ready' | 'protecting' | 'done' | 'error'
```

`idle` → file dropped → `ready` → "Protect PDF" clicked → `protecting` → success → `done`  
`protecting` → failure → `error` (but status stays `ready` so file and settings are preserved)

Validation is client-side before submit:
- Empty password → inline error, button disabled
- Passwords don't match → inline error, button disabled

Download filename: `file.name.replace(/\.pdf$/i, '-protected.pdf')`

Default permissions: all three checked (`printing: true, copying: true, editing: true`).

**Deleted files:** none  
**Created files:** `src/tools/protectPdf.ts`, `src/tools/protectPdf.test.ts`, `src/pages/ProtectPdf.tsx`, `src/pages/ProtectPdf.test.tsx`

**Wiring:**
| File | Change |
|------|--------|
| `src/App.tsx` | Add `/protect-pdf` route |
| `src/pages/Home.tsx` | Add Protect PDF card (`Lock` icon, href `/protect-pdf`) |
| `src/components/Navbar.tsx` | Add `{ to: '/protect-pdf', label: 'Protect' }` |
| `public/sitemap.xml` | Add `/protect-pdf` entry |

PageMeta: `title="PDFNip | Protect PDF"`, `path="/protect-pdf"`

## Page UI

### Idle

- DropZone (single PDF, `application/pdf`, max 100MB)
- Privacy note: "Your files never leave your browser · Ads keep this tool free."
- 3 how-it-works cards: "Drop your PDF" → "Set a password" → "Download instantly"

### Ready

- File card (name + size)
- Password input (`type="password"`, placeholder "Enter password")
- Confirm password input (`type="password"`, placeholder "Confirm password")
- Inline validation error shown between confirm field and permissions if passwords don't match or password is empty
- **Permissions** section — label "Restrict actions (optional)":
  - ☑ Allow printing (checked by default)
  - ☑ Allow copying text (checked by default)
  - ☑ Allow editing (checked by default)
- "Protect PDF" button (disabled when password empty or passwords don't match)
- Conversion error shown inline above button (from a failed protect attempt)

### Protecting

- "Protecting…" text (centred)

### Done

- Output size card
- Download link (`<basename>-protected.pdf`)
- "Protect another PDF" button → resets to idle

## Error Handling

| Condition | Message | State |
|-----------|---------|-------|
| Non-PDF dropped | "Please select a valid PDF file." | stays idle |
| File > 100MB | "File is too large (max 100MB)." | stays idle |
| Password empty | "Please enter a password." | button disabled, stays ready |
| Passwords don't match | "Passwords do not match." | button disabled, stays ready |
| Conversion failure | "Something went wrong. Please try again." | stays ready |

## Testing

### `src/tools/protectPdf.test.ts`

- Returns `Uint8Array` on valid input with a password
- Throws on file > 100MB
- Passes correct encryption options to pdf-lib (printing, copying, modifying flags)

### `src/pages/ProtectPdf.test.tsx`

**Idle & validation:**
- Idle: DropZone visible
- Non-PDF shows error, stays idle
- File >100MB shows error, stays idle

**Ready state:**
- Valid PDF → ready state (file card + password inputs + checkboxes + Protect button)
- All 3 permissions checked by default
- "Protect PDF" button disabled when password is empty
- "Protect PDF" button disabled when passwords don't match
- "Protect PDF" button enabled when passwords match and non-empty

**Converting & done:**
- Loading state shown while protecting
- Done: download link visible, filename is `report-protected.pdf`
- "Protect another PDF" resets to idle

**Error & permissions:**
- Conversion failure shows error, stays ready (Protect button still visible)
- Unchecking a permission passes correct flags to `protectPdf`

## Constraints

- All processing in-browser — no server calls
- Must work on Chrome, Firefox, Safari (latest 2 versions)
- Mobile responsive (375px min-width)
- pdf-lib encryption uses RC4-128 (the algorithm pdf-lib supports); note this in UI if needed
