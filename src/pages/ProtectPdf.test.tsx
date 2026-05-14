import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, beforeEach } from 'vitest'

vi.mock('../tools/protectPdf', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../tools/protectPdf')>()
  return { ...actual, protectPdf: vi.fn() }
})

import { protectPdf } from '../tools/protectPdf'
import ProtectPdf from './ProtectPdf'

const mockProtectPdf = vi.mocked(protectPdf)

beforeEach(() => {
  mockProtectPdf.mockReset()
  mockProtectPdf.mockResolvedValue(new Uint8Array(2048))
})

function makePDF(name = 'doc.pdf', size = 1024) {
  return new File([new ArrayBuffer(size)], name, { type: 'application/pdf' })
}

function dropFile(file: File) {
  fireEvent.drop(screen.getByTestId('dropzone'), { dataTransfer: { files: [file] } })
}

function fillPasswords(password: string, confirm: string) {
  fireEvent.change(screen.getByPlaceholderText('Enter password'), {
    target: { value: password },
  })
  fireEvent.change(screen.getByPlaceholderText('Confirm password'), {
    target: { value: confirm },
  })
}

// ── Idle & validation ────────────────────────────────────────────────────────

it('idle: shows DropZone', () => {
  render(<ProtectPdf />)
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
})

it('non-PDF shows error, stays idle', () => {
  render(<ProtectPdf />)
  dropFile(new File(['txt'], 'doc.txt', { type: 'text/plain' }))
  expect(screen.getByText('Please select a valid PDF file.')).toBeInTheDocument()
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
})

it('file over 100MB shows error, stays idle', () => {
  render(<ProtectPdf />)
  dropFile(new File([new ArrayBuffer(101 * 1024 * 1024)], 'big.pdf', { type: 'application/pdf' }))
  expect(screen.getByText('File is too large (max 100MB).')).toBeInTheDocument()
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
})

// ── Ready state ──────────────────────────────────────────────────────────────

it('valid PDF shows ready state with password inputs and protect button', () => {
  render(<ProtectPdf />)
  dropFile(makePDF('report.pdf'))
  expect(screen.getByText('report.pdf')).toBeInTheDocument()
  expect(screen.getByPlaceholderText('Enter password')).toBeInTheDocument()
  expect(screen.getByPlaceholderText('Confirm password')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /protect pdf/i })).toBeInTheDocument()
})

it('all 3 permissions are checked by default', () => {
  render(<ProtectPdf />)
  dropFile(makePDF())
  const checkboxes = screen.getAllByRole('checkbox')
  expect(checkboxes).toHaveLength(3)
  checkboxes.forEach((cb) => expect(cb).toBeChecked())
})

it('Protect PDF button is disabled when password is empty', () => {
  render(<ProtectPdf />)
  dropFile(makePDF())
  expect(screen.getByRole('button', { name: /protect pdf/i })).toBeDisabled()
})

it('Protect PDF button is disabled when passwords do not match', () => {
  render(<ProtectPdf />)
  dropFile(makePDF())
  fillPasswords('abc', 'xyz')
  expect(screen.getByRole('button', { name: /protect pdf/i })).toBeDisabled()
  expect(screen.getByText('Passwords do not match.')).toBeInTheDocument()
})

it('Protect PDF button is enabled when passwords match and non-empty', () => {
  render(<ProtectPdf />)
  dropFile(makePDF())
  fillPasswords('secret', 'secret')
  expect(screen.getByRole('button', { name: /protect pdf/i })).toBeEnabled()
})

// ── Converting & done ────────────────────────────────────────────────────────

it('shows loading state while protecting', async () => {
  mockProtectPdf.mockImplementation(() => new Promise(() => {}))
  render(<ProtectPdf />)
  dropFile(makePDF())
  fillPasswords('secret', 'secret')
  fireEvent.click(screen.getByRole('button', { name: /protect pdf/i }))
  await waitFor(() => expect(screen.getByText(/protecting/i)).toBeInTheDocument())
})

it('done state shows download link with correct filename', async () => {
  render(<ProtectPdf />)
  dropFile(makePDF('report.pdf'))
  fillPasswords('secret', 'secret')
  fireEvent.click(screen.getByRole('button', { name: /protect pdf/i }))
  await waitFor(() => screen.getByRole('link', { name: 'Download' }))
  expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute(
    'download',
    'report-protected.pdf',
  )
})

it('"Protect another PDF" resets to idle', async () => {
  render(<ProtectPdf />)
  dropFile(makePDF())
  fillPasswords('secret', 'secret')
  fireEvent.click(screen.getByRole('button', { name: /protect pdf/i }))
  await waitFor(() => screen.getByRole('link', { name: 'Download' }))
  fireEvent.click(screen.getByRole('button', { name: /protect another/i }))
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
})

// ── Error & permissions ──────────────────────────────────────────────────────

it('conversion failure shows error and Protect button stays visible', async () => {
  mockProtectPdf.mockRejectedValue(new Error('boom'))
  render(<ProtectPdf />)
  dropFile(makePDF())
  fillPasswords('secret', 'secret')
  fireEvent.click(screen.getByRole('button', { name: /protect pdf/i }))
  await waitFor(() =>
    expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument(),
  )
  expect(screen.getByRole('button', { name: /protect pdf/i })).toBeInTheDocument()
})

it('unchecking a permission passes correct flags to protectPdf', async () => {
  render(<ProtectPdf />)
  dropFile(makePDF())
  fillPasswords('secret', 'secret')
  // Uncheck "Allow printing" — first checkbox
  fireEvent.click(screen.getAllByRole('checkbox')[0])
  fireEvent.click(screen.getByRole('button', { name: /protect pdf/i }))
  await waitFor(() => screen.getByRole('link', { name: 'Download' }))
  expect(mockProtectPdf).toHaveBeenCalledWith(expect.any(File), 'secret', {
    printing: false,
    copying: true,
    editing: true,
  })
})
