import { vi, it, expect, beforeEach } from 'vitest'

const mockSave = vi.hoisted(() => vi.fn())

vi.mock('pdf-lib', () => ({
  PDFDocument: {
    load: vi.fn(),
  },
}))

import { PDFDocument } from 'pdf-lib'
import { protectPdf, MAX_BYTES } from './protectPdf'

beforeEach(() => {
  vi.clearAllMocks()
  mockSave.mockResolvedValue(new Uint8Array(512))
  vi.mocked(PDFDocument.load).mockResolvedValue({ save: mockSave } as unknown as PDFDocument)
})

function makeFile(size = 1024) {
  return new File([new ArrayBuffer(size)], 'test.pdf', { type: 'application/pdf' })
}

it('returns Uint8Array on valid input', async () => {
  const result = await protectPdf(makeFile(), 'secret', {
    printing: true,
    copying: true,
    editing: true,
  })
  expect(result).toBeInstanceOf(Uint8Array)
})

it('throws on file over 100MB', async () => {
  const file = new File([new ArrayBuffer(MAX_BYTES + 1)], 'big.pdf', { type: 'application/pdf' })
  await expect(
    protectPdf(file, 'secret', { printing: true, copying: true, editing: true }),
  ).rejects.toThrow('File is too large')
})

it('passes userPassword and ownerPassword to save', async () => {
  await protectPdf(makeFile(), 'mypass', { printing: true, copying: true, editing: true })
  expect(mockSave).toHaveBeenCalledWith(
    expect.objectContaining({ userPassword: 'mypass', ownerPassword: 'mypass' }),
  )
})

it('maps printing:true to highResolution', async () => {
  await protectPdf(makeFile(), 'p', { printing: true, copying: true, editing: true })
  const call = mockSave.mock.calls[0][0] as { permissions: Record<string, unknown> }
  expect(call.permissions.printing).toBe('highResolution')
})

it('maps printing:false to undefined', async () => {
  await protectPdf(makeFile(), 'p', { printing: false, copying: true, editing: true })
  const call = mockSave.mock.calls[0][0] as { permissions: Record<string, unknown> }
  expect(call.permissions.printing).toBeUndefined()
})

it('maps editing:false to modifying:false', async () => {
  await protectPdf(makeFile(), 'p', { printing: true, copying: true, editing: false })
  expect(mockSave).toHaveBeenCalledWith(
    expect.objectContaining({ permissions: expect.objectContaining({ modifying: false }) }),
  )
})

it('maps copying:false correctly', async () => {
  await protectPdf(makeFile(), 'p', { printing: true, copying: false, editing: true })
  expect(mockSave).toHaveBeenCalledWith(
    expect.objectContaining({ permissions: expect.objectContaining({ copying: false }) }),
  )
})
