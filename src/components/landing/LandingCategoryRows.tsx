import { useContent } from '../../context/ContentContext'
import { buildBrowseRows } from '../../utils/browse'
import { ContentRow } from '../ContentRow'
export function LandingCategoryRows() {
 const content=useContent()
 const rows=buildBrowseRows(content.visibleCatalog,{},content.categories,content.getContentById,{studentCinemaPicks:content.studentCinemaPicks,categoryOrder:content.categoryOrder})
 return <>{rows.map(row=><ContentRow key={row.id} title={row.title} items={row.items} guestMode onSelect={()=>undefined} viewAllHref={'/?kategori='+encodeURIComponent(row.id)} />)}</>
}
