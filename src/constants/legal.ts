export type LegalSlug =
  | 'kullanim-kosullari'
  | 'gizlilik-politikasi'
  | 'kvkk-aydinlatma'
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
    updatedAt: '18 Ağustos 2025',
    sections: [
      {
        heading: '1. Taraflar ve Kabul',
        body: 'Bu Kullanım Koşulları, Sineoda platformunu (“Platform”) kullanan gerçek veya tüzel kişiler ile Platform işletmecisi arasındaki hukuki ilişkiyi düzenler. Platforma üye olarak veya ziyaret ederek bu koşulları kabul etmiş sayılırsınız.',
      },
      {
        heading: '2. Hizmet Kapsamı',
        body: 'Sineoda; film, dizi ve diğer görsel-işitsel içeriklerin abonelik veya lisans modeliyle çevrimiçi izlenmesini sağlayan bir dijital yayın hizmetidir. İçerik kataloğu, bölge, cihaz ve lisans anlaşmalarına bağlı olarak değişebilir.',
      },
      {
        heading: '3. Üyelik ve Hesap Güvenliği',
        body: 'Hesap bilgilerinizin gizliliğinden ve hesabınız üzerinden yapılan işlemlerden siz sorumlusunuz. Hesap paylaşımı, yetkisiz erişim veya kötüye kullanım tespitinde hesabınız askıya alınabilir.',
      },
      {
        heading: '4. Abonelik ve Ödeme',
        body: 'Ücretli planlar, seçtiğiniz dönem için peşin veya yenilenen abonelik şeklinde faturalandırılır. İptal koşulları ve iade politikası, satın alma sırasında sunulan plan açıklamalarında belirtilir.',
      },
      {
        heading: '5. Fikri Mülkiyet',
        body: 'Platformdaki tüm içerik, yazılım, marka ve tasarımlar ilgili hak sahiplerine aittir. İzinsiz kopyalama, kayıt, dağıtım veya ticari kullanım yasaktır.',
      },
      {
        heading: '6. Sorumluluk Sınırı',
        body: 'Platform “olduğu gibi” sunulur. Yasaların izin verdiği ölçüde, kesinti, veri kaybı veya üçüncü taraf hizmetlerinden kaynaklanan zararlardan sorumluluk kabul edilmez.',
      },
      {
        heading: '7. Değişiklikler',
        body: 'Bu koşullar güncellenebilir. Güncel metin Platform üzerinde yayımlandığı tarihte yürürlüğe girer. Önemli değişikliklerde kullanıcılar bilgilendirilir.',
      },
    ],
  },
  'gizlilik-politikasi': {
    slug: 'gizlilik-politikasi',
    title: 'Gizlilik Politikası',
    updatedAt: '18 Ağustos 2025',
    sections: [
      {
        heading: '1. Genel İlkeler',
        body: 'Sineoda, kişisel verilerinizi 6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) ve ilgili mevzuata uygun şekilde işler. Bu politika, hangi verileri topladığımızı ve nasıl kullandığımızı açıklar.',
      },
      {
        heading: '2. Toplanan Veriler',
        body: 'Kimlik ve iletişim bilgileri (ad, e-posta, telefon), hesap ve profil bilgileri, abonelik/ödeme kayıtları, izleme geçmişi, cihaz ve oturum bilgileri ile çerez verileri işlenebilir.',
      },
      {
        heading: '3. İşleme Amaçları',
        body: 'Veriler; hizmet sunumu, kimlik doğrulama, faturalandırma, müşteri desteği, kişiselleştirme, güvenlik, yasal yükümlülükler ve meşru menfaatler kapsamında işlenir.',
      },
      {
        heading: '4. Aktarım',
        body: 'Ödeme kuruluşları, SMS/e-posta sağlayıcıları, barındırma ve analitik hizmet sağlayıcıları ile yalnızca hizmetin gerektirdiği ölçüde ve sözleşmesel güvencelerle paylaşım yapılabilir.',
      },
      {
        heading: '5. Saklama Süresi',
        body: 'Veriler, işleme amacının gerektirdiği süre boyunca ve yasal zamanaşımı süreleri dikkate alınarak saklanır; süre sonunda silinir, yok edilir veya anonimleştirilir.',
      },
      {
        heading: '6. Haklarınız',
        body: 'KVKK kapsamında verilerinize erişme, düzeltme, silme, işlemeyi kısıtlama ve itiraz etme haklarına sahipsiniz. Taleplerinizi iletişim kanallarımız üzerinden iletebilirsiniz.',
      },
    ],
  },
  'kvkk-aydinlatma': {
    slug: 'kvkk-aydinlatma',
    title: 'KVKK Aydınlatma Metni',
    updatedAt: '18 Ağustos 2025',
    sections: [
      {
        heading: 'Veri Sorumlusu',
        body: '6698 sayılı KVKK uyarınca veri sorumlusu Sineoda’dır. İletişim: kvkk@sineoda.com',
      },
      {
        heading: 'İşlenen Kişisel Veri Kategorileri',
        body: 'Kimlik, iletişim, müşteri işlem, finans, pazarlama, işlem güvenliği ve görsel-işitsel içerik tüketim verileri işlenebilir.',
      },
      {
        heading: 'Kişisel Verilerin İşlenme Amaçları',
        body: 'Üyelik oluşturma, SMS/e-posta doğrulama, abonelik yönetimi, içerik önerisi, teknik destek, dolandırıcılık önleme ve mevzuattan doğan yükümlülüklerin yerine getirilmesi.',
      },
      {
        heading: 'Hukuki Sebepler',
        body: 'KVKK m.5/2 kapsamında sözleşmenin kurulması veya ifası, hukuki yükümlülük, meşru menfaat ve açık rıza (gerektiğinde) hukuki sebeplerine dayanılır.',
      },
      {
        heading: 'Aktarım ve Yurt Dışı',
        body: 'Barındırma veya CDN hizmetleri nedeniyle veriler yurt dışındaki sunucularda işlenebilir. Bu durumda KVKK m.9 hükümlerine uygun güvenceler sağlanır.',
      },
      {
        heading: 'Başvuru',
        body: 'KVKK kapsamındaki taleplerinizi yazılı olarak veya kayıtlı elektronik posta yoluyla iletebilirsiniz. Başvurular en geç 30 gün içinde sonuçlandırılır.',
      },
    ],
  },
  'cerez-politikasi': {
    slug: 'cerez-politikasi',
    title: 'Çerez Politikası',
    updatedAt: '18 Ağustos 2025',
    sections: [
      {
        heading: 'Çerez Nedir?',
        body: 'Çerezler, web sitesini ziyaret ettiğinizde cihazınıza kaydedilen küçük metin dosyalarıdır. Oturum yönetimi, tercihlerin hatırlanması ve hizmet kalitesinin ölçülmesi için kullanılır.',
      },
      {
        heading: 'Kullandığımız Çerez Türleri',
        body: 'Zorunlu çerezler (oturum, güvenlik), işlevsel çerezler (profil tercihleri), analitik çerezler (kullanım istatistikleri) ve pazarlama çerezleri (onay vermeniz halinde) kullanılabilir.',
      },
      {
        heading: 'Yönetim',
        body: 'Tarayıcı ayarlarınızdan çerezleri silebilir veya engelleyebilirsiniz. Zorunlu çerezlerin devre dışı bırakılması hizmetin çalışmasını etkileyebilir.',
      },
      {
        heading: 'Onay',
        body: 'Zorunlu olmayan çerezler için sitemize ilk girişinizde çerez banner’ı üzerinden tercihinizi belirtebilirsiniz. Tercihinizi daha sonra tarayıcı ayarlarından değiştirebilirsiniz.',
      },
    ],
  },
}

export const LEGAL_LINKS = [
  { slug: 'kullanim-kosullari' as const, label: 'Kullanım Koşulları' },
  { slug: 'gizlilik-politikasi' as const, label: 'Gizlilik Politikası' },
  { slug: 'kvkk-aydinlatma' as const, label: 'KVKK' },
  { slug: 'cerez-politikasi' as const, label: 'Çerezler' },
]
