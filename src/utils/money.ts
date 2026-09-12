/** "1.250,50", "1250.50", "1 250,5" gibi girişleri sayıya çevirir; geçersizse NaN. */
export function parseMoney(raw: string) {
  let s = raw.trim().replace(/\s|₺|TL/gi, '')
  if (!s) return 0
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.')
  else if (s.includes(',')) s = s.replace(',', '.')
  else if ((s.match(/\./g) ?? []).length > 1) s = s.replace(/\./g, '')
  return Number(s)
}
