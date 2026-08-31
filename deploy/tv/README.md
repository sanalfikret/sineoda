# Plooy — Smart TV ve mağaza dağıtımı

Web uygulaması Android TV, Google TV, Samsung Tizen ve LG webOS tarayıcılarında çalışacak şekilde yapılandırıldı. Mağaza listeleri (Google Play TV, Samsung Apps) ayrı başvuru gerektirir.

## Şu an canlı (kod tarafı)

| Özellik | Açıklama |
|---------|----------|
| PWA manifest | 320×180 TV banner, `orientation: any`, entertainment kategorisi |
| Kumanda | Ok tuşları ile satır/kart gezintisi, oynatıcıda play/back/seek |
| SEO | `/video-sitemap.xml`, JSON-LD (WebSite + Movie/TVSeries) |
| Android TWA hazırlığı | `public/.well-known/assetlinks.json` (Play Store paketi eklenince) |

## Cihazda test

### Android TV / Google TV
1. TV'de **Chrome** aç → `https://plooy.tv`
2. Menü → **Ana ekrana ekle** / **Uygulamayı yükle**
3. Uygulama çekmecesinde **Plooy** görünmeli (320×180 banner ile)

### Samsung Tizen
1. **Samsung Internet** veya **Smart Hub → Uygulamalar → Web** (model yılına göre değişir)
2. `https://plooy.tv` adresine git
3. Sık kullanılanlara ekle veya Seller Office üzerinden hosted web app (aşağıda)

### LG webOS
1. **webOS Browser** → `https://plooy.tv`
2. Kumanda ile gezin; kartlarda altın odak halkası görünür

## Google keşfedilebilirlik

1. **Search Console** → `plooy.tv` mülkü → Sitemap ekle:
   - `https://plooy.tv/sitemap.xml`
   - `https://plooy.tv/video-sitemap.xml`
2. Video içerikleri Google Video araması ve TV arayüzünde indekslenebilir (`requires_subscription: yes` işaretli).
3. **Google TV ana satırı** (For You / öneriler): tam entegrasyon için Play Store'da **Android TV native veya TWA** uygulaması + [Engage SDK](https://developer.android.com/training/tv/engage) gerekir — saf PWA bunu otomatik vermez.

## Play Store (Android TV) — isteğe bağlı

1. Bubblewrap veya Android Studio ile **Trusted Web Activity** oluştur (`start_url`: `https://plooy.tv/?source=android-tv`)
2. `public/.well-known/assetlinks.json` içinde `package_name` ve Play imza SHA256 fingerprint güncelle
3. Play Console → **TV** form faktörü, leanback banner (320×180), ekran görüntüleri yükle

## Samsung Tizen (hosted web app)

`deploy/tv/tizen/config.xml` şablonu Seller Office başvurusu için hazır. Başvuru: [Samsung Seller Office](https://seller.samsungapps.com/).

## Kontrol listesi (deploy sonrası)

```bash
curl -sI https://plooy.tv/tv-banner.png | head -1
curl -s https://plooy.tv/video-sitemap.xml | head -20
curl -s https://plooy.tv/.well-known/assetlinks.json
curl -s https://plooy.tv/manifest.webmanifest | grep -i banner
```

## Notlar

- TV'de dikey içerik (Reels tarzı) yatay kumanda ile sınırlı; ana katalog yatay kartlar TV için optimize.
- PayTR / abonelik aktif olunca video sitemap `requires_subscription` doğru kalır.
- İkon yenileme: `npm run icons` (tv-banner.png dahil).
