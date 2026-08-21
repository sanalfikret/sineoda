import type { ReactNode } from 'react'
import { ImageUpload } from './ImageUpload'
import type { LandingFaqItem, LandingSectionsConfig, LandingTextItem } from '../../constants/landingDefaults'

const inputClass =
  'w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-sm text-white outline-none focus:border-sineoda-gold'

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#11141c] p-5">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  )
}

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
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-white/85">{label}</p>
      {items.map((item, index) => (
        <div key={index} className="rounded-lg border border-white/10 p-3 space-y-2">
          <input
            value={item.title}
            onChange={(event) => {
              const next = [...items]
              next[index] = { ...item, title: event.target.value }
              onChange(next)
            }}
            placeholder="Başlık"
            className={inputClass}
          />
          <textarea
            value={item.text}
            onChange={(event) => {
              const next = [...items]
              next[index] = { ...item, text: event.target.value }
              onChange(next)
            }}
            placeholder="Metin"
            rows={2}
            className={inputClass}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, { title: '', text: '' }])}
        className="text-xs text-sineoda-gold hover:underline"
      >
        + Madde ekle
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
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="rounded-lg border border-white/10 p-3 space-y-2">
          <input
            value={item.question}
            onChange={(event) => {
              const next = [...items]
              next[index] = { ...item, question: event.target.value }
              onChange(next)
            }}
            placeholder="Soru"
            className={inputClass}
          />
          <textarea
            value={item.answer}
            onChange={(event) => {
              const next = [...items]
              next[index] = { ...item, answer: event.target.value }
              onChange(next)
            }}
            placeholder="Cevap"
            rows={3}
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, i) => i !== index))}
            className="text-xs text-red-300 hover:underline"
          >
            Sil
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, { question: '', answer: '' }])}
        className="text-xs text-sineoda-gold hover:underline"
      >
        + Soru ekle
      </button>
    </div>
  )
}

export function AdminLandingSectionsEditor({
  sections,
  onChange,
}: {
  sections: LandingSectionsConfig
  onChange: (sections: LandingSectionsConfig) => void
}) {
  const patch = (key: keyof LandingSectionsConfig, value: LandingSectionsConfig[keyof LandingSectionsConfig]) => {
    onChange({ ...sections, [key]: value })
  }

  return (
    <div className="space-y-6">
      <SectionCard title="Manifesto (üst metin bloğu)">
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
      </SectionCard>

      <SectionCard title="Kampanya / Abonelik (fiyat kartı)">
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
            label="İkincil buton"
            value={sections.campaign.ctaSecondary}
            onChange={(ctaSecondary) => patch('campaign', { ...sections.campaign, ctaSecondary })}
          />
        </div>
      </SectionCard>

      <SectionCard title="Neden Sineoda">
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
      </SectionCard>

      <SectionCard title="Genç Sinema">
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
      </SectionCard>

      <SectionCard title="Yapımcılar">
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
      </SectionCard>

      <SectionCard title="SSS">
        <Field
          label="Bölüm başlığı"
          value={sections.faq.title}
          onChange={(title) => patch('faq', { ...sections.faq, title })}
        />
        <FaqEditor
          items={sections.faq.items}
          onChange={(items) => patch('faq', { ...sections.faq, items })}
        />
      </SectionCard>

      <SectionCard title="E-posta kayıt + Dergi başlığı">
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
          label="Dergi etiketi"
          value={sections.journal.eyebrow}
          onChange={(eyebrow) => patch('journal', { ...sections.journal, eyebrow })}
        />
        <Field
          label="Dergi başlığı"
          value={sections.journal.title}
          onChange={(title) => patch('journal', { ...sections.journal, title })}
        />
      </SectionCard>
    </div>
  )
}
