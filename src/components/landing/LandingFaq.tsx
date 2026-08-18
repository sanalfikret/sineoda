import { useState } from 'react'
import { Link } from 'react-router-dom'

const faqs = [
  {
    question: 'Sineoda nedir?',
    answer:
      'Sineoda; dünyanın dört bir yanından bağımsız sinemacıların filmlerini, dizilerini ve belgesellerini izleyebileceğiniz küratörlü bir dijital yayın platformudur. Tek hesapla telefon, tablet, bilgisayar ve Android TV üzerinden erişebilirsiniz.',
  },
  {
    question: 'Sineoda\'nın maliyeti nedir?',
    answer:
      'Aylık ₺149 veya yıllık ₺1.290 planlarımız mevcuttur. Yıllık planda 2 ay bedava avantajı sunulur. Güncel fiyatlar için Planlar sayfasını ziyaret edebilirsiniz.',
  },
  {
    question: 'Nerede izleyebilirim?',
    answer:
      'Sineoda\'yı web tarayıcısı, Android, iOS ve Android TV üzerinden izleyebilirsiniz. İnternet bağlantısı olan her cihazda, istediğiniz yerde izlemeye başlayın.',
  },
  {
    question: 'Nasıl iptal ederim?',
    answer:
      'Hesabınıza giriş yaparak Abonelik bölümünden planınızı istediğiniz zaman iptal edebilirsiniz. İptal sonrası dönem sonuna kadar izlemeye devam edersiniz.',
  },
  {
    question: 'Sineoda\'da ne izleyebilirim?',
    answer:
      'Dünya bağımsız sinemasından filmler ve diziler; festival ödüllü belgeseller, kısa metrajlar ve yerli bağımsız yapımlar. Katalog düzenli olarak güncellenir.',
  },
  {
    question: 'Sineoda çocuklar için uygun mudur?',
    answer:
      'Evet. Çocuk profili ile yaşa uygun içerikler sunulur. Ebeveynler profil ve izleme tercihlerini yönetebilir.',
  },
]

export function LandingFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section className="border-t border-white/5 bg-black px-5 py-20 sm:px-8">
      <div className="mx-auto max-w-[900px]">
        <h2 className="text-center text-3xl font-bold sm:text-4xl">Sıkça Sorulan Sorular</h2>

        <div className="mt-10 space-y-2">
          {faqs.map((faq, index) => {
            const open = openIndex === index
            return (
              <div key={faq.question} className="overflow-hidden rounded-md bg-[#2d2d2d]">
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
          İzlemeye hazır mısın?{' '}
          <Link to="/kayit" className="underline underline-offset-4 hover:text-sineoda-gold">
            Üye olmak için e-posta adresini gir
          </Link>
          .
        </p>
      </div>
    </section>
  )
}
