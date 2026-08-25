export const CREATOR_LEGAL_TERMS = `
YAPIMCI / CREATOR SÖZLEŞMESİ VE SORUMLULUK BEYANI

1. Mülkiyet ve Telif Hakkı
Yüklediğiniz her içeriğin telif hakkı veya yayın hakkının size ait olduğunu veya size devredildiğini beyan edersiniz. Sineoda'ya yüklediğiniz belgeler (sözleşme, lisans, yapımcı belgesi vb.) bu iddiayı desteklemelidir.

2. Yasal Sorumluluk
İçeriğinizden doğabilecek tüm yasal talepler, telif ihlali iddiaları, kişilik hakları ihlalleri ve üçüncü taraf haklarına ilişkin sorumluluk tamamen size aittir. Sineoda, içeriğinizin yasal uygunluğunu garanti etmez; yalnızca platform sağlayıcısıdır.

3. Gelir Paylaşımı
Gelir paylaşımı, yapımcı anlaşmasında belirtilen koşullara göre hesaplanır. İzlenme süreleri,
paylaşım oranları ve ödeme takvimi bu anlaşmada ayrıntılı olarak yer alır. Platform, anlaşma
hükümlerine uygun şekilde adil bir paylaşım modeli uygular.

4. İçerik İncelemesi
Gönderdiğiniz içerikler Sineoda editöryal incelemesinden geçer. Onaylanmadan yayınlanmaz. Sineoda, platform standartlarına uymayan içerikleri reddetme hakkını saklı tutar.

5. Platform Kuralları
Yasadışı, nefret söylemi, şiddet glorifikasyonu veya telif ihlali içeren materyaller yasaktır. İhlal halinde hesabınız askıya alınabilir.

6. Veri Doğruluğu
Stüdyo adı, iletişim bilgileri ve yüklediğiniz belgelerin doğruluğundan siz sorumlusunuz.

Bu şartları kabul ederek Sineoda yapımcı programına katılırsınız.
`.trim()

export const CREATOR_DOC_TYPES = [
  { value: 'ownership', label: 'Telif / mülkiyet belgesi' },
  { value: 'film_rights', label: 'Film telif / yapım hakkı' },
  { value: 'music_rights', label: 'Müzik / ses hakları' },
  { value: 'performer_release', label: 'Oyuncu / performans izni' },
  { value: 'image_rights', label: 'Görüntü / fotoğraf / arşiv izni' },
  { value: 'license', label: 'Yayın lisans sözleşmesi' },
  { value: 'producer', label: 'Yapımcı / stüdyo belgesi' },
  { value: 'school_approval', label: 'Okul / mezuniyet projesi onayı' },
  { value: 'student_id', label: 'Öğrenci kimliği' },
  { value: 'other', label: 'Diğer destekleyici belge' },
] as const
