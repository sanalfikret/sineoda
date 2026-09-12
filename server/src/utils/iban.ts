/** IBAN yardımcıları — yalnızca biçim doğrulama; hiçbir para hareketi yapılmaz. */

export function normalizeIban(value: unknown) {
  return String(value ?? '').replace(/\s+/g, '').toUpperCase()
}

/** ISO 13616 mod-97 kontrolü. Türk IBAN'ı 26 karakterdir (TR + 24 rakam). */
export function isValidIban(value: string) {
  const iban = normalizeIban(value)
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false
  if (iban.startsWith('TR') && iban.length !== 26) return false
  const rearranged = iban.slice(4) + iban.slice(0, 4)
  let remainder = 0
  for (const ch of rearranged) {
    const piece = /\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55)
    for (const digit of piece) remainder = (remainder * 10 + Number(digit)) % 97
  }
  return remainder === 1
}

/** Görüntüleme için: TR12 3456 7890 1234 5678 9012 34 */
export function formatIban(value: string) {
  return normalizeIban(value).replace(/(.{4})/g, '$1 ').trim()
}

/** Listelerde son 4 hane dışını gizler. */
export function maskIban(value: string) {
  const iban = normalizeIban(value)
  if (iban.length < 8) return iban
  return iban.slice(0, 4) + ' •••• ' + iban.slice(-4)
}

/** Vergi no (10 hane) veya TCKN (11 hane); boş bırakılabilir. */
export function isValidTaxId(value: string) {
  return value === '' || /^\d{10,11}$/.test(value)
}
