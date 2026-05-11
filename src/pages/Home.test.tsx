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

it('renders the page heading', () => {
  renderHome()
  expect(screen.getByText('What do you need to do?')).toBeInTheDocument()
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
