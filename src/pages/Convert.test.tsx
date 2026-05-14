import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, beforeEach } from 'vitest'

vi.mock('../tools/pdfToImages', () => ({ pdfToImages: vi.fn() }))
vi.mock('../tools/imagesToPdf', () => ({ imagesToPdf: vi.fn() }))

import { pdfToImages } from '../tools/pdfToImages'
import { imagesToPdf } from '../tools/imagesToPdf'
import Convert from './Convert'

const mockPdfToImages = vi.mocked(pdfToImages)
const mockImagesToPdf = vi.mocked(imagesToPdf)

beforeEach(() => {
  mockPdfToImages.mockReset()
  mockPdfToImages.mockResolvedValue(new Uint8Array(2048))
  mockImagesToPdf.mockReset()
  mockImagesToPdf.mockResolvedValue(new Uint8Array(4096))
})

function makePDF(name = 'doc.pdf', size = 1024) {
  return new File([new ArrayBuffer(size)], name, { type: 'application/pdf' })
}
function makeJpeg(name = 'photo.jpg', size = 1024) {
  return new File([new ArrayBuffer(size)], name, { type: 'image/jpeg' })
}
function makePng(name = 'photo.png', size = 1024) {
  return new File([new ArrayBuffer(size)], name, { type: 'image/png' })
}
function dropFile(file: File) {
  fireEvent.drop(screen.getByTestId('dropzone'), { dataTransfer: { files: [file] } })
}
function dropFiles(files: File[]) {
  fireEvent.drop(screen.getByTestId('dropzone'), { dataTransfer: { files } })
}
function clickPdfToImages() {
  fireEvent.click(screen.getByRole('button', { name: /pdf.*→.*images/i }))
}
function clickImagesToPdf() {
  fireEvent.click(screen.getByRole('button', { name: /images.*→.*pdf/i }))
}

// ── Direction picker ─────────────────────────────────────────────────────────

it('renders direction picker with two direction buttons', () => {
  render(<Convert />)
  expect(screen.getByRole('button', { name: /pdf.*→.*images/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /images.*→.*pdf/i })).toBeInTheDocument()
})

it('clicking PDF→Images hides picker and shows DropZone', () => {
  render(<Convert />)
  clickPdfToImages()
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /pdf.*→.*images/i })).not.toBeInTheDocument()
})

it('clicking Images→PDF hides picker and shows DropZone', () => {
  render(<Convert />)
  clickImagesToPdf()
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /images.*→.*pdf/i })).not.toBeInTheDocument()
})

it('"← Change direction" from PDF→Images resets to picker', () => {
  render(<Convert />)
  clickPdfToImages()
  fireEvent.click(screen.getByRole('button', { name: /change direction/i }))
  expect(screen.getByRole('button', { name: /pdf.*→.*images/i })).toBeInTheDocument()
})

it('"← Change direction" from Images→PDF resets to picker', () => {
  render(<Convert />)
  clickImagesToPdf()
  fireEvent.click(screen.getByRole('button', { name: /change direction/i }))
  expect(screen.getByRole('button', { name: /images.*→.*pdf/i })).toBeInTheDocument()
})

// ── PDF → Images: idle & validation ─────────────────────────────────────────

it('[pdf→images] idle: shows DropZone', () => {
  render(<Convert />)
  clickPdfToImages()
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
})

it('[pdf→images] non-PDF shows error', () => {
  render(<Convert />)
  clickPdfToImages()
  dropFile(new File(['txt'], 'doc.txt', { type: 'text/plain' }))
  expect(screen.getByText('Please select a valid PDF file.')).toBeInTheDocument()
})

it('[pdf→images] file over 100MB shows error', () => {
  render(<Convert />)
  clickPdfToImages()
  dropFile(new File([new ArrayBuffer(101 * 1024 * 1024)], 'big.pdf', { type: 'application/pdf' }))
  expect(screen.getByText('File is too large (max 100MB).')).toBeInTheDocument()
})

// ── PDF → Images: ready & options ───────────────────────────────────────────

it('[pdf→images] valid PDF drop shows ready state', () => {
  render(<Convert />)
  clickPdfToImages()
  dropFile(makePDF('report.pdf'))
  expect(screen.getByText('report.pdf')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /^Convert$/ })).toBeInTheDocument()
})

