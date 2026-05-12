import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="border-t border-white/5 mt-16">
      <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500">
        <span>© {new Date().getFullYear()} PDFNip. All rights reserved.</span>
        <nav className="flex items-center gap-5">
          <Link to="/privacy" className="hover:text-gray-300 transition-colors">
            Privacy Policy
          </Link>
          <Link to="/terms" className="hover:text-gray-300 transition-colors">
            Terms of Use
          </Link>
          <a
            href="https://x.com/pdfnip"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Twitter / X"
            className="hover:text-gray-300 transition-colors"
          >
            𝕏
          </a>
        </nav>
      </div>
    </footer>
  )
}
