import { PDFDocument } from 'pdf-lib'

export async function mergePDFs(
  files: File[],
  onProgress?: (current: number, total: number) => void,
): Promise<ArrayBuffer> {
  if (files.length < 2) {
    throw new Error('At least 2 files required')
  }
  for (const file of files) {
    if (file.size > 100 * 1024 * 1024) {
      throw new Error('File exceeds 100MB limit')
    }
  }

  const outputDoc = await PDFDocument.create()

  for (let i = 0; i < files.length; i++) {
    const arrayBuffer = await files[i].arrayBuffer()
    let srcDoc
    try {
      srcDoc = await PDFDocument.load(arrayBuffer)
    } catch (e) {
      const msg = e instanceof Error ? e.message.toLowerCase() : ''
      if (msg.includes('encrypt') || msg.includes('password')) {
        throw new Error('One or more PDFs are password-protected and cannot be merged.', { cause: e })
      }
      throw e
    }
    const pages = await outputDoc.copyPages(srcDoc, srcDoc.getPageIndices())
    for (const page of pages) {
      outputDoc.addPage(page)
    }
    onProgress?.(i + 1, files.length)
  }

  const bytes = await outputDoc.save()
  return bytes.buffer as ArrayBuffer
}

export async function getPageCount(file: File): Promise<number> {
  const arrayBuffer = await file.arrayBuffer()
  const doc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
  return doc.getPageCount()
}
