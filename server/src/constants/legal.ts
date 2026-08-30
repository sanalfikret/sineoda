import { BRAND_NAME } from './brand.js'

export const LEGAL_VERSION = '2026-08-30'

export type ConsentType = 'terms' | 'privacy' | 'kvkk' | 'cookies' | 'creator_terms'

export const CONSENT_DOCUMENTS: Record<
  Exclude<ConsentType, 'cookies' | 'creator_terms'>,
  { slug: string; title: string }
> = {
  terms: { slug: 'kullanim-kosullari', title: 'Kullanım Koşulları' },
  privacy: { slug: 'gizlilik-politikasi', title: 'Gizlilik Politikası' },
  kvkk: { slug: 'kvkk-aydinlatma', title: 'KVKK Aydınlatma Metni ve Açık Rıza' },
}

function formatConsentTimestamp(iso: string) {
  return new Date(iso).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })
}

export function buildConsentText(input: {
  type: ConsentType
  userName: string
  userEmail?: string | null
  ipAddress: string
  acceptedAt: string
}) {
  const { type, userName, userEmail, ipAddress, acceptedAt } = input
  const timestamp = formatConsentTimestamp(acceptedAt)
  const emailLine = userEmail ? `E-posta: ${userEmail}\n` : ''

  const header = `DİJİTAL ONAY KAYDI — ${BRAND_NAME}
İşlem yapan: ${userName}
${emailLine}IP adresi: ${ipAddress}
Tarih/saat (İstanbul): ${timestamp}
Belge sürümü: ${LEGAL_VERSION}
`

  if (type === 'terms') {
    return `${header}
${userName} olarak ${BRAND_NAME} Kullanım Koşulları'nı okuduğumu, anladığımı ve kabul ettiğimi; platformu bu koşullara uygun kullanacağımı beyan ederim.`
  }

  if (type === 'privacy') {
    return `${header}
${userName} olarak ${BRAND_NAME} Gizlilik Politikası'nı okuduğumu, anladığımı ve kişisel verilerimin bu politika kapsamında işlenmesini kabul ettiğimi beyan ederim.`
  }

  if (type === 'kvkk') {
    return `${header}
${userName} olarak 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında ${BRAND_NAME} KVKK Aydınlatma Metni'ni okuduğumu ve anladığımı; üyelik, kimlik doğrulama, abonelik yönetimi, içerik izleme ve teknik destek amaçlarıyla kişisel verilerimin işlenmesine AÇIK RIZAM olduğunu; bu onayın elektronik ortamda verildiğini ve isim, IP adresi ile zaman damgasıyla kayıt altına alındığını kabul ederim.`
  }

  if (type === 'cookies') {
    return `${header}
${userName} olarak ${BRAND_NAME} Çerez Politikası'nı okuduğumu; zorunlu çerezlerin hizmetin sunulması için kullanılmasını kabul ettiğimi beyan ederim.`
  }

  return `${header}
${userName} olarak ${BRAND_NAME} Yapımcı / Creator Sözleşmesi ve Sorumluluk Beyanı'nı okuduğumu, anladığımı ve kabul ettiğimi; yüklediğim içeriklerden doğabilecek tüm yasal sorumluluğun tarafıma ait olduğunu beyan ederim.`
}
