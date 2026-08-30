import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { AppShell, useContentUI } from '../components/AppShell'
import { ContentDetailView } from '../components/ContentDetailView'
import { useAuth } from '../context/AuthContext'
import { useContent } from '../context/ContentContext'
import { isContentAllowedForKids } from '../utils/contentRating'

function ContentDetailContent() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { getContentById, isLoading } = useContent()
  const { activeProfile } = useAuth()
  const { openPlayer } = useContentUI()

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
    return <Navigate to="/" replace />
  }

  return (
    <ContentDetailView
      item={item}
      onPlay={openPlayer}
      onBack={handleBack}
      mode="page"
      kidsProfileBlocked={kidsProfileBlocked}
    />
  )
}

export function ContentDetailPage() {
  return (
    <AppShell>
      <ContentDetailContent />
    </AppShell>
  )
}
