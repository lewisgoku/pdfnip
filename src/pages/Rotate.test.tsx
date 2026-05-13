import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, beforeEach } from 'vitest'

vi.mock('../tools/rotate', () => ({
  getPageCount: vi.fn(),
  rotatePDF: vi.fn(),
}))

import { getPageCount, rotatePDF } from '../tools/rotate'
import Rotate from './Rotate'

const mockGetPageCount = vi.mocked(getPageCount)
const mockRotatePDF = vi.mocked(rotatePDF)

beforeEach(() => {
  mockGetPageCount.mockReset()
  mockRotatePDF.mockReset()
  mockGetPageCount.mockResolvedValue(8)
  mockRotatePDF.mockResolvedValue(new Uint8Array(2048))
})

function dropFile(file: File) {
  const dropArea = screen.getByTestId('dropzone')
  fireEvent.drop(dropArea, { dataTransfer: { files: [file] } })
}

function makePDF(name = 'doc.pdf', size = 1024) {
  return new File([new ArrayBuffer(size)], name, { type: 'application/pdf' })
}

it('renders idle state with DropZone and privacy note', () => {
  render(<Rotate />)
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
  expect(screen.getByText(/never leaves your browser/i)).toBeInTheDocument()
})

it('renders how-it-works guide in idle state', () => {
  render(<Rotate />)
  expect(screen.getByText(/pick rotation/i)).toBeInTheDocument()
})

it('transitions to ready state after dropping a valid PDF', () => {
  render(<Rotate />)
  dropFile(makePDF('report.pdf'))
  expect(screen.getByText('report.pdf')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /apply/i })).toBeInTheDocument()
})

it('shows error for non-PDF file', () => {
  render(<Rotate />)
  const txt = new File(['text'], 'doc.txt', { type: 'text/plain' })
  dropFile(txt)
  expect(screen.getByText('Please select a valid PDF file.')).toBeInTheDocument()
})

it('shows error for file over 100MB', () => {
  render(<Rotate />)
  const big = new File([new ArrayBuffer(101 * 1024 * 1024)], 'big.pdf', {
    type: 'application/pdf',
  })
  dropFile(big)
  expect(screen.getByText('File is too large (max 100MB).')).toBeInTheDocument()
})

it('shows page count after file is dropped', async () => {
  render(<Rotate />)
  dropFile(makePDF())
  await waitFor(() => expect(screen.getByText(/8 pages/i)).toBeInTheDocument())
})

it('renders all three rotation options', () => {
  render(<Rotate />)
  dropFile(makePDF())
  expect(screen.getByRole('button', { name: '90° CW' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '180°' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '90° CCW' })).toBeInTheDocument()
})

it('shows loading state while rotating', async () => {
  mockRotatePDF.mockImplementation(() => new Promise(() => {}))
  render(<Rotate />)
  dropFile(makePDF())
  await waitFor(() => screen.getByText(/8 pages/i))
  fireEvent.click(screen.getByRole('button', { name: /apply/i }))
  await waitFor(() => expect(screen.getByText(/rotating/i)).toBeInTheDocument())
})

it('shows download button in done state', async () => {
  render(<Rotate />)
  dropFile(makePDF('report.pdf'))
  await waitFor(() => screen.getByText(/8 pages/i))
  fireEvent.click(screen.getByRole('button', { name: /apply/i }))
  await waitFor(() => screen.getByText('Download'))
  expect(screen.getByRole('link', { name: 'Download' })).toBeInTheDocument()
})

it('download link has correct filename', async () => {
  render(<Rotate />)
  dropFile(makePDF('report.pdf'))
  await waitFor(() => screen.getByText(/8 pages/i))
  fireEvent.click(screen.getByRole('button', { name: /apply/i }))
  await waitFor(() => screen.getByText('Download'))
  expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute(
    'download',
    'report-rotated.pdf',
  )
})

it('"Rotate another PDF" resets to idle', async () => {
  render(<Rotate />)
  dropFile(makePDF())
  await waitFor(() => screen.getByText(/8 pages/i))
  fireEvent.click(screen.getByRole('button', { name: /apply/i }))
  await waitFor(() => screen.getByText('Download'))
  fireEvent.click(screen.getByRole('button', { name: /rotate another/i }))
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
})

it('shows error when rotation fails', async () => {
  mockRotatePDF.mockRejectedValue(new Error('boom'))
  render(<Rotate />)
  dropFile(makePDF())
  await waitFor(() => screen.getByText(/8 pages/i))
  fireEvent.click(screen.getByRole('button', { name: /apply/i }))
  await waitFor(() =>
    expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument(),
  )
})
