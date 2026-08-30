import { useEffect, useRef, useState } from 'react'

interface AdminCategoryTitleFieldProps {
  categoryId: string
  title: string
  disabled?: boolean
  onSave: (title: string) => Promise<void>
  onEditingChange?: (editing: boolean) => void
}

export function AdminCategoryTitleField({
  categoryId,
  title,
  disabled = false,
  onSave,
  onEditingChange,
}: AdminCategoryTitleFieldProps) {
  const [draft, setDraft] = useState(title)
  const [saving, setSaving] = useState(false)
  const focusedRef = useRef(false)

  useEffect(() => {
    if (!focusedRef.current) {
      setDraft(title)
    }
  }, [title, categoryId])

  const commit = async () => {
    focusedRef.current = false
    onEditingChange?.(false)

    const trimmed = draft.trim()
    if (!trimmed) {
      setDraft(title)
      return
    }
    if (trimmed === title.trim()) {
      setDraft(trimmed)
      return
    }

    setSaving(true)
    try {
      await onSave(trimmed)
      setDraft(trimmed)
    } catch {
      setDraft(title)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mb-4">
      <input
        value={draft}
        disabled={disabled || saving}
        onFocus={() => {
          focusedRef.current = true
          onEditingChange?.(true)
        }}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            event.currentTarget.blur()
          }
          if (event.key === 'Escape') {
            event.preventDefault()
            setDraft(title)
            event.currentTarget.blur()
          }
        }}
        className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-base font-semibold text-white outline-none focus:border-plooy-gold disabled:opacity-60"
        aria-label="Kategori adı"
      />
      {saving ? (
        <p className="mt-1 text-xs text-plooy-gold">Kaydediliyor…</p>
      ) : (
        <p className="mt-1 text-xs text-plooy-muted">Enter ile kaydet · Esc ile iptal</p>
      )}
    </div>
  )
}
