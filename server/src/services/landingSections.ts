import { dbGet, dbRun } from '../db.js'

export interface LandingTextItem {
  title: string
  text: string
}

export interface LandingFaqItem {
  question: string
  answer: string
}

export interface LandingCampaignSection {
  eyebrow: string
  title: string
  description: string
  price: string
  priceSuffix: string
  priceNote: string
  image: string
  ctaPrimary: string
  ctaPrimaryLink: string
  ctaSecondary: string
  ctaSecondaryLink: string
}

export interface LandingSectionsConfig {
  manifesto: {
    pillars: LandingTextItem[]
    eyebrow: string
    title: string
    body: string
    ctaLabel: string
    ctaLink: string
  }
  features: {
    eyebrow: string
    title: string
    items: LandingTextItem[]
  }
  campaign: LandingCampaignSection
  studentCinema: {
    eyebrow: string
    title: string
    subtitle: string
    stepsHeading: string
    steps: LandingTextItem[]
    ctaPrimary: string
    ctaPrimaryLink: string
    ctaSecondary: string
    footnote: string
  }
  creator: {
    eyebrow: string
    title: string
    subtitle: string
    perks: LandingTextItem[]
    ctaPrimary: string
    ctaPrimaryLink: string
    ctaSecondary: string
    ctaSecondaryLink: string
    footnote: string
  }
  faq: {
    title: string
    items: LandingFaqItem[]
    footerText: string
    footerLinkLabel: string
    footerLink: string
  }
  emailSignup: {
    title: string
    description: string
    buttonLabel: string
  }
  journal: {
    eyebrow: string
    title: string
    description: string
  }
}

const SETTINGS_KEY = 'landing_sections'

