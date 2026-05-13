import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockToDataURL = vi.hoisted(() => vi.fn(() => 'data:image/jpeg;base64,AAAA'))

const mockZipInstance = vi.hoisted(() => ({
  file: vi.fn(),
  generateAsync: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
}))

// Alias used in assertions so the original test expectations still reference mockZip
const mockZip = mockZipInstance

const mockPage = vi.hoisted(() => ({
  getViewport: vi.fn().mockReturnValue({ width: 100, height: 150 }),
  render: vi.fn().mockReturnValue({ promise: Promise.resolve() }),
}))

const mockPdf = vi.hoisted(() => ({
  numPages: 2,
  getPage: vi.fn().mockResolvedValue(mockPage),
}))

const mockGetDocument = vi.hoisted(() => vi.fn())

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: mockGetDocument,
}))

vi.mock('jszip', () => {
  class MockJSZip {
    file = mockZipInstance.file
    generateAsync = mockZipInstance.generateAsync
  }
  return { default: MockJSZip }
})

import { pdfToImages } from './pdfToImages'

beforeEach(() => {
  vi.clearAllMocks()
  HTMLCanvasElement.prototype.toDataURL = mockToDataURL
  mockToDataURL.mockReturnValue('data:image/jpeg;base64,AAAA')
  mockGetDocument.mockReturnValue({ promise: Promise.resolve(mockPdf) })
  mockPdf.getPage.mockResolvedValue(mockPage)
  mockPage.getViewport.mockReturnValue({ width: 100, height: 150 })
  mockPage.render.mockReturnValue({ promise: Promise.resolve() })
  mockZip.generateAsync.mockResolvedValue(new Uint8Array([1, 2, 3]))
})

function makePDF() {
  return new File([new ArrayBuffer(1024)], 'doc.pdf', { type: 'application/pdf' })
}

describe('pdfToImages', () => {
  it('returns a Uint8Array', async () => {
    expect(await pdfToImages(makePDF(), 'jpg', 'medium')).toBeInstanceOf(Uint8Array)
  })

  it('uses jpeg MIME type for jpg format', async () => {
    await pdfToImages(makePDF(), 'jpg', 'medium')
    expect(mockToDataURL).toHaveBeenCalledWith('image/jpeg', expect.any(Number))
  })

  it('uses png MIME type for png format', async () => {
    await pdfToImages(makePDF(), 'png', 'medium')
    expect(mockToDataURL).toHaveBeenCalledWith('image/png')
  })

  it.each([
    ['low', 1.0],
    ['medium', 1.5],
    ['high', 2.0],
  ] as const)('uses scale %.1f for %s quality', async (quality, expectedScale) => {
    await pdfToImages(makePDF(), 'jpg', quality)
    expect(mockPage.getViewport).toHaveBeenCalledWith({ scale: expectedScale })
  })

  it('names jpg files with .jpg extension', async () => {
    await pdfToImages(makePDF(), 'jpg', 'medium')
    expect(mockZip.file).toHaveBeenCalledWith('page-1.jpg', expect.any(Uint8Array))
    expect(mockZip.file).toHaveBeenCalledWith('page-2.jpg', expect.any(Uint8Array))
  })

  it('names png files with .png extension', async () => {
    await pdfToImages(makePDF(), 'png', 'medium')
    expect(mockZip.file).toHaveBeenCalledWith('page-1.png', expect.any(Uint8Array))
    expect(mockZip.file).toHaveBeenCalledWith('page-2.png', expect.any(Uint8Array))
  })
})
