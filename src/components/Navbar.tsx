import { Link, NavLink } from 'react-router-dom'

const NAV_LINKS = [
  { to: '/compress', label: 'Compress' },
  { to: '/merge', label: 'Merge' },
  { to: '/split', label: 'Split' },
]

export default function Navbar() {
  return (
    <nav aria-label="Main navigation" className="sticky top-0 z-10 bg-bg px-6 py-4 flex items-center justify-between">
      <Link to="/" className="font-display font-bold text-2xl leading-none">
        <span className="text-white">pdf</span>
        <span className="text-primary">nip</span>
      </Link>
      <div className="flex items-center gap-6">
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
          className="text-sm font-medium px-3 py-1.5 rounded-full border border-primary text-primary hover:bg-primary hover:text-bg transition-colors"
        >
          ☕ Donate
        </a>
      </div>
    </nav>
  )
}
