import { vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

vi.mock('./tools/compress', () => ({
  compressPDF: vi.fn(),
}))

it('renders Home page at root route', () => {
  render(<App />)
  expect(screen.getByText('What do you need to do?')).toBeInTheDocument()
})

it('renders Navbar on Home', () => {
  render(<App />)
  expect(screen.getByText('pdf')).toBeInTheDocument()
  expect(screen.getByText('nip')).toBeInTheDocument()
})
