import { vi, describe, it, expect } from 'vitest'

vi.mock('pdf-lib', () => {
  const mockSrcDoc = {
    getPageCount: vi.fn().mockReturnValue(3),
    getPageIndices: vi.fn().mockReturnValue([0, 1, 2]),
  }
  const mockOutputDoc = {
    copyPages: vi.fn().mockResolvedValue(['page1', 'page2', 'page3']),
    addPage: vi.fn(),
    save: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
  }
  return {
    PDFDocument: {
      create: vi.fn().mockResolvedValue(mockOutputDoc),
      load: vi.fn().mockResolvedValue(mockSrcDoc),
    },
  }
})

import { mergePDFs, getPageCount } from './merge'

function makePDF(name = 'test.pdf', size = 1024) {
  return new File([new ArrayBuffer(size)], name, { type: 'application/pdf' })
}

describe('mergePDFs', () => {
  it('throws for fewer than 2 files', async () => {
    await expect(mergePDFs([makePDF()])).rejects.toThrow('At least 2 files required')
  })

  it('throws for a file over 100MB', async () => {
    const big = new File([new ArrayBuffer(101 * 1024 * 1024)], 'big.pdf', {
      type: 'application/pdf',
    })
    await expect(mergePDFs([big, makePDF()])).rejects.toThrow('File exceeds 100MB limit')
  })

  it('returns an ArrayBuffer for 2 valid files', async () => {
    const result = await mergePDFs([makePDF('a.pdf'), makePDF('b.pdf')])
    expect(result).toBeInstanceOf(ArrayBuffer)
  })

  it('calls onProgress once per file', async () => {
    const onProgress = vi.fn()
    await mergePDFs([makePDF('a.pdf'), makePDF('b.pdf')], onProgress)
    expect(onProgress).toHaveBeenCalledTimes(2)
    expect(onProgress).toHaveBeenNthCalledWith(1, 1, 2)
    expect(onProgress).toHaveBeenNthCalledWith(2, 2, 2)
  })
})

describe('getPageCount', () => {
  it('returns the page count for a valid PDF', async () => {
    const count = await getPageCount(makePDF())
    expect(count).toBe(3)
  })
})
