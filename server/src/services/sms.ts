import { config } from '../config.js'

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('90') && digits.length === 12) return digits
  if (digits.startsWith('0') && digits.length === 11) return `9${digits}`
  if (digits.length === 10 && digits.startsWith('5')) return `90${digits}`
  return digits
}

export function isValidTurkishMobile(phone: string) {
  const normalized = normalizePhone(phone)
  return /^905\d{9}$/.test(normalized)
}

export function formatPhoneDisplay(phone: string) {
  const normalized = normalizePhone(phone)
  if (normalized.length !== 12) return phone
  return `+${normalized.slice(0, 2)} ${normalized.slice(2, 5)} ${normalized.slice(5, 8)} ${normalized.slice(8, 10)} ${normalized.slice(10)}`
}

export async function sendVerificationSms(phone: string, code: string) {
  const normalized = normalizePhone(phone)
  const message = `Sineoda dogrulama kodunuz: ${code}. Bu kodu kimseyle paylasmayin.`

  if (!config.isSmsConfigured()) {
    console.info(`[SMS demo] ${normalized}: ${code}`)
    return { ok: true as const, devMode: true as const, devCode: code }
  }

  if (config.sms.provider === 'netgsm') {
    const params = new URLSearchParams({
      usercode: config.sms.netgsm.user,
      password: config.sms.netgsm.pass,
      gsmno: normalized.replace(/^90/, ''),
      message,
      msgheader: config.sms.netgsm.header,
      dil: 'TR',
    })

    const response = await fetch(`https://api.netgsm.com.tr/sms/send/get/?${params.toString()}`)
    const text = await response.text()
    const trimmed = text.trim()
    if (!response.ok || (!trimmed.startsWith('00') && !trimmed.startsWith('0'))) {
      throw new Error('SMS gönderilemedi. Lütfen telefon numaranızı kontrol edin.')
    }
    return { ok: true as const, devMode: false as const }
  }

  throw new Error('SMS sağlayıcısı yapılandırılmamış.')
}

export { normalizePhone }
