/** Çekim İçin Notlar — ana bölüm ve alt kategori satırları (client ile aynı) */
export const CEKIM_NOTLARI_CATEGORIES = [
  { id: 'cekim-film-nasil-cekilir', title: 'Film nasıl çekilir?' },
  { id: 'cekim-butce', title: 'Bütçeleme' },
  { id: 'cekim-yonetmen-notlari', title: 'Yönetmen Notları' },
  { id: 'cekim-goruntu-yonetmeni', title: 'Görüntü Yönetmeni' },
  { id: 'cekim-kamera-kullanimi', title: 'Kamera kullanımı' },
  { id: 'cekim-isik-kurulumu', title: 'Işık kurulumu' },
  { id: 'cekim-ses', title: 'Ses' },
  { id: 'cekim-sanat-yonetimi', title: 'Sanat yönetimi' },
  { id: 'cekim-sac-makyaj', title: 'Saç Makyaj' },
  { id: 'cekim-plastik-makyaj', title: 'Plastik makyaj' },
  { id: 'cekim-set-duzeni', title: 'Set düzeni' },
  { id: 'cekim-kadraj', title: 'Kadraj' },
  { id: 'cekim-oyuncu-yonetimi', title: 'Oyuncu yönetimi' },
  { id: 'cekim-kurgu', title: 'Kurgu' },
] as const

export const CEKIM_NOTLARI_CATEGORY_IDS: readonly string[] = CEKIM_NOTLARI_CATEGORIES.map(
  (entry) => entry.id,
)
