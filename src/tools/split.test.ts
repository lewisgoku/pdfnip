import { vi, describe, it, expect } from 'vitest'

vi.mock('pdf-lib', () => {
  const mockSrcDoc = {
    getPageCount: vi.fn().mockReturnValue(5),
  }
  const mockOutDoc = {
    copyPages: vi.fn().mockResolvedValue(['page1']),
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

vi.mock('jszip', () => {
  class MockJSZip {
    file = vi.fn()
    generateAsync = vi.fn().mockResolvedValue(new Uint8Array([4, 5, 6]))
  }
  return { default: MockJSZip }
})

import { parsePageRanges, groupsEveryN, allPagesGroups, splitPDF, getPageCount } from './split'

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

  it('throws on invalid range (start > end)', () => {
    expect(() => parsePageRanges('5-3', 10)).toThrow('Invalid range: 5-3')
  })

  it('throws on page out of range', () => {
    expect(() => parsePageRanges('15', 10)).toThrow('Page 15 out of range')
  })

  it('throws on empty input', () => {
    expect(() => parsePageRanges('', 10)).toThrow('Empty input')
  })
})

describe('groupsEveryN', () => {
  it('splits evenly', () => {
    expect(groupsEveryN(6, 2)).toEqual([[1, 2], [3, 4], [5, 6]])
  })

  it('last group is smaller when uneven', () => {
    expect(groupsEveryN(5, 2)).toEqual([[1, 2], [3, 4], [5]])
  })

  it('throws for n < 1', () => {
    expect(() => groupsEveryN(5, 0)).toThrow('N must be at least 1')
  })

  it('throws for n >= totalPages', () => {
    expect(() => groupsEveryN(5, 5)).toThrow('N exceeds page count')
  })
})

describe('allPagesGroups', () => {
  it('returns one group per page', () => {
    expect(allPagesGroups(3)).toEqual([[1], [2], [3]])
  })
})

describe('getPageCount', () => {
  it('returns the page count for a valid PDF', async () => {
    const file = new File([new ArrayBuffer(1024)], 'doc.pdf', { type: 'application/pdf' })
    expect(await getPageCount(file)).toBe(5)
  })
})

describe('splitPDF', () => {
  it('returns a Uint8Array', async () => {
    const file = new File([new ArrayBuffer(1024)], 'doc.pdf', { type: 'application/pdf' })
    const result = await splitPDF(file, [[1, 2], [3]])
    expect(result).toBeInstanceOf(Uint8Array)
  })

  it('calls onProgress once per group', async () => {
    const file = new File([new ArrayBuffer(1024)], 'doc.pdf', { type: 'application/pdf' })
    const onProgress = vi.fn()
    await splitPDF(file, [[1], [2], [3]], onProgress)
    expect(onProgress).toHaveBeenCalledTimes(3)
    expect(onProgress).toHaveBeenNthCalledWith(1, 1, 3)
    expect(onProgress).toHaveBeenNthCalledWith(3, 3, 3)
  })
})
