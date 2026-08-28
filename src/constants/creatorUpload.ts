/** Yapımcı film başvurusu — teknik yükleme şartları */
export const CREATOR_FILM_UPLOAD_REQUIREMENTS = {
  title: 'Video yükleme şartları',
  items: [
    'Codec: H.265 (HEVC) — kaliteden ödün vermeden',
    'Çözünürlük: Full HD (1080p) veya üzeri',
    'Ses: stereo veya 5.1, net diyalog',
    'Filmi Google Drive, Dropbox, WeTransfer vb. üzerinden indirilebilir link ile paylaşın',
    'Link herkese açık veya “linki olan herkes” erişiminde olmalıdır',
  ],
} as const
