import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// --- Mocks (must be before imports that use them) ---

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
  const mockDoc = {
    embedJpg: vi.fn().mockResolvedValue({
      scale: vi.fn().mockReturnValue({ width: 100, height: 100 }),
    }),
    addPage: vi.fn().mockReturnValue(mockPage),
    save: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
  }
  return { PDFDocument: { create: vi.fn().mockResolvedValue(mockDoc) } }
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
    await expect(compressPDF(bigFile, 'medium')).rejects.toThrow(
      'File exceeds 100MB limit',
    )
  })

  it('returns an ArrayBuffer for a valid file', async () => {
    const file = new File([new ArrayBuffer(1024)], 'test.pdf', {
      type: 'application/pdf',
    })
    const result = await compressPDF(file, 'medium')
    expect(result).toBeInstanceOf(ArrayBuffer)
  })

  it('calls onProgress once per page', async () => {
    const file = new File([new ArrayBuffer(1024)], 'test.pdf', {
      type: 'application/pdf',
    })
    const onProgress = vi.fn()
    await compressPDF(file, 'medium', onProgress)
    expect(onProgress).toHaveBeenCalledTimes(2)
    expect(onProgress).toHaveBeenNthCalledWith(1, 1, 2)
    expect(onProgress).toHaveBeenNthCalledWith(2, 2, 2)
  })

  it('uses correct JPEG quality for each level', async () => {
    const file = new File([new ArrayBuffer(1024)], 'test.pdf', {
      type: 'application/pdf',
    })
    await compressPDF(file, 'low')
    expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.5)

    mockCanvas.toDataURL.mockClear()
    await compressPDF(file, 'high')
    expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.92)
  })
})
