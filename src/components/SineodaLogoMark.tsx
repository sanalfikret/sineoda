import { PlooyLogoStack } from './PlooyLogo'

/** @deprecated SineodaLogoMark — PlooyLogoStack kullanın */
export function SineodaLogoMark({
  size = 'md',
  linked = false,
  className = '',
}: {
  size?: 'md' | 'lg'
  linked?: boolean
  className?: string
}) {
  return (
    <PlooyLogoStack
      size={size === 'lg' ? 'lg' : 'md'}
      tone="on-dark"
      linked={linked}
      className={className}
    />
  )
}

export { PlooyLogo, PlooyLogoStack } from './PlooyLogo'
export type { PlooyLogoTone } from './PlooyLogo'
