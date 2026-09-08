export type OwnerGroup = 'platform' | 'standard' | 'student_cinema'
export type ShareBasis = 'views' | 'minutes'
export interface AccountingPool { id: string; label: string; rate: number; categoryId?: string }
export interface AccountingRules { threshold: number; basis: ShareBasis; pools: AccountingPool[] }
export interface AccountingItem {
  contentId: string; title: string; type: string; program: OwnerGroup
  creatorId: string | null; creatorName: string; views: number; qualifiedViews: number
  watchSeconds: number; qualifiedSeconds: number; pool: string; poolShare: number; profitShare: number
}
export interface AccountingReport {
  month: string; closedAt: string | null; rules: AccountingRules; startedAt: string
  items: AccountingItem[]; platformShare: number
  creators: { id: string; name: string; share: number; views: number; paidAt: string | null; reference: string }[]
  thresholds: number[]
}

