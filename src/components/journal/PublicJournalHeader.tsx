import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { PlooyLogo } from '../PlooyLogo'

export function PublicJournalHeader() {
  const { user } = useAuth()

  return (
    <header className="safe-top border-b border-white/5 px-4 py-5 sm:px-6">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4">
        <PlooyLogo variant="wordmark" tone="on-dark" linked linkTo="/" className="h-7" />
        {user ? (
          <Link
            to="/profiller"
            className="rounded-md border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/5"
          >
            Profillere dön
          </Link>
        ) : (
          <Link
            to="/kayit"
            className="rounded-md bg-sineoda-accent px-4 py-2 text-sm font-semibold text-sineoda-bg"
          >
            Üye Ol
          </Link>
        )}
      </div>
    </header>
  )
}
