import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LegalDocumentModal } from './LegalDocumentModal'

export function TermsAcceptanceNote() {
  const { t } = useTranslation('content')
  const { t: tc } = useTranslation()
  const [legalOpen, setLegalOpen] = useState(false)

  return (
    <>
      <p className="text-sm text-white/70">
        {t('termsNote.prefix')}{' '}
        <button
          type="button"
          onClick={() => setLegalOpen(true)}
          className="text-plooy-gold underline underline-offset-2 hover:text-plooy-gold/80"
        >
          {tc('footer.terms')}
        </button>
        {t('termsNote.suffix')}
      </p>
      <LegalDocumentModal
        slug="kullanim-kosullari"
        open={legalOpen}
        onClose={() => setLegalOpen(false)}
      />
    </>
  )
}
