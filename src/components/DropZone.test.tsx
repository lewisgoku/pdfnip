import { render, screen } from '@testing-library/react'
import DropZone from './DropZone'

it('renders the drop label', () => {
  render(<DropZone onFiles={() => {}} />)
  expect(screen.getByText(/drop your pdf/i)).toBeInTheDocument()
})

it('renders a custom label when provided', () => {
  render(<DropZone onFiles={() => {}} label="Drop files here" />)
  expect(screen.getByText('Drop files here')).toBeInTheDocument()
})
