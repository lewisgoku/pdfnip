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
  } as Parameters<typeof pdfDoc.save>[0])
}
