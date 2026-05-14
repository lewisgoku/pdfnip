import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, beforeEach } from 'vitest'

vi.mock('../tools/imagesToPdf', () => ({
  imagesToPdf: vi.fn(),
}))

import { imagesToPdf } from '../tools/imagesToPdf'
import ImagesToPdf from './ImagesToPdf'

const mockImagesToPdf = vi.mocked(imagesToPdf)

beforeEach(() => {
  mockImagesToPdf.mockReset()
  mockImagesToPdf.mockResolvedValue(new Uint8Array(4096))
})

function makeJpeg(name = 'photo.jpg', size = 1024) {
  return new File([new ArrayBuffer(size)], name, { type: 'image/jpeg' })
}

function makePng(name = 'photo.png', size = 1024) {
  return new File([new ArrayBuffer(size)], name, { type: 'image/png' })
}

function dropFiles(files: File[]) {
  const dropArea = screen.getByTestId('dropzone')
  fireEvent.drop(dropArea, { dataTransfer: { files } })
}

it('renders idle state with DropZone and privacy note', () => {
  render(<ImagesToPdf />)
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
  expect(screen.getByText(/never leave your browser/i)).toBeInTheDocument()
})

it('transitions to ready state after dropping valid images', () => {
  render(<ImagesToPdf />)
  dropFiles([makeJpeg('a.jpg'), makePng('b.png')])
  expect(screen.getByText('a.jpg')).toBeInTheDocument()
  expect(screen.getByText('b.png')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /convert to pdf/i })).toBeInTheDocument()
})

it('shows error for non-image file', () => {
  render(<ImagesToPdf />)
  dropFiles([new File(['text'], 'doc.txt', { type: 'text/plain' })])
  expect(screen.getByText('Only JPG and PNG images are supported.')).toBeInTheDocument()
})

it('shows error when more than 20 images are dropped', () => {
  render(<ImagesToPdf />)
  const files = Array.from({ length: 21 }, (_, i) => makeJpeg(`img${i}.jpg`))
  dropFiles(files)
  expect(screen.getByText('Maximum 20 images allowed.')).toBeInTheDocument()
})

it('shows error when total size exceeds 50 MB', () => {
  render(<ImagesToPdf />)
  const big = new File([new ArrayBuffer(51 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' })
  dropFiles([big])
  expect(screen.getByText('Total size exceeds 50 MB limit.')).toBeInTheDocument()
})

it('has A4 selected by default', () => {
  render(<ImagesToPdf />)
  dropFiles([makeJpeg()])
  expect(screen.getByRole('button', { name: 'A4' })).toHaveClass('bg-primary')
})

it('shows page size selector with A4, Letter, and Match image size options', () => {
  render(<ImagesToPdf />)
  dropFiles([makeJpeg()])
  expect(screen.getByRole('button', { name: 'A4' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Letter' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /match image size/i })).toBeInTheDocument()
})

it('remove button removes a file from the list', () => {
  render(<ImagesToPdf />)
  dropFiles([makeJpeg('a.jpg'), makePng('b.png'), makeJpeg('c.jpg')])
  fireEvent.click(screen.getByRole('button', { name: /remove a\.jpg/i }))
  expect(screen.queryByText('a.jpg')).not.toBeInTheDocument()
  expect(screen.getByText('b.png')).toBeInTheDocument()
})

it('removing all files resets to idle', () => {
  render(<ImagesToPdf />)
  dropFiles([makeJpeg('a.jpg')])
  fireEvent.click(screen.getByRole('button', { name: /remove a\.jpg/i }))
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
})

it('drag-and-drop reorder updates file order', () => {
  render(<ImagesToPdf />)
  dropFiles([makeJpeg('a.jpg'), makePng('b.png'), makeJpeg('c.jpg')])
  const items = screen.getAllByRole('listitem')
  fireEvent.dragStart(items[0])
  fireEvent.dragOver(items[2])
  fireEvent.drop(items[2])
  const updated = screen.getAllByRole('listitem')
  expect(updated[0]).toHaveTextContent('b.png')
  expect(updated[2]).toHaveTextContent('a.jpg')
})

it('shows loading state while converting', async () => {
  mockImagesToPdf.mockImplementation(() => new Promise(() => {}))
  render(<ImagesToPdf />)
  dropFiles([makeJpeg()])
  fireEvent.click(screen.getByRole('button', { name: /convert to pdf/i }))
  await waitFor(() => expect(screen.getByText(/converting/i)).toBeInTheDocument())
})

it('shows download button in done state', async () => {
  render(<ImagesToPdf />)
  dropFiles([makeJpeg()])
  fireEvent.click(screen.getByRole('button', { name: /convert to pdf/i }))
  await waitFor(() => screen.getByText('Download'))
  expect(screen.getByRole('link', { name: 'Download' })).toBeInTheDocument()
})

it('download link has filename images.pdf', async () => {
  render(<ImagesToPdf />)
  dropFiles([makeJpeg()])
  fireEvent.click(screen.getByRole('button', { name: /convert to pdf/i }))
  await waitFor(() => screen.getByText('Download'))
  expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute('download', 'images.pdf')
})

it('"Convert more images" resets to idle', async () => {
  render(<ImagesToPdf />)
  dropFiles([makeJpeg()])
  fireEvent.click(screen.getByRole('button', { name: /convert to pdf/i }))
  await waitFor(() => screen.getByText('Download'))
  fireEvent.click(screen.getByRole('button', { name: /convert more images/i }))
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
})

it('shows error when conversion fails', async () => {
  mockImagesToPdf.mockRejectedValue(new Error('boom'))
  render(<ImagesToPdf />)
  dropFiles([makeJpeg()])
  fireEvent.click(screen.getByRole('button', { name: /convert to pdf/i }))
  await waitFor(() =>
    expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument(),
  )
})

it('passes selected page size to imagesToPdf', async () => {
  render(<ImagesToPdf />)
  dropFiles([makeJpeg()])
  fireEvent.click(screen.getByRole('button', { name: 'Letter' }))
  fireEvent.click(screen.getByRole('button', { name: /convert to pdf/i }))
  await waitFor(() => screen.getByText('Download'))
  expect(mockImagesToPdf).toHaveBeenCalledWith(expect.any(Array), 'letter')
})