export const DEFAULT_LANDING_SECTIONS: LandingSectionsConfig = {
  manifesto: {
    pillars: [
      {
        title: 'Dünyadan bağımsız yapımlar',
        text: 'Avrupa, Asya, Amerika ve Afrika\'dan bağımsız sinemacıların filmleri ve dizileri tek katalogda.',
      },
      {
        title: 'İstediğin zaman izle',
        text: 'Festival ödüllü filmler ve bağımsız diziler — dilediğin cihazdan, kaldığın yerden devam ederek.',
      },
    ],
    eyebrow: 'Sineoda nedir?',
    title: 'Dünyanın bağımsız sinemacılarına açılan kapı.',
    body: 'Hollywood ve ticari yapımların ötesinde; Cannes, Berlin, Sundance, Rotterdam ve yerli festivallerden bağımsız filmler, diziler, belgeseller ve kısa metrajlar.',
    ctaLabel: 'Kataloğu keşfet',
    ctaLink: '/kayit',
  },
  features: {
    eyebrow: 'Neden Sineoda',
    title: 'Dünya bağımsız sineması için tasarlandı.\nGöz yormaz.',
    items: [
      { title: 'Dünya bağımsız sineması', text: 'Kıtalar arası bağımsız yapımcıların filmleri ve dizileri.' },
      { title: 'Festival seçkisi', text: 'Ödüllü festival filmleri — küratör ekibi tarafından seçilir.' },
      { title: 'Sakin arayüz', text: 'Göz yormayan, dikkat dağıtmayan sinematik tasarım.' },
      { title: 'Her cihazda', text: 'TV, tablet veya telefonda aynı kalitede izleme.' },
    ],
  },
  campaign: {
    eyebrow: 'Abonelik',
    title: 'İzlemeye bugün başla',
    description: 'Aylık veya yıllık plan. İstediğin zaman iptal et.',
    price: '₺49',
    priceSuffix: '/ay',
    priceNote: 'veya yıllık ₺490 — 2 ay bedava',
    image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1200&h=800&fit=crop&q=80',
    ctaPrimary: 'Ücretsiz Dene',
    ctaPrimaryLink: '/kayit',
    ctaSecondary: 'Planları karşılaştır',
    ctaSecondaryLink: '/planlar',
  },
  studentCinema: {
    eyebrow: 'Sinema okullarıyla',
    title: 'Genç sinemaya dijital sahne',
    subtitle:
      'Mezun ve öğrenci filmlerinizi yükleyin, kamera arkası görüntülerinizi paylaşın.',
    stepsHeading: 'Nasıl çalışır?',
    steps: [
      { title: 'Filmini ve kamera arkasını yükle', text: 'Kısa film veya belgesel — yanında set görüntüleri.' },
      { title: 'Okulun onaylasın', text: 'Hocanız veya okul temsilcisi projeyi okul adına önerir.' },
      { title: 'Sineoda yayınlasın', text: 'Genç Sinema seçkisinde yerini alır.' },
    ],
    ctaPrimary: 'Filmini Gönder',
    ctaPrimaryLink: '/creator/kayit?program=genc-sinema',
    ctaSecondary: 'Nasıl Çalışır?',
    footnote: 'Okulunuz seçer · Sineoda son onayı verir · Film + kamera arkası birlikte yayınlanır',
  },
  creator: {
    eyebrow: 'Bağımsız yapımcılar için',
    title: 'Filmini yükle, adil paylaşımdan kazanç elde et',
    subtitle: 'Sineoda bağımsız sinemacılar için de tasarlandı.',
    perks: [
      { title: 'Gerçek izleyici kitlesi', text: 'Bağımsız sinema meraklılarından oluşan odaklı bir topluluk.' },
      { title: 'Adil gelir modeli', text: 'Şeffaf paylaşım koşulları.' },
      { title: 'Küratörlü vitrin', text: 'Filmin editöryal incelemeden geçer.' },
      { title: 'Tek platform, tek adres', text: 'Bağımsız yapımını tek yerden yönet.' },
    ],
    ctaPrimary: 'Yapımcı Üyeliği Oluştur',
    ctaPrimaryLink: '/creator/kayit',
    ctaSecondary: 'Yapımcı Girişi',
    ctaSecondaryLink: '/creator/giris',
    footnote: 'Bağımsız sinemanın buluşma noktası — izleyici tarafında keşfet, yapımcı tarafında yayınla.',
  },
  faq: {
    title: 'Sıkça Sorulan Sorular',
    items: [
      {
        question: 'Sineoda nedir?',
        answer:
          'Sineoda; dünyanın dört bir yanından bağımsız sinemacıların filmlerini, dizilerini ve belgesellerini izleyebileceğiniz küratörlü bir dijital yayın platformudur.',
      },
      {
        question: "Sineoda'nın maliyeti nedir?",
        answer:
          'Aylık ₺49 veya yıllık ₺490 planlarımız mevcuttur. Yıllık planda 2 ay bedava avantajı sunulur.',
      },
      {
        question: 'Nerede izleyebilirim?',
        answer:
          "Sineoda'yı web tarayıcısı, Android, iOS ve Android TV üzerinden izleyebilirsiniz.",
      },
      {
        question: 'Nasıl iptal ederim?',
        answer: 'Hesabınızdan Abonelik bölümünden planınızı istediğiniz zaman iptal edebilirsiniz.',
      },
      {
        question: "Sineoda'da ne izleyebilirim?",
        answer: 'Dünya bağımsız sinemasından filmler, diziler, belgeseller ve kısa metrajlar.',
      },
      {
        question: 'Sineoda çocuklar için uygun mudur?',
        answer: 'Evet. Çocuk profili ile yaşa uygun içerikler sunulur.',
      },
    ],
    footerText: 'İzlemeye hazır mısın?',
    footerLinkLabel: 'Üye olmak için e-posta adresini gir',
    footerLink: '/kayit',
  },
  emailSignup: {
    title: 'İzlemeye hazır mısın?',
    description: 'E-posta adresini gir, üyeliğini oluştur ve sınırsız içeriğe hemen başla.',
    buttonLabel: 'Başla',
  },
  journal: {
    eyebrow: 'Sineoda Dergi',
    title: 'Bağımsız sinema üzerine yazılar',
    description: 'Festival notları, küratör seçkileri ve dünya bağımsız sinemasından haberler.',
  },
}

function trim(value: unknown) {
  return String(value ?? '').trim()
}

function parseTextItems(raw: unknown, fallback: LandingTextItem[]) {
  if (!Array.isArray(raw)) return fallback
  return raw
    .map((item) => ({
      title: trim((item as LandingTextItem)?.title),
      text: trim((item as LandingTextItem)?.text),
    }))
    .filter((item) => item.title || item.text)
}

function parseFaqItems(raw: unknown, fallback: LandingFaqItem[]) {
  if (!Array.isArray(raw)) return fallback
  const parsed = raw
    .map((item) => ({
      question: trim((item as LandingFaqItem)?.question),
      answer: trim((item as LandingFaqItem)?.answer),
    }))
    .filter((item) => item.question && item.answer)
  return parsed
}

