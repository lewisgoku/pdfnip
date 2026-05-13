import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, beforeEach } from 'vitest'

vi.mock('../tools/extract', () => ({
  parsePageRanges: vi.fn(),
  getPageCount: vi.fn(),
  extractPages: vi.fn(),
}))

import { parsePageRanges, getPageCount, extractPages } from '../tools/extract'
import Extract from './Extract'

const mockParsePageRanges = vi.mocked(parsePageRanges)
const mockGetPageCount = vi.mocked(getPageCount)
const mockExtractPages = vi.mocked(extractPages)

beforeEach(() => {
  mockParsePageRanges.mockReset()
  mockGetPageCount.mockReset()
  mockExtractPages.mockReset()
  mockGetPageCount.mockResolvedValue(10)
  mockParsePageRanges.mockReturnValue([[1, 2, 3]])
  mockExtractPages.mockResolvedValue(new Uint8Array(2048))
})

function dropFile(file: File) {
  const dropArea = screen.getByTestId('dropzone')
  fireEvent.drop(dropArea, { dataTransfer: { files: [file] } })
}

function makePDF(name = 'doc.pdf', size = 1024) {
  return new File([new ArrayBuffer(size)], name, { type: 'application/pdf' })
}

it('renders idle state with DropZone and privacy note', () => {
  render(<Extract />)
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
  expect(screen.getByText(/never leave your browser/i)).toBeInTheDocument()
})

it('renders how-it-works guide in idle state', () => {
  render(<Extract />)
  expect(screen.getByText(/enter page range/i)).toBeInTheDocument()
})

it('transitions to ready state after dropping a valid PDF', () => {
  render(<Extract />)
  dropFile(makePDF('report.pdf'))
  expect(screen.getByText('report.pdf')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Extract' })).toBeInTheDocument()
})

it('shows error for non-PDF file', () => {
  render(<Extract />)
  const txt = new File(['text'], 'doc.txt', { type: 'text/plain' })
  dropFile(txt)
  expect(screen.getByText('Please select a valid PDF file.')).toBeInTheDocument()
})

it('shows error for file over 100MB', () => {
  render(<Extract />)
  const big = new File([new ArrayBuffer(101 * 1024 * 1024)], 'big.pdf', {
    type: 'application/pdf',
  })
  dropFile(big)
  expect(screen.getByText('File is too large (max 100MB).')).toBeInTheDocument()
})

it('shows page count after file is dropped', async () => {
  render(<Extract />)
  dropFile(makePDF())
  await waitFor(() => expect(screen.getByText(/10 pages/i)).toBeInTheDocument())
})

it('shows page range input when ready', () => {
  render(<Extract />)
  dropFile(makePDF())
  expect(screen.getByLabelText(/page range/i)).toBeInTheDocument()
})

it('shows error when range is invalid on extract click', async () => {
  mockParsePageRanges.mockImplementation(() => {
    throw new Error('Invalid range: 5-3')
  })
  render(<Extract />)
  dropFile(makePDF())
  await waitFor(() => screen.getByText(/10 pages/i))
  fireEvent.click(screen.getByRole('button', { name: 'Extract' }))
  expect(screen.getByText('Invalid range: 5-3')).toBeInTheDocument()
})

it('shows loading state while extracting', async () => {
  mockExtractPages.mockImplementation(() => new Promise(() => {}))
  render(<Extract />)
  dropFile(makePDF())
  await waitFor(() => screen.getByText(/10 pages/i))
  fireEvent.click(screen.getByRole('button', { name: 'Extract' }))
  await waitFor(() =>
    expect(screen.getByText(/extracting/i)).toBeInTheDocument(),
  )
})

it('shows download button in done state', async () => {
  render(<Extract />)
  dropFile(makePDF('report.pdf'))
  await waitFor(() => screen.getByText(/10 pages/i))
  fireEvent.click(screen.getByRole('button', { name: 'Extract' }))
  await waitFor(() => screen.getByText('Download'))
  expect(screen.getByRole('link', { name: 'Download' })).toBeInTheDocument()
})

it('download link has correct filename', async () => {
  render(<Extract />)
  dropFile(makePDF('report.pdf'))
  await waitFor(() => screen.getByText(/10 pages/i))
  fireEvent.click(screen.getByRole('button', { name: 'Extract' }))
  await waitFor(() => screen.getByText('Download'))
  expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute(
    'download',
    'report-extracted.pdf',
  )
})

it('"Extract another PDF" resets to idle', async () => {
  render(<Extract />)
  dropFile(makePDF())
  await waitFor(() => screen.getByText(/10 pages/i))
  fireEvent.click(screen.getByRole('button', { name: 'Extract' }))
  await waitFor(() => screen.getByText('Download'))
  fireEvent.click(screen.getByRole('button', { name: /extract another/i }))
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
})

it('shows error when extraction fails', async () => {
  mockExtractPages.mockRejectedValue(new Error('boom'))
  render(<Extract />)
  dropFile(makePDF())
  await waitFor(() => screen.getByText(/10 pages/i))
  fireEvent.click(screen.getByRole('button', { name: 'Extract' }))
  await waitFor(() =>
    expect(
      screen.getByText('Something went wrong. Please try again.'),
    ).toBeInTheDocument(),
  )
})
