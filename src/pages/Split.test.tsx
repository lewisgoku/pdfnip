import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, beforeEach } from 'vitest'

vi.mock('../tools/split', () => ({
  parsePageRanges: vi.fn(),
  groupsEveryN: vi.fn(),
  allPagesGroups: vi.fn(),
  splitPDF: vi.fn(),
  getPageCount: vi.fn(),
}))

import {
  parsePageRanges,
  groupsEveryN,
  allPagesGroups,
  splitPDF,
  getPageCount,
} from '../tools/split'
import Split from './Split'

const mockParsePageRanges = vi.mocked(parsePageRanges)
const mockGroupsEveryN = vi.mocked(groupsEveryN)
const mockAllPagesGroups = vi.mocked(allPagesGroups)
const mockSplitPDF = vi.mocked(splitPDF)
const mockGetPageCount = vi.mocked(getPageCount)

beforeEach(() => {
  mockParsePageRanges.mockReset()
  mockGroupsEveryN.mockReset()
  mockAllPagesGroups.mockReset()
  mockSplitPDF.mockReset()
  mockGetPageCount.mockReset()
  mockGetPageCount.mockResolvedValue(10)
  mockParsePageRanges.mockReturnValue([[1, 2, 3]])
  mockAllPagesGroups.mockReturnValue([[1], [2], [3]])
  mockGroupsEveryN.mockReturnValue([[1, 2], [3, 4]])
})

function dropFile(file: File) {
  const dropArea = screen.getByTestId('dropzone')
  fireEvent.drop(dropArea, { dataTransfer: { files: [file] } })
}

function makePDF(name = 'doc.pdf', size = 1024) {
  return new File([new ArrayBuffer(size)], name, { type: 'application/pdf' })
}

it('renders idle state with DropZone and privacy note', () => {
  render(<Split />)
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
  expect(screen.getByText(/never leaves your browser/i)).toBeInTheDocument()
})

it('renders how-it-works guide in idle state', () => {
  render(<Split />)
  expect(screen.getByText(/choose how to split/i)).toBeInTheDocument()
  expect(screen.getByText(/page range, every n pages/i)).toBeInTheDocument()
})

it('transitions to ready state after dropping a valid PDF', () => {
  render(<Split />)
  dropFile(makePDF('report.pdf'))
  expect(screen.getByText('report.pdf')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Split' })).toBeInTheDocument()
})

it('shows error for non-PDF file', () => {
  render(<Split />)
  const txt = new File(['text'], 'doc.txt', { type: 'text/plain' })
  dropFile(txt)
  expect(screen.getByText('Please select a valid PDF file.')).toBeInTheDocument()
})

it('shows error for file over 100MB', () => {
  render(<Split />)
  const big = new File([new ArrayBuffer(101 * 1024 * 1024)], 'big.pdf', {
    type: 'application/pdf',
  })
  dropFile(big)
  expect(screen.getByText('File is too large (max 100MB).')).toBeInTheDocument()
})

it('mode selector switches to Every N pages', () => {
  render(<Split />)
  dropFile(makePDF())
  fireEvent.click(screen.getByRole('button', { name: 'Every N pages' }))
  expect(screen.getByLabelText(/every n pages/i)).toBeInTheDocument()
})

it('mode selector switches to All pages', () => {
  render(<Split />)
  dropFile(makePDF())
  fireEvent.click(screen.getByRole('button', { name: 'All pages' }))
  expect(screen.queryByLabelText(/page range/i)).not.toBeInTheDocument()
  expect(screen.queryByLabelText(/every n pages/i)).not.toBeInTheDocument()
})

it('shows text input for page range mode (default)', () => {
  render(<Split />)
  dropFile(makePDF())
  expect(screen.getByLabelText(/page range/i)).toBeInTheDocument()
})

it('shows number input for every-n mode', () => {
  render(<Split />)
  dropFile(makePDF())
  fireEvent.click(screen.getByRole('button', { name: 'Every N pages' }))
  expect(screen.getByRole('spinbutton')).toBeInTheDocument()
})

it('shows inline error for invalid range string', async () => {
  mockParsePageRanges.mockImplementation(() => {
    throw new Error('Invalid range: 5-3')
  })
  render(<Split />)
  dropFile(makePDF())
  await waitFor(() => screen.getByText(/10 pages/))
  fireEvent.click(screen.getByRole('button', { name: 'Split' }))
  expect(screen.getByText('Invalid range: 5-3')).toBeInTheDocument()
})

it('shows inline error for N >= page count', async () => {
  render(<Split />)
  dropFile(makePDF())
  await waitFor(() => screen.getByText(/10 pages/))
  fireEvent.click(screen.getByRole('button', { name: 'Every N pages' }))
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '10' } })
  fireEvent.click(screen.getByRole('button', { name: 'Split' }))
  expect(
    screen.getByText('N must be less than the total number of pages.'),
  ).toBeInTheDocument()
})

