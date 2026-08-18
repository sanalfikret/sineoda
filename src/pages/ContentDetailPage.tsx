import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { AppShell, useContentUI } from '../components/AppShell'
import { ContentDetailView } from '../components/ContentDetailView'
import { useContent } from '../context/ContentContext'

function ContentDetailContent() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { getContentById, isLoading } = useContent()
  const { openPlayer } = useContentUI()

  const item = getContentById(id)
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
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-sineoda-gold border-t-transparent" />
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
