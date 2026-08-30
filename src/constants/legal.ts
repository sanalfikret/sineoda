import { BRAND_NAME } from './brand'
import { appConfig } from '../config/appConfig'

const { support: supportEmail, kvkk: kvkkEmail } = appConfig.emails

export const LEGAL_VERSION = '2026-08-30'

export type LegalSlug =
  | 'kullanim-kosullari'
  | 'gizlilik-politikasi'
  | 'kvkk-aydinlatma'
  | 'acik-riza-metni'
  | 'cerez-politikasi'

export interface LegalDocument {
  slug: LegalSlug
  title: string
  updatedAt: string
  sections: Array<{ heading: string; body: string }>
}

export const LEGAL_DOCUMENTS: Record<LegalSlug, LegalDocument> = {
  'kullanim-kosullari': {
    slug: 'kullanim-kosullari',
    title: 'Kullanım Koşulları',
    updatedAt: '30 Ağustos 2026',
    sections: [
      {
        heading: '1. Taraflar ve Kabul',
        body: `Bu Kullanım Koşulları (“Koşullar”), ${BRAND_NAME} dijital yayın platformunu (“Platform”) kullanan gerçek veya tüzel kişiler ile Platform işletmecisi arasındaki hukuki ilişkiyi düzenler. Platforma üye olarak, giriş yaparak veya hizmeti kullanarak bu Koşulları okuduğunuzu, anladığınızı ve kabul ettiğinizi beyan etmiş olursunuz.`,
      },
      {
        heading: '2. Hizmet Kapsamı',
        body: `${BRAND_NAME}; bağımsız sinema yapımları, diziler, belgeseller ve ilgili görsel-işitsel içeriklerin abonelik modeliyle çevrimiçi izlenmesini sağlayan bir dijital yayın hizmetidir. İçerik kataloğu, bölge, cihaz, lisans anlaşmaları ve teknik koşullara bağlı olarak değişebilir. Platform, önceden haber vermeksizin içerik ekleme veya kaldırma hakkını saklı tutar.`,
      },
      {
        heading: '3. Üyelik ve Hesap Güvenliği',
        body: 'Kayıt sırasında doğru ve güncel bilgi vermekle yükümlüsünüz. Hesap bilgilerinizin gizliliğinden ve hesabınız üzerinden yapılan tüm işlemlerden siz sorumlusunuz. Hesap paylaşımı, yetkisiz erişim, otomatik bot kullanımı, içerik indirme/kaydetme girişimleri veya kötüye kullanım tespitinde hesabınız askıya alınabilir veya sonlandırılabilir.',
      },
      {
        heading: '4. Abonelik ve Ödeme',
        body: 'Ücretli planlar, seçtiğiniz dönem için peşin veya yenilenen abonelik şeklinde faturalandırılır. Ödeme işlemleri lisanslı ödeme kuruluşları aracılığıyla gerçekleştirilir. İptal, yenileme ve iade koşulları satın alma sırasında sunulan plan açıklamalarında belirtilir. Yasal zorunluluklar saklı kalmak kaydıyla, hizmetin ifasına başlandıktan sonra cayma hakkı kullanılamayabilir.',
      },
      {
        heading: '5. Fikri Mülkiyet ve İçerik Kullanımı',
        body: 'Platformdaki tüm içerik, yazılım, marka, logo ve tasarımlar ilgili hak sahiplerine aittir. İzinsiz kopyalama, kayıt, ekran görüntüsü alma, dağıtım, yeniden yayın, tersine mühendislik veya ticari kullanım yasaktır. İçerikler yalnızca kişisel, ticari olmayan izleme amacıyla sunulur.',
      },
      {
        heading: '6. Yasaklı Davranışlar',
        body: 'Platformu yasa dışı amaçlarla kullanmak, telif hakkı ihlali teşvik etmek, nefret söylemi veya şiddet içeren materyal yaymak, diğer kullanıcıları taciz etmek, sistem güvenliğini tehdit etmek veya hizmeti aksatmak yasaktır. Bu tür ihlallerde hesap derhal kapatılabilir ve gerekli hallerde yetkili mercilere bildirim yapılabilir.',
      },
      {
        heading: '7. Sorumluluk Sınırı',
        body: 'Platform “olduğu gibi” sunulur. Yasaların izin verdiği ölçüde; kesinti, veri kaybı, üçüncü taraf hizmetlerinden kaynaklanan sorunlar veya dolaylı zararlardan sorumluluk kabul edilmez. Platform, içeriklerin doğruluğu, kalitesi veya belirli bir amaca uygunluğu konusunda garanti vermez.',
      },
      {
        heading: '8. Değişiklikler ve İletişim',
        body: `Bu Koşullar güncellenebilir. Güncel metin Platform üzerinde yayımlandığı tarihte yürürlüğe girer. Önemli değişikliklerde kullanıcılar e-posta veya uygulama içi bildirimle bilgilendirilebilir. Sorularınız için: ${supportEmail}`,
      },
    ],
  },
  'gizlilik-politikasi': {
    slug: 'gizlilik-politikasi',
    title: 'Gizlilik Politikası',
    updatedAt: '30 Ağustos 2026',
    sections: [
      {
        heading: '1. Genel İlkeler',
        body: `${BRAND_NAME}, kişisel verilerinizi 6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) ve ilgili mevzuata uygun şekilde işler. Bu politika, hangi verileri topladığımızı, hangi amaçlarla kullandığımızı ve haklarınızı açıklar.`,
      },
      {
        heading: '2. Toplanan Veriler',
        body: 'Kimlik ve iletişim bilgileri (ad, e-posta, telefon), hesap ve profil bilgileri, abonelik/ödeme kayıtları, izleme geçmişi ve tercihleri, cihaz ve oturum bilgileri, IP adresi, çerez verileri, destek talepleri ve yasal onay kayıtları (isim, IP, zaman damgası) işlenebilir.',
      },
      {
        heading: '3. İşleme Amaçları',
        body: 'Veriler; hizmet sunumu, kimlik doğrulama, SMS/e-posta doğrulama, faturalandırma, müşteri desteği, kişiselleştirme, güvenlik, dolandırıcılık önleme, yasal yükümlülüklerin yerine getirilmesi ve meşru menfaatler kapsamında işlenir.',
      },
      {
        heading: '4. Hukuki Sebepler',
        body: 'KVKK m.5/2 kapsamında sözleşmenin kurulması veya ifası, hukuki yükümlülük, meşru menfaat; gerektiğinde ise açık rıza hukuki sebeplerine dayanılır. Pazarlama iletişimi yalnızca açık rıza veya mevzuatın izin verdiği hallerde yapılır.',
      },
      {
        heading: '5. Aktarım',
        body: 'Ödeme kuruluşları, SMS/e-posta sağlayıcıları, barındırma, CDN ve analitik hizmet sağlayıcıları ile yalnızca hizmetin gerektirdiği ölçüde ve sözleşmesel güvencelerle paylaşım yapılabilir. Yurt dışına aktarımda KVKK m.9 hükümlerine uyulur.',
      },
      {
        heading: '6. Saklama Süresi',
        body: 'Veriler, işleme amacının gerektirdiği süre boyunca ve yasal zamanaşımı süreleri dikkate alınarak saklanır. Yasal onay kayıtları, uyuşmazlık halinde delil niteliği taşıması amacıyla makul süreler boyunca muhafaza edilir.',
      },
      {
        heading: '7. Haklarınız',
        body: `KVKK kapsamında verilerinize erişme, düzeltme, silme, işlemeyi kısıtlama, itiraz etme ve açık rızayı geri çekme haklarına sahipsiniz. Taleplerinizi ${kvkkEmail} adresine iletebilirsiniz.`,
      },
    ],
  },
  'kvkk-aydinlatma': {
    slug: 'kvkk-aydinlatma',
    title: 'KVKK Aydınlatma Metni',
    updatedAt: '30 Ağustos 2026',
    sections: [
      {
        heading: 'Veri Sorumlusu',
        body: `6698 sayılı KVKK uyarınca veri sorumlusu ${BRAND_NAME} platform işletmecisidir. İletişim: ${kvkkEmail} · ${supportEmail}`,
      },
      {
        heading: 'İşlenen Kişisel Veri Kategorileri',
        body: 'Kimlik, iletişim, müşteri işlem, finans, pazarlama (açık rıza halinde), işlem güvenliği, görsel-işitsel içerik tüketim verileri, log kayıtları (IP, oturum, cihaz) ve yasal onay kayıtları işlenebilir.',
      },
      {
        heading: 'Kişisel Verilerin İşlenme Amaçları',
        body: 'Üyelik oluşturma, SMS/e-posta doğrulama, abonelik yönetimi, içerik önerisi, teknik destek, dolandırıcılık önleme, yasal yükümlülüklerin yerine getirilmesi ve mevzuattan doğan yükümlülüklerin ifası.',
      },
      {
        heading: 'Hukuki Sebepler',
        body: 'KVKK m.5/2 kapsamında sözleşmenin kurulması veya ifası, hukuki yükümlülük, meşru menfaat; pazarlama ve isteğe bağlı çerezler için açık rıza (KVKK m.5/1) hukuki sebeplerine dayanılır.',
      },
      {
        heading: 'Aktarım ve Yurt Dışı',
        body: 'Barındırma veya CDN hizmetleri nedeniyle veriler yurt dışındaki sunucularda işlenebilir. Bu durumda KVKK m.9 hükümlerine uygun güvenceler sağlanır.',
      },
      {
        heading: 'Başvuru',
        body: `KVKK kapsamındaki taleplerinizi yazılı olarak ${kvkkEmail} adresine veya kayıtlı elektronik posta yoluyla iletebilirsiniz. Başvurular en geç 30 gün içinde sonuçlandırılır.`,
      },
    ],
  },
  'acik-riza-metni': {
    slug: 'acik-riza-metni',
    title: 'Açık Rıza Metni',
    updatedAt: '30 Ağustos 2026',
    sections: [
      {
        heading: 'Açık Rıza Beyanı',
        body: `${BRAND_NAME} platformuna üye olurken, KVKK Aydınlatma Metni'ni okuduğumu ve anladığımı; kişisel verilerimin üyelik oluşturma, kimlik doğrulama, abonelik yönetimi, içerik izleme, teknik destek, güvenlik ve yasal yükümlülüklerin yerine getirilmesi amaçlarıyla işlenmesine AÇIK RIZAM olduğunu kabul ve beyan ederim.`,
      },
      {
        heading: 'Onay Kaydı',
        body: 'Bu onay elektronik ortamda verilir. Onay anında adınız, e-posta adresiniz, IP adresiniz ve zaman damgası (İstanbul saati) sistemde kayıt altına alınır. Bu kayıt, taraflar arasındaki hukuki ilişkinin ispatı amacıyla saklanır.',
      },
      {
        heading: 'Rızanın Geri Alınması',
        body: `Açık rızanızı dilediğiniz zaman ${kvkkEmail} üzerinden geri alabilirsiniz. Rızanın geri alınması, geri alma tarihinden sonraki işlemleri etkiler; rıza dayanaklı işlemlerin hukuka uygun şekilde tamamlanmış olması saklıdır.`,
      },
    ],
  },
  'cerez-politikasi': {
    slug: 'cerez-politikasi',
    title: 'Çerez Politikası',
    updatedAt: '30 Ağustos 2026',
    sections: [
      {
        heading: 'Çerez Nedir?',
        body: 'Çerezler, web sitesini ziyaret ettiğinizde cihazınıza kaydedilen küçük metin dosyalarıdır. Oturum yönetimi, tercihlerin hatırlanması, güvenlik ve hizmet kalitesinin ölçülmesi için kullanılır.',
      },
      {
        heading: 'Kullandığımız Çerez Türleri',
        body: 'Zorunlu çerezler (oturum, güvenlik, kimlik doğrulama), işlevsel çerezler (profil tercihleri), analitik çerezler (anonim kullanım istatistikleri) ve pazarlama çerezleri (açık onay vermeniz halinde) kullanılabilir.',
      },
      {
        heading: 'Yönetim',
        body: 'Tarayıcı ayarlarınızdan çerezleri silebilir veya engelleyebilirsiniz. Zorunlu çerezlerin devre dışı bırakılması hizmetin çalışmasını etkileyebilir.',
      },
      {
        heading: 'Onay',
        body: 'Zorunlu olmayan çerezler için sitemize ilk girişinizde çerez banner’ı üzerinden tercihinizi belirtebilirsiniz. Tercihiniz IP adresi ve zaman damgası ile kayıt altına alınabilir.',
      },
    ],
  },
}

export const LEGAL_LINKS = [
  { slug: 'kullanim-kosullari' as const, label: 'Kullanım Koşulları' },
  { slug: 'gizlilik-politikasi' as const, label: 'Gizlilik Politikası' },
  { slug: 'kvkk-aydinlatma' as const, label: 'KVKK' },
  { slug: 'acik-riza-metni' as const, label: 'Açık Rıza' },
  { slug: 'cerez-politikasi' as const, label: 'Çerezler' },
]

export type ConsentType = 'terms' | 'privacy' | 'kvkk' | 'cookies' | 'creator_terms'

export const CONSENT_TYPE_LABELS: Record<ConsentType, string> = {
  terms: 'Kullanım Koşulları',
  privacy: 'Gizlilik Politikası',
  kvkk: 'KVKK / Açık Rıza',
  cookies: 'Çerezler',
  creator_terms: 'Yapımcı Sözleşmesi',
}

/** Yasal sayfa linki — `geri` ile dönüş adresi eklenebilir (ör. /kayit). */
export function legalPageHref(slug: LegalSlug, returnTo?: string | null) {
  if (!returnTo) return `/yasal/${slug}`
  return `/yasal/${slug}?geri=${encodeURIComponent(returnTo)}`
}
