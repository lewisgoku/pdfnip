import { FileDown, GitMerge, Scissors } from 'lucide-react'
import ToolCard from '../components/ToolCard'
import PageMeta from '../components/PageMeta'

const TOOLS = [
  {
    title: 'Compress',
    description: 'Reduce PDF file size without losing quality',
    detail: '3 quality levels · No file size limit',
    icon: <FileDown size={32} />,
    href: '/compress',
  },
  {
    title: 'Merge',
    description: 'Join multiple PDFs into one document',
    detail: '2–10 files · Drag to reorder',
    icon: <GitMerge size={32} />,
    href: '/merge',
  },
  {
    title: 'Split',
    description: 'Extract pages or split into parts',
    detail: 'By range, every N pages, or all · ZIP output',
    icon: <Scissors size={32} />,
    href: '/split',
  },
]

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <PageMeta
        title="PDFNip — Free PDF Tools | Compress, Merge & Split"
        description="Free, private PDF tools that run entirely in your browser. Compress, merge, and split PDFs — no uploads, no account required."
        path="/"
      />
      <div className="mb-14 text-center">
        <span className="inline-block border border-primary text-primary text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-6">
          Free · Private · No account
        </span>
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-5 tracking-tight leading-tight">
          Trim. Merge.{' '}
          <span className="text-primary">Split.</span>
        </h1>
        <p className="text-gray-400 text-lg max-w-sm mx-auto leading-relaxed">
          Your files never leave your device.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-6 text-sm text-gray-500">
          <span>0 uploads</span>
          <span className="w-1 h-1 rounded-full bg-gray-600" />
          <span>0 accounts</span>
          <span className="w-1 h-1 rounded-full bg-gray-600" />
          <span className="text-primary font-medium">100% private</span>
        </div>
      </div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Choose a tool</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TOOLS.map((tool) => (
          <ToolCard key={tool.href} {...tool} />
        ))}
      </div>
    </div>
  )
}
