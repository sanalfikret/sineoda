import type { ReactNode } from 'react'
import { ImageUpload } from './ImageUpload'
import type { LandingContentBlockId } from '../../constants/landingLayout'
import type { LandingFaqItem, LandingSectionsConfig, LandingTextItem } from '../../constants/landingDefaults'

const inputClass =
  'w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-sm text-white outline-none focus:border-sineoda-gold'

function Field({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  multiline?: boolean
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm text-white/85">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={3}
          className={inputClass}
        />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} className={inputClass} />
      )}
    </label>
  )
}

function TextItemsEditor({
  label,
  items,
  onChange,
}: {
  label: string
  items: LandingTextItem[]
  onChange: (items: LandingTextItem[]) => void
}) {
  const updateItem = (index: number, patch: Partial<LandingTextItem>) => {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  const addItem = () => onChange([...items, { title: '', text: '' }])
  const removeItem = (index: number) => onChange(items.filter((_, i) => i !== index))

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-white/85">{label}</p>
      {items.map((item, index) => (
        <div key={index} className="space-y-2 rounded-lg border border-white/10 bg-[#0d0f14] p-3">
          <Field label="Başlık" value={item.title} onChange={(title) => updateItem(index, { title })} />
          <Field
            label="Metin"
            value={item.text}
            onChange={(text) => updateItem(index, { text })}
            multiline
          />
          <button
            type="button"
            onClick={() => removeItem(index)}
            className="text-xs text-red-300 hover:text-red-200"
          >
            Kaldır
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addItem}
        className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/80 hover:bg-white/5"
      >
        + Ekle
      </button>
    </div>
  )
}

function FaqEditor({
  items,
  onChange,
}: {
  items: LandingFaqItem[]
  onChange: (items: LandingFaqItem[]) => void
}) {
  const updateItem = (index: number, patch: Partial<LandingFaqItem>) => {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  const addItem = () => onChange([...items, { question: '', answer: '' }])
  const removeItem = (index: number) => onChange(items.filter((_, i) => i !== index))

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="space-y-2 rounded-lg border border-white/10 bg-[#0d0f14] p-3">
          <Field
            label="Soru"
            value={item.question}
            onChange={(question) => updateItem(index, { question })}
          />
          <Field
            label="Cevap"
            value={item.answer}
            onChange={(answer) => updateItem(index, { answer })}
            multiline
          />
          <button
            type="button"
            onClick={() => removeItem(index)}
            className="text-xs text-red-300 hover:text-red-200"
          >
            Kaldır
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addItem}
        className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/80 hover:bg-white/5"
      >
        + Soru ekle
      </button>
    </div>
  )
}

export function AdminLandingSectionBlock({
  blockId,
  sections,
  onChange,
}: {
  blockId: LandingContentBlockId
  sections: LandingSectionsConfig
  onChange: (sections: LandingSectionsConfig) => void
}) {
  const patch = (key: keyof LandingSectionsConfig, value: LandingSectionsConfig[keyof LandingSectionsConfig]) => {
    onChange({ ...sections, [key]: value })
  }

  const editors: Record<LandingContentBlockId, ReactNode> = {
    manifesto: (
      <>
        <TextItemsEditor
          label="İki sütunlu kısa metinler"
          items={sections.manifesto.pillars}
          onChange={(pillars) => patch('manifesto', { ...sections.manifesto, pillars })}
        />
        <Field
          label="Etiket"
          value={sections.manifesto.eyebrow}
          onChange={(eyebrow) => patch('manifesto', { ...sections.manifesto, eyebrow })}
        />
        <Field
          label="Başlık"
          value={sections.manifesto.title}
          onChange={(title) => patch('manifesto', { ...sections.manifesto, title })}
        />
        <Field
          label="Açıklama"
          value={sections.manifesto.body}
          onChange={(body) => patch('manifesto', { ...sections.manifesto, body })}
          multiline
        />
        <Field
          label="Buton metni"
          value={sections.manifesto.ctaLabel}
          onChange={(ctaLabel) => patch('manifesto', { ...sections.manifesto, ctaLabel })}
        />
        <Field
          label="Buton linki"
          value={sections.manifesto.ctaLink}
          onChange={(ctaLink) => patch('manifesto', { ...sections.manifesto, ctaLink })}
        />
      </>
    ),
    campaign: (
      <>
        <p className="text-xs text-sineoda-muted">
          Kampanya dönemlerinde etiketi &quot;Kampanya&quot;, fiyatı ve görseli buradan değiştirin.
        </p>
        <Field
          label="Etiket (Abonelik / Kampanya / Hero)"
          value={sections.campaign.eyebrow}
          onChange={(eyebrow) => patch('campaign', { ...sections.campaign, eyebrow })}
        />
        <Field
          label="Başlık"
          value={sections.campaign.title}
          onChange={(title) => patch('campaign', { ...sections.campaign, title })}
        />
        <Field
          label="Açıklama"
          value={sections.campaign.description}
          onChange={(description) => patch('campaign', { ...sections.campaign, description })}
          multiline
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <Field
            label="Fiyat"
            value={sections.campaign.price}
            onChange={(price) => patch('campaign', { ...sections.campaign, price })}
          />
          <Field
            label="Fiyat eki"
            value={sections.campaign.priceSuffix}
            onChange={(priceSuffix) => patch('campaign', { ...sections.campaign, priceSuffix })}
          />
          <Field
            label="Alt fiyat notu"
            value={sections.campaign.priceNote}
            onChange={(priceNote) => patch('campaign', { ...sections.campaign, priceNote })}
          />
        </div>
        <ImageUpload
          label="Sağ taraftaki görsel"
          value={sections.campaign.image}
          onChange={(image) => patch('campaign', { ...sections.campaign, image })}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Birincil buton"
            value={sections.campaign.ctaPrimary}
            onChange={(ctaPrimary) => patch('campaign', { ...sections.campaign, ctaPrimary })}
          />
          <Field
            label="Birincil link"
            value={sections.campaign.ctaPrimaryLink}
            onChange={(ctaPrimaryLink) => patch('campaign', { ...sections.campaign, ctaPrimaryLink })}
          />
          <Field
            label="İkincil buton"
            value={sections.campaign.ctaSecondary}
            onChange={(ctaSecondary) => patch('campaign', { ...sections.campaign, ctaSecondary })}
          />
          <Field
            label="İkincil link"
            value={sections.campaign.ctaSecondaryLink}
            onChange={(ctaSecondaryLink) =>
              patch('campaign', { ...sections.campaign, ctaSecondaryLink })
            }
          />
        </div>
      </>
    ),
    features: (
      <>
        <Field
          label="Etiket"
          value={sections.features.eyebrow}
          onChange={(eyebrow) => patch('features', { ...sections.features, eyebrow })}
        />
        <Field
          label="Başlık"
          value={sections.features.title}
          onChange={(title) => patch('features', { ...sections.features, title })}
          multiline
        />
        <TextItemsEditor
          label="Özellik kartları"
          items={sections.features.items}
          onChange={(items) => patch('features', { ...sections.features, items })}
        />
      </>
    ),
    studentCinema: (
      <>
        <Field
          label="Etiket"
          value={sections.studentCinema.eyebrow}
          onChange={(eyebrow) => patch('studentCinema', { ...sections.studentCinema, eyebrow })}
        />
        <Field
          label="Başlık"
          value={sections.studentCinema.title}
          onChange={(title) => patch('studentCinema', { ...sections.studentCinema, title })}
        />
        <Field
          label="Alt metin"
          value={sections.studentCinema.subtitle}
          onChange={(subtitle) => patch('studentCinema', { ...sections.studentCinema, subtitle })}
          multiline
        />
        <TextItemsEditor
          label="Adımlar"
          items={sections.studentCinema.steps}
          onChange={(steps) => patch('studentCinema', { ...sections.studentCinema, steps })}
        />
        <Field
          label="Adımlar başlığı"
          value={sections.studentCinema.stepsHeading}
          onChange={(stepsHeading) => patch('studentCinema', { ...sections.studentCinema, stepsHeading })}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Birincil buton"
            value={sections.studentCinema.ctaPrimary}
            onChange={(ctaPrimary) => patch('studentCinema', { ...sections.studentCinema, ctaPrimary })}
          />
          <Field
            label="Birincil link"
            value={sections.studentCinema.ctaPrimaryLink}
            onChange={(ctaPrimaryLink) =>
              patch('studentCinema', { ...sections.studentCinema, ctaPrimaryLink })
            }
          />
          <Field
            label="İkincil buton (kaydır)"
            value={sections.studentCinema.ctaSecondary}
            onChange={(ctaSecondary) =>
              patch('studentCinema', { ...sections.studentCinema, ctaSecondary })
            }
          />
        </div>
        <Field
          label="Dipnot"
          value={sections.studentCinema.footnote}
          onChange={(footnote) => patch('studentCinema', { ...sections.studentCinema, footnote })}
          multiline
        />
      </>
    ),
    creator: (
      <>
        <Field
          label="Etiket"
          value={sections.creator.eyebrow}
          onChange={(eyebrow) => patch('creator', { ...sections.creator, eyebrow })}
        />
        <Field
          label="Başlık"
          value={sections.creator.title}
          onChange={(title) => patch('creator', { ...sections.creator, title })}
        />
        <Field
          label="Alt metin"
          value={sections.creator.subtitle}
          onChange={(subtitle) => patch('creator', { ...sections.creator, subtitle })}
          multiline
        />
        <TextItemsEditor
          label="Avantaj kartları"
          items={sections.creator.perks}
          onChange={(perks) => patch('creator', { ...sections.creator, perks })}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Birincil buton"
            value={sections.creator.ctaPrimary}
            onChange={(ctaPrimary) => patch('creator', { ...sections.creator, ctaPrimary })}
          />
          <Field
            label="Birincil link"
            value={sections.creator.ctaPrimaryLink}
            onChange={(ctaPrimaryLink) => patch('creator', { ...sections.creator, ctaPrimaryLink })}
          />
          <Field
            label="İkincil buton"
            value={sections.creator.ctaSecondary}
            onChange={(ctaSecondary) => patch('creator', { ...sections.creator, ctaSecondary })}
          />
          <Field
            label="İkincil link"
            value={sections.creator.ctaSecondaryLink}
            onChange={(ctaSecondaryLink) =>
              patch('creator', { ...sections.creator, ctaSecondaryLink })
            }
          />
        </div>
        <Field
          label="Dipnot"
          value={sections.creator.footnote}
          onChange={(footnote) => patch('creator', { ...sections.creator, footnote })}
          multiline
        />
      </>
    ),
    faq: (
      <>
        <Field
          label="Bölüm başlığı"
          value={sections.faq.title}
          onChange={(title) => patch('faq', { ...sections.faq, title })}
        />
        <FaqEditor
          items={sections.faq.items}
          onChange={(items) => patch('faq', { ...sections.faq, items })}
        />
        <Field
          label="Alt metin"
          value={sections.faq.footerText}
          onChange={(footerText) => patch('faq', { ...sections.faq, footerText })}
        />
        <Field
          label="Alt link metni"
          value={sections.faq.footerLinkLabel}
          onChange={(footerLinkLabel) => patch('faq', { ...sections.faq, footerLinkLabel })}
        />
        <Field
          label="Alt link adresi"
          value={sections.faq.footerLink}
          onChange={(footerLink) => patch('faq', { ...sections.faq, footerLink })}
        />
      </>
    ),
    emailSignup: (
      <>
        <Field
          label="E-posta bölümü başlığı"
          value={sections.emailSignup.title}
          onChange={(title) => patch('emailSignup', { ...sections.emailSignup, title })}
        />
        <Field
          label="E-posta bölümü açıklaması"
          value={sections.emailSignup.description}
          onChange={(description) => patch('emailSignup', { ...sections.emailSignup, description })}
          multiline
        />
        <Field
          label="Buton metni"
          value={sections.emailSignup.buttonLabel}
          onChange={(buttonLabel) => patch('emailSignup', { ...sections.emailSignup, buttonLabel })}
        />
      </>
    ),
    journal: (
      <>
        <Field
          label="Dergi etiketi"
          value={sections.journal.eyebrow}
          onChange={(eyebrow) => patch('journal', { ...sections.journal, eyebrow })}
        />
        <Field
          label="Dergi başlığı"
          value={sections.journal.title}
          onChange={(title) => patch('journal', { ...sections.journal, title })}
        />
        <Field
          label="Dergi açıklaması"
          value={sections.journal.description}
          onChange={(description) => patch('journal', { ...sections.journal, description })}
          multiline
        />
      </>
    ),
  }

  return <div className="space-y-4">{editors[blockId]}</div>
}

export function isLandingContentBlock(id: string): id is LandingContentBlockId {
  return (
    id === 'manifesto' ||
    id === 'journal' ||
    id === 'features' ||
    id === 'campaign' ||
    id === 'studentCinema' ||
    id === 'faq' ||
    id === 'emailSignup' ||
    id === 'creator'
  )
}
