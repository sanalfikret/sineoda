/** IBAN görüntüleme yardımcıları (yalnızca biçim; para hareketi yok). */
export function normalizeIban(value: string) {
  return value.replace(/\s+/g, '').toUpperCase()
}

/** TR12 3456 7890 … biçiminde dörtlü gruplar. */
export function formatIban(value: string) {
  return normalizeIban(value).replace(/(.{4})/g, '$1 ').trim()
}

/** Listelerde IBAN'ın yalnızca başı ve son 4 hanesi görünür. */
export function maskIban(value: string) {
  const iban = normalizeIban(value)
  if (iban.length < 8) return iban
  return `${iban.slice(0, 4)} •••• ${iban.slice(-4)}`
}
