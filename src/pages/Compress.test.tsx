import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, beforeEach } from 'vitest'

vi.mock('../tools/compress', () => ({
  compressPDF: vi.fn(),
}))

import { compressPDF } from '../tools/compress'
import Compress from './Compress'

const mockCompress = vi.mocked(compressPDF)

beforeEach(() => {
  mockCompress.mockReset()
})

function dropFile(file: File) {
  const dropArea = screen.getByTestId('dropzone')
  fireEvent.drop(dropArea, { dataTransfer: { files: [file] } })
}

function makePDF(name = 'test.pdf', size = 1024) {
  return new File([new ArrayBuffer(size)], name, { type: 'application/pdf' })
}

it('renders idle state with DropZone and privacy note', () => {
  render(<Compress />)
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
  expect(screen.getByText(/never leaves your browser/i)).toBeInTheDocument()
})

it('transitions to ready state after valid file drop', () => {
  render(<Compress />)
  dropFile(makePDF())
  expect(screen.getByText('Low')).toBeInTheDocument()
  expect(screen.getByText('Medium')).toBeInTheDocument()
  expect(screen.getByText('High')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Compress' })).toBeInTheDocument()
})

it('defaults quality to Medium', () => {
  render(<Compress />)
  dropFile(makePDF())
  const mediumBtn = screen.getByRole('button', { name: 'Medium' })
  expect(mediumBtn.className).toContain('bg-primary')
})

it('changes active quality when a level is clicked', () => {
  render(<Compress />)
  dropFile(makePDF())
  fireEvent.click(screen.getByRole('button', { name: 'Low' }))
  expect(screen.getByRole('button', { name: 'Low' }).className).toContain('bg-primary')
  expect(screen.getByRole('button', { name: 'Medium' }).className).not.toContain('bg-primary')
})

it('shows error for non-PDF file', () => {
  render(<Compress />)
  const txt = new File(['text'], 'doc.txt', { type: 'text/plain' })
  dropFile(txt)
  expect(screen.getByText('Please select a valid PDF file.')).toBeInTheDocument()
})

it('shows error for file over 100MB', () => {
  render(<Compress />)
  const big = new File([new ArrayBuffer(101 * 1024 * 1024)], 'big.pdf', {
    type: 'application/pdf',
  })
  dropFile(big)
  expect(screen.getByText('File is too large (max 100MB).')).toBeInTheDocument()
})

it('shows progress bar while compressing', async () => {
  mockCompress.mockImplementation((_file, _quality, onProgress) => {
    onProgress?.(1, 3)
    return new Promise(() => {})
  })
  render(<Compress />)
  dropFile(makePDF())
  fireEvent.click(screen.getByRole('button', { name: 'Compress' }))
  await waitFor(() =>
    expect(screen.getByText(/processing page 1 of 3/i)).toBeInTheDocument(),
  )
})

it('shows before/after sizes in done state', async () => {
  const output = new ArrayBuffer(512)
  mockCompress.mockResolvedValue(output)
  render(<Compress />)
  dropFile(makePDF('doc.pdf', 1024))
  fireEvent.click(screen.getByRole('button', { name: 'Compress' }))
  await waitFor(() => expect(screen.getByText('Download')).toBeInTheDocument())
  expect(screen.getByText(/original/i)).toBeInTheDocument()
  expect(screen.getByText(/compressed/i)).toBeInTheDocument()
})

it('download link has correct filename', async () => {
  mockCompress.mockResolvedValue(new ArrayBuffer(512))
  render(<Compress />)
  dropFile(makePDF('my-report.pdf', 1024))
  fireEvent.click(screen.getByRole('button', { name: 'Compress' }))
  await waitFor(() => screen.getByText('Download'))
  const link = screen.getByRole('link', { name: 'Download' })
  expect(link).toHaveAttribute('download', 'my-report-compressed.pdf')
})

it('"Compress another PDF" resets to idle', async () => {
  mockCompress.mockResolvedValue(new ArrayBuffer(512))
  render(<Compress />)
  dropFile(makePDF('doc.pdf', 1024))
  fireEvent.click(screen.getByRole('button', { name: 'Compress' }))
  await waitFor(() => screen.getByText('Download'))
  fireEvent.click(screen.getByRole('button', { name: /compress another/i }))
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'Download' })).not.toBeInTheDocument()
})

it('shows error message when compression fails', async () => {
  mockCompress.mockRejectedValue(new Error('boom'))
  render(<Compress />)
  dropFile(makePDF())
  fireEvent.click(screen.getByRole('button', { name: 'Compress' }))
  await waitFor(() =>
    expect(
      screen.getByText('Something went wrong. Please try again.'),
    ).toBeInTheDocument(),
  )
})
