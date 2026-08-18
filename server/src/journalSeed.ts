import { v4 as uuid } from 'uuid'
import { dbGet, dbRun } from './db.js'
import { slugify } from './mappers.js'

const SEED_POSTS = [
  {
    slug: 'berlinale-2026-bagimsiz-sinemadan-notlar',
    title: 'Berlinale 2026: Bağımsız sinemadan notlar',
    excerpt:
      'Berlin Film Festivali\'nin bağımsız bölümünden öne çıkan yapımlar ve dünya sinemasının yeni sesleri.',
    body: `Berlinale her yıl bağımsız sinemanın nabzını tutar. Bu yıl da ticari yapımların gölgesinde kalan özgün hikâyeler ön plana çıktı.

Özellikle Asya ve Latin Amerika coğrafyalarından gelen yapımlar, festivalin en çok konuşulan işleri arasındaydı. Küçük bütçeli filmlerin büyük duygular taşıyabileceğini bir kez daha gördük.

Sineoda seçkisinde bu festivalden iz bırakan yapımları yakında katalogda bulabileceksiniz.`,
    cover_image:
      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&h=675&fit=crop&q=80',
    author: 'Sineoda Editör',
  },
  {
    slug: 'bagimsiz-dizi-yapimi-neden-yukseliyor',
    title: 'Bağımsız dizi yapımı neden yükseliyor?',
    excerpt:
      'Dünya genelinde bağımsız yapımcıların kısa ve orta metraj dizi formatına yönelmesinin arkasındaki trendler.',
    body: `Bağımsız sinemacılar artık yalnızca festival filmleriyle sınırlı değil. Dizi formatı, daha uzun soluklu karakter gelişimine ve düşük bütçeyle üretime olanak tanıyor.

Avrupa ve Orta Doğu'dan gelen bağımsız diziler, geleneksel yayıncılık modellerinin dışında doğrudan izleyiciye ulaşmayı başarıyor. Bu da küratörlü platformlar için büyük bir fırsat.

Sineoda'da bağımsız dizi yapımlarına ayrılmış bir seçki bulacaksınız — Hollywood dizileri değil, özgün sesler.`,
    cover_image:
      'https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=1200&h=675&fit=crop&q=80',
    author: 'Sineoda Editör',
  },
  {
    slug: 'turkiyeden-bagimsiz-sesler',
    title: 'Türkiye\'den bağımsız sesler',
    excerpt:
      'Yerli bağımsız sinemacıların festival yolculuğu ve Sineoda kataloğuna yansıyan seçkiler.',
    body: `Türk bağımsız sineması son yıllarda uluslararası festivallerde güçlü bir varlık gösteriyor. Antalya'dan İstanbul'a, yerel hikâyeler evrensel temalarla buluşuyor.

Bağımsız yapımcıların en büyük zorluğu görünürlük. Sineoda, bu yapımlara dünya izleyicisine ulaşacak bir vitrin sunmayı hedefliyor.

Katalogdaki yerli bağımsız filmler ve diziler düzenli olarak güncelleniyor. Her hafta yeni bir keşif için bizi takip edin.`,
    cover_image:
      'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=1200&h=675&fit=crop&q=80',
    author: 'Sineoda Editör',
  },
] as const

function upsertPost(post: (typeof SEED_POSTS)[number], index: number) {
  const exists = dbGet('SELECT id FROM journal_posts WHERE slug = ?', [post.slug])
  const now = new Date().toISOString()
  const publishedAt = new Date(Date.now() - index * 3 * 24 * 60 * 60 * 1000).toISOString()

  if (exists) return

  dbRun(
    `INSERT INTO journal_posts (id, slug, title, excerpt, body, cover_image, author, content_id, status, published_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 'published', ?, ?, ?)`,
    [uuid(), post.slug, post.title, post.excerpt, post.body, post.cover_image, post.author, publishedAt, now, now],
  )
}

export function ensureJournalPosts() {
  for (const [index, post] of SEED_POSTS.entries()) {
    upsertPost(post, index)
  }
}

export function uniqueJournalSlug(title: string, excludeId?: string) {
  const base = slugify(title) || 'yazi'
  let candidate = base
  let counter = 2

  while (true) {
    const existing = dbGet<{ id: string }>('SELECT id FROM journal_posts WHERE slug = ?', [candidate])
    if (!existing || existing.id === excludeId) return candidate
    candidate = `${base}-${counter}`
    counter += 1
  }
}
