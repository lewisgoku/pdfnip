import * as pdfjsLib from 'pdfjs-dist'
import { PDFDocument } from 'pdf-lib'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export type Quality = 'low' | 'medium' | 'high'

const CANVAS_SETTINGS: Record<Quality, { scale: number; jpegQuality: number }> = {
  low: { scale: 0.5, jpegQuality: 0.35 },
  medium: { scale: 0.7, jpegQuality: 0.55 },
  high: { scale: 0.85, jpegQuality: 0.75 },
}

async function losslessPass(arrayBuffer: ArrayBuffer): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(arrayBuffer)
  return pdfDoc.save({ useObjectStreams: true })
}

async function canvasPass(
  arrayBuffer: ArrayBuffer,
  quality: Quality,
  onProgress?: (page: number, total: number) => void,
): Promise<Uint8Array> {
  const { scale, jpegQuality } = CANVAS_SETTINGS[quality]
  // slice(0) gives pdf.js its own copy to transfer to the worker without detaching the original
  const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise
  const numPages = pdfDoc.numPages
  const outputDoc = await PDFDocument.create()

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i)
    const viewport = page.getViewport({ scale })

    const canvas = document.createElement('canvas') as HTMLCanvasElement
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)

    await page.render({ canvas, viewport }).promise

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

  return outputDoc.save()
}

export async function compressPDF(
  file: File,
  quality: Quality,
  onProgress?: (page: number, total: number) => void,
): Promise<ArrayBuffer> {
  if (file.size > 100 * 1024 * 1024) {
    throw new Error('File exceeds 100MB limit')
  }

  const arrayBuffer = await file.arrayBuffer()

  const lossless = await losslessPass(arrayBuffer)
  const canvas = await canvasPass(arrayBuffer, quality, onProgress)

  const best = lossless.byteLength <= canvas.byteLength ? lossless : canvas

  if (best.byteLength >= file.size) {
    return arrayBuffer
  }

  return best.slice().buffer
}
