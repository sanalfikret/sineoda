export type OwnerGroup = 'platform' | 'standard' | 'student_cinema'
export type ShareBasis = 'views' | 'minutes'
export interface AccountingPool { id: string; label: string; rate: number; categoryId?: string }
export interface AccountingRules { threshold: number; basis: ShareBasis; pools: AccountingPool[] }
export interface AccountingItem {
  contentId: string; title: string; type: string; program: OwnerGroup
  creatorId: string | null; creatorName: string; views: number; qualifiedViews: number
  watchSeconds: number; qualifiedSeconds: number; pool: string; poolShare: number; profitShare: number
}
/** Yapımcının panelde bildirdiği banka bilgileri (ödeme platform dışında, havale ile yapılır). */
export interface PayoutDetails { holder: string; iban: string; taxId: string; taxOffice: string }
/** Ayın para özeti — tahsilat otomatik, gider/kesinti admin girişi, dağıtılabilir net = tahsilat − gider (veya elle girilen net). */
export interface AccountingFinance {
  grossRevenue: number
  paidOrders: number
  expenses: number
  expenseNote: string
  netOverride: number | null
  distributable: number
  updatedAt: string | null
  /** Ay için en az bir ödeme kaydı varsa gider/net değiştirilemez. */
  locked: boolean
}
export interface AccountingCreatorRow {
  id: string; name: string; share: number; views: number
  /** share × dağıtılabilir net (TL, 2 ondalık). Açık ayda tahminidir. */
  amount: number
  paidAt: string | null; reference: string
  /** Ödendi işaretlenirken kaydedilen tutar ve IBAN (sonradan profil değişse de sabit kalır). */
  paidAmount: number | null; paidIban: string
  payout: PayoutDetails
}
export interface AccountingReport {
  month: string; closedAt: string | null; rules: AccountingRules; startedAt: string
  items: AccountingItem[]; platformShare: number
  creators: AccountingCreatorRow[]
  thresholds: number[]
  finance: AccountingFinance
}
