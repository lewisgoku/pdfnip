import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Navbar from './Navbar'

function renderNavbar(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Navbar />
    </MemoryRouter>,
  )
}

it('renders the pdfnip wordmark', () => {
  renderNavbar()
  expect(screen.getByText('pdf')).toBeInTheDocument()
  expect(screen.getByText('nip')).toBeInTheDocument()
})

it('renders all three nav links', () => {
  renderNavbar()
  expect(screen.getByRole('link', { name: 'Compress' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Merge' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Split' })).toBeInTheDocument()
})

it('nav links point to correct routes', () => {
  renderNavbar()
  expect(screen.getByRole('link', { name: 'Compress' })).toHaveAttribute('href', '/compress')
  expect(screen.getByRole('link', { name: 'Merge' })).toHaveAttribute('href', '/merge')
  expect(screen.getByRole('link', { name: 'Split' })).toHaveAttribute('href', '/split')
})
