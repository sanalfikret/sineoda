import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { fetchFilmSchools, uploadStudentId } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { BRAND_STUDENT_CINEMA } from '../../constants/brand'
import { CREATOR_LEGAL_TERMS } from '../../constants/creatorLegal'
import { groupSchoolsByUniversity, splitSchoolName } from '../../utils/filmSchools'

export function CreatorRegisterPage() {
  const { creatorSignup, isCreator, isLoading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isStudentProgram = searchParams.get('program') === 'genc-sinema'

  const [name, setName] = useState('')
  const [studioName, setStudioName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [projectCrew, setProjectCrew] = useState('')
  const [bio, setBio] = useState('')
  const [schoolId, setSchoolId] = useState('')
  const [schools, setSchools] = useState<Array<{ id: string; name: string }>>([])
  const [studentIdFile, setStudentIdFile] = useState<File | null>(null)
  const [studentIdPreview, setStudentIdPreview] = useState('')
  const [acceptLegal, setAcceptLegal] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isStudentProgram) return
    void fetchFilmSchools()
      .then((data) => setSchools(data.schools))
      .catch(() => setSchools([]))
  }, [isStudentProgram])

  const groupedSchools = useMemo(() => groupSchoolsByUniversity(schools), [schools])

  if (!isLoading && isCreator) {
    return <Navigate to="/creator" replace />
  }

  const handleStudentIdChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    setStudentIdFile(file)
    setStudentIdPreview(file ? file.name : '')
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!acceptLegal) {
      setError('Yasal şartları kabul etmelisiniz.')
      return
    }
    if (isStudentProgram && !schoolId) {
      setError('Sinema okulunuzu seçmelisiniz.')
      return
    }
    if (isStudentProgram && !phone.trim()) {
      setError('Telefon numaranızı girmelisiniz.')
      return
    }
    if (isStudentProgram && !projectCrew.trim()) {
      setError('Yönetmen ve yapım ekibi bilgisini girmelisiniz.')
      return
    }
    if (isStudentProgram && !studentIdFile) {
      setError('Öğrenci kimliği yüklemeniz zorunludur.')
      return
    }
    setError('')
    setLoading(true)
    try {
      let studentIdFileUrl: string | undefined
      if (isStudentProgram && studentIdFile) {
        studentIdFileUrl = await uploadStudentId(studentIdFile)
      }

      await creatorSignup({
        name,
        email,
        password,
        studioName,
        bio,
        acceptLegal,
        program: isStudentProgram ? 'student_cinema' : 'standard',
        schoolId: isStudentProgram ? schoolId : undefined,
        phone: isStudentProgram ? phone : undefined,
        projectCrew: isStudentProgram ? projectCrew : undefined,
        studentIdFileUrl,
      })
      navigate('/creator', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt başarısız.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-[#0d0f14] px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-8 flex items-center gap-3">
          <img src="/icon.svg" alt="" className="h-10 w-10 rounded-lg" />
          <div>
            <h1 className="text-2xl font-bold text-white">
              {isStudentProgram ? 'Genç Sinema Başvurusu' : 'Yapımcı Kaydı'}
            </h1>
            <p className="text-sm text-sineoda-muted">
              {isStudentProgram
                ? 'Mezun veya öğrenci projenizi yüklemek için hesap oluşturun'
                : 'Bağımsız sinemanızı Sineoda\'da yayınlayın'}
            </p>
          </div>
        </div>

        {isStudentProgram && (
          <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100">
            {BRAND_STUDENT_CINEMA.subtitle}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-white/10 bg-[#11141c] p-6 sm:p-8">
          {isStudentProgram && (
            <label className="block">
              <span className="mb-1.5 block text-sm text-white/90">Sinema okulunuz</span>
              <select
                required
                value={schoolId}
                onChange={(event) => setSchoolId(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-3 text-white outline-none focus:border-emerald-400"
              >
                <option value="">Okul seçin</option>
                {groupedSchools.map((group) => (
                  <optgroup key={group.university} label={group.university}>
                    {group.schools.map((school) => {
                      const { department } = splitSchoolName(school.name)
                      return (
                        <option key={school.id} value={school.id}>
                          {department}
                        </option>
                      )
                    })}
                  </optgroup>
                ))}
              </select>
            </label>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm text-white/90">Ad Soyad</span>
              <input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-3 text-white outline-none focus:border-sineoda-gold"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm text-white/90">
                {isStudentProgram ? 'Proje / yapım adı' : 'Stüdyo / Yapım Adı'}
              </span>
              <input
                required
                value={studioName}
                onChange={(event) => setStudioName(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-3 text-white outline-none focus:border-sineoda-gold"
              />
            </label>
          </div>

          {isStudentProgram && (
            <>
              <label className="block">
                <span className="mb-1.5 block text-sm text-white/90">Telefon</span>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="05XX XXX XX XX"
                  className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-3 text-white outline-none focus:border-emerald-400"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm text-white/90">
                  Yönetmen ve yapım ekibi
                </span>
                <textarea
                  required
                  rows={4}
                  value={projectCrew}
                  onChange={(event) => setProjectCrew(event.target.value)}
                  placeholder={'Yönetmen: ...\nYapımcı: ...\nGörüntü yönetmeni: ...\nKurgu: ...'}
                  className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-3 text-white outline-none focus:border-emerald-400"
                />
                <span className="mt-1.5 block text-xs text-white/40">
                  Her satıra bir isim ve rol yazabilirsiniz.
                </span>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm text-white/90">Öğrenci kimliği</span>
                <input
                  type="file"
                  required
                  accept="image/*,application/pdf"
                  onChange={handleStudentIdChange}
                  className="w-full rounded-lg border border-dashed border-white/15 bg-[#0d0f14] px-4 py-3 text-sm text-white/80 file:mr-4 file:rounded-md file:border-0 file:bg-emerald-500 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[#07110d]"
                />
                {studentIdPreview && (
                  <span className="mt-1.5 block text-xs text-emerald-300/80">{studentIdPreview}</span>
                )}
                <span className="mt-1.5 block text-xs text-white/40">
                  Öğrenci veya mezun olduğunuzu gösteren kimlik kartı fotoğrafı veya PDF (en fazla 10 MB).
                </span>
              </label>
            </>
          )}

          <label className="block">
            <span className="mb-1.5 block text-sm text-white/90">E-posta</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-3 text-white outline-none focus:border-sineoda-gold"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm text-white/90">Şifre (en az 6 karakter)</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-3 text-white outline-none focus:border-sineoda-gold"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm text-white/90">Kısa biyografi (isteğe bağlı)</span>
            <textarea
              rows={3}
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-3 text-white outline-none focus:border-sineoda-gold"
            />
          </label>

          <div className="rounded-xl border border-white/10 bg-[#0d0f14] p-4">
            <p className="text-sm font-medium text-white">Yasal şartlar ve sorumluluk beyanı</p>
            <pre className="mt-3 max-h-48 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-sineoda-muted">
              {CREATOR_LEGAL_TERMS}
            </pre>
            <label className="mt-4 flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={acceptLegal}
                onChange={(event) => setAcceptLegal(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-white/20 accent-sineoda-gold"
              />
              <span className="text-sm text-white/90">
                Filminin bana ait olduğunu belgeleyeceğimi, tüm yasal sorumluluğun bana ait olduğunu
                ve gelir paylaşımı koşullarının yapımcı anlaşmasında belirtildiğini kabul ediyorum.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full rounded-lg py-3 text-sm font-semibold disabled:opacity-60 ${
              isStudentProgram
                ? 'bg-emerald-500 text-[#07110d]'
                : 'bg-sineoda-gold text-sineoda-bg'
            }`}
          >
            {loading
              ? 'Kayıt oluşturuluyor...'
              : isStudentProgram
                ? BRAND_STUDENT_CINEMA.registerCta
                : 'Yapımcı Hesabı Oluştur'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-sineoda-muted">
          Zaten hesabınız var mı?{' '}
          <Link to="/creator/giris" className="text-sineoda-gold hover:underline">
            Giriş yap
          </Link>
        </p>
      </div>
    </div>
  )
}
