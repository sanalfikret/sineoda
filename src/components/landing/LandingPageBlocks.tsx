import { useContext } from 'react'
import {useTranslation} from 'react-i18next'
import {Context} from './GuestPresentation'
import { GuestBlockFrame } from './GuestPresentation'
import type { ReactNode } from 'react'
import type { LandingHeroConfig } from '../../api/client'
import type { LandingSectionsConfig } from '../../constants/landingDefaults'
import type { LandingBlockTitlesConfig } from '../../constants/landingBlockTitles'
import { resolvePublicRowTitle } from '../../constants/landingBlockTitles'
import type { LandingCustomBlock } from '../../constants/landingCustomBlocks'
import type { LandingLayoutConfig } from '../../constants/landingLayout'
import { isCustomLandingBlockId, normalizeLandingLayout } from '../../constants/landingLayout'
import { LandingCustomBlockSection } from './LandingCustomBlockSection'
import { LandingFeatures } from './LandingFeatures'
import { LandingManifesto } from './LandingManifesto'
import { LandingCategoryRows } from './LandingCategoryRows'
import { LandingSlider } from './LandingSlider'
import { LandingEmailSignup } from './LandingEmailSignup'
import { LandingFaq } from './LandingFaq'
import { LandingJournalTeaser } from './LandingJournalTeaser'
import { LandingPricing } from './LandingPricing'
import { LandingCreatorSection } from './LandingCreatorSection'
import { LandingStudentCinemaSection } from './LandingStudentCinemaSection'
import { LandingHero } from './LandingHero'
import { ProgramShowcaseRow } from '../ProgramShowcaseRow'
import type { ContentItem } from '../../types/content'
import type { CekimNotlariSection, LandingShowcaseResponse } from '../../api/client'
import type { SiteNavId } from '../../constants/siteNav'

export interface LandingPageBlockContext {
  heroConfig: LandingHeroConfig
  backgroundContent: ContentItem | null
  featuredItem: ContentItem | null
  fallbackImage: string
  sections: LandingSectionsConfig
  blockTitles?: LandingBlockTitlesConfig
  sliderItems: ContentItem[]
  studentPicks: ContentItem[]
  studentMonthlyWinners: ContentItem[]
  showcases: LandingShowcaseResponse[]
  layout?: LandingLayoutConfig | null
  customBlocks?: LandingCustomBlock[]
  hiddenNavIds?: SiteNavId[]
  catalog?: ContentItem[]
  cekimSections?: CekimNotlariSection[]
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
    return (
      <GuestBlockFrame id={id}><LandingCustomBlockSection
        block={block}
        catalog={ctx.catalog}
        cekimSections={ctx.cekimSections}
      /></GuestBlockFrame>
    )
  }

  switch (id) {
    case 'hero':
      return (
        <LandingHero
          items={ctx.sliderItems}
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
        <ProgramShowcaseRow
          kind="studentMonthlyWinners"
          items={ctx.studentMonthlyWinners}
          title={resolvePublicRowTitle('studentMonthlyWinners', ctx.blockTitles ?? {})}
          guestMode
          className="pt-4"
        />
      )
    case 'studentPicks':
      return (
        <ProgramShowcaseRow
          kind="studentPicks"
          items={ctx.studentPicks}
          title={resolvePublicRowTitle('studentPicks', ctx.blockTitles ?? {})}
          guestMode
          className="pt-4"
        />
      )
    case 'showcases':
      return <LandingCategoryRows showcases={ctx.showcases} />
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
  const presentation=useContext(Context)
  const {i18n}=useTranslation()
  const english=i18n.language.startsWith('en')
  const blockTitles={...ctx.blockTitles}
  const customBlocks=ctx.customBlocks?.map(block=>{const setting=presentation['custom:'+block.id];return {...block,title:(english?setting?.titleEn:setting?.titleTr)||block.title,body:(english?setting?.bodyEn:setting?.bodyTr)||block.body}})
  const sections={...ctx.sections}
  for(const [id,setting] of Object.entries(presentation)){
    const title=english?setting.titleEn:setting.titleTr,body=english?setting.bodyEn:setting.bodyTr
    if(title) (blockTitles as Record<string,string>)[id]=title
    const section=(sections as unknown as Record<string,Record<string,unknown>>)[id]
    if(section) (sections as unknown as Record<string,unknown>)[id]={...section,...(title?{title}:{}),...(body?{body,description:body,subtitle:body}: {})}
  }
  const heroSetting=presentation.hero
  const heroTitle=english?heroSetting?.titleEn:heroSetting?.titleTr
  const heroBody=english?heroSetting?.bodyEn:heroSetting?.bodyTr
  ctx={...ctx,blockTitles,customBlocks,sections,heroConfig:{...ctx.heroConfig,...(heroTitle?{line1:heroTitle}:{}),...(heroBody?{description:heroBody}:{})}}

  const customBlockIds = ctx.customBlocks?.map((block) => block.id) ?? []
  const layout = normalizeLandingLayout(ctx.layout, customBlockIds)
  const hiddenNavIds = ctx.hiddenNavIds ?? []
  const visibleOrder = layout.order.filter(
    (id) => !presentation[id]?.removed && !layout.hidden.includes(id) && !isLandingBlockHidden(id, hiddenNavIds),
  )

  return (
    <>
      {visibleOrder.map((id) => (
        <div key={id}>{!presentation[id]||isCustomLandingBlockId(id)||['studentPicks','studentMonthlyWinners'].includes(id)?renderLandingBlock(id,ctx):<GuestBlockFrame id={id}>
          {['slider','showcases','hero','features','faq'].includes(id)&&((english?presentation[id]?.titleEn:presentation[id]?.titleTr)||(english?presentation[id]?.bodyEn:presentation[id]?.bodyTr))&&<div className="py-4"><h2 className="text-xl font-bold">{english?presentation[id]?.titleEn:presentation[id]?.titleTr}</h2><p>{english?presentation[id]?.bodyEn:presentation[id]?.bodyTr}</p></div>}
          {renderLandingBlock(id,ctx)}
        </GuestBlockFrame>}</div>
      ))}
    </>
  )
}
