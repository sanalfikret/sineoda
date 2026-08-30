import { PlooyLogo } from './PlooyLogo'

/** @deprecated PlooyLogo kullanın */
export function SineodaLogoMark({
  size = 'md',
  linked = false,
  className = '',
}: {
  size?: 'md' | 'lg'
  linked?: boolean
  className?: string
}) {
  const height = size === 'lg' ? 'h-10 sm:h-12' : 'h-8 sm:h-9'
  return (
    <PlooyLogo
      tone="on-dark"
      linked={linked}
      className={`mx-auto ${height} ${className}`.trim()}
    />
  )
}

export { PlooyLogo, PlooyLogoStack } from './PlooyLogo'
export type { PlooyLogoTone } from './PlooyLogo'
