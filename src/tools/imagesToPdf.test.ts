import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockImage = vi.hoisted(() => ({ width: 800, height: 600 }))

const mockPage = vi.hoisted(() => ({
  drawImage: vi.fn(),
}))

const mockPdfDoc = vi.hoisted(() => ({
  embedJpg: vi.fn(),
  embedPng: vi.fn(),
  addPage: vi.fn(),
  save: vi.fn(),
}))

vi.mock('pdf-lib', () => ({
  PDFDocument: { create: vi.fn() },
}))

import { PDFDocument } from 'pdf-lib'
import { imagesToPdf } from './imagesToPdf'

beforeEach(() => {
  vi.clearAllMocks()
  mockImage.width = 800
  mockImage.height = 600
  mockPdfDoc.embedJpg.mockResolvedValue(mockImage)
  mockPdfDoc.embedPng.mockResolvedValue(mockImage)
  mockPdfDoc.addPage.mockReturnValue(mockPage)
  mockPdfDoc.save.mockResolvedValue(new Uint8Array([1, 2, 3]))
  vi.mocked(PDFDocument.create).mockResolvedValue(mockPdfDoc as unknown as PDFDocument)
})

function makeJpeg(name = 'photo.jpg', size = 1024) {
  return new File([new ArrayBuffer(size)], name, { type: 'image/jpeg' })
}

function makePng(name = 'photo.png', size = 1024) {
  return new File([new ArrayBuffer(size)], name, { type: 'image/png' })
}

describe('imagesToPdf', () => {
  it('returns a Uint8Array', async () => {
    expect(await imagesToPdf([makeJpeg()], 'a4')).toBeInstanceOf(Uint8Array)
  })

  it('calls embedJpg for JPEG files', async () => {
    await imagesToPdf([makeJpeg()], 'a4')
    expect(mockPdfDoc.embedJpg).toHaveBeenCalledTimes(1)
    expect(mockPdfDoc.embedPng).not.toHaveBeenCalled()
  })

  it('calls embedPng for PNG files', async () => {
    await imagesToPdf([makePng()], 'a4')
    expect(mockPdfDoc.embedPng).toHaveBeenCalledTimes(1)
    expect(mockPdfDoc.embedJpg).not.toHaveBeenCalled()
  })

  it('creates A4 page with dimensions 595 x 842', async () => {
    await imagesToPdf([makeJpeg()], 'a4')
    expect(mockPdfDoc.addPage).toHaveBeenCalledWith([595, 842])
  })

  it('creates Letter page with dimensions 612 x 792', async () => {
    await imagesToPdf([makeJpeg()], 'letter')
    expect(mockPdfDoc.addPage).toHaveBeenCalledWith([612, 792])
  })

  it('creates page matching image dimensions for image page size', async () => {
    mockImage.width = 1200
    mockImage.height = 900
    await imagesToPdf([makeJpeg()], 'image')
    expect(mockPdfDoc.addPage).toHaveBeenCalledWith([1200, 900])
  })

  it('fits image within A4 preserving aspect ratio and centres it', async () => {
    // image 800x600, A4 595x842: scale = min(595/800, 842/600) = 0.74375
    mockImage.width = 800
    mockImage.height = 600
    await imagesToPdf([makeJpeg()], 'a4')
    const opts = mockPage.drawImage.mock.calls[0][1]
    expect(opts.width).toBeCloseTo(595, 0)
    expect(opts.height).toBeCloseTo(446, 0)
    expect(opts.x).toBeCloseTo(0, 0)
    expect(opts.y).toBeCloseTo(198, 0)
  })

  it('draws image at full page for image page size (no scaling)', async () => {
    mockImage.width = 1200
    mockImage.height = 900
    await imagesToPdf([makeJpeg()], 'image')
    const opts = mockPage.drawImage.mock.calls[0][1]
    expect(opts.x).toBe(0)
    expect(opts.y).toBe(0)
    expect(opts.width).toBe(1200)
    expect(opts.height).toBe(900)
  })

  it('throws when more than 20 files are provided', async () => {
    const files = Array.from({ length: 21 }, (_, i) => makeJpeg(`img${i}.jpg`))
    await expect(imagesToPdf(files, 'a4')).rejects.toThrow('Maximum 20 images allowed.')
  })

  it('throws when total size exceeds 50 MB', async () => {
    const big = new File([new ArrayBuffer(51 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' })
    await expect(imagesToPdf([big], 'a4')).rejects.toThrow('Total size exceeds 50 MB limit.')
  })

  it('throws for non-image files', async () => {
    const pdf = new File([new ArrayBuffer(1024)], 'doc.pdf', { type: 'application/pdf' })
    await expect(imagesToPdf([pdf], 'a4')).rejects.toThrow('Only JPG and PNG images are supported.')
  })
})
