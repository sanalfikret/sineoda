/** Marka adı — logo metni (Pl + ooy vurgusu) */
export function BrandName({
  className = '',
  accentClass = 'text-sineoda-gold',
}: {
  className?: string
  accentClass?: string
}) {
  return (
    <span className={className}>
      Plo<span className={accentClass}>oy</span>
    </span>
  )
}
