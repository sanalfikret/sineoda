import { useEffect, useMemo, useState } from 'react'
import type { JournalPost } from '../../types/journal'
import { MAX_JOURNAL_PINS } from '../../constants/journal'

interface AdminJournalPinsPanelProps {
  posts: JournalPost[]
  pinnedIds: string[]
  saving: boolean
  onSave: (pinnedIds: string[]) => Promise<void>
}

export function AdminJournalPinsPanel({
  posts,
  pinnedIds,
  saving,
  onSave,
}: AdminJournalPinsPanelProps) {
  const [draftIds, setDraftIds] = useState<string[]>(pinnedIds)
  const [error, setError] = useState('')

  useEffect(() => {
    setDraftIds(pinnedIds)
  }, [pinnedIds])

  const pinnedPosts = useMemo(
    () =>
      draftIds
        .map((id) => posts.find((post) => post.id === id))
        .filter((post): post is JournalPost => Boolean(post)),
    [draftIds, posts],
  )

  const unpinnedPublished = useMemo(
    () =>
      posts.filter(
        (post) => post.status === 'published' && !draftIds.includes(post.id),
      ),
    [draftIds, posts],
  )

  const dirty = draftIds.join('|') !== pinnedIds.join('|')

  const move = (index: number, direction: -1 | 1) => {
    const next = [...draftIds]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setDraftIds(next)
    setError('')
  }

  const pin = (postId: string) => {
    if (draftIds.includes(postId)) return
    if (draftIds.length >= MAX_JOURNAL_PINS) {
      setError(`En fazla ${MAX_JOURNAL_PINS} yazı sabitlenebilir.`)
      return
    }
    setDraftIds([...draftIds, postId])
    setError('')
  }

  const unpin = (postId: string) => {
    setDraftIds(draftIds.filter((id) => id !== postId))
    setError('')
  }

  const handleSave = async () => {
    setError('')
    try {
      await onSave(draftIds)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kaydedilemedi.')
    }
  }

  const handleReset = () => {
    setDraftIds(pinnedIds)
    setError('')
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#11141c] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Üst sıra</h2>
          <p className="mt-1 text-sm text-sineoda-muted">
            En fazla {MAX_JOURNAL_PINS} yazıyı dergi listesinin en üstüne sabitleyebilirsiniz. Sabitlenmeyen
            yazılar yayın tarihine göre sıralanır.
          </p>
        </div>
        <div className="flex gap-2">
          {dirty && (
            <button
              type="button"
              onClick={handleReset}
              disabled={saving}
              className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/5 disabled:opacity-50"
            >
              Vazgeç
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!dirty || saving}
            className="rounded-lg bg-sineoda-gold px-4 py-2 text-sm font-semibold text-sineoda-bg disabled:opacity-50"
          >
            {saving ? 'Kaydediliyor…' : 'Sırayı kaydet'}
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      <div className="mt-5 space-y-2">
        {pinnedPosts.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-sm text-sineoda-muted">
            Henüz sabitlenmiş yazı yok. Liste tamamen yayın tarihine göre serbest sıralanır.
          </p>
        ) : (
          pinnedPosts.map((post, index) => (
            <div
              key={post.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3"
            >
              <span className="w-6 text-sm font-semibold text-sineoda-gold">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-white">{post.title}</p>
                <p className="text-xs text-sineoda-muted">/dergi/{post.slug}</p>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0 || saving}
                  className="rounded-lg bg-white/5 px-2 py-1 text-xs text-white hover:bg-white/10 disabled:opacity-40"
                  aria-label="Yukarı taşı"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === pinnedPosts.length - 1 || saving}
                  className="rounded-lg bg-white/5 px-2 py-1 text-xs text-white hover:bg-white/10 disabled:opacity-40"
                  aria-label="Aşağı taşı"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => unpin(post.id)}
                  disabled={saving}
                  className="rounded-lg bg-red-500/10 px-3 py-1 text-xs text-red-300 hover:bg-red-500/20 disabled:opacity-40"
                >
                  Kaldır
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {draftIds.length < MAX_JOURNAL_PINS && unpinnedPublished.length > 0 && (
        <div className="mt-5 border-t border-white/10 pt-5">
          <label className="block text-sm font-medium text-white/80" htmlFor="journal-pin-add">
            Sabitle
          </label>
          <select
            id="journal-pin-add"
            defaultValue=""
            disabled={saving}
            onChange={(event) => {
              const value = event.target.value
              if (!value) return
              pin(value)
              event.currentTarget.value = ''
            }}
            className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
          >
            <option value="">Yayında bir yazı seçin…</option>
            {unpinnedPublished.map((post) => (
              <option key={post.id} value={post.id}>
                {post.title}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
