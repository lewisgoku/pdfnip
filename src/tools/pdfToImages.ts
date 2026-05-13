import * as pdfjsLib from 'pdfjs-dist'
import JSZip from 'jszip'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export type ImageFormat = 'jpg' | 'png'
export type ImageQuality = 'low' | 'medium' | 'high'

const QUALITY_SETTINGS: Record<ImageQuality, { scale: number; jpegQuality: number }> = {
  low:    { scale: 1.0, jpegQuality: 0.60 },
  medium: { scale: 1.5, jpegQuality: 0.82 },
  high:   { scale: 2.0, jpegQuality: 0.95 },
}

export async function pdfToImages(
  file: File,
  format: ImageFormat,
  quality: ImageQuality,
): Promise<Uint8Array> {
  if (file.size > 100 * 1024 * 1024) {
    throw new Error('File exceeds 100MB limit')
  }
  const { scale, jpegQuality } = QUALITY_SETTINGS[quality]
  const arrayBuffer = await file.arrayBuffer()
  const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const numPages = pdfDoc.numPages
  const zip = new JSZip()

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    await page.render({ canvas, viewport }).promise

    const dataUrl =
      format === 'jpg'
        ? canvas.toDataURL('image/jpeg', jpegQuality)
        : canvas.toDataURL('image/png')

    const base64 = dataUrl.split(',')[1]
    const binaryStr = atob(base64)
    const bytes = new Uint8Array(binaryStr.length)
    for (let j = 0; j < binaryStr.length; j++) {
      bytes[j] = binaryStr.charCodeAt(j)
    }

    zip.file(`page-${i}.${format}`, bytes)
  }

  return zip.generateAsync({ type: 'uint8array' })
}
