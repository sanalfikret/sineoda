import type { ReactNode } from 'react'
import type { LandingHeroConfig } from '../../api/client'
import type { LandingSectionsConfig } from '../../constants/landingDefaults'
import type { LandingCustomBlock } from '../../constants/landingCustomBlocks'
import type { LandingLayoutConfig } from '../../constants/landingLayout'
import { isCustomLandingBlockId, normalizeLandingLayout } from '../../constants/landingLayout'
import { LandingCustomBlockSection } from './LandingCustomBlockSection'
import { LandingFeatures } from './LandingFeatures'
import { LandingManifesto } from './LandingManifesto'
import { LandingCategoryShowcase } from './LandingCategoryShowcase'
import { LandingSlider } from './LandingSlider'
import { LandingEmailSignup } from './LandingEmailSignup'
import { LandingFaq } from './LandingFaq'
import { LandingJournalTeaser } from './LandingJournalTeaser'
import { LandingPricing } from './LandingPricing'
import { LandingCreatorSection } from './LandingCreatorSection'
import { LandingStudentCinemaSection } from './LandingStudentCinemaSection'
import { LandingHero } from './LandingHero'
import { StudentCinemaPicksRow } from '../StudentCinemaPicksRow'
import { StudentCinemaMonthlyWinnersRow } from '../StudentCinemaMonthlyWinnersRow'
import type { ContentItem } from '../../types/content'
import type { LandingShowcaseResponse } from '../../api/client'
import type { SiteNavId } from '../../constants/siteNav'

export interface LandingPageBlockContext {
  heroConfig: LandingHeroConfig
  backgroundContent: ContentItem | null
  featuredItem: ContentItem | null
  fallbackImage: string
  sections: LandingSectionsConfig
  sliderItems: ContentItem[]
  studentPicks: ContentItem[]
  studentMonthlyWinners: ContentItem[]
  showcases: LandingShowcaseResponse[]
  layout?: LandingLayoutConfig | null
  customBlocks?: LandingCustomBlock[]
  hiddenNavIds?: SiteNavId[]
}

function isLandingBlockHidden(id: string, hiddenNavIds: SiteNavId[]) {
  if (hiddenNavIds.includes('gencSinema') && ['studentPicks', 'studentMonthlyWinners', 'studentCinema'].includes(id)) {
    return true
  }
  if (hiddenNavIds.includes('dergi') && id === 'journal') {
    return true
  }
  return false
}

function renderLandingBlock(id: string, ctx: LandingPageBlockContext): ReactNode {
  if (isCustomLandingBlockId(id)) {
    const blockId = id.slice('custom:'.length)
    const block = ctx.customBlocks?.find((entry) => entry.id === blockId)
    if (!block) return null
    return <LandingCustomBlockSection block={block} />
  }

  switch (id) {
    case 'hero':
      return (
        <LandingHero
          hero={ctx.heroConfig}
          backgroundContent={ctx.backgroundContent}
          featuredItem={ctx.featuredItem}
          fallbackImage={ctx.fallbackImage}
        />
      )
    case 'manifesto':
      return <LandingManifesto section={ctx.sections.manifesto} />
    case 'slider':
      return <LandingSlider items={ctx.sliderItems} />
    case 'studentMonthlyWinners':
      return (
        <StudentCinemaMonthlyWinnersRow items={ctx.studentMonthlyWinners} guestMode className="pt-4" />
      )
    case 'studentPicks':
      return <StudentCinemaPicksRow items={ctx.studentPicks} guestMode className="pt-4" />
    case 'showcases':
      return ctx.showcases.length > 0 ? <LandingCategoryShowcase showcases={ctx.showcases} /> : null
    case 'journal':
      return <LandingJournalTeaser section={ctx.sections.journal} />
    case 'features':
      return <LandingFeatures section={ctx.sections.features} />
    case 'campaign':
      return <LandingPricing section={ctx.sections.campaign} />
    case 'studentCinema':
      return <LandingStudentCinemaSection section={ctx.sections.studentCinema} />
    case 'faq':
      return <LandingFaq section={ctx.sections.faq} />
    case 'emailSignup':
      return <LandingEmailSignup section={ctx.sections.emailSignup} />
    case 'creator':
      return <LandingCreatorSection section={ctx.sections.creator} />
    default:
      return null
  }
}

export function LandingPageBlocks({ ctx }: { ctx: LandingPageBlockContext }) {
  const customBlockIds = ctx.customBlocks?.map((block) => block.id) ?? []
  const layout = normalizeLandingLayout(ctx.layout, customBlockIds)
  const hiddenNavIds = ctx.hiddenNavIds ?? []
  const visibleOrder = layout.order.filter(
    (id) => !layout.hidden.includes(id) && !isLandingBlockHidden(id, hiddenNavIds),
  )

  return (
    <>
      {visibleOrder.map((id) => (
        <div key={id}>{renderLandingBlock(id, ctx)}</div>
      ))}
    </>
  )
}
