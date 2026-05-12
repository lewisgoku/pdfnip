import JSZip from 'jszip'
import { PDFDocument } from 'pdf-lib'

export type SplitMode = 'range' | 'every-n' | 'all'

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

export async function getPageCount(file: File): Promise<number> {
  const arrayBuffer = await file.arrayBuffer()
  const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
  return doc.getPageCount()
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
