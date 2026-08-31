import { useMemo, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { SITE_NAV_ITEMS, type SiteNavId } from '../constants/siteNav'
import { useContent } from '../context/ContentContext'
import { useLocale } from '../i18n/LocaleContext'
import { toTrPathname } from '../i18n/paths'
import { navIdForBrowseRoute } from '../utils/navVisibility'

interface NavRouteGuardProps {
  children: ReactNode
  contentType?: string | null
  verticalOnly?: boolean
  studentCinemaOnly?: boolean
  cekimNotlariOnly?: boolean
  classicsOnly?: boolean
}

function resolveNavId(
  path: string,
  props: Omit<NavRouteGuardProps, 'children'>,
): SiteNavId | null {
  const fromBrowse = navIdForBrowseRoute({
    contentType: props.contentType,
    verticalOnly: props.verticalOnly,
    studentCinemaOnly: props.studentCinemaOnly,
    cekimNotlariOnly: props.cekimNotlariOnly,
    classicsOnly: props.classicsOnly,
    path,
  })
  if (fromBrowse) return fromBrowse

  const match = SITE_NAV_ITEMS.find((item) => item.match(path))
  return match?.id ?? null
}

export function NavRouteGuard({ children, ...props }: NavRouteGuardProps) {
  const location = useLocation()
  const { hiddenNavIds, isLoading } = useContent()
  const { localizePath } = useLocale()
  const trPath = toTrPathname(location.pathname)

  const navId = useMemo(
    () => resolveNavId(trPath, props),
    [trPath, props.contentType, props.verticalOnly, props.studentCinemaOnly, props.cekimNotlariOnly, props.classicsOnly],
  )

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-plooy-bg">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-plooy-gold border-t-transparent" />
      </div>
    )
  }

  if (navId && hiddenNavIds.includes(navId)) {
    return <Navigate to={localizePath('/')} replace />
  }

  return children
}
