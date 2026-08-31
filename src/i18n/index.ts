import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import trCommon from '../locales/tr/common.json'
import enCommon from '../locales/en/common.json'
import trAuth from '../locales/tr/auth.json'
import enAuth from '../locales/en/auth.json'
import trPricing from '../locales/tr/pricing.json'
import enPricing from '../locales/en/pricing.json'
import trPayment from '../locales/tr/payment.json'
import enPayment from '../locales/en/payment.json'
import trProfiles from '../locales/tr/profiles.json'
import enProfiles from '../locales/en/profiles.json'
import trAccount from '../locales/tr/account.json'
import enAccount from '../locales/en/account.json'
import trBrowse from '../locales/tr/browse.json'
import enBrowse from '../locales/en/browse.json'
import trContent from '../locales/tr/content.json'
import enContent from '../locales/en/content.json'
import trCreator from '../locales/tr/creator.json'
import enCreator from '../locales/en/creator.json'
import trJournal from '../locales/tr/journal.json'
import enJournal from '../locales/en/journal.json'
import trMessages from '../locales/tr/messages.json'
import enMessages from '../locales/en/messages.json'
import trLegalShell from '../locales/tr/legalShell.json'
import enLegalShell from '../locales/en/legalShell.json'
import trLanding from '../locales/tr/landing.json'
import enLanding from '../locales/en/landing.json'
import trInstall from '../locales/tr/install.json'
import enInstall from '../locales/en/install.json'
import enLegalDocuments from '../locales/en/legalDocuments.json'
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, type Locale } from './paths'

const saved = (typeof localStorage !== 'undefined'
  ? (localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null)
  : null)

const namespaces = [
  'common',
  'auth',
  'pricing',
  'payment',
  'profiles',
  'account',
  'browse',
  'content',
  'creator',
  'journal',
  'messages',
  'legalShell',
  'landing',
  'install',
  'legalDocuments',
] as const

void i18n.use(initReactI18next).init({
  resources: {
    tr: {
      common: trCommon,
      auth: trAuth,
      pricing: trPricing,
      payment: trPayment,
      profiles: trProfiles,
      account: trAccount,
      browse: trBrowse,
      content: trContent,
      creator: trCreator,
      journal: trJournal,
      messages: trMessages,
      legalShell: trLegalShell,
      landing: trLanding,
      install: trInstall,
    },
    en: {
      common: enCommon,
      auth: enAuth,
      pricing: enPricing,
      payment: enPayment,
      profiles: enProfiles,
      account: enAccount,
      browse: enBrowse,
      content: enContent,
      creator: enCreator,
      journal: enJournal,
      messages: enMessages,
      legalShell: enLegalShell,
      landing: enLanding,
      install: enInstall,
      legalDocuments: enLegalDocuments,
    },
  },
  lng: saved && (saved === 'tr' || saved === 'en') ? saved : DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  defaultNS: 'common',
  ns: [...namespaces],
  interpolation: { escapeValue: false },
  returnEmptyString: false,
})

export default i18n

export function setI18nLocale(locale: Locale) {
  void i18n.changeLanguage(locale)
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    /* private mode */
  }
  document.documentElement.lang = locale
}
