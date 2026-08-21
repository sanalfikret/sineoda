import { dbGet, dbRun } from '../db.js'

export type LandingHeroBackgroundType = 'image' | 'video' | 'content'

export interface LandingHeroConfig {
  line1: string
  line2: string
  description: string
  ctaPrimary: string
  ctaSecondary: string
  legalNote: string
  backgroundType: LandingHeroBackgroundType
  backgroundImage: string
  backgroundVideo: string
  backgroundContentId: string | null
  featuredContentId: string | null
  showFeaturedCard: boolean
}

const SETTINGS_KEY = 'landing_hero'

export const DEFAULT_LANDING_HERO: LandingHeroConfig = {
  line1: 'Bağımsız sinemanın buluşma noktası',
  line2: 'Festival filmleri, diziler ve belgeseller',
  description:
    'Dünyanın dört bir yanından bağımsız yapımcıların özgün hikâyeleri. Ticari blockbuster değil — küratörlü seçki, sakin arayüz, sinemaseverlere özel bir izleme deneyimi.',
  ctaPrimary: 'Ücretsiz Dene',
  ctaSecondary: 'Giriş Yap',
  legalNote: "Üye olarak Kullanım Koşulları ve Gizlilik Politikası'nı kabul etmiş olursun.",
  backgroundType: 'content',
  backgroundImage: '',
  backgroundVideo: '',
  backgroundContentId: null,
  featuredContentId: null,
  showFeaturedCard: true,
}

function trimOrEmpty(value: unknown) {
  return String(value ?? '').trim()
}

function normalizeBackgroundType(value: unknown): LandingHeroBackgroundType {
  if (value === 'video' || value === 'image') return value
  return 'content'
}

function isEmbeddableVideoUrl(url: string) {
  if (!url) return false
  return !/youtube\.com|youtu\.be/i.test(url)
}

/** DB'den okunan veya admin'den gelen ham veriyi birleştir — alan silme. */
export function parseLandingHero(input: Partial<LandingHeroConfig> | null | undefined): LandingHeroConfig {
  const source = input ?? {}

  return {
    line1: trimOrEmpty(source.line1) || DEFAULT_LANDING_HERO.line1,
    line2: trimOrEmpty(source.line2) || DEFAULT_LANDING_HERO.line2,
    description: trimOrEmpty(source.description) || DEFAULT_LANDING_HERO.description,
    ctaPrimary: trimOrEmpty(source.ctaPrimary) || DEFAULT_LANDING_HERO.ctaPrimary,
    ctaSecondary: trimOrEmpty(source.ctaSecondary) || DEFAULT_LANDING_HERO.ctaSecondary,
    legalNote: trimOrEmpty(source.legalNote) || DEFAULT_LANDING_HERO.legalNote,
    backgroundType: normalizeBackgroundType(source.backgroundType),
    backgroundImage: trimOrEmpty(source.backgroundImage),
    backgroundVideo: trimOrEmpty(source.backgroundVideo),
    backgroundContentId: trimOrEmpty(source.backgroundContentId) || null,
    featuredContentId: trimOrEmpty(source.featuredContentId) || null,
    showFeaturedCard: source.showFeaturedCard !== false,
  }
}

export function getLandingHeroConfig(): LandingHeroConfig {
  const row = dbGet<{ value: string }>('SELECT value FROM site_settings WHERE key = ?', [SETTINGS_KEY])
  if (!row?.value) return { ...DEFAULT_LANDING_HERO }

  try {
    const parsed = JSON.parse(row.value) as Partial<LandingHeroConfig>
    return parseLandingHero(parsed)
  } catch {
    return { ...DEFAULT_LANDING_HERO }
  }
}

export function saveLandingHeroConfig(input: Partial<LandingHeroConfig>): LandingHeroConfig {
  const hero = parseLandingHero(input)

  if (hero.backgroundType === 'video' && !isEmbeddableVideoUrl(hero.backgroundVideo)) {
    hero.backgroundVideo = ''
  }

  dbRun('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)', [
    SETTINGS_KEY,
    JSON.stringify(hero),
  ])
  return hero
}
