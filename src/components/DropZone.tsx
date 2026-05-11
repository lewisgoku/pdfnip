export interface DropZoneProps {
  accept?: string
  multiple?: boolean
  onFiles: (files: File[]) => void
  label?: string
}

export default function DropZone({
  label = 'Drop your PDF here or click to browse',
}: DropZoneProps) {
  return (
    <div className="flex items-center justify-center w-full h-48 border-2 border-dashed border-gray-600 rounded-xl cursor-pointer hover:border-primary transition-colors">
      <p className="text-gray-400 text-sm">{label}</p>
    </div>
  )
}
