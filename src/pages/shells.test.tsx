import { vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Compress from './Compress'
import Merge from './Merge'
import Split from './Split'

vi.mock('../tools/compress', () => ({
  compressPDF: vi.fn(),
}))

vi.mock('../tools/merge', () => ({
  mergePDFs: vi.fn(),
  getPageCount: vi.fn(),
}))

vi.mock('../tools/split', () => ({
  parsePageRanges: vi.fn(),
  groupsEveryN: vi.fn(),
  allPagesGroups: vi.fn(),
  splitPDF: vi.fn(),
  getPageCount: vi.fn(),
}))

it('Compress page renders heading and drop zone', () => {
  render(<Compress />)
  expect(screen.getByText('Compress PDF')).toBeInTheDocument()
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
})

it('Merge page renders heading and drop zone', () => {
  render(<Merge />)
  expect(screen.getByText('Merge PDFs')).toBeInTheDocument()
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
})

it('Split page renders heading and drop zone', () => {
  render(<Split />)
  expect(screen.getByText('Split PDF')).toBeInTheDocument()
  expect(screen.getByTestId('dropzone')).toBeInTheDocument()
})
