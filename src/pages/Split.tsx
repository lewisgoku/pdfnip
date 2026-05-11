import DropZone from '../components/DropZone'

export default function Split() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-semibold text-white mb-2">Split PDF</h1>
      <p className="text-gray-400 mb-8">
        Extract pages or split into parts — all processing happens in your browser.
      </p>
      <DropZone onFiles={() => {}} />
    </div>
  )
}