it('shows progress bar while splitting', async () => {
  mockSplitPDF.mockImplementation((_file, _groups, onProgress) => {
    onProgress?.(1, 3)
    return new Promise(() => {})
  })
  render(<Split />)
  dropFile(makePDF())
  await waitFor(() => screen.getByText(/10 pages/))
  fireEvent.click(screen.getByRole('button', { name: 'All pages' }))
  fireEvent.click(screen.getByRole('button', { name: 'Split' }))
  await waitFor(() =>
    expect(screen.getByText(/extracting part 1 of 3/i)).toBeInTheDocument(),
  )
})

it('shows summary in done state', async () => {
  mockSplitPDF.mockResolvedValue(new Uint8Array(2048))
  mockAllPagesGroups.mockReturnValue([[1], [2]])
  render(<Split />)
  dropFile(makePDF('report.pdf'))
  await waitFor(() => screen.getByText(/10 pages/))
  fireEvent.click(screen.getByRole('button', { name: 'All pages' }))
  fireEvent.click(screen.getByRole('button', { name: 'Split' }))
  await waitFor(() => screen.getByText('Download ZIP'))
  expect(screen.getByText(/split into 2 parts/i)).toBeInTheDocument()
})

it('download link has correct download attribute', async () => {
  mockSplitPDF.mockResolvedValue(new Uint8Array(2048))
  mockAllPagesGroups.mockReturnValue([[1]])
  render(<Split />)
  dropFile(makePDF('report.pdf'))
  await waitFor(() => screen.getByText(/10 pages/))
  fireEvent.click(screen.getByRole('button', { name: 'All pages' }))
  fireEvent.click(screen.getByRole('button', { name: 'Split' }))
  await waitFor(() => screen.getByText('Download ZIP'))
  expect(screen.getByRole('link', { name: 'Download ZIP' })).toHaveAttribute(
    'download',
    'report-split.zip',
  )
})

it('"Split another PDF" resets to idle', async () => {
  mockSplitPDF.mockResolvedValue(new Uint8Array(2048))
  mockAllPagesGroups.mockReturnValue([[1]])
  render(<Split />)
  dropFile(makePDF())
  await waitFor(() => screen.getByText(/10 pages/))
  fireEvent.click(screen.getByRole('button', { name: 'All pages' }))
  fireEvent.click(screen.getByRole('button', { name: 'Split' }))
  await waitFor(() => screen.getByText('Download ZIP'))
  fireEvent.click(screen.getByRole('button', { name: /split another/i }))
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
})

it('shows error when split fails', async () => {
  mockSplitPDF.mockRejectedValue(new Error('boom'))
  mockAllPagesGroups.mockReturnValue([[1]])
  render(<Split />)
  dropFile(makePDF())
  await waitFor(() => screen.getByText(/10 pages/))
  fireEvent.click(screen.getByRole('button', { name: 'All pages' }))
  fireEvent.click(screen.getByRole('button', { name: 'Split' }))
  await waitFor(() =>
    expect(
      screen.getByText('Something went wrong. Please try again.'),
    ).toBeInTheDocument(),
  )
})
