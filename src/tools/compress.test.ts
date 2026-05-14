import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// --- Mocks ---

const mockSaveLossless = vi.hoisted(() => vi.fn())
const mockSaveCanvas = vi.hoisted(() => vi.fn())

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: vi.fn().mockReturnValue({
    promise: Promise.resolve({
      numPages: 2,
      getPage: vi.fn().mockResolvedValue({
        getViewport: vi.fn().mockReturnValue({ width: 100, height: 100 }),
        render: vi.fn().mockReturnValue({ promise: Promise.resolve() }),
      }),
    }),
  }),
}))

vi.mock('pdf-lib', () => {
  const mockPage = { drawImage: vi.fn() }
  return {
    PDFDocument: {
      load: vi.fn().mockResolvedValue({ save: mockSaveLossless }),
      create: vi.fn().mockResolvedValue({
        embedJpg: vi.fn().mockResolvedValue({
          scale: vi.fn().mockReturnValue({ width: 100, height: 100 }),
        }),
        addPage: vi.fn().mockReturnValue(mockPage),
        save: mockSaveCanvas,
      }),
    },
  }
})

import { compressPDF } from './compress'

// --- Canvas mock ---

const mockCanvas = {
  width: 0,
  height: 0,
  getContext: vi.fn().mockReturnValue({}),
  toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,/9j/abc'),
}

let originalCreateElement: typeof document.createElement

beforeEach(() => {
  vi.clearAllMocks()
  // Default: lossless is smaller than canvas, both smaller than a 10 KB "original"
  mockSaveLossless.mockResolvedValue(new Uint8Array(200))
  mockSaveCanvas.mockResolvedValue(new Uint8Array(800))
  mockCanvas.toDataURL.mockReturnValue('data:image/jpeg;base64,/9j/abc')

  originalCreateElement = document.createElement.bind(document)
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'canvas') return mockCanvas as unknown as HTMLElement
    return originalCreateElement(tag)
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

// --- Tests ---

describe('compressPDF', () => {
  it('throws for files over 100MB', async () => {
    const bigFile = new File(
      [new ArrayBuffer(101 * 1024 * 1024)],
      'big.pdf',
      { type: 'application/pdf' },
    )
    await expect(compressPDF(bigFile, 'medium')).rejects.toThrow('File exceeds 100MB limit')
  })

  it('returns an ArrayBuffer for a valid file', async () => {
    const file = new File([new ArrayBuffer(10 * 1024)], 'test.pdf', { type: 'application/pdf' })
    const result = await compressPDF(file, 'medium')
    expect(result).toBeInstanceOf(ArrayBuffer)
  })

  it('calls onProgress once per page during canvas pass', async () => {
    const file = new File([new ArrayBuffer(10 * 1024)], 'test.pdf', { type: 'application/pdf' })
    const onProgress = vi.fn()
    await compressPDF(file, 'medium', onProgress)
    expect(onProgress).toHaveBeenCalledTimes(2)
    expect(onProgress).toHaveBeenNthCalledWith(1, 1, 2)
    expect(onProgress).toHaveBeenNthCalledWith(2, 2, 2)
  })

  it('uses correct JPEG quality for each level', async () => {
    const file = new File([new ArrayBuffer(10 * 1024)], 'test.pdf', { type: 'application/pdf' })

    await compressPDF(file, 'low')
    expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.5)

    mockCanvas.toDataURL.mockClear()
    await compressPDF(file, 'medium')
    expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.7)

    mockCanvas.toDataURL.mockClear()
    await compressPDF(file, 'high')
    expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.85)
  })

  it('returns lossless result when it is smaller than canvas', async () => {
    mockSaveLossless.mockResolvedValue(new Uint8Array(100))
    mockSaveCanvas.mockResolvedValue(new Uint8Array(500))
    const file = new File([new ArrayBuffer(10 * 1024)], 'test.pdf', { type: 'application/pdf' })
    const result = await compressPDF(file, 'medium')
    expect(result.byteLength).toBe(100)
  })

  it('returns canvas result when it is smaller than lossless', async () => {
    mockSaveLossless.mockResolvedValue(new Uint8Array(500))
    mockSaveCanvas.mockResolvedValue(new Uint8Array(100))
    const file = new File([new ArrayBuffer(10 * 1024)], 'test.pdf', { type: 'application/pdf' })
    const result = await compressPDF(file, 'medium')
    expect(result.byteLength).toBe(100)
  })

  it('returns original when both compressed results are larger than the source', async () => {
    mockSaveLossless.mockResolvedValue(new Uint8Array(2000))
    mockSaveCanvas.mockResolvedValue(new Uint8Array(2000))
    const file = new File([new ArrayBuffer(1000)], 'test.pdf', { type: 'application/pdf' })
    const result = await compressPDF(file, 'medium')
    expect(result.byteLength).toBe(1000)
  })
})