export function parseLandingSections(input: Partial<LandingSectionsConfig> | null | undefined): LandingSectionsConfig {
  const source = input ?? {}
  const base = DEFAULT_LANDING_SECTIONS

  return {
    manifesto: {
      pillars: parseTextItems(source.manifesto?.pillars, base.manifesto.pillars),
      eyebrow: trim(source.manifesto?.eyebrow) || base.manifesto.eyebrow,
      title: trim(source.manifesto?.title) || base.manifesto.title,
      body: trim(source.manifesto?.body) || base.manifesto.body,
      ctaLabel: trim(source.manifesto?.ctaLabel) || base.manifesto.ctaLabel,
      ctaLink: trim(source.manifesto?.ctaLink) || base.manifesto.ctaLink,
    },
    features: {
      eyebrow: trim(source.features?.eyebrow) || base.features.eyebrow,
      title: trim(source.features?.title) || base.features.title,
      items: parseTextItems(source.features?.items, base.features.items),
    },
    campaign: {
      eyebrow: trim(source.campaign?.eyebrow) || base.campaign.eyebrow,
      title: trim(source.campaign?.title) || base.campaign.title,
      description: trim(source.campaign?.description) || base.campaign.description,
      price: trim(source.campaign?.price) || base.campaign.price,
      priceSuffix: trim(source.campaign?.priceSuffix) || base.campaign.priceSuffix,
      priceNote: trim(source.campaign?.priceNote) || base.campaign.priceNote,
      image: trim(source.campaign?.image) || base.campaign.image,
      ctaPrimary: trim(source.campaign?.ctaPrimary) || base.campaign.ctaPrimary,
      ctaPrimaryLink: trim(source.campaign?.ctaPrimaryLink) || base.campaign.ctaPrimaryLink,
      ctaSecondary: trim(source.campaign?.ctaSecondary) || base.campaign.ctaSecondary,
      ctaSecondaryLink: trim(source.campaign?.ctaSecondaryLink) || base.campaign.ctaSecondaryLink,
    },
    studentCinema: {
      eyebrow: trim(source.studentCinema?.eyebrow) || base.studentCinema.eyebrow,
      title: trim(source.studentCinema?.title) || base.studentCinema.title,
      subtitle: trim(source.studentCinema?.subtitle) || base.studentCinema.subtitle,
      stepsHeading: trim(source.studentCinema?.stepsHeading) || base.studentCinema.stepsHeading,
      steps: parseTextItems(source.studentCinema?.steps, base.studentCinema.steps),
      ctaPrimary: trim(source.studentCinema?.ctaPrimary) || base.studentCinema.ctaPrimary,
      ctaPrimaryLink: trim(source.studentCinema?.ctaPrimaryLink) || base.studentCinema.ctaPrimaryLink,
      ctaSecondary: trim(source.studentCinema?.ctaSecondary) || base.studentCinema.ctaSecondary,
      footnote: trim(source.studentCinema?.footnote) || base.studentCinema.footnote,
    },
    creator: {
      eyebrow: trim(source.creator?.eyebrow) || base.creator.eyebrow,
      title: trim(source.creator?.title) || base.creator.title,
      subtitle: trim(source.creator?.subtitle) || base.creator.subtitle,
      perks: parseTextItems(source.creator?.perks, base.creator.perks),
      ctaPrimary: trim(source.creator?.ctaPrimary) || base.creator.ctaPrimary,
      ctaPrimaryLink: trim(source.creator?.ctaPrimaryLink) || base.creator.ctaPrimaryLink,
      ctaSecondary: trim(source.creator?.ctaSecondary) || base.creator.ctaSecondary,
      ctaSecondaryLink: trim(source.creator?.ctaSecondaryLink) || base.creator.ctaSecondaryLink,
      footnote: trim(source.creator?.footnote) || base.creator.footnote,
    },
    faq: {
      title: trim(source.faq?.title) || base.faq.title,
      items: parseFaqItems(source.faq?.items, base.faq.items),
      footerText: trim(source.faq?.footerText) || base.faq.footerText,
      footerLinkLabel: trim(source.faq?.footerLinkLabel) || base.faq.footerLinkLabel,
      footerLink: trim(source.faq?.footerLink) || base.faq.footerLink,
    },
    emailSignup: {
      title: trim(source.emailSignup?.title) || base.emailSignup.title,
      description: trim(source.emailSignup?.description) || base.emailSignup.description,
      buttonLabel: trim(source.emailSignup?.buttonLabel) || base.emailSignup.buttonLabel,
    },
    journal: {
      eyebrow: trim(source.journal?.eyebrow) || base.journal.eyebrow,
      title: trim(source.journal?.title) || base.journal.title,
      description: trim(source.journal?.description) || base.journal.description,
    },
  }
}

export function getLandingSectionsConfig(): LandingSectionsConfig {
  const row = dbGet<{ value: string }>('SELECT value FROM site_settings WHERE key = ?', [SETTINGS_KEY])
  if (!row?.value) return { ...DEFAULT_LANDING_SECTIONS }

  try {
    return parseLandingSections(JSON.parse(row.value) as Partial<LandingSectionsConfig>)
  } catch {
    return { ...DEFAULT_LANDING_SECTIONS }
  }
}

export function saveLandingSectionsConfig(input: Partial<LandingSectionsConfig>): LandingSectionsConfig {
  const sections = parseLandingSections(input)
  dbRun('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)', [
    SETTINGS_KEY,
    JSON.stringify(sections),
  ])
  return sections
}
