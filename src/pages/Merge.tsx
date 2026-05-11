import DropZone from '../components/DropZone'

export default function Merge() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-semibold text-white mb-2">Merge PDFs</h1>
      <p className="text-gray-400 mb-8">
        Combine multiple PDF files into one — all processing happens in your browser.
      </p>
      <DropZone onFiles={() => {}} multiple label="Drop your PDFs here or click to browse" />
    </div>
  )
}
