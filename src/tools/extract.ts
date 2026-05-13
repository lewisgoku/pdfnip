import { PDFDocument } from 'pdf-lib'

export function parsePageRanges(input: string, totalPages: number): number[][] {
  const trimmed = input.trim()
  if (!trimmed) throw new Error('Empty input')
  return trimmed.split(',').map((token) => {
    const part = token.trim()
    if (part.includes('-')) {
      const segments = part.split('-')
      if (segments.length !== 2) throw new Error(`Invalid range: ${part}`)
      const [startStr, endStr] = segments
      const start = parseInt(startStr, 10)
      const end = parseInt(endStr, 10)
      if (Number.isNaN(start) || Number.isNaN(end)) throw new Error(`Invalid range: ${part}`)
      if (start > end) throw new Error(`Invalid range: ${part}`)
      if (start < 1 || end > totalPages) {
        const bad = start < 1 ? start : end
        throw new Error(`Page ${bad} out of range`)
      }
      return Array.from({ length: end - start + 1 }, (_, i) => start + i)
    } else {
      const page = parseInt(part, 10)
      if (Number.isNaN(page)) throw new Error(`Invalid page: ${part}`)
      if (page < 1 || page > totalPages) throw new Error(`Page ${page} out of range`)
      return [page]
    }
  })
}

export async function getPageCount(file: File): Promise<number> {
  const arrayBuffer = await file.arrayBuffer()
  const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
  return doc.getPageCount()
}

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
