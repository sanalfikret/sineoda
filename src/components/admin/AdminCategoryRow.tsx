import type { DragEvent } from 'react'
import { resolveMediaUrl } from '../../api/client'
import { AdminCategoryTitleField } from './AdminCategoryTitleField'
import type { ContentCategory, ContentItem } from '../../types/content'
import { fuzzySearchMatch } from '../../utils/search'
import {
  getNavIdForCategory,
  NAV_LABELS,
  STANDALONE_CATEGORY_IDS,
} from '../../constants/siteNavLinks'

interface AdminCategoryRowProps {
  category: ContentCategory
  index: number
  total: number
  expanded: boolean
  dragging: boolean
  savingOrder: boolean
  catalogById: Map<string, ContentItem>
  catalog: ContentItem[]
  search: string
  onToggleExpanded: () => void
  onDelete: () => void
  onNudge: (direction: -1 | 1) => void
  onSearchChange: (value: string) => void
  onSaveTitle: (title: string) => Promise<void>
  onEditingChange: (editing: boolean) => void
  onToggleHidden: (hidden: boolean) => Promise<void>
  onUpdateItems: (itemIds: string[]) => Promise<void>
  onDragStart: (event: DragEvent<HTMLElement>) => void
  onDragOver: (event: DragEvent<HTMLElement>) => void
  onDrop: (event: DragEvent<HTMLElement>) => void
  onDragEnd: () => void
}

export function AdminCategoryRow({
  category,
  index,
  total,
  expanded,
  dragging,
  savingOrder,
  catalogById,
  catalog,
  search,
  onToggleExpanded,
  onDelete,
  onNudge,
  onSearchChange,
  onSaveTitle,
  onEditingChange,
  onToggleHidden,
  onUpdateItems,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: AdminCategoryRowProps) {
  const linkedNavId = getNavIdForCategory(category.id)
  const linkedNavLabel = linkedNavId ? NAV_LABELS[linkedNavId] : null
  const isStandalone = STANDALONE_CATEGORY_IDS.has(category.id)

  const selectedItems = category.itemIds
    .map((id) => catalogById.get(id))
    .filter((item): item is ContentItem => Boolean(item))

  const addableItems = catalog.filter(
    (item) =>
      !category.itemIds.includes(item.id) &&
      fuzzySearchMatch(search, item.title, item.id, item.genres.join(' ')),
  )

  const removeItem = (itemId: string) => {
    const nextIds = category.itemIds.filter((entry) => entry !== itemId)
    void onUpdateItems(nextIds)
  }

  const addItem = (itemId: string) => {
    void onUpdateItems([...category.itemIds, itemId])
  }

  return (
    <section
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`rounded-2xl border bg-[#11141c] transition ${
        dragging ? 'border-sineoda-gold/50 opacity-70' : category.hidden ? 'border-white/10 opacity-75' : 'border-white/10'
      }`}
    >
      <div className="flex items-center gap-3 p-4">
        <div
          draggable={!savingOrder}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          role="button"
          tabIndex={0}
          aria-label="Sürükleyerek sırala"
          className="cursor-grab rounded-lg border border-white/10 px-2 py-3 text-sineoda-muted hover:bg-white/5 active:cursor-grabbing"
          title="Sürükleyerek sırala"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="9" cy="7" r="1.5" />
            <circle cx="15" cy="7" r="1.5" />
            <circle cx="9" cy="12" r="1.5" />
            <circle cx="15" cy="12" r="1.5" />
            <circle cx="9" cy="17" r="1.5" />
            <circle cx="15" cy="17" r="1.5" />
          </svg>
        </div>

        <div className="flex flex-col gap-1">
          <button
            type="button"
            aria-label="Yukarı taşı"
            disabled={index === 0 || savingOrder}
            onClick={() => onNudge(-1)}
            className="rounded border border-white/10 px-2 py-0.5 text-xs text-white/70 hover:bg-white/5 disabled:opacity-30"
          >
            ↑
          </button>
          <button
            type="button"
            aria-label="Aşağı taşı"
            disabled={index === total - 1 || savingOrder}
            onClick={() => onNudge(1)}
            className="rounded border border-white/10 px-2 py-0.5 text-xs text-white/70 hover:bg-white/5 disabled:opacity-30"
          >
            ↓
          </button>
        </div>

        <button
          type="button"
          onClick={onToggleExpanded}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span className="text-white/60">{expanded ? '▼' : '▶'}</span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-lg font-semibold text-white">{category.title}</p>
              {category.hidden ? (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-sineoda-muted">
                  Gizli
                </span>
              ) : null}
            </div>
            <p className="text-xs text-sineoda-muted">
              {selectedItems.length} içerik · {category.id}
              {linkedNavLabel ? (
                <span className="text-emerald-300/80"> · Menü: {linkedNavLabel}</span>
              ) : isStandalone ? (
                <span> · Bağımsız satır</span>
              ) : null}
            </p>
          </div>
        </button>

        <button
          type="button"
          disabled={savingOrder}
          aria-pressed={!category.hidden}
          onClick={() => void onToggleHidden(!category.hidden)}
          className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
            category.hidden
              ? 'border-white/10 text-sineoda-muted hover:bg-white/5'
              : 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10'
          }`}
        >
          <span
            className={`inline-flex h-4 w-4 items-center justify-center rounded border ${
              category.hidden ? 'border-white/20 bg-transparent' : 'border-emerald-400 bg-emerald-500/30'
            }`}
            aria-hidden="true"
          >
            {!category.hidden && '✓'}
          </span>
          {category.hidden ? 'Kapalı' : 'Açık'}
        </button>

        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300 hover:bg-red-500/20"
        >
          Sil
        </button>
      </div>

      {expanded && (
        <div className="border-t border-white/10 p-4 pt-3">
          <AdminCategoryTitleField
            categoryId={category.id}
            title={category.title}
            onSave={onSaveTitle}
            onEditingChange={onEditingChange}
          />

          {selectedItems.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-sineoda-muted">
                Seçili içerikler
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="flex items-center gap-2 rounded-full border border-sineoda-gold/30 bg-sineoda-gold/10 px-2.5 py-1 text-xs text-white hover:bg-sineoda-gold/20"
                  >
                    <img
                      src={resolveMediaUrl(item.poster)}
                      alt=""
                      className="h-5 w-3.5 rounded object-cover"
                    />
                    <span className="max-w-[140px] truncate">{item.title}</span>
                    <span className="text-white/50">×</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="İçerik ara ve ekle..."
            className="mb-3 w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-sm text-white outline-none focus:border-sineoda-gold"
          />

          <div className="max-h-72 space-y-2 overflow-y-auto">
            {addableItems.length === 0 ? (
              <p className="py-4 text-center text-sm text-sineoda-muted">
                {search ? 'Eşleşen içerik yok.' : 'Tüm içerikler bu kategoride.'}
              </p>
            ) : (
              addableItems.slice(0, 40).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => addItem(item.id)}
                  className="flex w-full items-center gap-3 rounded-lg border border-white/10 px-3 py-2 text-left transition hover:border-sineoda-gold/30 hover:bg-white/5"
                >
                  <img
                    src={resolveMediaUrl(item.poster)}
                    alt=""
                    className="h-10 w-7 rounded object-cover"
                  />
                  <span className="truncate text-sm text-white/85">{item.title}</span>
                  <span className="ml-auto text-xs text-sineoda-gold">Ekle</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </section>
  )
}
