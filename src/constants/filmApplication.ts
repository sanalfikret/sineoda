/** Film başvurusunda hak beyanı + belge gerektiren kategoriler */
export const FILM_RIGHTS_CATEGORIES = [
  {
    id: 'film_rights',
    docType: 'film_rights',
    declaration:
      'Filmin telif ve yayın hakları tarafımda veya geçerli yazılı lisans/devir sözleşmesi altındadır.',
    docLabel: 'Film telif / yapım hakkı belgesi',
  },
  {
    id: 'music_rights',
    docType: 'music_rights',
    declaration:
      'Filmde kullanılan müzik, ses ve ilgili eserler için gerekli izinleri aldım veya haklar tarafımdadır.',
    docLabel: 'Müzik / ses hakları belgesi',
  },
  {
    id: 'performer_release',
    docType: 'performer_release',
    declaration:
      'Oyuncu, seslendirme ve performans kullanımları için gerekli izinleri aldım veya haklar tarafımdadır.',
    docLabel: 'Oyuncu / performans izin belgesi',
  },
  {
    id: 'image_rights',
    docType: 'image_rights',
    declaration:
      'Görüntü, fotoğraf, arşiv materyali ve üçüncü kişilerin görünür olduğu sahneler için gerekli izinleri aldım.',
    docLabel: 'Görüntü / fotoğraf / arşiv izin belgesi',
  },
] as const

/** Yasal uygunluk beyanları (belge gerektirmez) */
export const FILM_LEGAL_DECLARATIONS = [
  {
    id: 'no_defamation',
    text: 'İçerikte hakaret, tehdit veya kişilik hakları / özel hayat ihlali bulunmamaktadır.',
  },
  {
    id: 'child_protection',
    text: 'Çocukların korunmasına ilişkin mevzuata ve beyan ettiğim yaş sınıflandırmasına uygundur.',
  },
  {
    id: 'no_illegal_content',
    text: 'Suç teşkil eden, terör/suç propagandası veya yasaklı unsurlar içermemektedir.',
  },
  {
    id: 'no_court_ban',
    text: 'Yayın yasağı, mahkeme kararı veya erişim engeli kapsamında olmadığını beyan ederim.',
  },
  {
    id: 'platform_rules',
    text: 'Sineoda yapımcı sözleşmesi ve platform kurallarına uygun olduğunu kabul ederim.',
  },
] as const

export type FilmRightsCategoryId = (typeof FILM_RIGHTS_CATEGORIES)[number]['id']
export type FilmLegalDeclarationId = (typeof FILM_LEGAL_DECLARATIONS)[number]['id']

export const REQUIRED_RIGHTS_DOC_TYPES = FILM_RIGHTS_CATEGORIES.map((entry) => entry.docType)
