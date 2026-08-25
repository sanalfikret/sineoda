import { Link } from 'react-router-dom'
import { resolveMediaUrl } from '../../api/client'
import type { LandingCustomBlock } from '../../constants/landingCustomBlocks'

function CtaLink({
  label,
  link,
  primary = true,
}: {
  label: string
  link: string
  primary?: boolean
}) {
  if (!label.trim()) return null
  const href = link.trim() || '/kayit'
  const isExternal = href.startsWith('http://') || href.startsWith('https://')

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={
          primary
            ? 'inline-flex rounded-md bg-sineoda-gold px-8 py-3.5 text-sm font-bold text-sineoda-bg transition hover:brightness-110'
            : 'inline-flex text-sm font-semibold text-white/70 underline-offset-4 hover:text-white hover:underline'
        }
      >
        {label}
      </a>
    )
  }

  return (
    <Link
      to={href}
      className={
        primary
          ? 'inline-flex rounded-md bg-sineoda-gold px-8 py-3.5 text-sm font-bold text-sineoda-bg transition hover:brightness-110'
          : 'inline-flex text-sm font-semibold text-white/70 underline-offset-4 hover:text-white hover:underline'
      }
    >
      {label}
    </Link>
  )
}

export function LandingCustomBlockSection({ block }: { block: LandingCustomBlock }) {
  if (block.type === 'ctaBanner') {
    return (
      <section className="border-y border-white/10 bg-gradient-to-br from-[#141824] to-black px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          {block.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sineoda-gold">
              {block.eyebrow}
            </p>
          )}
          {block.title && (
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">{block.title}</h2>
          )}
          {block.body && <p className="mt-4 text-base leading-relaxed text-white/60">{block.body}</p>}
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <CtaLink label={block.ctaLabel} link={block.ctaLink} />
            <CtaLink label={block.ctaSecondaryLabel} link={block.ctaSecondaryLink} primary={false} />
          </div>
        </div>
      </section>
    )
  }

  if (block.type === 'imageText') {
    return (
      <section className="border-y border-white/5 bg-sineoda-surface px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto grid max-w-[1400px] items-center gap-10 lg:grid-cols-2">
          {block.image && (
            <img
              src={resolveMediaUrl(block.image)}
              alt=""
              className="aspect-[4/3] w-full rounded-2xl object-cover"
            />
          )}
          <div>
            {block.eyebrow && (
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sineoda-gold">
                {block.eyebrow}
              </p>
            )}
            {block.title && <h2 className="mt-4 text-3xl font-bold text-white">{block.title}</h2>}
            {block.body && <p className="mt-4 text-base leading-relaxed text-sineoda-muted">{block.body}</p>}
            <div className="mt-8 flex flex-wrap gap-4">
              <CtaLink label={block.ctaLabel} link={block.ctaLink} />
              <CtaLink label={block.ctaSecondaryLabel} link={block.ctaSecondaryLink} primary={false} />
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="border-y border-white/5 px-5 py-16 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-3xl">
        {block.eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sineoda-gold">{block.eyebrow}</p>
        )}
        {block.title && <h2 className="mt-4 text-3xl font-bold text-white">{block.title}</h2>}
        {block.body && (
          <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-sineoda-muted">{block.body}</p>
        )}
        {(block.ctaLabel || block.ctaSecondaryLabel) && (
          <div className="mt-8 flex flex-wrap gap-4">
            <CtaLink label={block.ctaLabel} link={block.ctaLink} />
            <CtaLink label={block.ctaSecondaryLabel} link={block.ctaSecondaryLink} primary={false} />
          </div>
        )}
      </div>
    </section>
  )
}
