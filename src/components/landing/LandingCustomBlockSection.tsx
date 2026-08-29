import { Link } from 'react-router-dom'
import { resolveMediaUrl, type CekimNotlariSection } from '../../api/client'
import type { LandingCustomBlock } from '../../constants/landingCustomBlocks'
import type { ContentItem } from '../../types/content'
import type { ContentPoolId } from '../../utils/contentPools'
import { isShootingNotesContent } from '../../utils/contentPools'
import { guestItemHref, viewAllHrefForBlock } from '../../utils/landingContentLinks'
import { normalizeLandingLink, resolveContentRowItems } from '../../utils/landingContentRow'

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
  const href = normalizeLandingLink(link) || '/kayit'
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

function contentRowPoster(
  item: ContentItem,
  pool?: ContentPoolId,
): { src: string; imageClass: string; titleClass: string } {
  const useHorizontal = pool === 'shooting_notes' || isShootingNotesContent(item)
  if (useHorizontal) {
    return {
      src: item.backdrop || item.poster,
      imageClass: 'h-[124px] w-[176px] object-cover sm:h-[158px] sm:w-[224px]',
      titleClass: 'max-w-[224px] truncate px-2 py-2 text-xs font-medium text-white/90 group-hover:text-white',
    }
  }
  if (item.videoFormat === 'vertical') {
    return {
      src: item.poster,
      imageClass: 'h-[220px] w-[124px] object-cover sm:h-[280px] sm:w-[158px]',
      titleClass: 'max-w-[148px] truncate px-2 py-2 text-xs font-medium text-white/90 group-hover:text-white',
    }
  }
  return {
    src: item.poster,
    imageClass: 'h-[220px] w-[148px] object-cover sm:h-[280px] sm:w-[187px]',
    titleClass: 'max-w-[148px] truncate px-2 py-2 text-xs font-medium text-white/90 group-hover:text-white',
  }
}

export function LandingCustomBlockSection({
  block,
  catalog = [],
  cekimSections = [],
}: {
  block: LandingCustomBlock
  catalog?: ContentItem[]
  cekimSections?: CekimNotlariSection[]
}) {
  if (block.type === 'contentRow') {
    const items = resolveContentRowItems(block, catalog, cekimSections)

    if (items.length === 0) return null

    const viewAllLink = normalizeLandingLink(block.ctaLink) || viewAllHrefForBlock(block)

    return (
      <section className="border-y border-white/5 bg-sineoda-bg px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-[1400px]">
          {block.eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sineoda-gold">{block.eyebrow}</p>
          )}
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            {block.title && <h2 className="text-2xl font-bold text-white sm:text-3xl">{block.title}</h2>}
            {block.ctaLabel && <CtaLink label={block.ctaLabel} link={viewAllLink} />}
          </div>
          {block.body && <p className="mt-3 max-w-3xl text-sm leading-relaxed text-sineoda-muted sm:text-base">{block.body}</p>}

          <div className="hide-scrollbar mt-6 flex gap-3 overflow-x-auto pb-2 sm:gap-4">
            {items.map((item) => {
              const poster = contentRowPoster(item, block.contentPool)
              return (
              <Link
                key={item.id}
                to={guestItemHref(item)}
                className="group shrink-0 overflow-hidden rounded-lg bg-white/5 transition hover:ring-2 hover:ring-sineoda-gold/40"
              >
                <img
                  src={resolveMediaUrl(poster.src)}
                  alt={item.title}
                  className={poster.imageClass}
                />
                <p className={poster.titleClass}>
                  {item.title}
                </p>
              </Link>
              )
            })}
          </div>
        </div>
      </section>
    )
  }

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
