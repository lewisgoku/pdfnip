import JSZip from 'jszip'
import { PDFDocument } from 'pdf-lib'
import { parsePageRanges, getPageCount } from './pdfUtils'

export { parsePageRanges, getPageCount }

export type SplitMode = 'range' | 'every-n' | 'all'

export function groupsEveryN(totalPages: number, n: number): number[][] {
  if (n < 1) throw new Error('N must be at least 1')
  if (n >= totalPages) throw new Error('N exceeds page count')
  const groups: number[][] = []
  for (let start = 1; start <= totalPages; start += n) {
    const end = Math.min(start + n - 1, totalPages)
    groups.push(Array.from({ length: end - start + 1 }, (_, i) => start + i))
  }
  return groups
}

export function allPagesGroups(totalPages: number): number[][] {
  return Array.from({ length: totalPages }, (_, i) => [i + 1])
}

export async function splitPDF(
  file: File,
  groups: number[][],
  onProgress?: (current: number, total: number) => void,
): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer()
  const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
  const base = file.name.replace(/\.pdf$/i, '')
  const zip = new JSZip()

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i]
    const outDoc = await PDFDocument.create()
    const pages = await outDoc.copyPages(srcDoc, group.map((p) => p - 1))
    for (const page of pages) {
      outDoc.addPage(page)
    }
    const bytes = await outDoc.save()
    const first = group[0]
    const last = group[group.length - 1]
    const filename =
      first === last ? `${base}-p${first}.pdf` : `${base}-p${first}-${last}.pdf`
    zip.file(filename, bytes)
    onProgress?.(i + 1, groups.length)
  }

  return zip.generateAsync({ type: 'uint8array' })
}
