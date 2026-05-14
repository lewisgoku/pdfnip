import { PDFDocument } from 'pdf-lib'

export type PageSize = 'a4' | 'letter' | 'image'

const PAGE_DIMENSIONS: Record<'a4' | 'letter', { width: number; height: number }> = {
  a4:     { width: 595, height: 842 },
  letter: { width: 612, height: 792 },
}

function isJpeg(file: File): boolean {
  return file.type === 'image/jpeg'
}

function isPng(file: File): boolean {
  return file.type === 'image/png'
}

export async function imagesToPdf(
  files: File[],
  pageSize: PageSize,
): Promise<Uint8Array> {
  if (files.length < 1 || files.length > 20) {
    throw new Error('Maximum 20 images allowed.')
  }

  const totalSize = files.reduce((sum, f) => sum + f.size, 0)
  if (totalSize > 50 * 1024 * 1024) {
    throw new Error('Total size exceeds 50 MB limit.')
  }

  for (const f of files) {
    if (!isJpeg(f) && !isPng(f)) {
      throw new Error('Only JPG and PNG images are supported.')
    }
  }

  const pdfDoc = await PDFDocument.create()

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer()
    const image = isJpeg(file)
      ? await pdfDoc.embedJpg(arrayBuffer)
      : await pdfDoc.embedPng(arrayBuffer)

    let pageWidth: number
    let pageHeight: number

    if (pageSize === 'image') {
      pageWidth = image.width
      pageHeight = image.height
    } else {
      const dims = PAGE_DIMENSIONS[pageSize]
      pageWidth = dims.width
      pageHeight = dims.height
    }

    const page = pdfDoc.addPage([pageWidth, pageHeight])

    if (pageSize === 'image') {
      page.drawImage(image, { x: 0, y: 0, width: pageWidth, height: pageHeight })
    } else {
      const scale = Math.min(pageWidth / image.width, pageHeight / image.height)
      const drawWidth = image.width * scale
      const drawHeight = image.height * scale
      const x = (pageWidth - drawWidth) / 2
      const y = (pageHeight - drawHeight) / 2
      page.drawImage(image, { x, y, width: drawWidth, height: drawHeight })
    }
  }

  return pdfDoc.save()
}
