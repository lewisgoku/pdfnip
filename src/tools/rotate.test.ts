import { vi, describe, it, expect } from 'vitest'

vi.mock('pdf-lib', () => {
  const mockPage = {
    getRotation: vi.fn().mockReturnValue({ angle: 0 }),
    setRotation: vi.fn(),
  }
  const mockDoc = {
    getPages: vi.fn().mockReturnValue([mockPage, mockPage]),
    save: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
  }
  return {
    PDFDocument: {
      load: vi.fn().mockResolvedValue(mockDoc),
    },
    degrees: vi.fn((n: number) => ({ type: 'degrees', angle: n })),
  }
})

import { rotatePDF } from './rotate'

describe('rotatePDF', () => {
  it('returns a Uint8Array for 90° rotation', async () => {
    const file = new File([new ArrayBuffer(1024)], 'doc.pdf', { type: 'application/pdf' })
    expect(await rotatePDF(file, 90)).toBeInstanceOf(Uint8Array)
  })

  it('returns a Uint8Array for 180° rotation', async () => {
    const file = new File([new ArrayBuffer(1024)], 'doc.pdf', { type: 'application/pdf' })
    expect(await rotatePDF(file, 180)).toBeInstanceOf(Uint8Array)
  })

  it('returns a Uint8Array for 270° rotation', async () => {
    const file = new File([new ArrayBuffer(1024)], 'doc.pdf', { type: 'application/pdf' })
    expect(await rotatePDF(file, 270)).toBeInstanceOf(Uint8Array)
  })

  it('calls degrees with the sum of existing and requested rotation', async () => {
    const { degrees } = await import('pdf-lib')
    vi.mocked(degrees).mockClear()
    const file = new File([new ArrayBuffer(1024)], 'doc.pdf', { type: 'application/pdf' })
    await rotatePDF(file, 90)
    expect(vi.mocked(degrees)).toHaveBeenCalledWith(90)
  })
})
