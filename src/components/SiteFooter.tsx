import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  FOOTER_PRODUCER_LINKS,
  FOOTER_PUBLIC_LINKS,
  footerLegalLinks,
} from '../constants/navigation'

export function SiteFooter() {
  const { user, isCreator } = useAuth()
  const producerLinks = user
    ? isCreator
      ? [{ label: 'Yapımcı Paneli', to: '/creator' }]
      : []
    : FOOTER_PRODUCER_LINKS

  return (
    <footer className="border-t border-white/5 bg-sineoda-bg px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
        <p className="text-sm text-sineoda-muted">© {new Date().getFullYear()} Sineoda</p>
        <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
          {FOOTER_PUBLIC_LINKS.map((link) => (
            <Link key={link.to} to={link.to} className="text-sineoda-muted transition hover:text-white">
              {link.label}
            </Link>
          ))}
          {producerLinks.map((link) => (
            <Link key={link.to} to={link.to} className="text-sineoda-muted transition hover:text-white">
              {link.label}
            </Link>
          ))}
          {footerLegalLinks().map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sineoda-muted transition hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
