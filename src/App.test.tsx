import { vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

vi.mock('./tools/compress', () => ({
  compressPDF: vi.fn(),
}))

vi.mock('./tools/merge', () => ({
  mergePDFs: vi.fn(),
  getPageCount: vi.fn(),
}))

vi.mock('./tools/split', () => ({
  parsePageRanges: vi.fn(),
  groupsEveryN: vi.fn(),
  allPagesGroups: vi.fn(),
  splitPDF: vi.fn(),
  getPageCount: vi.fn(),
}))

vi.mock('./tools/pdfToImages', () => ({
  pdfToImages: vi.fn(),
}))

it('renders Home page at root route', () => {
  render(<App />)
  expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
})

it('renders Navbar on Home', () => {
  render(<App />)
  expect(screen.getByText('pdf')).toBeInTheDocument()
  expect(screen.getByText('nip')).toBeInTheDocument()
})
