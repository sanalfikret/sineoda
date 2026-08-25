export type AdFrequency = 'once' | 'every_play' | 'monthly_once'
export type AdSkipMode = 'mandatory' | 'skippable'

export interface AdCampaign {
  id: string
  name: string
  videoUrl: string
  kidsVideoUrl: string | null
  targetAll: boolean
  contentIds: string[]
  frequency: AdFrequency
  skipMode: AdSkipMode
  skipAfterSeconds: number
  startsAt: string | null
  endsAt: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface AdPlayback {
  show: true
  campaignId: string
  sponsorName: string
  videoUrl: string
  skipMode: AdSkipMode
  skipAfterSeconds: number
  frequency: AdFrequency
}

export interface AdCampaignFormInput {
  name: string
  videoUrl: string
  kidsVideoUrl: string
  targetAll: boolean
  contentIds: string[]
  frequency: AdFrequency
  skipMode: AdSkipMode
  skipAfterSeconds: number
  startsAt: string
  endsAt: string
  isActive: boolean
}

export const AD_FREQUENCY_LABELS: Record<AdFrequency, string> = {
  once: 'Kullanıcı başına bir kez',
  monthly_once: 'Ayda bir kez',
  every_play: 'Her izlemede',
}

export const AD_SKIP_LABELS: Record<AdSkipMode, string> = {
  mandatory: 'Zorunlu (Geç yok)',
  skippable: 'Atlanabilir',
}
