import { Link } from 'react-router-dom'

/** Tek logo — beyaz/siyah wordmark PNG */
export type PlooyLogoTone = 'on-dark' | 'on-light'

const LOGO_SRC: Record<PlooyLogoTone, string> = {
  'on-dark': '/brand/plooy-wordmark.png',
  'on-light': '/brand/plooy-wordmark-on-light.png',
}

type PlooyLogoProps = {
  tone?: PlooyLogoTone
  className?: string
  linked?: boolean
  linkTo?: string
}

export function PlooyLogo({
  tone = 'on-dark',
  className = '',
  linked = false,
  linkTo = '/',
}: PlooyLogoProps) {
  const graphic = (
    <img
      src={LOGO_SRC[tone]}
      alt="Plooy"
      className={`block w-auto max-w-full object-contain object-left ${className}`.trim()}
      draggable={false}
    />
  )

  if (!linked) return graphic

  return (
    <Link
      to={linkTo}
      className="inline-flex shrink-0 transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sineoda-gold"
      aria-label="Plooy"
    >
      {graphic}
    </Link>
  )
}

/** @deprecated Tek logo — PlooyLogo kullanın */
export function PlooyLogoStack({
  size = 'md',
  tone = 'on-dark',
  linked = false,
  className = '',
}: {
  size?: 'md' | 'lg'
  tone?: PlooyLogoTone
  linked?: boolean
  className?: string
}) {
  const height = size === 'lg' ? 'h-10 sm:h-12' : 'h-8 sm:h-9'
  return (
    <PlooyLogo
      tone={tone}
      linked={linked}
      className={`mx-auto ${height} ${className}`.trim()}
    />
  )
}
