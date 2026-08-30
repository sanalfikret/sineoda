import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  reorderAdminCekimNotlariCategoryItems,
  type CekimNotlariSection,
} from '../../api/client'
import type { AdminContentItem } from '../../types/content'
import { useAdminOrderedList } from '../../admin/useAdminOrderedList'
import { AdminDragHandle } from './AdminDragHandle'
import { AdminCekimNotlariPublishButton } from './AdminCekimNotlariPublishButton'
import { useContent } from '../../context/ContentContext'

interface AdminCekimNotlariVideoListProps {
  section: CekimNotlariSection
  deletingId: string | null
  togglingPublishId: string | null
  dragDisabled?: boolean
  onDelete: (id: string, title: string) => void
  onTogglePublish: (item: AdminContentItem) => void
  onSectionsUpdate: (sections: CekimNotlariSection[]) => void
}

export function AdminCekimNotlariVideoList({
  section,
  deletingId,
  togglingPublishId,
  dragDisabled = false,
  onDelete,
  onTogglePublish,
  onSectionsUpdate,
}: AdminCekimNotlariVideoListProps) {
  const navigate = useNavigate()
  const { refresh: refreshBootstrap } = useContent()

  const reorderItems = useCallback(
    async (orderedIds: string[]) => {
      const data = await reorderAdminCekimNotlariCategoryItems(section.id, orderedIds)
      onSectionsUpdate(data.sections)
      await refreshBootstrap()
      const updated = data.sections.find((entry) => entry.id === section.id)
      return updated?.items ?? []
    },
    [onSectionsUpdate, refreshBootstrap, section.id],
  )

  const {
    orderedItems,
    draggingId,
    savingOrder,
    orderError,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    nudgeItem,
  } = useAdminOrderedList<AdminContentItem>({ items: section.items, reorderItems })

  const disabled = dragDisabled || savingOrder

  return (
    <div className="space-y-2">
      {orderError ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {orderError}
        </p>
      ) : null}
      {savingOrder ? (
        <p className="text-xs text-plooy-muted">Video sırası kaydediliyor...</p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-plooy-muted">
            <tr>
              {!dragDisabled ? <th className="pb-3 pr-2 w-10" /> : null}
              <th className="pb-3 pr-4">Başlık</th>
              <th className="pb-3 pr-4">Uzman</th>
              <th className="pb-3 pr-4">Süre</th>
              <th className="pb-3 pr-4">Durum</th>
              <th className="pb-3">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {orderedItems.map((item, index) => {
              const dragging = draggingId === item.id

              return (
                <tr
                  key={item.id}
                  onDragOver={(event) => {
                    if (!dragDisabled) handleDragOver(event, item.id)
                  }}
                  onDrop={handleDrop}
                  className={dragging ? 'opacity-60' : undefined}
                >
                  {!dragDisabled ? (
                    <td className="py-3 pr-2 align-middle">
                      <div className="flex items-center gap-1">
                        <AdminDragHandle
                          disabled={disabled}
                          onDragStart={(event) => handleDragStart(event, item.id)}
                          onDragEnd={handleDragEnd}
                        />
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            aria-label="Yukarı taşı"
                            disabled={disabled || index === 0}
                            onClick={() => nudgeItem(index, -1)}
                            className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-white/70 disabled:opacity-30"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            aria-label="Aşağı taşı"
                            disabled={disabled || index === orderedItems.length - 1}
                            onClick={() => nudgeItem(index, 1)}
                            className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-white/70 disabled:opacity-30"
                          >
                            ↓
                          </button>
                        </div>
                      </div>
                    </td>
                  ) : null}
                  <td className="py-3 pr-4 font-medium text-white">{item.title}</td>
                  <td className="py-3 pr-4 text-plooy-muted">
                    {item.credits?.directors?.[0] ?? '—'}
                  </td>
                  <td className="py-3 pr-4 text-plooy-muted">{item.duration}</td>
                  <td className="py-3 pr-4 text-plooy-muted">
                    {item.publishedAt ? 'Yayında' : 'Taslak'}
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2">
                      <AdminCekimNotlariPublishButton
                        published={Boolean(item.publishedAt)}
                        loading={togglingPublishId === item.id}
                        onClick={() => onTogglePublish(item)}
                      />
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
                        onClick={() => onDelete(item.id, item.title)}
                        className="rounded-md border border-red-500/30 px-2.5 py-1 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                      >
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
