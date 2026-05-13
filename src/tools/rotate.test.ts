import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockPages = vi.hoisted(() => [
  { getRotation: vi.fn().mockReturnValue({ angle: 0 }), setRotation: vi.fn() },
  { getRotation: vi.fn().mockReturnValue({ angle: 0 }), setRotation: vi.fn() },
])

vi.mock('pdf-lib', () => {
  const mockDoc = {
    getPages: vi.fn().mockReturnValue(mockPages),
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
import { degrees } from 'pdf-lib'

describe('rotatePDF', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each([90, 180, 270] as const)(
    'returns a Uint8Array for %d° rotation',
    async (rotation) => {
      const file = new File([new ArrayBuffer(1024)], 'doc.pdf', { type: 'application/pdf' })
      expect(await rotatePDF(file, rotation)).toBeInstanceOf(Uint8Array)
    },
  )

  it('calls degrees with the correct angle and passes result to setRotation', async () => {
    const file = new File([new ArrayBuffer(1024)], 'doc.pdf', { type: 'application/pdf' })
    await rotatePDF(file, 90)

    expect(vi.mocked(degrees)).toHaveBeenCalledWith(90)
    const degreeResult = { type: 'degrees', angle: 90 }
    expect(mockPages[0].setRotation).toHaveBeenCalledWith(degreeResult)
    expect(mockPages[1].setRotation).toHaveBeenCalledWith(degreeResult)
  })

  it('accumulates existing page rotation', async () => {
    mockPages[0].getRotation.mockReturnValueOnce({ angle: 90 })
    mockPages[1].getRotation.mockReturnValueOnce({ angle: 90 })
    const file = new File([new ArrayBuffer(1024)], 'doc.pdf', { type: 'application/pdf' })
    await rotatePDF(file, 90)
    expect(vi.mocked(degrees)).toHaveBeenCalledWith(180)
  })
})
