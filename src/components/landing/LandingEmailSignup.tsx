import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

export function LandingEmailSignup() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const query = email.trim() ? `?email=${encodeURIComponent(email.trim())}` : ''
    navigate(`/kayit${query}`)
  }

  return (
    <section className="border-t border-white/5 bg-gradient-to-b from-sineoda-bg to-black px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
          İzlemeye hazır mısın?
        </h2>
        <p className="mt-3 text-sm text-white/60 sm:text-base">
          E-posta adresini gir, üyeliğini oluştur ve sınırsız içeriğe hemen başla.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row"
        >
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="E-posta adresin"
            className="h-14 flex-1 rounded-md border border-white/20 bg-black/50 px-4 text-base text-white outline-none backdrop-blur-sm placeholder:text-white/40 focus:border-sineoda-gold"
          />
          <button
            type="submit"
            className="h-14 rounded-md bg-sineoda-gold px-8 text-base font-bold text-sineoda-bg transition hover:brightness-110"
          >
            Başla
          </button>
        </form>
      </div>
    </section>
  )
}
