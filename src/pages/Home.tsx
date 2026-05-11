import { FileDown, GitMerge, Scissors } from 'lucide-react'
import ToolCard from '../components/ToolCard'

const TOOLS = [
  {
    title: 'Compress',
    description: 'Reduce PDF file size without losing quality',
    icon: <FileDown size={32} />,
    href: '/compress',
  },
  {
    title: 'Merge',
    description: 'Join multiple PDFs into one document',
    icon: <GitMerge size={32} />,
    href: '/merge',
  },
  {
    title: 'Split',
    description: 'Extract pages or split into parts',
    icon: <Scissors size={32} />,
    href: '/split',
  },
]

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-semibold text-white mb-8">What do you need to do?</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TOOLS.map((tool) => (
          <ToolCard key={tool.href} {...tool} />
        ))}
      </div>
    </div>
  )
}
