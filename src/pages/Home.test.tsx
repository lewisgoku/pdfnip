import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Home from './Home'

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  )
}

it('renders the hero tagline', () => {
  renderHome()
  expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  expect(screen.getByText(/trim\. merge\./i)).toBeInTheDocument()
})

it('renders all three tool cards', () => {
  renderHome()
  expect(screen.getByText('Compress')).toBeInTheDocument()
  expect(screen.getByText('Merge')).toBeInTheDocument()
  expect(screen.getByText('Split')).toBeInTheDocument()
})

it('tool cards link to correct routes', () => {
  renderHome()
  expect(screen.getByRole('link', { name: /compress/i })).toHaveAttribute('href', '/compress')
  expect(screen.getByRole('link', { name: /merge/i })).toHaveAttribute('href', '/merge')
  expect(screen.getByRole('link', { name: /split/i })).toHaveAttribute('href', '/split')
})

it('renders the pdfs processed counter', () => {
  renderHome()
  expect(screen.getByText(/pdfs processed/i)).toBeInTheDocument()
  expect(screen.getByText(/\d{3},\d{3}\+/)).toBeInTheDocument()
})

it('renders the how-it-works section heading', () => {
  renderHome()
  expect(screen.getByText(/how it works/i)).toBeInTheDocument()
})

it('renders all three how-it-works steps', () => {
  renderHome()
  expect(screen.getByText('Drop your file')).toBeInTheDocument()
  expect(screen.getByText('Choose your options')).toBeInTheDocument()
  expect(screen.getByText('Download instantly')).toBeInTheDocument()
})

it('renders Extract and Rotate tool cards', () => {
  renderHome()
  expect(screen.getByText('Extract')).toBeInTheDocument()
  expect(screen.getByText('Rotate')).toBeInTheDocument()
})

it('Extract and Rotate cards link to correct routes', () => {
  renderHome()
  const links = screen.getAllByRole('link')
  const extractLink = links.find((l) => l.getAttribute('href') === '/extract')
  const rotateLink = links.find((l) => l.getAttribute('href') === '/rotate')
  expect(extractLink).toBeInTheDocument()
  expect(rotateLink).toBeInTheDocument()
})
