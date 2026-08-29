import { useRef, useState } from 'react'
import { normalizeStoredMediaPath, resolveMediaUrl, uploadImage } from '../../api/client'

interface ImageUploadProps {
  label: string
  value: string
  onChange: (url: string) => void
}

export function ImageUpload({ label, value, onChange }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const storedPath = normalizeStoredMediaPath(value)

  const handleFile = async (file: File) => {
    setError('')
    setUploading(true)
    try {
      const path = await uploadImage(file)
      onChange(path)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yükleme başarısız.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <span className="block text-sm text-white/85">{label}</span>

      {storedPath && (
        <>
          <img src={resolveMediaUrl(storedPath)} alt="" className="h-32 w-full max-w-xs rounded-lg object-cover" />
          <p className="font-mono text-xs text-white/45">{storedPath}</p>
        </>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15 disabled:opacity-60"
        >
          {uploading ? 'Yükleniyor...' : storedPath ? 'Başka Görsel Yükle' : 'Dosya Yükle'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void handleFile(file)
          }}
        />
      </div>

      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  )
}
