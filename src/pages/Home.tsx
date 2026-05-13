import { FileDown, GitMerge, Scissors, FileOutput, RotateCw } from 'lucide-react'
import ToolCard from '../components/ToolCard'
import PageMeta from '../components/PageMeta'

const PDFS_PROCESSED = '250,000+'

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
  {
    title: 'Extract',
    description: 'Pull specific pages into a new PDF',
    detail: 'Page range · Single PDF output',
    icon: <FileOutput size={32} />,
    href: '/extract',
  },
  {
    title: 'Rotate',
    description: 'Rotate all pages in your PDF',
    detail: '90° CW, 180°, or 90° CCW',
    icon: <RotateCw size={32} />,
    href: '/rotate',
  },
]

const STEPS = [
  {
    n: 1,
    title: 'Drop your file',
    body: 'Select any PDF up to 100 MB — drag and drop or click to browse',
  },
  {
    n: 2,
    title: 'Choose your options',
    body: 'Pick compression level, set a page range, or arrange file order',
  },
  {
    n: 3,
    title: 'Download instantly',
    body: 'Your processed PDF is ready immediately — no uploads, no waiting',
  },
]

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <PageMeta
        title="PDFNip | Free PDF Tools"
        description="Free PDF tools that run entirely in your browser. Compress, merge, split, extract, and rotate PDFs — your files never leave your device."
        path="/"
      />
      <div className="mb-14 text-center">
        <span className="inline-block border border-primary text-primary text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-6">
          Free · No account · Ad-supported
        </span>
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-5 tracking-tight leading-tight">
          Trim. Merge.{' '}
          <span className="text-primary">Split.</span>
        </h1>
        <p className="text-gray-400 text-lg max-w-sm mx-auto leading-relaxed">
          Your files never leave your device — ads keep it free.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-6 text-sm text-gray-500">
          <span>0 uploads</span>
          <span className="w-1 h-1 rounded-full bg-gray-600" />
          <span>0 accounts</span>
          <span className="w-1 h-1 rounded-full bg-gray-600" />
          <span className="text-primary font-medium">Files stay local</span>
        </div>
        <p className="text-gray-500 text-xs mt-5">
          <span className="text-white font-semibold">{PDFS_PROCESSED}</span> PDFs processed
        </p>
      </div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Choose a tool</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {TOOLS.map((tool) => (
          <ToolCard key={tool.href} {...tool} />
        ))}
      </div>
      <section className="mt-14">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
          How it works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map(({ n, title, body }) => (
            <div key={n} className="flex items-start gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-surface flex items-center justify-center text-primary font-bold text-sm">
                {n}
              </span>
              <div>
                <p className="text-white text-sm font-medium">{title}</p>
                <p className="text-gray-500 text-xs mt-1">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
