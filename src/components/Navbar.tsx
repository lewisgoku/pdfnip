import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Menu, X } from 'lucide-react'

const NAV_LINKS = [
  { to: '/compress', label: 'Compress' },
  { to: '/merge', label: 'Merge' },
  { to: '/split', label: 'Split' },
]

const donateClass =
  'text-sm font-medium px-3 py-1.5 rounded-full border border-primary text-primary hover:bg-primary hover:text-bg transition-colors'

export default function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <nav aria-label="Main navigation" className="sticky top-0 z-10 bg-bg border-b border-white/5">
      <div className="px-6 py-4 flex items-center justify-between">
        <Link to="/" className="font-display font-bold text-2xl leading-none">
          <span className="text-white">pdf</span>
          <span className="text-primary">nip</span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-white border-b border-primary pb-0.5'
                    : 'text-gray-400 hover:text-white'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
          <a
            href="https://buymeacoffee.com/PLACEHOLDER"
            target="_blank"
            rel="noopener noreferrer"
            className={donateClass}
          >
            ☕ Donate
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-gray-400 hover:text-white transition-colors"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden px-6 pb-5 flex flex-col gap-4 border-t border-white/5">
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${
                  isActive ? 'text-white' : 'text-gray-400'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
          <a
            href="https://buymeacoffee.com/PLACEHOLDER"
            target="_blank"
            rel="noopener noreferrer"
            className={`${donateClass} self-start`}
          >
            ☕ Donate
          </a>
        </div>
      )}
    </nav>
  )
}
