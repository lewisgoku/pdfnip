import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Compress from './pages/Compress'
import Merge from './pages/Merge'
import Split from './pages/Split'
import Extract from './pages/Extract'
import Rotate from './pages/Rotate'
import Convert from './pages/Convert'
import UnlockPdf from './pages/UnlockPdf'
import ProtectPdf from './pages/ProtectPdf'
import PrivacyPolicy from './pages/PrivacyPolicy'
import Terms from './pages/Terms'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'compress', element: <Compress /> },
      { path: 'merge', element: <Merge /> },
      { path: 'split', element: <Split /> },
      { path: 'extract', element: <Extract /> },
      { path: 'rotate', element: <Rotate /> },
      { path: 'convert', element: <Convert /> },
      { path: 'pdf-to-images', element: <Navigate to="/convert" replace /> },
      { path: 'images-to-pdf', element: <Navigate to="/convert" replace /> },
      { path: 'unlock-pdf', element: <UnlockPdf /> },
      { path: 'protect-pdf', element: <ProtectPdf /> },
      { path: 'privacy', element: <PrivacyPolicy /> },
      { path: 'terms', element: <Terms /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
