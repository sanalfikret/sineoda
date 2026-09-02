import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAdminCategoryList } from '../../admin/categories/useAdminCategoryList'
import { AdminCategoryRow } from '../../components/admin/AdminCategoryRow'
import { AdminSiteNavPanel } from '../../components/admin/AdminSiteNavPanel'
import { isCekimCategoryId } from '../../constants/cekimNotlari'
import type { SiteNavId } from '../../constants/siteNav'
import { mergeCategoriesForAdminOrder, isVirtualBrowseCategoryId } from '../../utils/browse'
import { mergeAdminPickerCatalog } from '../../utils/adminPickerCatalog'
import { useContent } from '../../context/ContentContext'

export function AdminCategoriesPage() {
  const {
    catalog,
    studentCinemaCatalog,
    cekimNotlariSections,
    categories,
    categoryOrder,
    hiddenNavIds,
    addCategory,
    updateCategory,
    updateSiteNavVisibility,
    deleteCategory,
    reorderCategories,
    resetToSeed,
  } = useContent()
  const mainCategories = useMemo(
    () => categories.filter((category) => !isCekimCategoryId(category.id)),
    [categories],
  )
  const adminCategoryList = useMemo(
    () => mergeCategoriesForAdminOrder(mainCategories, categoryOrder),
    [mainCategories, categoryOrder],
  )
  const [newTitle, setNewTitle] = useState('')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [searchByCategory, setSearchByCategory] = useState<Record<string, string>>({})
  const [navSaving, setNavSaving] = useState(false)
  const [navError, setNavError] = useState('')
  const [categoryError, setCategoryError] = useState('')
  const [categoryMessage, setCategoryMessage] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)

  const {
    orderedCategories,
    draggingId,
    savingOrder,
    orderError,
    setEditingCategory,
    patchLocalCategory,
    finishCategorySync,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    nudgeCategory,
    resetListFromServer,
  } = useAdminCategoryList({ categories: adminCategoryList, reorderCategories })

  const adminPickerCatalog = useMemo(() => {
    const cekimItems = cekimNotlariSections.flatMap((section) => section.items)
    return mergeAdminPickerCatalog([catalog, studentCinemaCatalog, cekimItems])
  }, [catalog, studentCinemaCatalog, cekimNotlariSections])

  const catalogById = useMemo(
    () => new Map(adminPickerCatalog.map((item) => [item.id, item])),
    [adminPickerCatalog],
  )

  const handleAddCategory = async () => {
    const title = newTitle.trim()
    if (!title) return
    setAddingCategory(true)
    setCategoryError('')
    setCategoryMessage('')
    try {
      const created = await addCategory(title)
      setNewTitle('')
      setExpandedIds((current) => new Set([...current, created.id]))
      setCategoryMessage(`"${created.title}" eklendi ve kaydedildi.`)
    } catch (err) {
      setCategoryError(err instanceof Error ? err.message : 'Kategori eklenemedi.')
    } finally {
      setAddingCategory(false)
    }
  }

  const handleDeleteCategory = async (id: string, title: string) => {
    if (!window.confirm(`"${title}" kategorisini silmek istediğine emin misin?`)) return
    setCategoryError('')
    try {
      await deleteCategory(id)
      setCategoryMessage(`"${title}" silindi.`)
    } catch (err) {
      setCategoryError(err instanceof Error ? err.message : 'Kategori silinemedi.')
    }
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
    resetListFromServer()
  }

  const toggleExpanded = (id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const saveCategoryTitle = async (categoryId: string, title: string) => {
    patchLocalCategory(categoryId, { title })
    try {
      await updateCategory(categoryId, { title })
    } catch (err) {
      setCategoryError(err instanceof Error ? err.message : 'Kategori güncellenemedi.')
    } finally {
      finishCategorySync(categoryId)
    }
  }

  const saveCategoryItems = async (categoryId: string, itemIds: string[]) => {
    patchLocalCategory(categoryId, { itemIds })
    try {
      await updateCategory(categoryId, { itemIds })
    } catch (err) {
      setCategoryError(err instanceof Error ? err.message : 'İçerik listesi kaydedilemedi.')
    } finally {
      finishCategorySync(categoryId)
    }
  }

  const toggleCategoryHidden = async (categoryId: string, hidden: boolean) => {
    setCategoryError('')
    patchLocalCategory(categoryId, { hidden })
    try {
      await updateCategory(categoryId, { hidden })
    } catch (err) {
      patchLocalCategory(categoryId, { hidden: !hidden })
      setCategoryError(err instanceof Error ? err.message : 'Kategori güncellenemedi.')
    } finally {
      finishCategorySync(categoryId)
    }
  }

  const toggleNavItem = async (navId: SiteNavId, hidden: boolean) => {
    setNavSaving(true)
    setNavError('')
    try {
      const nextHidden = hidden
        ? [...new Set([...hiddenNavIds, navId])]
        : hiddenNavIds.filter((id) => id !== navId)
      await updateSiteNavVisibility(nextHidden)
    } catch (err) {
      setNavError(err instanceof Error ? err.message : 'Menü güncellenemedi.')
    } finally {
      setNavSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Kategoriler & Menü</h1>
          <p className="mt-1 text-sm text-plooy-muted">
            Ana sayfadaki içerik satırları (Trend, Yeni, sizin ekledikleriniz). Her ekleme anında
            veritabanına kaydedilir.
            {savingOrder && <span className="ml-2 text-plooy-gold">Sıra kaydediliyor…</span>}
          </p>
          <p className="mt-2 text-xs text-plooy-muted">
            Ana sayfadaki Dizi / Film <strong className="text-white/80">sekmeleri</strong> farklıdır →{' '}
            <Link to="/admin/ana-sayfa" className="text-plooy-gold hover:underline">
              Ana Sayfa → Kategori şeritleri
            </Link>
            . Çekim Notları alt bölümleri →{' '}
            <Link to="/admin/cekim-notlari" className="text-plooy-gold hover:underline">
              Çekim Notları
            </Link>
            .
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleReset()}
          className="rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10"
        >
          Demo Verisine Sıfırla
        </button>
      </div>

      <AdminSiteNavPanel hiddenNavIds={hiddenNavIds} saving={navSaving} onToggle={toggleNavItem} />

      {navError && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {navError}
        </p>
      )}

      {orderError && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {orderError}
        </p>
      )}

      {categoryError && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {categoryError}
        </p>
      )}

      {categoryMessage && (
        <p className="rounded-lg border border-plooy-gold/30 bg-plooy-gold/10 px-4 py-3 text-sm text-plooy-gold">
          {categoryMessage}
        </p>
      )}

      <div>
        <h2 className="mb-1 text-lg font-semibold text-white">Ana kategori ekle</h2>
        <p className="mb-3 text-xs text-plooy-muted">
          Misafir ana sayfada yatay film/dizi satırı olarak görünür.
        </p>
        <div className="flex gap-2">
          <input
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void handleAddCategory()
            }}
            placeholder="Örn. Belgesel, Yerli Yapımlar"
            className="flex-1 rounded-lg border border-white/10 bg-[#11141c] px-4 py-2.5 text-white outline-none focus:border-plooy-gold"
          />
          <button
            type="button"
            disabled={addingCategory || !newTitle.trim()}
            onClick={() => void handleAddCategory()}
            className="rounded-lg bg-plooy-gold px-4 py-2.5 text-sm font-semibold text-plooy-bg disabled:opacity-60"
          >
            {addingCategory ? 'Ekleniyor…' : 'Kategori Ekle'}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {orderedCategories.map((category, index) => {
          const virtualRow = isVirtualBrowseCategoryId(category.id)
          return (
          <AdminCategoryRow
            key={category.id}
            category={category}
            index={index}
            total={orderedCategories.length}
            expanded={expandedIds.has(category.id)}
            dragging={draggingId === category.id}
            savingOrder={savingOrder}
            readOnly={virtualRow}
            catalogById={catalogById}
            catalog={adminPickerCatalog}
            search={searchByCategory[category.id] ?? ''}
            onToggleExpanded={() => toggleExpanded(category.id)}
            onDelete={() => void handleDeleteCategory(category.id, category.title)}
            onNudge={(direction) => void nudgeCategory(index, direction)}
            onSearchChange={(value) =>
              setSearchByCategory((current) => ({ ...current, [category.id]: value }))
            }
            onSaveTitle={(title) => saveCategoryTitle(category.id, title)}
            onEditingChange={(editing) => setEditingCategory(category.id, editing)}
            onToggleHidden={(hidden) => toggleCategoryHidden(category.id, hidden)}
            onUpdateItems={(itemIds) => saveCategoryItems(category.id, itemIds)}
            onDragStart={(event) => handleDragStart(event, category.id)}
            onDragOver={(event) => handleDragOver(event, category.id)}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
          />
          )
        })}
      </div>
    </div>
  )
}
