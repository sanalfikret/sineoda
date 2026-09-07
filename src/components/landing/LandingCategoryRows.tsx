import { useContent } from '../../context/ContentContext'
import { buildBrowseRows } from '../../utils/browse'
import { GuestGrid } from './GuestPresentation'
export function LandingCategoryRows() {
 const content=useContent()
 const rows=buildBrowseRows(content.visibleCatalog,{},content.categories,content.getContentById,{studentCinemaPicks:content.studentCinemaPicks,categoryOrder:content.categoryOrder})
 return <>{rows.map(row=><GuestGrid key={row.id} id={row.id} title={row.title} items={row.items} href={'/?kategori='+encodeURIComponent(row.id)} />)}</>
}
