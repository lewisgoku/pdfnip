import { vi, describe, it, expect } from 'vitest'

vi.mock('pdf-lib', () => {
  const mockSrcDoc = {
    getPageCount: vi.fn().mockReturnValue(10),
  }
  const mockOutDoc = {
    copyPages: vi.fn().mockResolvedValue(['page1', 'page2']),
    addPage: vi.fn(),
    save: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
  }
  return {
    PDFDocument: {
      load: vi.fn().mockResolvedValue(mockSrcDoc),
      create: vi.fn().mockResolvedValue(mockOutDoc),
    },
  }
})

import { parsePageRanges, getPageCount, extractPages } from './extract'

describe('parsePageRanges', () => {
  it('parses a single page', () => {
    expect(parsePageRanges('5', 10)).toEqual([[5]])
  })

  it('parses a range', () => {
    expect(parsePageRanges('1-3', 10)).toEqual([[1, 2, 3]])
  })

  it('parses mixed input', () => {
    expect(parsePageRanges('1-3, 5', 10)).toEqual([[1, 2, 3], [5]])
  })

  it('throws on start > end', () => {
    expect(() => parsePageRanges('5-3', 10)).toThrow('Invalid range: 5-3')
  })

  it('throws on page out of range', () => {
    expect(() => parsePageRanges('15', 10)).toThrow('Page 15 out of range')
  })

  it('throws on empty input', () => {
    expect(() => parsePageRanges('', 10)).toThrow('Empty input')
  })
})

describe('getPageCount', () => {
  it('returns the page count for a valid PDF', async () => {
    const file = new File([new ArrayBuffer(1024)], 'doc.pdf', { type: 'application/pdf' })
    expect(await getPageCount(file)).toBe(10)
  })
})

describe('extractPages', () => {
  it('returns a Uint8Array', async () => {
    const file = new File([new ArrayBuffer(1024)], 'doc.pdf', { type: 'application/pdf' })
    const result = await extractPages(file, [1, 2])
    expect(result).toBeInstanceOf(Uint8Array)
  })

  it('passes 0-based indices to copyPages', async () => {
    const { PDFDocument } = await import('pdf-lib')
    const file = new File([new ArrayBuffer(1024)], 'doc.pdf', { type: 'application/pdf' })
    await extractPages(file, [1, 3, 5])
    const outDoc = await vi.mocked(PDFDocument.create)()
    expect(vi.mocked(outDoc.copyPages)).toHaveBeenCalledWith(
      expect.anything(),
      [0, 2, 4],
    )
  })
})
