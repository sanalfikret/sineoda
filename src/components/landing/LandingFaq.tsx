import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { LandingSectionsConfig } from '../../constants/landingDefaults'
import { useLocale } from '../../i18n/LocaleContext'

export function LandingFaq({ section }: { section: LandingSectionsConfig['faq'] }) {
  const { t } = useTranslation('landing')
  const { localizePath } = useLocale()
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  const items = t('faq.items', { returnObjects: true }) as Array<{ question: string; answer: string }>

  return (
    <section className="border-t border-white/5 bg-black px-5 py-20 sm:px-8">
      <div className="mx-auto max-w-[900px]">
        <h2 className="text-center text-3xl font-bold sm:text-4xl">{t('faq.title')}</h2>

        <div className="mt-10 space-y-2">
          {items.map((faq, index) => {
            const open = openIndex === index
            return (
              <div key={`${faq.question}-${index}`} className="overflow-hidden rounded-md bg-[#2d2d2d]">
                <button
                  type="button"
                  onClick={() => setOpenIndex(open ? null : index)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left text-base font-medium sm:text-lg"
                >
                  <span>{faq.question}</span>
                  <span className="text-2xl leading-none text-white/80">{open ? '×' : '+'}</span>
                </button>
                {open && (
                  <div className="border-t border-white/10 px-5 pb-5 pt-3 text-sm leading-relaxed text-white/70 sm:text-base">
                    {faq.answer}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <p className="mt-10 text-center text-lg text-white/80">
          {t('faq.footerText')}{' '}
          <Link
            to={localizePath(section.footerLink || '/kayit')}
            className="underline underline-offset-4 hover:text-plooy-gold"
          >
            {t('faq.footerLinkLabel')}
          </Link>
          .
        </p>
      </div>
    </section>
  )
}
