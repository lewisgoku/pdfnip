import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import Layout from './Layout'

function renderLayout() {
  const router = createMemoryRouter([
    {
      path: '/',
      element: <Layout />,
      children: [{ index: true, element: <div>page content</div> }],
    },
  ])
  return render(<RouterProvider router={router} />)
}

it('renders the navbar', () => {
  renderLayout()
  expect(screen.getByText('pdf')).toBeInTheDocument()
})

it('renders outlet content', () => {
  renderLayout()
  expect(screen.getByText('page content')).toBeInTheDocument()
})
