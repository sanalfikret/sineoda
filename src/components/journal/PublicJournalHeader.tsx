import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export function PublicJournalHeader() {
  const { user } = useAuth()

  return (
    <header className="safe-top border-b border-white/5 px-4 py-5 sm:px-6">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2">
          <img src="/icon.svg" alt="" className="h-8 w-8 rounded-lg" />
          <span className="text-xl font-bold">
            Sine<span className="text-sineoda-accent">oda</span>
          </span>
        </Link>
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
