import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import DropZone from './DropZone'

it('renders the default drop label', () => {
  render(<DropZone onFiles={() => {}} />)
  expect(screen.getByText(/drop your pdf/i)).toBeInTheDocument()
})

it('renders a custom label when provided', () => {
  render(<DropZone onFiles={() => {}} label="Drop files here" />)
  expect(screen.getByText('Drop files here')).toBeInTheDocument()
})

it('calls onFiles with dropped files', () => {
  const onFiles = vi.fn()
  render(<DropZone onFiles={onFiles} />)
  const dropArea = screen.getByTestId('dropzone')
  const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })

  fireEvent.drop(dropArea, {
    dataTransfer: { files: [file] },
  })

  expect(onFiles).toHaveBeenCalledWith([file])
})

it('shows filename and size after file is dropped', () => {
  render(<DropZone onFiles={() => {}} />)
  const dropArea = screen.getByTestId('dropzone')
  const file = new File(['hello'], 'my-doc.pdf', { type: 'application/pdf' })

  fireEvent.drop(dropArea, {
    dataTransfer: { files: [file] },
  })

  expect(screen.getByText('my-doc.pdf')).toBeInTheDocument()
})

it('applies teal border class when dragging over', () => {
  render(<DropZone onFiles={() => {}} />)
  const dropArea = screen.getByTestId('dropzone')

  fireEvent.dragOver(dropArea)
  expect(dropArea.className).toContain('border-primary')

  fireEvent.dragLeave(dropArea)
  expect(dropArea.className).not.toContain('border-primary')
})
