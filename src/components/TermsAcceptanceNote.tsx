import { useState } from 'react'
import { LegalDocumentModal } from './LegalDocumentModal'

export function TermsAcceptanceNote() {
  const [legalOpen, setLegalOpen] = useState(false)

  return (
    <>
      <p className="text-sm text-white/70">
        Oynat&apos;a tıklayarak{' '}
        <button
          type="button"
          onClick={() => setLegalOpen(true)}
          className="text-sineoda-gold underline underline-offset-2 hover:text-sineoda-gold/80"
        >
          Kullanım Koşulları
        </button>
        &apos;mızı kabul etmiş olursunuz.
      </p>
      <LegalDocumentModal
        slug="kullanim-kosullari"
        open={legalOpen}
        onClose={() => setLegalOpen(false)}
      />
    </>
  )
}
