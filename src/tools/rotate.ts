import { PDFDocument, degrees } from 'pdf-lib'
import { getPageCount } from './pdfUtils'

export { getPageCount }

export type RotationDegrees = 90 | 180 | 270

export async function rotatePDF(file: File, rotation: RotationDegrees): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer()
  const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
  for (const page of doc.getPages()) {
    const current = page.getRotation().angle
    page.setRotation(degrees((current + rotation) % 360))
  }
  return doc.save()
}
