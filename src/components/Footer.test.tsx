import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Footer from './Footer'

function renderFooter() {
  return render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>,
  )
}

it('renders copyright notice', () => {
  renderFooter()
  expect(screen.getByText(/pdfnip\. all rights reserved/i)).toBeInTheDocument()
})

it('renders privacy policy link', () => {
  renderFooter()
  expect(screen.getByRole('link', { name: 'Privacy Policy' })).toBeInTheDocument()
})

it('renders terms of use link', () => {
  renderFooter()
  expect(screen.getByRole('link', { name: 'Terms of Use' })).toBeInTheDocument()
})

it('renders twitter/x social link', () => {
  renderFooter()
  expect(screen.getByRole('link', { name: /twitter|x/i })).toBeInTheDocument()
})
