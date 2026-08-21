import {
  BRAND_CREATOR,
  BRAND_FEATURES,
  BRAND_MANIFESTO,
  BRAND_PILLARS,
  BRAND_STUDENT_CINEMA,
} from './brand'

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
    ctaSecondary: string
    footnote: string
  }
  creator: {
    eyebrow: string
    title: string
    subtitle: string
    perks: LandingTextItem[]
    ctaPrimary: string
    ctaSecondary: string
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

export const DEFAULT_LANDING_SECTIONS: LandingSectionsConfig = {
  manifesto: {
    pillars: BRAND_PILLARS.map((item) => ({ title: item.title, text: item.text })),
    eyebrow: BRAND_MANIFESTO.eyebrow,
    title: BRAND_MANIFESTO.title,
    body: BRAND_MANIFESTO.body,
    ctaLabel: 'Kataloğu keşfet',
    ctaLink: '/kayit',
  },
  features: {
    eyebrow: 'Neden Sineoda',
    title: 'Dünya bağımsız sineması için tasarlandı.\nGöz yormaz.',
    items: BRAND_FEATURES.map((item) => ({ title: item.title, text: item.text })),
  },
  campaign: {
    eyebrow: 'Abonelik',
    title: 'İzlemeye bugün başla',
    description: 'Aylık veya yıllık plan. İstediğin zaman iptal et.',
    price: '₺149',
    priceSuffix: '/ay',
    priceNote: 'veya yıllık ₺1.290 — 2 ay bedava',
    image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1200&h=800&fit=crop&q=80',
    ctaPrimary: 'Ücretsiz Dene',
    ctaPrimaryLink: '/kayit',
    ctaSecondary: 'Planları karşılaştır',
    ctaSecondaryLink: '/planlar',
  },
  studentCinema: {
    eyebrow: BRAND_STUDENT_CINEMA.eyebrow,
    title: BRAND_STUDENT_CINEMA.title,
    subtitle: BRAND_STUDENT_CINEMA.subtitle,
    stepsHeading: 'Nasıl çalışır?',
    steps: BRAND_STUDENT_CINEMA.steps.map((item) => ({ title: item.title, text: item.text })),
    ctaPrimary: BRAND_STUDENT_CINEMA.ctaPrimary,
    ctaSecondary: BRAND_STUDENT_CINEMA.ctaSecondary,
    footnote: 'Okulunuz seçer · Sineoda son onayı verir · Film + kamera arkası birlikte yayınlanır',
  },
  creator: {
    eyebrow: BRAND_CREATOR.eyebrow,
    title: BRAND_CREATOR.title,
    subtitle: BRAND_CREATOR.subtitle,
    perks: BRAND_CREATOR.perks.map((item) => ({ title: item.title, text: item.text })),
    ctaPrimary: BRAND_CREATOR.ctaPrimary,
    ctaSecondary: BRAND_CREATOR.ctaSecondary,
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
          'Aylık ₺149 veya yıllık ₺1.290 planlarımız mevcuttur. Yıllık planda 2 ay bedava avantajı sunulur.',
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

export function mergeLandingSections(
  input: Partial<LandingSectionsConfig> | null | undefined,
): LandingSectionsConfig {
  if (!input) return DEFAULT_LANDING_SECTIONS

  const mergeFaqItems = (saved: LandingFaqItem[] | undefined, defaults: LandingFaqItem[]) => {
    if (!saved?.length) return defaults
    const seen = new Set(saved.map((item) => item.question.trim().toLocaleLowerCase('tr')))
    const missing = defaults.filter(
      (item) => !seen.has(item.question.trim().toLocaleLowerCase('tr')),
    )
    return missing.length > 0 ? [...saved, ...missing] : saved
  }

  return {
    manifesto: { ...DEFAULT_LANDING_SECTIONS.manifesto, ...input.manifesto },
    features: { ...DEFAULT_LANDING_SECTIONS.features, ...input.features },
    campaign: { ...DEFAULT_LANDING_SECTIONS.campaign, ...input.campaign },
    studentCinema: { ...DEFAULT_LANDING_SECTIONS.studentCinema, ...input.studentCinema },
    creator: { ...DEFAULT_LANDING_SECTIONS.creator, ...input.creator },
    faq: {
      ...DEFAULT_LANDING_SECTIONS.faq,
      ...input.faq,
      items: mergeFaqItems(input.faq?.items, DEFAULT_LANDING_SECTIONS.faq.items),
    },
    emailSignup: { ...DEFAULT_LANDING_SECTIONS.emailSignup, ...input.emailSignup },
    journal: { ...DEFAULT_LANDING_SECTIONS.journal, ...input.journal },
  }
}
