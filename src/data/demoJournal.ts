import type { JournalPost } from '../types/journal'
import { BRAND_NAME, BRAND_EDITOR } from '../constants/brand'

export const DEMO_JOURNAL_POSTS: JournalPost[] = [
  {
    id: 'journal-demo-1',
    slug: 'berlinale-2026-bagimsiz-sinemadan-notlar',
    title: 'Berlinale 2026: Bağımsız sinemadan notlar',
    excerpt:
      'Berlin Film Festivali\'nin bağımsız bölümünden öne çıkan yapımlar ve dünya sinemasının yeni sesleri.',
    body: `Berlinale her yıl bağımsız sinemanın nabzını tutar. Bu yıl da ticari yapımların gölgesinde kalan özgün hikâyeler ön plana çıktı.

Özellikle Asya ve Latin Amerika coğrafyalarından gelen yapımlar, festivalin en çok konuşulan işleri arasındaydı. Küçük bütçeli filmlerin büyük duygular taşıyabileceğini bir kez daha gördük.

${BRAND_NAME} seçkisinde bu festivalden iz bırakan yapımları yakında katalogda bulabileceksiniz.`,
    coverImage:
      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&h=675&fit=crop&q=80',
    author: BRAND_EDITOR,
    contentId: null,
    status: 'published',
    publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'journal-demo-2',
    slug: 'bagimsiz-dizi-yapimi-neden-yukseliyor',
    title: 'Bağımsız dizi yapımı neden yükseliyor?',
    excerpt:
      'Dünya genelinde bağımsız yapımcıların kısa ve orta metraj dizi formatına yönelmesinin arkasındaki trendler.',
    body: `Bağımsız sinemacılar artık yalnızca festival filmleriyle sınırlı değil. Dizi formatı, daha uzun soluklu karakter gelişimine ve düşük bütçeyle üretime olanak tanıyor.

Avrupa ve Orta Doğu'dan gelen bağımsız diziler, geleneksel yayıncılık modellerinin dışında doğrudan izleyiciye ulaşmayı başarıyor.

${BRAND_NAME}'da bağımsız dizi yapımlarına ayrılmış bir seçki bulacaksınız — Hollywood dizileri değil, özgün sesler.`,
    coverImage:
      'https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=1200&h=675&fit=crop&q=80',
    author: BRAND_EDITOR,
    contentId: null,
    status: 'published',
    publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'journal-demo-3',
    slug: 'turkiyeden-bagimsiz-sesler',
    title: 'Türkiye\'den bağımsız sesler',
    excerpt:
      `Yerli bağımsız sinemacıların festival yolculuğu ve ${BRAND_NAME} kataloğuna yansıyan seçkiler.`,
    body: `Türk bağımsız sineması son yıllarda uluslararası festivallerde güçlü bir varlık gösteriyor. Antalya'dan İstanbul'a, yerel hikâyeler evrensel temalarla buluşuyor.

Bağımsız yapımcıların en büyük zorluğu görünürlük. ${BRAND_NAME}, bu yapımlara dünya izleyicisine ulaşacak bir vitrin sunmayı hedefliyor.`,
    coverImage:
      'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=1200&h=675&fit=crop&q=80',
    author: BRAND_EDITOR,
    contentId: null,
    status: 'published',
    publishedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

export function resolveJournalPosts(apiPosts?: JournalPost[]): JournalPost[] {
  if (apiPosts?.length) return apiPosts
  return DEMO_JOURNAL_POSTS
}

export function resolveJournalPost(slug: string, apiPost?: JournalPost | null): JournalPost | null {
  if (apiPost) return apiPost
  return DEMO_JOURNAL_POSTS.find((post) => post.slug === slug) ?? null
}
