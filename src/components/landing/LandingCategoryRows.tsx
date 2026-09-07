import { GuestGrid } from './GuestPresentation'
import type { LandingShowcaseResponse } from '../../api/client'
/** Only the showcases explicitly configured in Admin > Ana Sayfa. */
export function LandingCategoryRows({showcases}:{showcases:LandingShowcaseResponse[]}) {
 return <>{showcases.filter(row=>row.items.length>0).map(row=><GuestGrid key={row.id} id={'showcase:'+row.id} title={row.title} items={row.items} href={'/?kategori=showcase:'+encodeURIComponent(row.id)} />)}</>
}
