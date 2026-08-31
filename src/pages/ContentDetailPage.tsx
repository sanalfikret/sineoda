import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { resolveMediaUrl } from '../api/client'
import { AppShell, useContentUI } from '../components/AppShell'
import { ContentDetailView } from '../components/ContentDetailView'
import { PageMeta } from '../components/PageMeta'
import { VideoStructuredData } from '../components/StructuredData'
import { useAuth } from '../context/AuthContext'
import { useContent } from '../context/ContentContext'
import { useLocale } from '../i18n/LocaleContext'
import { isContentAllowedForKids } from '../utils/contentRating'

function ContentDetailContent() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { getContentById, isLoading } = useContent()
  const { activeProfile } = useAuth()
  const { openPlayer } = useContentUI()
  const { localizePath } = useLocale()

  const item = getContentById(id)
  const kidsProfileBlocked = Boolean(
    activeProfile?.isKids && item && !isContentAllowedForKids(item.rating),
  )
  const storedFrom = sessionStorage.getItem('content-detail-from')
  const from = (location.state as { from?: string } | null)?.from ?? storedFrom ?? '/'

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate(from)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-plooy-gold border-t-transparent" />
      </div>
    )
  }

  if (!item) {
    return <Navigate to={localizePath('/')} replace />
  }

  return (
    <>
      <PageMeta
        title={item.title}
        description={item.description}
        image={resolveMediaUrl(item.poster)}
        path={`/icerik/${item.id}`}
      />
      <VideoStructuredData
        title={item.title}
        description={item.description}
        thumbnailUrl={
          resolveMediaUrl(item.poster) ||
          (typeof window !== 'undefined' ? `${window.location.origin}/brand/plooy-wordmark.png` : '')
        }
        pageUrl={
          typeof window !== 'undefined'
            ? `${window.location.origin}/icerik/${item.id}`
            : `/icerik/${item.id}`
        }
        uploadDate={item.publishedAt ?? null}
        contentType={item.type}
      />
      <ContentDetailView
        item={item}
        onPlay={openPlayer}
        onBack={handleBack}
        mode="page"
        kidsProfileBlocked={kidsProfileBlocked}
      />
    </>
  )
}

export function ContentDetailPage() {
  return (
    <AppShell>
      <ContentDetailContent />
    </AppShell>
  )
}
