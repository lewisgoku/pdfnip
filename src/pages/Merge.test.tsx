import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, beforeEach } from 'vitest'

vi.mock('../tools/merge', () => ({
  mergePDFs: vi.fn(),
  getPageCount: vi.fn(),
}))

import { mergePDFs, getPageCount } from '../tools/merge'
import Merge from './Merge'

const mockMerge = vi.mocked(mergePDFs)
const mockGetPageCount = vi.mocked(getPageCount)

beforeEach(() => {
  mockMerge.mockReset()
  mockGetPageCount.mockReset()
  mockGetPageCount.mockResolvedValue(5)
})

function dropFiles(files: File[]) {
  const dropArea = screen.getByTestId('dropzone')
  fireEvent.drop(dropArea, { dataTransfer: { files } })
}

function makePDF(name = 'test.pdf', size = 1024) {
  return new File([new ArrayBuffer(size)], name, { type: 'application/pdf' })
}

it('renders idle state with DropZone and privacy note', () => {
  render(<Merge />)
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
  expect(screen.getByText(/never leaves your browser/i)).toBeInTheDocument()
})

it('transitions to ready state after dropping 2 valid files', () => {
  render(<Merge />)
  dropFiles([makePDF('a.pdf'), makePDF('b.pdf')])
  expect(screen.getByText('a.pdf')).toBeInTheDocument()
  expect(screen.getByText('b.pdf')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Merge' })).toBeInTheDocument()
})

it('shows "— pages" while page count is loading', () => {
  mockGetPageCount.mockReturnValue(new Promise(() => {}))
  render(<Merge />)
  dropFiles([makePDF('a.pdf'), makePDF('b.pdf')])
  expect(screen.getAllByText(/— pages/)).toHaveLength(2)
})

it('shows page count after getPageCount resolves', async () => {
  mockGetPageCount.mockResolvedValue(7)
  render(<Merge />)
  dropFiles([makePDF('a.pdf'), makePDF('b.pdf')])
  await waitFor(() => expect(screen.getAllByText(/7 pages/)).toHaveLength(2))
})

it('remove button removes a file from the list', () => {
  render(<Merge />)
  dropFiles([makePDF('a.pdf'), makePDF('b.pdf'), makePDF('c.pdf')])
  fireEvent.click(screen.getByRole('button', { name: /remove a\.pdf/i }))
  expect(screen.queryByText('a.pdf')).not.toBeInTheDocument()
  expect(screen.getByText('b.pdf')).toBeInTheDocument()
})

it('removing below 2 files resets to idle', () => {
  render(<Merge />)
  dropFiles([makePDF('a.pdf'), makePDF('b.pdf')])
  fireEvent.click(screen.getByRole('button', { name: /remove a\.pdf/i }))
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
})

it('drag-and-drop reorder updates file order', () => {
  render(<Merge />)
  dropFiles([makePDF('a.pdf'), makePDF('b.pdf'), makePDF('c.pdf')])
  const items = screen.getAllByRole('listitem')
  fireEvent.dragStart(items[0])
  fireEvent.dragOver(items[2])
  fireEvent.drop(items[2])
  const updated = screen.getAllByRole('listitem')
  expect(updated[0]).toHaveTextContent('b.pdf')
  expect(updated[2]).toHaveTextContent('a.pdf')
})

it('shows error for non-PDF file', () => {
  render(<Merge />)
  const txt = new File(['text'], 'doc.txt', { type: 'text/plain' })
  dropFiles([txt])
  expect(screen.getByText('Please select valid PDF files only.')).toBeInTheDocument()
})

it('shows progress bar while merging', async () => {
  mockMerge.mockImplementation((_files, onProgress) => {
    onProgress?.(1, 2)
    return new Promise(() => {})
  })
  render(<Merge />)
  dropFiles([makePDF('a.pdf'), makePDF('b.pdf')])
  fireEvent.click(screen.getByRole('button', { name: 'Merge' }))
  await waitFor(() =>
    expect(screen.getByText(/merging file 1 of 2/i)).toBeInTheDocument(),
  )
})

it('shows summary in done state', async () => {
  mockMerge.mockResolvedValue(new ArrayBuffer(2048))
  mockGetPageCount.mockResolvedValue(5)
  render(<Merge />)
  dropFiles([makePDF('a.pdf', 1024), makePDF('b.pdf', 1024)])
  fireEvent.click(screen.getByRole('button', { name: 'Merge' }))
  await waitFor(() => expect(screen.getByText('Download')).toBeInTheDocument())
  expect(screen.getByText(/2 files merged/i)).toBeInTheDocument()
})

it('download link has download="merged.pdf"', async () => {
  mockMerge.mockResolvedValue(new ArrayBuffer(2048))
  render(<Merge />)
  dropFiles([makePDF('a.pdf'), makePDF('b.pdf')])
  fireEvent.click(screen.getByRole('button', { name: 'Merge' }))
  await waitFor(() => screen.getByText('Download'))
  expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute('download', 'merged.pdf')
})

it('"Merge more PDFs" resets to idle', async () => {
  mockMerge.mockResolvedValue(new ArrayBuffer(2048))
  render(<Merge />)
  dropFiles([makePDF('a.pdf'), makePDF('b.pdf')])
  fireEvent.click(screen.getByRole('button', { name: 'Merge' }))
  await waitFor(() => screen.getByText('Download'))
  fireEvent.click(screen.getByRole('button', { name: /merge more/i }))
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
})

it('shows error when merge fails', async () => {
  mockMerge.mockRejectedValue(new Error('boom'))
  render(<Merge />)
  dropFiles([makePDF('a.pdf'), makePDF('b.pdf')])
  fireEvent.click(screen.getByRole('button', { name: 'Merge' }))
  await waitFor(() =>
    expect(
      screen.getByText('Something went wrong. Please try again.'),
    ).toBeInTheDocument(),
  )
})
