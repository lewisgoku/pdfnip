import { PDFDocument } from 'pdf-lib'
import { parsePageRanges, getPageCount } from './pdfUtils'

export { parsePageRanges, getPageCount }

export async function extractPages(file: File, pageNumbers: number[]): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer()
  const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
  const outDoc = await PDFDocument.create()
  const pages = await outDoc.copyPages(srcDoc, pageNumbers.map((p) => p - 1))
  for (const page of pages) {
    outDoc.addPage(page)
  }
  return outDoc.save()
}
