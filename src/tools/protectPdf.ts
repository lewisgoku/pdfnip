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
  const saveOptions = {
    userPassword: password,
    ownerPassword: password,
    permissions: {
      ...(permissions.printing && { printing: 'highResolution' as const }),
      modifying: permissions.editing,
      copying: permissions.copying,
      annotating: true,
      fillingForms: true,
      contentAccessibility: true,
      documentAssembly: true,
    },
  }
  // pdf-lib's SaveOptions type omits encryption fields — cast only at the call site
  return pdfDoc.save(saveOptions as unknown as Parameters<typeof pdfDoc.save>[0])
}
