import { resolveMediaUrl } from '../api/client'
import {
  FESTIVAL_KIND_LABELS,
  festivalEntryLabel,
  type FestivalEntry,
} from '../constants/festivals'

export function FestivalLaurelBadge({
  entry,
  compact = false,
}: {
  entry: FestivalEntry
  compact?: boolean
}) {
  const subtitle =
    entry.kind === 'award'
      ? entry.awardName ?? FESTIVAL_KIND_LABELS.award
      : FESTIVAL_KIND_LABELS.selection

  if (entry.laurelUrl) {
    return (
      <figure
        className={`flex flex-col items-center text-center ${compact ? 'w-20' : 'w-28 sm:w-32'}`}
        title={`${entry.festivalName} ${entry.year}`}
      >
        <img
          src={resolveMediaUrl(entry.laurelUrl)}
          alt={`${entry.festivalName} ${entry.year}`}
          className={`object-contain ${compact ? 'h-16 w-16' : 'h-24 w-24 sm:h-28 sm:w-28'}`}
        />
        {!compact && (
          <figcaption className="mt-2 text-[10px] leading-tight text-white/75">
            {entry.festivalName}
            <span className="block text-white/55">{entry.year}</span>
          </figcaption>
        )}
      </figure>
    )
  }

  return (
    <figure
      className={`relative flex flex-col items-center justify-center text-center ${compact ? 'h-20 w-20' : 'h-28 w-28 sm:h-32 sm:w-32'}`}
      title={`${entry.festivalName} ${entry.year}`}
    >
      <svg
        viewBox="0 0 120 120"
        className="absolute inset-0 h-full w-full text-sineoda-gold/85"
        aria-hidden="true"
      >
        <path
          fill="currentColor"
          d="M60 8c-18 8-30 24-30 44 0 14 6 26 16 34-8 2-14 8-16 16 10-4 20-4 30 0 10-4 20-4 30 0-2-8-8-14-16-16 10-8 16-20 16-34 0-20-12-36-30-44Z"
          opacity="0.22"
        />
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          d="M60 14c-14 6-24 18-24 34 0 11 5 21 13 27-6 1-11 5-13 11 8-3 16-3 24 0 8-3 16-3 24 0-2-6-7-10-13-11 8-6 13-16 13-27 0-16-10-28-24-34Z"
        />
      </svg>
      <div className={`relative z-10 px-2 ${compact ? 'max-w-[4.5rem]' : 'max-w-[6rem]'}`}>
        <p className={`font-semibold leading-tight text-white ${compact ? 'text-[9px]' : 'text-[11px]'}`}>
          {entry.festivalName}
        </p>
        <p className={`mt-0.5 text-sineoda-gold ${compact ? 'text-[8px]' : 'text-[10px]'}`}>{entry.year}</p>
        {!compact && (
          <p className="mt-1 text-[9px] leading-tight text-white/70">{subtitle}</p>
        )}
      </div>
    </figure>
  )
}

export function FestivalCreditsDisplay({
  festivals,
  compact = false,
}: {
  festivals: FestivalEntry[]
  compact?: boolean
}) {
  if (!festivals.length) return null

  return (
    <div className={compact ? 'flex flex-wrap gap-3' : 'space-y-4'}>
      {!compact && (
        <h3 className="text-sm font-semibold text-white">Festivaller & Ödüller</h3>
      )}
      <div className={`flex flex-wrap ${compact ? 'gap-3' : 'gap-4 sm:gap-6'}`}>
        {festivals.map((entry) => (
          <div key={entry.id} className="flex flex-col items-center">
            <FestivalLaurelBadge entry={entry} compact={compact} />
            {!compact && (
              <p className="mt-2 max-w-[8rem] text-center text-[11px] text-white/65">
                {festivalEntryLabel(entry)}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