it('[pdf→images] JPG selected by default', () => {
  render(<Convert />)
  clickPdfToImages()
  dropFile(makePDF())
  expect(screen.getByRole('button', { name: 'JPG' })).toHaveClass('bg-primary')
})

it('[pdf→images] quality selector shown for JPG', () => {
  render(<Convert />)
  clickPdfToImages()
  dropFile(makePDF())
  expect(screen.getByText('Quality')).toBeInTheDocument()
})

it('[pdf→images] quality selector hidden for PNG', () => {
  render(<Convert />)
  clickPdfToImages()
  dropFile(makePDF())
  fireEvent.click(screen.getByRole('button', { name: 'PNG' }))
  expect(screen.queryByText('Quality')).not.toBeInTheDocument()
})

// ── PDF → Images: converting & done ─────────────────────────────────────────

it('[pdf→images] shows loading state while converting', async () => {
  mockPdfToImages.mockImplementation(() => new Promise(() => {}))
  render(<Convert />)
  clickPdfToImages()
  dropFile(makePDF())
  fireEvent.click(screen.getByRole('button', { name: /^Convert$/ }))
  await waitFor(() => expect(screen.getByText(/converting/i)).toBeInTheDocument())
})

it('[pdf→images] done state shows download link with correct filename', async () => {
  render(<Convert />)
  clickPdfToImages()
  dropFile(makePDF('report.pdf'))
  fireEvent.click(screen.getByRole('button', { name: /^Convert$/ }))
  await waitFor(() => screen.getByRole('link', { name: 'Download' }))
  expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute('download', 'report-images.zip')
})

it('[pdf→images] "Convert another PDF" resets to idle within pdf-to-images flow', async () => {
  render(<Convert />)
  clickPdfToImages()
  dropFile(makePDF())
  fireEvent.click(screen.getByRole('button', { name: /^Convert$/ }))
  await waitFor(() => screen.getByRole('link', { name: 'Download' }))
  fireEvent.click(screen.getByRole('button', { name: /convert another/i }))
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
  // direction preserved — change direction button still shown, picker buttons absent
  expect(screen.getByRole('button', { name: /change direction/i })).toBeInTheDocument()
})

it('[pdf→images] conversion failure shows error and stays in ready state', async () => {
  mockPdfToImages.mockRejectedValue(new Error('boom'))
  render(<Convert />)
  clickPdfToImages()
  dropFile(makePDF())
  fireEvent.click(screen.getByRole('button', { name: /^Convert$/ }))
  await waitFor(() =>
    expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument(),
  )
  expect(screen.getByRole('button', { name: /^Convert$/ })).toBeInTheDocument()
})

// ── Images → PDF: idle & validation ─────────────────────────────────────────

it('[images→pdf] idle: shows DropZone', () => {
  render(<Convert />)
  clickImagesToPdf()
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
})

it('[images→pdf] non-image shows error', () => {
  render(<Convert />)
  clickImagesToPdf()
  dropFiles([new File(['txt'], 'doc.txt', { type: 'text/plain' })])
  expect(screen.getByText('Only JPG and PNG images are supported.')).toBeInTheDocument()
})

it('[images→pdf] more than 20 images shows error', () => {
  render(<Convert />)
  clickImagesToPdf()
  dropFiles(Array.from({ length: 21 }, (_, i) => makeJpeg(`img${i}.jpg`)))
  expect(screen.getByText('Maximum 20 images allowed.')).toBeInTheDocument()
})

