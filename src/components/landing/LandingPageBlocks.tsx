import type { ReactNode } from 'react'
import type { LandingHeroConfig } from '../../api/client'
import type { LandingSectionsConfig } from '../../constants/landingDefaults'
import type { LandingBlockId, LandingLayoutConfig } from '../../constants/landingLayout'
import { normalizeLandingLayout } from '../../constants/landingLayout'
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
import type { ContentItem } from '../../types/content'
import type { LandingShowcaseResponse } from '../../api/client'

export interface LandingPageBlockContext {
  heroConfig: LandingHeroConfig
  backgroundContent: ContentItem | null
  featuredItem: ContentItem | null
  fallbackImage: string
  sections: LandingSectionsConfig
  sliderItems: ContentItem[]
  studentPicks: ContentItem[]
  showcases: LandingShowcaseResponse[]
  layout?: LandingLayoutConfig | null
}

function renderLandingBlock(id: LandingBlockId, ctx: LandingPageBlockContext): ReactNode {
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
    case 'studentPicks':
      return <StudentCinemaPicksRow items={ctx.studentPicks} guestMode className="pt-4" />
    case 'showcases':
      return <LandingCategoryShowcase showcases={ctx.showcases} />
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
  const layout = normalizeLandingLayout(ctx.layout)
  const visibleOrder = layout.order.filter((id) => !layout.hidden.includes(id))

  return (
    <>
      {visibleOrder.map((id) => (
        <div key={id}>{renderLandingBlock(id, ctx)}</div>
      ))}
    </>
  )
}
