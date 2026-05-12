import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export interface ToolCardProps {
  title: string
  description: string
  detail?: string
  icon: ReactNode
  href: string
}

export default function ToolCard({ title, description, detail, icon, href }: ToolCardProps) {
  return (
    <Link
      to={href}
      className="group block bg-surface rounded-xl p-6 border-l-2 border-transparent hover:border-primary hover:scale-[1.02] transition-all duration-200"
    >
      <div className="text-primary mb-3">{icon}</div>
      <h3 className="text-white font-semibold text-lg mb-1">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
      {detail && <p className="text-gray-500 text-xs mt-2">{detail}</p>}
      <div className="mt-4 flex justify-end">
        <span className="text-primary text-sm">Open →</span>
      </div>
    </Link>
  )
}
