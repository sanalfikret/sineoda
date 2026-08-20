import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { CONTENT_TYPES } from './contentTypes'
import { LEGAL_DOCUMENTS, LEGAL_LINKS } from './legal'
import {
  ADMIN_NAV_ITEMS,
  CONTENT_TYPE_BROWSE_PATHS,
  CREATOR_NAV_ITEMS,
  FOOTER_PRODUCER_LINKS,
  FOOTER_PUBLIC_LINKS,
  LANDING_NAV_ITEMS,
  REGISTERED_APP_PATHS,
  VIEWER_NAV_ITEMS,
  footerLegalLinks,
} from './navigation'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const appSource = readFileSync(join(root, 'src/App.tsx'), 'utf8')
const headerSource = readFileSync(join(root, 'src/components/Header.tsx'), 'utf8')
const adminSource = readFileSync(join(root, 'src/components/admin/AdminLayout.tsx'), 'utf8')
const landingHeaderSource = readFileSync(join(root, 'src/components/landing/LandingHeader.tsx'), 'utf8')
const footerSource = readFileSync(join(root, 'src/components/SiteFooter.tsx'), 'utf8')

function appDeclaresPath(path: string) {
  if (path === '/') return /path="\/"/.test(appSource)
  if (path === '/admin') return appSource.includes('path="/admin"')
  if (path.startsWith('/admin/') && path !== '/admin/giris') {
    const leaf = path.slice('/admin/'.length)
    return appSource.includes(`path="${path}"`) || appSource.includes(`path="${leaf}"`)
  }
  return appSource.includes(`path="${path}"`)
}

describe('menü ve rota eşleşmesi', () => {
  it('kayıtlı her path App.tsx içinde tanımlı', () => {
    const missing = REGISTERED_APP_PATHS.filter((path) => !appDeclaresPath(path))
    expect(missing).toEqual([])
  })

  it('izleyici menüsündeki her link kayıtlı rota', () => {
    for (const item of VIEWER_NAV_ITEMS) {
      expect(REGISTERED_APP_PATHS).toContain(item.to)
    }
  })

  it('her içerik türünün katalog sayfası izleyici menüsünde', () => {
    const viewerPaths = VIEWER_NAV_ITEMS.map((item) => item.to)
    for (const type of CONTENT_TYPES) {
      expect(viewerPaths).toContain(CONTENT_TYPE_BROWSE_PATHS[type.value])
    }
  })

  it('yapımcı menüsü izleyici kataloğunu göstermez', () => {
    const creatorPaths = CREATOR_NAV_ITEMS.map((item) => item.to)
    expect(creatorPaths).toContain('/creator')
    expect(creatorPaths).not.toContain('/diziler')
    expect(creatorPaths).not.toContain('/filmler')
    expect(FOOTER_PRODUCER_LINKS.every((link) => !creatorPaths.includes(link.to))).toBe(true)
  })

  it('landing, admin ve footer linkleri kayıtlı rota', () => {
    const links = [
      ...LANDING_NAV_ITEMS,
      ...ADMIN_NAV_ITEMS,
      ...FOOTER_PUBLIC_LINKS,
      ...FOOTER_PRODUCER_LINKS,
      ...footerLegalLinks(),
    ]
    for (const item of links) {
      if (item.to.startsWith('/yasal/')) {
        expect(item.to.startsWith('/yasal/')).toBe(true)
        continue
      }
      expect(REGISTERED_APP_PATHS).toContain(item.to)
    }
  })

  it('yasal footer linkleri LEGAL_DOCUMENTS ile eşleşir', () => {
    expect(LEGAL_LINKS.map((link) => link.slug).sort()).toEqual(Object.keys(LEGAL_DOCUMENTS).sort())
  })

  it('Header, admin ve landing menüleri ortak sabitleri kullanır', () => {
    expect(headerSource).toContain('VIEWER_NAV_ITEMS')
    expect(headerSource).toContain('CREATOR_NAV_ITEMS')
    expect(adminSource).toContain('ADMIN_NAV_ITEMS')
    expect(landingHeaderSource).toContain('LANDING_NAV_ITEMS')
    expect(footerSource).toContain('FOOTER_PUBLIC_LINKS')
  })
})
