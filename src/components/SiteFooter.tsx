import { Link } from 'react-router-dom'
import { BRAND_NAME } from '../constants/brand'
import { InstallAppButton } from './InstallAppButton'
import { LEGAL_LINKS } from '../constants/legal'

export function SiteFooter() {
  return (
    <footer className="border-t border-white/5 bg-plooy-bg px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
        <p className="text-sm text-plooy-muted">© {new Date().getFullYear()} {BRAND_NAME}</p>
        <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
          <Link to="/dergi" className="text-plooy-muted transition hover:text-white">
            Dergi
          </Link>
          <Link to="/iletisim" className="text-plooy-muted transition hover:text-white">
            İletişim
          </Link>
          <Link to="/creator/giris" className="text-plooy-muted transition hover:text-white">
            Yapımcı Girişi
          </Link>
          <Link to="/creator/kayit" className="text-plooy-muted transition hover:text-white">
            Film Başvurusu Yap
          </Link>
          <InstallAppButton variant="link" label="Uygulamayı indir" />
          {LEGAL_LINKS.map((link) => (
            <Link
              key={link.slug}
              to={`/yasal/${link.slug}`}
              className="text-plooy-muted transition hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
