import { dbGet, dbRun } from '../db.js'

export interface LandingHeroConfig {
  line1: string
  line2: string
  description: string
  ctaPrimary: string
  ctaSecondary: string
  legalNote: string
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
  backgroundImage: '',
  backgroundVideo: '',
  backgroundContentId: null,
  featuredContentId: null,
  showFeaturedCard: true,
}

function trimOrEmpty(value: unknown) {
  return String(value ?? '').trim()
}

function isEmbeddableVideoUrl(url: string) {
  return Boolean(url) && !/youtube\.com|youtu\.be/i.test(url)
}

export function parseLandingHero(input: Partial<LandingHeroConfig> | null | undefined): LandingHeroConfig {
  const source = input ?? {}

  let backgroundImage = trimOrEmpty(source.backgroundImage)
  let backgroundVideo = trimOrEmpty(source.backgroundVideo)
  let backgroundContentId = trimOrEmpty(source.backgroundContentId) || null

  const legacyType = (source as { backgroundType?: string }).backgroundType
  if (legacyType === 'image') {
    backgroundVideo = ''
    backgroundContentId = null
  } else if (legacyType === 'video') {
    backgroundImage = ''
    backgroundContentId = null
  } else if (legacyType === 'content') {
    backgroundImage = ''
    backgroundVideo = ''
  }

  if (backgroundImage) {
    backgroundVideo = ''
    backgroundContentId = null
  } else if (isEmbeddableVideoUrl(backgroundVideo)) {
    backgroundImage = ''
    backgroundContentId = null
  } else if (backgroundContentId) {
    backgroundImage = ''
    backgroundVideo = ''
  } else {
    backgroundVideo = ''
  }

  if (!isEmbeddableVideoUrl(backgroundVideo)) {
    backgroundVideo = ''
  }

  return {
    line1: trimOrEmpty(source.line1) || DEFAULT_LANDING_HERO.line1,
    line2: trimOrEmpty(source.line2) || DEFAULT_LANDING_HERO.line2,
    description: trimOrEmpty(source.description) || DEFAULT_LANDING_HERO.description,
    ctaPrimary: trimOrEmpty(source.ctaPrimary) || DEFAULT_LANDING_HERO.ctaPrimary,
    ctaSecondary: trimOrEmpty(source.ctaSecondary) || DEFAULT_LANDING_HERO.ctaSecondary,
    legalNote: trimOrEmpty(source.legalNote) || DEFAULT_LANDING_HERO.legalNote,
    backgroundImage,
    backgroundVideo,
    backgroundContentId,
    featuredContentId: trimOrEmpty(source.featuredContentId) || null,
    showFeaturedCard: source.showFeaturedCard !== false,
  }
}

export function getLandingHeroConfig(): LandingHeroConfig {
  const row = dbGet<{ value: string }>('SELECT value FROM site_settings WHERE key = ?', [SETTINGS_KEY])
  if (!row?.value) return { ...DEFAULT_LANDING_HERO }

  try {
    return parseLandingHero(JSON.parse(row.value) as Partial<LandingHeroConfig>)
  } catch {
    return { ...DEFAULT_LANDING_HERO }
  }
}

export function saveLandingHeroConfig(input: Partial<LandingHeroConfig>): LandingHeroConfig {
  const hero = parseLandingHero(input)
  dbRun('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)', [
    SETTINGS_KEY,
    JSON.stringify(hero),
  ])
  return hero
}
