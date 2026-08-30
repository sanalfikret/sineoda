import { useRef, useState } from 'react'
import { normalizeStoredMediaPath, resolveMediaUrl, uploadVideo } from '../../api/client'

interface VideoUploadProps {
  label: string
  value: string
  onChange: (url: string) => void
}

export function VideoUpload({ label, value, onChange }: VideoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')

  const handleFile = async (file: File) => {
    setError('')
    setProgress('')
    setUploading(true)

    try {
      setProgress(`${(file.size / (1024 * 1024)).toFixed(1)} MB yükleniyor...`)
      const path = await uploadVideo(file)
      onChange(path)
      setProgress('Yükleme tamamlandı.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yükleme başarısız.')
    } finally {
      setUploading(false)
    }
  }

  const storedPath = value ? normalizeStoredMediaPath(value) : ''
  const previewUrl = storedPath ? resolveMediaUrl(storedPath) : ''
  const isUploadedFile = storedPath.startsWith('/uploads/')

  return (
    <div className="space-y-2">
      <span className="block text-sm text-white/85">{label}</span>

      {previewUrl && (
        <video
          src={previewUrl}
          controls
          className="max-h-48 w-full max-w-md rounded-lg bg-black"
        />
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15 disabled:opacity-60"
        >
          {uploading ? 'Yükleniyor...' : 'Video Dosyası Yükle'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void handleFile(file)
          }}
        />
      </div>

      {isUploadedFile && storedPath && (
        <p className="font-mono text-xs text-white/45">{storedPath}</p>
      )}

      <input
        type="url"
        value={isUploadedFile ? '' : value}
        onChange={(event) => onChange(normalizeStoredMediaPath(event.target.value))}
        placeholder="Bunny CDN HLS (.m3u8) veya MP4 URL yapıştır"
        className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-2.5 text-white outline-none focus:border-plooy-gold"
      />

      {progress && <p className="text-xs text-plooy-muted">{progress}</p>}
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  )
}
