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
      password ? ({ password } as Record<string, unknown>) : undefined,
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