it('[images→pdf] total size over 50MB shows error', () => {
  render(<Convert />)
  clickImagesToPdf()
  dropFiles([new File([new ArrayBuffer(51 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' })])
  expect(screen.getByText('Total size exceeds 50 MB limit.')).toBeInTheDocument()
})

// ── Images → PDF: ready & options ───────────────────────────────────────────

it('[images→pdf] valid images show ready state with file list and Convert to PDF button', () => {
  render(<Convert />)
  clickImagesToPdf()
  dropFiles([makeJpeg('a.jpg'), makePng('b.png')])
  expect(screen.getByText('a.jpg')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /convert to pdf/i })).toBeInTheDocument()
})

it('[images→pdf] A4 selected by default', () => {
  render(<Convert />)
  clickImagesToPdf()
  dropFiles([makeJpeg()])
  expect(screen.getByRole('button', { name: 'A4' })).toHaveClass('bg-primary')
})

it('[images→pdf] page size selector shows A4, Letter, and Match image size', () => {
  render(<Convert />)
  clickImagesToPdf()
  dropFiles([makeJpeg()])
  expect(screen.getByRole('button', { name: 'A4' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Letter' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /match image size/i })).toBeInTheDocument()
})

it('[images→pdf] remove button removes file from list', () => {
  render(<Convert />)
  clickImagesToPdf()
  dropFiles([makeJpeg('a.jpg'), makePng('b.png')])
  fireEvent.click(screen.getByRole('button', { name: /remove a\.jpg/i }))
  expect(screen.queryByText('a.jpg')).not.toBeInTheDocument()
  expect(screen.getByText('b.png')).toBeInTheDocument()
})

it('[images→pdf] removing all files shows DropZone', () => {
  render(<Convert />)
  clickImagesToPdf()
  dropFiles([makeJpeg('a.jpg')])
  fireEvent.click(screen.getByRole('button', { name: /remove a\.jpg/i }))
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
})

it('[images→pdf] drag-to-reorder changes file order', () => {
  render(<Convert />)
  clickImagesToPdf()
  dropFiles([makeJpeg('a.jpg'), makePng('b.png'), makeJpeg('c.jpg')])
  const items = screen.getAllByRole('listitem')
  fireEvent.dragStart(items[0])
  fireEvent.dragOver(items[2])
  fireEvent.drop(items[2])
  const updated = screen.getAllByRole('listitem')
  expect(updated[0]).toHaveTextContent('b.png')
  expect(updated[2]).toHaveTextContent('a.jpg')
})

// ── Images → PDF: converting & done ─────────────────────────────────────────

it('[images→pdf] shows loading state while converting', async () => {
  mockImagesToPdf.mockImplementation(() => new Promise(() => {}))
  render(<Convert />)
  clickImagesToPdf()
  dropFiles([makeJpeg()])
  fireEvent.click(screen.getByRole('button', { name: /convert to pdf/i }))
  await waitFor(() => expect(screen.getByText(/converting/i)).toBeInTheDocument())
})

it('[images→pdf] done state shows download link with filename images.pdf', async () => {
  render(<Convert />)
  clickImagesToPdf()
  dropFiles([makeJpeg()])
  fireEvent.click(screen.getByRole('button', { name: /convert to pdf/i }))
  await waitFor(() => screen.getByRole('link', { name: 'Download' }))
  expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute('download', 'images.pdf')
})

it('[images→pdf] "Convert more images" resets to idle within images-to-pdf flow', async () => {
  render(<Convert />)
  clickImagesToPdf()
  dropFiles([makeJpeg()])
  fireEvent.click(screen.getByRole('button', { name: /convert to pdf/i }))
  await waitFor(() => screen.getByRole('link', { name: 'Download' }))
  fireEvent.click(screen.getByRole('button', { name: /convert more images/i }))
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /change direction/i })).toBeInTheDocument()
})

it('[images→pdf] conversion failure shows error and stays in ready state', async () => {
  mockImagesToPdf.mockRejectedValue(new Error('boom'))
  render(<Convert />)
  clickImagesToPdf()
  dropFiles([makeJpeg()])
  fireEvent.click(screen.getByRole('button', { name: /convert to pdf/i }))
  await waitFor(() =>
    expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument(),
  )
  expect(screen.getByRole('button', { name: /convert to pdf/i })).toBeInTheDocument()
})

it('[images→pdf] passes selected page size to imagesToPdf', async () => {
  render(<Convert />)
  clickImagesToPdf()
  dropFiles([makeJpeg()])
  fireEvent.click(screen.getByRole('button', { name: 'Letter' }))
  fireEvent.click(screen.getByRole('button', { name: /convert to pdf/i }))
  await waitFor(() => screen.getByRole('link', { name: 'Download' }))
  expect(mockImagesToPdf).toHaveBeenCalledWith(expect.any(Array), 'letter')
})
