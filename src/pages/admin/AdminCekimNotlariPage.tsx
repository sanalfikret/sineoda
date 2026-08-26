import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  createAdminCekimNotlariCategory,
  deleteAdminCekimNotlariCategory,
  deleteAdminCekimNotlariItem,
  fetchAdminCekimNotlari,
  reorderAdminCekimNotlariCategories,
  updateAdminCekimNotlariCategory,
  type CekimNotlariSection,
} from '../../api/client'
import { useAdminOrderedList } from '../../admin/useAdminOrderedList'
import { AdminCekimNotlariVideoList } from '../../components/admin/AdminCekimNotlariVideoList'
import { AdminDragHandle } from '../../components/admin/AdminDragHandle'
import { AdminSearchBar } from '../../components/admin/AdminSearchBar'
import { CEKIM_NOTLARI_NAV_LABEL, CEKIM_NOTLARI_SECTION_TITLE } from '../../constants/cekimNotlari'
import { useContent } from '../../context/ContentContext'
import { fuzzySearchMatch } from '../../utils/search'

export function AdminCekimNotlariPage() {
  const navigate = useNavigate()
  const { refresh: refreshBootstrap } = useContent()
  const [sections, setSections] = useState<CekimNotlariSection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [newCategoryTitle, setNewCategoryTitle] = useState('')
  const [savingCategory, setSavingCategory] = useState(false)
  const [editingTitles, setEditingTitles] = useState<Record<string, string>>({})

  const reorderSections = useCallback(async (orderedIds: string[]) => {
    const data = await reorderAdminCekimNotlariCategories(orderedIds)
    setSections(data.sections)
    await refreshBootstrap()
    return data.sections
  }, [refreshBootstrap])

  const {
    orderedItems: orderedSections,
    draggingId,
    savingOrder,
    orderError,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    nudgeItem,
    resetListFromServer,
  } = useAdminOrderedList({ items: sections, reorderItems: reorderSections })

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchAdminCekimNotlari()
      setSections(data.sections)
      setEditingTitles(
        Object.fromEntries(data.sections.map((section) => [section.id, section.title])),
      )
      resetListFromServer()
      await refreshBootstrap()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Veriler yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }, [resetListFromServer, refreshBootstrap])

  useEffect(() => {
    void load()
  }, [load])

  const filteredSections = useMemo(() => {
    if (!query.trim()) return orderedSections
    return orderedSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) =>
          fuzzySearchMatch(query, item.title, item.description, section.title),
        ),
      }))
      .filter((section) => fuzzySearchMatch(query, section.title) || section.items.length > 0)
  }, [orderedSections, query])

  const totalVideos = orderedSections.reduce((count, section) => count + section.items.length, 0)

  const toggleExpanded = (id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleDeleteVideo = async (id: string, title: string) => {
    if (!window.confirm(`"${title}" videosunu silmek istediğine emin misin?`)) return
    setDeletingId(id)
    try {
      await deleteAdminCekimNotlariItem(id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Silinemedi.')
    } finally {
      setDeletingId(null)
    }
  }

  const syncAfterMutation = useCallback(
    async (nextSections: CekimNotlariSection[]) => {
      setSections(nextSections)
      resetListFromServer()
      await refreshBootstrap()
    },
    [refreshBootstrap, resetListFromServer],
  )

  const handleAddCategory = async () => {
    const title = newCategoryTitle.trim()
    if (!title) return
    setSavingCategory(true)
    setError('')
    try {
      const data = await createAdminCekimNotlariCategory(title)
      await syncAfterMutation(data.sections)
      setEditingTitles(
        Object.fromEntries(data.sections.map((section) => [section.id, section.title])),
      )
      setExpandedIds((current) => new Set([...current, data.category.id]))
      setNewCategoryTitle('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kategori eklenemedi.')
    } finally {
      setSavingCategory(false)
    }
  }

  const handleSaveCategoryTitle = async (categoryId: string) => {
    const title = editingTitles[categoryId]?.trim()
    if (!title) return
    setSavingCategory(true)
    setError('')
    try {
      const data = await updateAdminCekimNotlariCategory(categoryId, { title })
      await syncAfterMutation(data.sections)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kategori güncellenemedi.')
    } finally {
      setSavingCategory(false)
    }
  }

  const handleDeleteCategory = async (categoryId: string, title: string) => {
    if (!window.confirm(`"${title}" kategorisini silmek istediğine emin misin?`)) return
    setSavingCategory(true)
    setError('')
    try {
      const data = await deleteAdminCekimNotlariCategory(categoryId)
      await syncAfterMutation(data.sections)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kategori silinemedi.')
    } finally {
      setSavingCategory(false)
    }
  }

  const handleToggleCategoryHidden = async (categoryId: string, hidden: boolean) => {
    setSavingCategory(true)
    setError('')
    try {
      const data = await updateAdminCekimNotlariCategory(categoryId, { hidden })
      await syncAfterMutation(data.sections)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kategori güncellenemedi.')
    } finally {
      setSavingCategory(false)
    }
  }

  const handleVideoSectionsUpdate = useCallback((nextSections: CekimNotlariSection[]) => {
    setSections(nextSections)
  }, [])

  const displayError = error || orderError

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sineoda-accent">
            {CEKIM_NOTLARI_SECTION_TITLE}
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white">{CEKIM_NOTLARI_NAV_LABEL}</h1>
          <p className="mt-2 text-sm text-sineoda-muted">
            {totalVideos} video · {orderedSections.length} alt kategori
            {savingOrder ? ' · Sıra kaydediliyor...' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/admin/cekim-notlari/yeni')}
          className="rounded-lg bg-sineoda-gold px-4 py-2.5 text-sm font-semibold text-sineoda-bg transition hover:brightness-110"
        >
          + Yeni Video
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#11141c] p-4">
        <h2 className="text-sm font-semibold text-white">Yeni kategori ekle</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={newCategoryTitle}
            onChange={(event) => setNewCategoryTitle(event.target.value)}
            placeholder="Örn. Kurgu Dersleri"
            className="min-w-[220px] flex-1 rounded-lg border border-white/10 bg-sineoda-bg px-4 py-2.5 text-white outline-none focus:border-sineoda-gold"
            onKeyDown={(event) => {
              if (event.key === 'Enter') void handleAddCategory()
            }}
          />
          <button
            type="button"
            disabled={savingCategory || !newCategoryTitle.trim()}
            onClick={() => void handleAddCategory()}
            className="rounded-lg bg-sineoda-gold px-4 py-2.5 text-sm font-semibold text-sineoda-bg disabled:opacity-50"
          >
            Kategori Ekle
          </button>
        </div>
      </div>

      <AdminSearchBar value={query} onChange={setQuery} placeholder="Kategori veya video ara..." />

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-sineoda-gold border-t-transparent" />
        </div>
      ) : displayError ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{displayError}</p>
      ) : (
        <div className="space-y-3">
          {filteredSections.map((section) => {
            const index = orderedSections.findIndex((entry) => entry.id === section.id)
            const expanded = expandedIds.has(section.id)
            const dragging = draggingId === section.id

            return (
              <section
                key={section.id}
                onDragOver={(event) => handleDragOver(event, section.id)}
                onDrop={handleDrop}
                className={`overflow-hidden rounded-2xl border bg-[#11141c] transition ${
                  dragging ? 'border-sineoda-gold/50 opacity-70' : 'border-white/10'
                }`}
              >
                <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
                  <AdminDragHandle
                    disabled={savingOrder || Boolean(query.trim())}
                    onDragStart={(event) => handleDragStart(event, section.id)}
                    onDragEnd={handleDragEnd}
                  />

                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      aria-label="Yukarı taşı"
                      disabled={index === 0 || savingOrder || Boolean(query.trim())}
                      onClick={() => nudgeItem(index, -1)}
                      className="rounded-md border border-white/10 px-2 py-0.5 text-xs text-white/70 disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label="Aşağı taşı"
                      disabled={index === orderedSections.length - 1 || savingOrder || Boolean(query.trim())}
                      onClick={() => nudgeItem(index, 1)}
                      className="rounded-md border border-white/10 px-2 py-0.5 text-xs text-white/70 disabled:opacity-30"
                    >
                      ↓
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleExpanded(section.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span className="text-white/50">{expanded ? '▼' : '▶'}</span>
                    <span className="truncate font-semibold text-white">{section.title}</span>
                    {section.hidden ? (
                      <span className="shrink-0 rounded bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-sineoda-muted">
                        Gizli
                      </span>
                    ) : null}
                    <span className="shrink-0 text-xs text-sineoda-muted">{section.items.length} video</span>
                  </button>
                </div>

                {expanded && (
                  <div className="space-y-4 p-4">
                    <div className="flex flex-wrap items-end gap-2">
                      <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-xs text-sineoda-muted">
                        Kategori başlığı
                        <input
                          value={editingTitles[section.id] ?? section.title}
                          onChange={(event) =>
                            setEditingTitles((current) => ({
                              ...current,
                              [section.id]: event.target.value,
                            }))
                          }
                          className="rounded-lg border border-white/10 bg-sineoda-bg px-3 py-2 text-sm text-white outline-none focus:border-sineoda-gold"
                        />
                      </label>
                      <button
                        type="button"
                        disabled={savingCategory}
                        onClick={() => void handleToggleCategoryHidden(section.id, !section.hidden)}
                        className={`rounded-lg border px-3 py-2 text-sm transition disabled:opacity-50 ${
                          section.hidden
                            ? 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10'
                            : 'border-white/10 text-white/85 hover:bg-white/5'
                        }`}
                      >
                        {section.hidden ? 'Yayında göster' : 'Gizle'}
                      </button>
                      <button
                        type="button"
                        disabled={savingCategory}
                        onClick={() => void handleSaveCategoryTitle(section.id)}
                        className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/85 hover:bg-white/5"
                      >
                        Başlığı Kaydet
                      </button>
                      <button
                        type="button"
                        disabled={savingCategory || section.items.length > 0}
                        title={section.items.length > 0 ? 'Önce videoları silin' : undefined}
                        onClick={() => void handleDeleteCategory(section.id, section.title)}
                        className="rounded-lg border border-red-500/30 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-40"
                      >
                        Kategoriyi Sil
                      </button>
                      <Link
                        to={`/admin/cekim-notlari/yeni?kategori=${encodeURIComponent(section.id)}`}
                        className="ml-auto text-sm font-medium text-sineoda-gold hover:underline"
                      >
                        + Bu kategoriye video ekle
                      </Link>
                    </div>

                    {section.items.length === 0 ? (
                      <p className="text-sm text-sineoda-muted">Henüz video yok.</p>
                    ) : query.trim() ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                          <thead className="text-xs uppercase tracking-wide text-sineoda-muted">
                            <tr>
                              <th className="pb-3 pr-4">Başlık</th>
                              <th className="pb-3 pr-4">Uzman</th>
                              <th className="pb-3 pr-4">Süre</th>
                              <th className="pb-3 pr-4">Durum</th>
                              <th className="pb-3">İşlem</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {section.items.map((item) => (
                              <tr key={item.id}>
                                <td className="py-3 pr-4 font-medium text-white">{item.title}</td>
                                <td className="py-3 pr-4 text-sineoda-muted">
                                  {item.credits?.directors?.[0] ?? '—'}
                                </td>
                                <td className="py-3 pr-4 text-sineoda-muted">{item.duration}</td>
                                <td className="py-3 pr-4 text-sineoda-muted">
                                  {item.publishedAt ? 'Yayında' : 'Taslak'}
                                </td>
                                <td className="py-3">
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => navigate(`/admin/cekim-notlari/${item.id}`)}
                                      className="rounded-md border border-white/10 px-2.5 py-1 text-xs text-white/80 hover:bg-white/5"
                                    >
                                      Düzenle
                                    </button>
                                    <button
                                      type="button"
                                      disabled={deletingId === item.id}
                                      onClick={() => void handleDeleteVideo(item.id, item.title)}
                                      className="rounded-md border border-red-500/30 px-2.5 py-1 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                                    >
                                      Sil
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <AdminCekimNotlariVideoList
                        section={orderedSections.find((entry) => entry.id === section.id) ?? section}
                        deletingId={deletingId}
                        onDelete={(id, title) => void handleDeleteVideo(id, title)}
                        onSectionsUpdate={handleVideoSectionsUpdate}
                      />
                    )}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
