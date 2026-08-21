import { Link } from 'react-router-dom'

export function SineodaLogoMark({
  size = 'md',
  linked = false,
  className = '',
}: {
  size?: 'md' | 'lg'
  linked?: boolean
  className?: string
}) {
  const iconClass = size === 'lg' ? 'h-14 w-14 rounded-xl' : 'h-11 w-11 rounded-lg'
  const textClass = size === 'lg' ? 'text-3xl' : 'text-2xl'

  const content = (
    <div className={`flex flex-col items-center gap-3 text-center ${className}`}>
      <img src="/icon.svg" alt="" className={iconClass} />
      <span className={`${textClass} font-bold tracking-tight text-white`}>
        Sine<span className="text-sineoda-gold">oda</span>
      </span>
    </div>
  )

  if (linked) {
    return (
      <Link to="/" className="inline-flex transition hover:opacity-90">
        {content}
      </Link>
    )
  }

  return content
}
