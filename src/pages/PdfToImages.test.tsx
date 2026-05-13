import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, beforeEach } from 'vitest'

vi.mock('../tools/pdfToImages', () => ({
  pdfToImages: vi.fn(),
}))

import { pdfToImages } from '../tools/pdfToImages'
import PdfToImages from './PdfToImages'

const mockPdfToImages = vi.mocked(pdfToImages)

beforeEach(() => {
  mockPdfToImages.mockReset()
  mockPdfToImages.mockResolvedValue(new Uint8Array(2048))
})

function dropFile(file: File) {
  const dropArea = screen.getByTestId('dropzone')
  fireEvent.drop(dropArea, { dataTransfer: { files: [file] } })
}

function makePDF(name = 'doc.pdf', size = 1024) {
  return new File([new ArrayBuffer(size)], name, { type: 'application/pdf' })
}

it('renders idle state with DropZone and privacy note', () => {
  render(<PdfToImages />)
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
  expect(screen.getByText(/never leaves your browser/i)).toBeInTheDocument()
})

it('renders how-it-works guide in idle state', () => {
  render(<PdfToImages />)
  expect(screen.getByText(/pick format/i)).toBeInTheDocument()
})

it('transitions to ready state after dropping a valid PDF', () => {
  render(<PdfToImages />)
  dropFile(makePDF('report.pdf'))
  expect(screen.getByText('report.pdf')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /^Convert$/ })).toBeInTheDocument()
})

it('shows error for non-PDF file', () => {
  render(<PdfToImages />)
  dropFile(new File(['text'], 'doc.txt', { type: 'text/plain' }))
  expect(screen.getByText('Please select a valid PDF file.')).toBeInTheDocument()
})

it('shows error for file over 100MB', () => {
  render(<PdfToImages />)
  dropFile(new File([new ArrayBuffer(101 * 1024 * 1024)], 'big.pdf', { type: 'application/pdf' }))
  expect(screen.getByText('File is too large (max 100MB).')).toBeInTheDocument()
})

it('shows JPG format selected by default', () => {
  render(<PdfToImages />)
  dropFile(makePDF())
  expect(screen.getByRole('button', { name: 'JPG' })).toHaveClass('bg-primary')
})

it('shows quality selector when JPG is selected', () => {
  render(<PdfToImages />)
  dropFile(makePDF())
  expect(screen.getByText('Quality')).toBeInTheDocument()
})

it('hides quality selector when PNG is selected', () => {
  render(<PdfToImages />)
  dropFile(makePDF())
  fireEvent.click(screen.getByRole('button', { name: 'PNG' }))
  expect(screen.queryByText('Quality')).not.toBeInTheDocument()
})

it('shows loading state while converting', async () => {
  mockPdfToImages.mockImplementation(() => new Promise(() => {}))
  render(<PdfToImages />)
  dropFile(makePDF())
  fireEvent.click(screen.getByRole('button', { name: /^Convert$/ }))
  await waitFor(() => expect(screen.getByText(/converting/i)).toBeInTheDocument())
})

it('shows download button in done state', async () => {
  render(<PdfToImages />)
  dropFile(makePDF('report.pdf'))
  fireEvent.click(screen.getByRole('button', { name: /^Convert$/ }))
  await waitFor(() => screen.getByText('Download'))
  expect(screen.getByRole('link', { name: 'Download' })).toBeInTheDocument()
})

it('download link has correct filename', async () => {
  render(<PdfToImages />)
  dropFile(makePDF('report.pdf'))
  fireEvent.click(screen.getByRole('button', { name: /^Convert$/ }))
  await waitFor(() => screen.getByText('Download'))
  expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute(
    'download',
    'report-images.zip',
  )
})

it('"Convert another PDF" resets to idle', async () => {
  render(<PdfToImages />)
  dropFile(makePDF())
  fireEvent.click(screen.getByRole('button', { name: /^Convert$/ }))
  await waitFor(() => screen.getByText('Download'))
  fireEvent.click(screen.getByRole('button', { name: /convert another/i }))
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
})

it('shows error when conversion fails', async () => {
  mockPdfToImages.mockRejectedValue(new Error('boom'))
  render(<PdfToImages />)
  dropFile(makePDF())
  fireEvent.click(screen.getByRole('button', { name: /^Convert$/ }))
  await waitFor(() =>
    expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument(),
  )
})

it('switching back to JPG after PNG still converts successfully', async () => {
  render(<PdfToImages />)
  dropFile(makePDF('report.pdf'))
  fireEvent.click(screen.getByRole('button', { name: 'PNG' }))
  fireEvent.click(screen.getByRole('button', { name: 'JPG' }))
  expect(screen.getByText('Quality')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /^Convert$/ }))
  await waitFor(() => screen.getByText('Download'))
  expect(screen.getByRole('link', { name: 'Download' })).toBeInTheDocument()
})
