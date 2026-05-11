import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ToolCard from './ToolCard'

function renderCard() {
  return render(
    <MemoryRouter>
      <ToolCard
        title="Compress"
        description="Reduce PDF file size"
        icon={<span data-testid="icon">icon</span>}
        href="/compress"
      />
    </MemoryRouter>,
  )
}

it('renders the title', () => {
  renderCard()
  expect(screen.getByText('Compress')).toBeInTheDocument()
})

it('renders the description', () => {
  renderCard()
  expect(screen.getByText('Reduce PDF file size')).toBeInTheDocument()
})

it('renders the icon', () => {
  renderCard()
  expect(screen.getByTestId('icon')).toBeInTheDocument()
})

it('links to the correct href', () => {
  renderCard()
  expect(screen.getByRole('link')).toHaveAttribute('href', '/compress')
})
