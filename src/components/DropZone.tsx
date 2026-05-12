import { useRef, useState } from 'react'
import { formatBytes } from '../utils/formatBytes'

export interface DropZoneProps {
  accept?: string
  multiple?: boolean
  onFiles: (files: File[]) => void
  label?: string
}

export default function DropZone({
  accept,
  multiple = false,
  onFiles,
  label = 'Drop your PDF here or click to browse',
}: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [selected, setSelected] = useState<File | null>(null)

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const arr = Array.from(files)
    setSelected(arr[0])
    onFiles(arr)
  }

  return (
    <div
      data-testid="dropzone"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragging(false)
        handleFiles(e.dataTransfer?.files ?? null)
      }}
      className={`flex items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
        isDragging ? 'border-primary' : 'border-gray-600'
      } ${isDragging ? '' : 'hover:border-gray-400'}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {selected ? (
        <div className="text-center">
          <p className="text-white text-sm font-medium">{selected.name}</p>
          <p className="text-gray-400 text-xs mt-1">{formatBytes(selected.size)}</p>
        </div>
      ) : (
        <p className="text-gray-400 text-sm">{label}</p>
      )}
    </div>
  )
}
