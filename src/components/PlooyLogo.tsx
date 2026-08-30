import { Link } from 'react-router-dom'

/** Koyu zemin → beyaz PNG; açık zemin → siyah PNG (senin gönderdiğin dosyalardan) */
export type PlooyLogoTone = 'on-dark' | 'on-light'

type PlooyLogoProps = {
  variant?: 'wordmark' | 'mark'
  tone?: PlooyLogoTone
  className?: string
  linked?: boolean
  linkTo?: string
}

const LOGO_SRC = {
  'on-dark': {
    wordmark: '/brand/plooy-wordmark-light.png',
    mark: '/brand/plooy-mark-light.png',
  },
  'on-light': {
    wordmark: '/brand/plooy-wordmark-on-light.png',
    mark: '/brand/plooy-mark-on-light.png',
  },
} as const

export function PlooyLogo({
  variant = 'wordmark',
  tone = 'on-dark',
  className = '',
  linked = false,
  linkTo = '/',
}: PlooyLogoProps) {
  const label = 'Plooy'
  const src = LOGO_SRC[tone][variant]

  const graphic = (
    <img
      src={src}
      alt={variant === 'wordmark' ? label : ''}
      className={`max-h-full w-auto object-contain object-left ${className}`.trim()}
      draggable={false}
    />
  )

  if (!linked) return graphic

  return (
    <Link
      to={linkTo}
      className="inline-flex shrink-0 transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sineoda-gold"
      aria-label={label}
    >
      {graphic}
    </Link>
  )
}

/** Giriş / kayıt — ikon + wordmark */
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
  const markHeight = size === 'lg' ? 'h-14 sm:h-16' : 'h-11 sm:h-12'
  const wordHeight = size === 'lg' ? 'h-8 sm:h-9' : 'h-6 sm:h-7'

  const content = (
    <div className={`flex flex-col items-center gap-3 text-center ${className}`}>
      <PlooyLogo variant="mark" tone={tone} className={markHeight} />
      <PlooyLogo variant="wordmark" tone={tone} className={wordHeight} />
    </div>
  )

  if (!linked) return content

  return (
    <Link
      to="/"
      className="inline-flex transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sineoda-gold"
      aria-label="Plooy"
    >
      {content}
    </Link>
  )
}
