import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { resolveMediaUrl } from '../../api/client'
import { AdminSearchBar } from '../../components/admin/AdminSearchBar'
import { useContent } from '../../context/ContentContext'
import { CONTENT_TYPES, getContentDisplayLabel } from '../../constants/contentTypes'
import type { ContentType } from '../../types/content'
import { isVerticalContent } from '../../utils/vertical'
import { fuzzySearchMatch, sortByTurkishTitle } from '../../utils/search'

type TypeFilter = 'all' | ContentType | 'dikey'

const NEW_VERTICAL_HREF = '/admin/icerikler/yeni?dikey=1'

export function AdminContentListPage() {
  const { catalog, deleteContent, setFeatured } = useContent()
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')

  const verticalCount = useMemo(() => catalog.filter(isVerticalContent).length, [catalog])

  const filteredItems = useMemo(() => {
    const searched = catalog.filter((item) => {
      if (typeFilter === 'dikey') {
        if (!isVerticalContent(item)) return false
      } else if (typeFilter !== 'all' && item.type !== typeFilter) {
        return false
      }
      return fuzzySearchMatch(query, item.title, item.id, item.genres.join(' '))
    })
    return sortByTurkishTitle(searched, (item) => item.title)
  }, [catalog, query, typeFilter])

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`"${title}" içeriğini silmek istediğine emin misin?`)) return
    try {
      await deleteContent(id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Silme başarısız.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">İçerikler</h1>
          <p className="mt-1 text-sm text-sineoda-muted">
            Alfabetik sıralı · {catalog.length} kayıt
            {verticalCount > 0 && ` · ${verticalCount} dikey dizi`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={NEW_VERTICAL_HREF}
            className="rounded-lg border border-sineoda-gold/50 bg-sineoda-gold/10 px-4 py-2 text-sm font-semibold text-sineoda-gold transition hover:bg-sineoda-gold/20"
          >
            + Yeni Dikey Dizi
          </Link>
          <Link
            to="/admin/icerikler/yeni"
            className="rounded-lg bg-sineoda-gold px-4 py-2 text-sm font-semibold text-sineoda-bg"
          >
            + Yeni İçerik
          </Link>
        </div>
      </div>

      <AdminSearchBar
        value={query}
        onChange={setQuery}
        placeholder="Film veya dizi ara... (ör. kap krg → Kalp Kırığı)"
        resultCount={filteredItems.length}
        totalCount={catalog.length}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTypeFilter('all')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            typeFilter === 'all'
              ? 'bg-sineoda-gold text-sineoda-bg'
              : 'bg-white/10 text-white/85 hover:bg-white/15'
          }`}
        >
          Tümü
        </button>
        {CONTENT_TYPES.map((entry) => (
          <button
            key={entry.value}
            type="button"
            onClick={() => setTypeFilter(entry.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              typeFilter === entry.value
                ? 'bg-sineoda-gold text-sineoda-bg'
                : 'bg-white/10 text-white/85 hover:bg-white/15'
            }`}
          >
            {entry.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setTypeFilter('dikey')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            typeFilter === 'dikey'
              ? 'bg-sineoda-gold text-sineoda-bg'
              : 'bg-white/10 text-white/85 hover:bg-white/15'
          }`}
        >
          Dikey Dizi
          {verticalCount > 0 && (
            <span className="ml-1.5 text-xs opacity-80">({verticalCount})</span>
          )}
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#11141c]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/10 text-sineoda-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Poster</th>
                <th className="px-4 py-3 font-medium">Başlık</th>
                <th className="px-4 py-3 font-medium">Tür</th>
                <th className="px-4 py-3 font-medium">Yıl</th>
                <th className="px-4 py-3 font-medium">Öne Çıkan</th>
                <th className="px-4 py-3 font-medium">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sineoda-muted">
                    {typeFilter === 'dikey' ? (
                      <div className="space-y-3">
                        <p>Henüz dikey dizi eklenmemiş.</p>
                        <Link
                          to={NEW_VERTICAL_HREF}
                          className="inline-flex rounded-lg bg-sineoda-gold px-4 py-2 text-sm font-semibold text-sineoda-bg"
                        >
                          + İlk Dikey Diziyi Ekle
                        </Link>
                      </div>
                    ) : (
                      'Aramanızla eşleşen içerik bulunamadı.'
                    )}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-3">
                      <img
                        src={resolveMediaUrl(item.poster)}
                        alt=""
                        className={`rounded object-cover ${
                          isVerticalContent(item) ? 'h-16 w-9' : 'h-14 w-10'
                        }`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{item.title}</p>
                      <p className="text-xs text-sineoda-muted">{item.id}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          isVerticalContent(item)
                            ? 'rounded-full bg-sineoda-gold/15 px-2 py-1 text-xs font-medium text-sineoda-gold'
                            : 'text-white/80'
                        }
                      >
                        {getContentDisplayLabel(item)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/80">{item.year}</td>
                    <td className="px-4 py-3">
                      {item.featured ? (
                        <span className="rounded-full bg-sineoda-gold/15 px-2 py-1 text-xs text-sineoda-gold">
                          Evet
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void setFeatured(item.id)}
                          className="text-xs text-sineoda-muted hover:text-white"
                        >
                          Öne çıkar
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link
                          to={`/admin/icerikler/${item.id}`}
                          className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white hover:bg-white/10"
                        >
                          Düzenle
                        </Link>
                        <button
                          type="button"
                          onClick={() => void handleDelete(item.id, item.title)}
                          className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/20"
                        >
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
