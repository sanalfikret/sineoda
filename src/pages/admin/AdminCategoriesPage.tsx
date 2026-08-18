import { useState } from 'react'
import { resolveMediaUrl } from '../../api/client'
import { useContent } from '../../context/ContentContext'

export function AdminCategoriesPage() {
  const { catalog, categories, addCategory, updateCategory, deleteCategory, resetToSeed } =
    useContent()
  const [newTitle, setNewTitle] = useState('')

  const handleAddCategory = async () => {
    if (!newTitle.trim()) return
    await addCategory(newTitle)
    setNewTitle('')
  }

  const handleDeleteCategory = async (id: string, title: string) => {
    if (!window.confirm(`"${title}" kategorisini silmek istediğine emin misin?`)) return
    await deleteCategory(id)
  }

  const handleReset = async () => {
    if (
      !window.confirm(
        'Tüm içerik ve kategoriler varsayılan demo verisine sıfırlanacak. Emin misin?',
      )
    ) {
      return
    }
    await resetToSeed()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Kategoriler</h1>
          <p className="mt-1 text-sm text-sineoda-muted">Ana sayfa satırlarını yönet</p>
        </div>
        <button
          type="button"
          onClick={() => void handleReset()}
          className="rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10"
        >
          Demo Verisine Sıfırla
        </button>
      </div>

      <div className="flex gap-2">
        <input
          value={newTitle}
          onChange={(event) => setNewTitle(event.target.value)}
          placeholder="Yeni kategori adı"
          className="flex-1 rounded-lg border border-white/10 bg-[#11141c] px-4 py-2.5 text-white outline-none focus:border-sineoda-gold"
        />
        <button
          type="button"
          onClick={() => void handleAddCategory()}
          className="rounded-lg bg-sineoda-gold px-4 py-2.5 text-sm font-semibold text-sineoda-bg"
        >
          Ekle
        </button>
      </div>

      <div className="space-y-4">
        {categories.map((category) => (
          <section
            key={category.id}
            className="rounded-2xl border border-white/10 bg-[#11141c] p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <input
                value={category.title}
                onChange={(event) =>
                  updateCategory(category.id, { title: event.target.value })
                }
                className="rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-lg font-semibold text-white outline-none focus:border-sineoda-gold"
              />
              <button
                type="button"
                onClick={() => void handleDeleteCategory(category.id, category.title)}
                className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300 hover:bg-red-500/20"
              >
                Kategoriyi Sil
              </button>
            </div>

            <p className="mt-2 text-xs text-sineoda-muted">{category.id}</p>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {catalog.map((item) => {
                const checked = category.itemIds.includes(item.id)
                return (
                  <label
                    key={item.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition ${
                      checked
                        ? 'border-sineoda-gold/40 bg-sineoda-gold/10'
                        : 'border-white/10 hover:bg-white/5'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const itemIds = checked
                          ? category.itemIds.filter((entry) => entry !== item.id)
                          : [...category.itemIds, item.id]
                        updateCategory(category.id, { itemIds })
                      }}
                      className="accent-sineoda-gold"
                    />
                    <img src={resolveMediaUrl(item.poster)} alt="" className="h-10 w-7 rounded object-cover" />
                    <span className="truncate text-sm text-white/85">{item.title}</span>
                  </label>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
