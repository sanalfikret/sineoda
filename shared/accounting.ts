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
/** Tek gider kalemi: ofis, CDN, vergi, çalışan, kira… */
export interface ExpenseItem { id: string; label: string; amount: number }
/** Plan bazında tahsilat: kaç ödeme, toplam TL. */
export interface RevenueByPlan { planId: string; planName: string; count: number; amount: number }
export interface AccountingFinance {
  /** Ayın brüt tahsilatı (başarıyla ödenen abonelik siparişleri), TL */
  grossRevenue: number
  paidOrders: number
  revenueByPlan: RevenueByPlan[]
  /** Şu an üyeliği aktif izleyici + yapımcı sayısı (bilgi amaçlı) */
  activeSubscribers: number
  expenseItems: ExpenseItem[]
  /** Kalemlerin toplamı */
  expenses: number
  expenseNote: string
  /** Eski sürümden kalan elle net; yeni kayıtlarda null */
  netOverride: number | null
  /** Dağıtılacak net = tahsilat − giderler (0'ın altına inmez) */
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
