import { Link } from 'react-router-dom'
import { SiteFooter } from '../SiteFooter'

export function CreatorAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#0d0f14]">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        {children}
      </div>
      <div className="px-4 pb-6 text-center">
        <Link to="/" className="text-sm text-sineoda-gold hover:underline">
          Ana siteye dön
        </Link>
      </div>
      <SiteFooter />
    </div>
  )
}
