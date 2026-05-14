# Unlock PDF Design

## Goal

Add an "Unlock PDF" tool that removes password protection and owner restrictions from a PDF — fully in-browser via pdf-lib (already installed). No uploads, no new dependencies.

## User Flow

1. User drops a PDF (up to 100 MB)
2. Tool immediately attempts to unlock (no extra button click)
3. If the PDF has no user password: unlocked PDF is ready to download
4. If the PDF has a user password: password input appears
5. User enters password → clicks "Unlock" → downloads unlocked PDF
6. If password is wrong: inline error, stays on password input

## Architecture

### `src/tools/unlockPdf.ts`

Pure function, no React imports. Signature:

```ts
export class PasswordRequiredError extends Error {}
export class IncorrectPasswordError extends Error {}

export async function unlockPdf(
  file: File,
  password?: string,
): Promise<Uint8Array>
```

**Logic:**
- File > 100 MB → throw `new Error('File is too large (max 100MB).')`
- Read file as `ArrayBuffer`
- Call `PDFDocument.load(arrayBuffer, password ? { password } : undefined)`
- If `EncryptedPDFError` thrown and no password provided → throw `PasswordRequiredError`
- If `EncryptedPDFError` thrown and password was provided → throw `IncorrectPasswordError`
- On success: return `pdfDoc.save()` as `Uint8Array` — strips all encryption and owner restrictions

**Dependencies:** `pdf-lib` (already installed, exports `EncryptedPDFError`)

### `src/pages/UnlockPdf.tsx`

State machine: `idle | unlocking | needs_password | done | error`

- **idle:** DropZone (single PDF, max 100MB) + privacy note + how-it-works cards. On file drop → immediately call `unlockPdf` (no extra button needed)
- **unlocking:** loading text ("Unlocking…") — shown on first attempt and after each password submission
- **needs_password:** password input + "Unlock" button + "Use a different file" button (resets to idle). Inline error shown if previous password attempt was wrong.
- **done:** file size + Download button + "Unlock another PDF" reset
- **error:** error message + DropZone shown again (for oversized, non-PDF, or unexpected failures)

Download filename: `<originalname>-unlocked.pdf`

PageMeta: `title="PDFNip | Unlock PDF"`, `path="/unlock-pdf"`

### Wiring

- Route `/unlock-pdf` added to `src/App.tsx`
- Card added to `src/pages/Home.tsx` TOOLS array with `LockOpen` icon from lucide-react
- Navbar: add `"Unlock"` link to `NAV_LINKS` in `src/components/Navbar.tsx`

## Error Handling

| Condition | Behaviour |
|-----------|-----------|
| Non-PDF file dropped | `"Please select a valid PDF file."` — stays idle |
| File > 100 MB | `"File is too large (max 100MB)."` — stays idle |
| PDF has user password | Show password input (needs_password state) |
| Wrong password entered | `"Incorrect password. Please try again."` — stays needs_password |
| Unexpected failure | `"Something went wrong. Please try again."` — shows error state (error message + DropZone) |

## Testing

### `src/tools/unlockPdf.test.ts`
- Returns `Uint8Array` for an unprotected PDF (no encryption error)
- Throws `PasswordRequiredError` when PDF is encrypted and no password given
- Throws `IncorrectPasswordError` when PDF is encrypted and wrong password given
- Returns `Uint8Array` when correct password provided
- Throws file-too-large error for files over 100 MB
- Passes `{ password }` to `PDFDocument.load` when password is supplied
- Passes no options to `PDFDocument.load` when no password

### `src/pages/UnlockPdf.test.tsx`
- Idle state renders DropZone and privacy note
- Non-PDF file shows error, stays idle
- File over 100 MB shows error, stays idle
- Valid PDF drop immediately triggers unlock attempt (no button click)
- Loading state shown while unlocking
- Done state: Download link visible, filename is `report-unlocked.pdf`
- "Unlock another PDF" resets to idle
- `PasswordRequiredError` → password input appears (needs_password state)
- Wrong password shows `"Incorrect password. Please try again."` inline
- Correct password after wrong attempt → done state
- General failure shows `"Something went wrong. Please try again."` in error state (error message + DropZone visible)

## Constraints

- All processing in-browser — no server calls
- Single PDF input, max 100 MB
- No new dependencies — uses pdf-lib already installed
- Must work on Chrome, Firefox, Safari (latest 2 versions)
- Mobile responsive (375px min-width)
