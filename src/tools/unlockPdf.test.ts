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
