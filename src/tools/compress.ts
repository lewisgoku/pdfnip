import * as pdfjsLib from 'pdfjs-dist'
import { PDFDocument } from 'pdf-lib'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export type Quality = 'low' | 'medium' | 'high'

const QUALITY_SETTINGS: Record<Quality, { jpegQuality: number; scale: number }> = {
  low: { jpegQuality: 0.5, scale: 1.0 },
  medium: { jpegQuality: 0.75, scale: 1.5 },
  high: { jpegQuality: 0.92, scale: 2.0 },
}

export async function compressPDF(
  file: File,
  quality: Quality,
  onProgress?: (page: number, total: number) => void,
): Promise<ArrayBuffer> {
  if (file.size > 100 * 1024 * 1024) {
    throw new Error('File exceeds 100MB limit')
  }

  const { jpegQuality, scale } = QUALITY_SETTINGS[quality]
  const arrayBuffer = await file.arrayBuffer()
  const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const numPages = pdfDoc.numPages
  const outputDoc = await PDFDocument.create()

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i)
    const viewport = page.getViewport({ scale })

    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    const ctx = canvas.getContext('2d')!

    await page.render({ canvasContext: ctx, viewport }).promise

    const dataUrl = canvas.toDataURL('image/jpeg', jpegQuality)
    const base64 = dataUrl.split(',')[1]
    const binaryStr = atob(base64)
    const jpegBytes = new Uint8Array(binaryStr.length)
    for (let j = 0; j < binaryStr.length; j++) {
      jpegBytes[j] = binaryStr.charCodeAt(j)
    }

    const jpegImage = await outputDoc.embedJpg(jpegBytes)
    const { width, height } = jpegImage.scale(1)
    const outputPage = outputDoc.addPage([width, height])
    outputPage.drawImage(jpegImage, { x: 0, y: 0, width, height })

    onProgress?.(i, numPages)
  }

  const bytes = await outputDoc.save()
  return bytes.buffer as ArrayBuffer
}
