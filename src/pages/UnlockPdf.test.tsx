import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, beforeEach } from 'vitest'

// Preserve the real PasswordRequiredError / IncorrectPasswordError classes
// so instanceof checks in the page work, but mock unlockPdf itself.
vi.mock('../tools/unlockPdf', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../tools/unlockPdf')>()
  return { ...actual, unlockPdf: vi.fn() }
})

import { unlockPdf, PasswordRequiredError, IncorrectPasswordError } from '../tools/unlockPdf'
import UnlockPdf from './UnlockPdf'

const mockUnlockPdf = vi.mocked(unlockPdf)

beforeEach(() => {
  mockUnlockPdf.mockReset()
  mockUnlockPdf.mockResolvedValue(new Uint8Array(4096))
})

function makePdf(name = 'report.pdf', size = 1024) {
  return new File([new ArrayBuffer(size)], name, { type: 'application/pdf' })
}

function dropFile(file: File) {
  const zone = screen.getByTestId('dropzone')
  fireEvent.drop(zone, { dataTransfer: { files: [file] } })
}

// ── Idle state ─────────────────────────────────────────────────────────────

it('renders idle state with DropZone and privacy note', () => {
  render(<UnlockPdf />)
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
  expect(screen.getByText(/never leave your browser/i)).toBeInTheDocument()
})

// ── File validation (stays idle) ────────────────────────────────────────────

it('shows error and stays idle for non-PDF file', () => {
  render(<UnlockPdf />)
  fireEvent.drop(screen.getByTestId('dropzone'), {
    dataTransfer: { files: [new File(['txt'], 'doc.txt', { type: 'text/plain' })] },
  })
  expect(screen.getByText('Please select a valid PDF file.')).toBeInTheDocument()
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
})

it('shows error and stays idle for file over 100 MB', () => {
  render(<UnlockPdf />)
  const big = new File([new ArrayBuffer(101 * 1024 * 1024)], 'big.pdf', { type: 'application/pdf' })
  dropFile(big)
  expect(screen.getByText('File is too large (max 100MB).')).toBeInTheDocument()
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
})

// ── Unlocking state ─────────────────────────────────────────────────────────

it('immediately triggers unlock attempt on valid PDF drop (no button click needed)', async () => {
  render(<UnlockPdf />)
  dropFile(makePdf())
  await waitFor(() => expect(mockUnlockPdf).toHaveBeenCalledTimes(1))
})

it('shows loading text while unlocking', async () => {
  mockUnlockPdf.mockImplementation(() => new Promise(() => {}))
  render(<UnlockPdf />)
  dropFile(makePdf())
  await waitFor(() => expect(screen.getByText(/unlocking/i)).toBeInTheDocument())
})

// ── Done state ──────────────────────────────────────────────────────────────

it('shows Download link in done state', async () => {
  render(<UnlockPdf />)
  dropFile(makePdf())
  await waitFor(() => screen.getByRole('link', { name: /download/i }))
  expect(screen.getByRole('link', { name: /download/i })).toBeInTheDocument()
})

it('download filename is <basename>-unlocked.pdf', async () => {
  render(<UnlockPdf />)
  dropFile(makePdf('report.pdf'))
  await waitFor(() => screen.getByRole('link', { name: /download/i }))
  expect(screen.getByRole('link', { name: /download/i })).toHaveAttribute(
    'download',
    'report-unlocked.pdf',
  )
})

it('"Unlock another PDF" resets to idle', async () => {
  render(<UnlockPdf />)
  dropFile(makePdf())
  await waitFor(() => screen.getByRole('link', { name: /download/i }))
  fireEvent.click(screen.getByRole('button', { name: /unlock another pdf/i }))
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
})

// ── needs_password state ────────────────────────────────────────────────────

it('shows password input when PDF requires a password', async () => {
  mockUnlockPdf.mockRejectedValue(new PasswordRequiredError())
  render(<UnlockPdf />)
  dropFile(makePdf())
  await waitFor(() =>
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument(),
  )
})

it('shows Unlock button and Use-a-different-file button in needs_password state', async () => {
  mockUnlockPdf.mockRejectedValue(new PasswordRequiredError())
  render(<UnlockPdf />)
  dropFile(makePdf())
  await waitFor(() => screen.getByPlaceholderText(/password/i))
  expect(screen.getByRole('button', { name: /^unlock$/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /use a different file/i })).toBeInTheDocument()
})

it('shows inline error on wrong password and stays in needs_password state', async () => {
  mockUnlockPdf
    .mockRejectedValueOnce(new PasswordRequiredError())
    .mockRejectedValueOnce(new IncorrectPasswordError())
  render(<UnlockPdf />)
  dropFile(makePdf())
  await waitFor(() => screen.getByPlaceholderText(/password/i))
  fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'wrong' } })
  fireEvent.click(screen.getByRole('button', { name: /^unlock$/i }))
  await waitFor(() =>
    expect(
      screen.getByText('Incorrect password. Please try again.'),
    ).toBeInTheDocument(),
  )
  expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument()
})

it('transitions to done state after correct password', async () => {
  mockUnlockPdf
    .mockRejectedValueOnce(new PasswordRequiredError())
    .mockResolvedValueOnce(new Uint8Array(4096))
  render(<UnlockPdf />)
  dropFile(makePdf())
  await waitFor(() => screen.getByPlaceholderText(/password/i))
  fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'correct' } })
  fireEvent.click(screen.getByRole('button', { name: /^unlock$/i }))
  await waitFor(() => screen.getByRole('link', { name: /download/i }))
})

it('"Use a different file" resets to idle', async () => {
  mockUnlockPdf.mockRejectedValue(new PasswordRequiredError())
  render(<UnlockPdf />)
  dropFile(makePdf())
  await waitFor(() => screen.getByPlaceholderText(/password/i))
  fireEvent.click(screen.getByRole('button', { name: /use a different file/i }))
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
})

// ── Error state ─────────────────────────────────────────────────────────────

it('shows error state with message and DropZone for unexpected failure', async () => {
  mockUnlockPdf.mockRejectedValue(new Error('boom'))
  render(<UnlockPdf />)
  dropFile(makePdf())
  await waitFor(() =>
    expect(
      screen.getByText('Something went wrong. Please try again.'),
    ).toBeInTheDocument(),
  )
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
})
