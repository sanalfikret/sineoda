import { useLegalDocuments } from '../../hooks/useLegalDocuments'
import { useLocalizedLegalDocuments } from '../../i18n/useLegalLocale'
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchFilmSchools, fetchBillingPlans, uploadStudentId, type BillingPlan } from '../../api/client'
import { CreatorAuthLayout } from '../../components/creator/CreatorAuthLayout'
import { PlooyLogo } from '../../components/PlooyLogo'
import { useAuth } from '../../context/AuthContext'
import { BRAND_STUDENT_CINEMA, BRAND_NAME } from '../../constants/brand'
import { useLocale } from '../../i18n/LocaleContext'
import {
  findCreatorRegistrationPlan,
  formatPlanRegistrationNotice,
} from '../../utils/planRegistrationNotice'

export function CreatorRegisterPage() {
  const legal = useLegalDocuments()
  const {documents} = useLocalizedLegalDocuments(legal.documents)
  const { t } = useTranslation('creator', { keyPrefix: 'register' })
  const { locale, localizePath } = useLocale()
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
  const [filmLink, setFilmLink] = useState('')
  const [bio, setBio] = useState('')
  const [schoolId, setSchoolId] = useState('')
  const [studentApplicationType,setStudentApplicationType]=useState<'individual'|'school'|''>('')
  const [studentDepartment,setStudentDepartment]=useState('')
  const [studentUniversity,setStudentUniversity]=useState('')
  const [schoolSearch,setSchoolSearch]=useState('')
  const [schools, setSchools] = useState<Array<{ id: string; name: string }>>([])
  const [studentIdFile, setStudentIdFile] = useState<File | null>(null)
  const [studentIdPreview, setStudentIdPreview] = useState('')
  const [acceptLegal, setAcceptLegal] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [registrationPlan, setRegistrationPlan] = useState<BillingPlan | null>(null)

  useEffect(() => {
    void fetchBillingPlans()
      .then(({ plans }) => {
        const program = isStudentProgram ? 'student_cinema' : 'standard'
        setRegistrationPlan(findCreatorRegistrationPlan(plans, program))
      })
      .catch(() => setRegistrationPlan(null))
  }, [isStudentProgram])

  useEffect(() => {
    if (!isStudentProgram) return
    void fetchFilmSchools()
      .then((data) => setSchools(data.schools))
      .catch(() => setSchools([]))
  }, [isStudentProgram])

  const selectableSchools = schools.filter(s=>s.id.startsWith('yok-') || s.id==='diger' || !schools.some(v=>v.id.startsWith('yok-')))
  const filteredSchools = selectableSchools.filter(s=>s.id===schoolId || s.name.toLocaleLowerCase('tr').includes(schoolSearch.toLocaleLowerCase('tr')))
  const registrationPrice =
    registrationPlan?.price ?? (isStudentProgram ? 49 : 69)
  const feeNoticeText = formatPlanRegistrationNotice(
    registrationPlan?.registrationNotice,
    { price: registrationPrice, brand: BRAND_NAME },
    t(isStudentProgram ? 'feeNoticeStudent' : 'feeNoticeStandard', {
      price: registrationPrice,
      brand: BRAND_NAME,
    }),
  )

  if (!isLoading && isCreator) {
    return <Navigate to={localizePath('/creator')} replace />
  }

  const handleStudentIdChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    setStudentIdFile(file)
    setStudentIdPreview(file ? file.name : '')
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!acceptLegal) {
      setError(t('errors.legalRequired'))
      return
    }
    if (isStudentProgram && !schoolId) {
      setError(t('errors.schoolRequired'))
      return
    }
    if (isStudentProgram && !phone.trim()) {
      setError(t('errors.phoneRequired'))
      return
    }
    if (isStudentProgram && !projectCrew.trim()) {
      setError(t('errors.crewRequired'))
      return
    }
    if (isStudentProgram && !filmLink.trim()) {
      setError(t('errors.filmLinkRequired'))
      return
    }
    if (isStudentProgram && !studentIdFile) {
      setError(t('errors.studentIdRequired'))
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
        studentApplicationType: isStudentProgram && studentApplicationType ? studentApplicationType : undefined,
        studentDepartment: isStudentProgram ? studentDepartment : undefined,
        studentUniversity: isStudentProgram ? studentUniversity : undefined,
        phone: isStudentProgram ? phone : undefined,
        projectCrew: isStudentProgram ? projectCrew : undefined,
        filmLink: isStudentProgram ? filmLink : undefined,
        studentIdFileUrl,
      })
      navigate(
        isStudentProgram
          ? `${localizePath('/creator/odeme')}?checkout=1`
          : localizePath('/creator'),
        { replace: true },
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.signupFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <CreatorAuthLayout backTo={localizePath('/creator/giris')}>
      <div className="px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-8 flex items-center gap-3">
          <PlooyLogo tone="on-dark" linked linkTo={localizePath('/')} className="h-8" />
          <div>
            <h1 className="text-2xl font-bold text-white">
              {isStudentProgram ? t('titleStudent') : t('titleStandard')}
            </h1>
            <p className="text-sm text-plooy-muted">
              {isStudentProgram
                ? t('subtitleStudent')
                : t('subtitleStandard', { brand: BRAND_NAME })}
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
          {isStudentProgram && <div className="space-y-4">
            <fieldset className="space-y-3"><legend>{locale==='en'?'Application type':'Başvuru türü'}</legend>
              {(['individual','school'] as const).map(value=><label key={value} className="flex gap-3 rounded-lg border border-white/20 p-3"><input required type="radio" name="studentApplicationType" value={value} checked={studentApplicationType===value} onChange={()=>setStudentApplicationType(value)}/>{value==='individual'?(locale==='en'?'Individual Student Application':'Bireysel Öğrenci Başvurusu'):(locale==='en'?'School Application':'Okul Üzerinden Başvuru')}</label>)}
            </fieldset>
            <p className="text-sm text-plooy-muted">{studentApplicationType==='individual'?(locale==='en'?'Your submission is reviewed directly by Plooy. School approval is not required.':'Başvurunu doğrudan Plooy inceler. Okul onayı gerekmez.'):(locale==='en'?'School applications require school approval before Plooy publication review.':'Okul üzerinden başvurularda yayın incelemesinden önce okul onayı gerekir.')}</p>
            <label className="block">{locale==='en'?'Search university':'Üniversite ara'}<input className="w-full rounded bg-[#0d0f14] p-3" value={schoolSearch} onChange={e=>setSchoolSearch(e.target.value)}/></label>
            <select aria-label={locale==='en'?'University':'Üniversite'} required className="w-full rounded bg-[#0d0f14] p-3" value={schoolId} onChange={e=>setSchoolId(e.target.value)}><option value="">{locale==='en'?'Choose university':'Üniversite seçin'}</option>{filteredSchools.map(s=><option key={s.id} value={s.id}>{s.id==='diger'?(locale==='en'?'My university is not listed':'Üniversitem listede yok'):s.name}</option>)}</select>
            {schoolId==='diger'&&<input required aria-label="University name" maxLength={250} className="w-full rounded bg-[#0d0f14] p-3" placeholder={locale==='en'?'University name':'Üniversite adı'} value={studentUniversity} onChange={e=>setStudentUniversity(e.target.value)}/>}
            <label className="block">{locale==='en'?'Department':'Bölüm'}<input required list="student-departments" maxLength={200} className="w-full rounded bg-[#0d0f14] p-3" value={studentDepartment} onChange={e=>setStudentDepartment(e.target.value)} placeholder={locale==='en'?'Select or type your department':'Bölüm seçin veya yazın'}/></label>
            <datalist id="student-departments">{(locale==='en'?['Radio, Television and Cinema','New Media','Visual Communication Design','Animation','Cinema and Television']:['Radyo, Televizyon ve Sinema','Yeni Medya','Görsel İletişim Tasarımı','Animasyon','Sinema ve Televizyon']).map(v=><option key={v} value={v}/>)}</datalist>
          </div>}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm text-white/90">{t('nameLabel')}</span>
              <input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-3 text-white outline-none focus:border-plooy-gold"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm text-white/90">
                {isStudentProgram ? t('studioLabelStudent') : t('studioLabelStandard')}
              </span>
              <input
                required
                value={studioName}
                onChange={(event) => setStudioName(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-3 text-white outline-none focus:border-plooy-gold"
              />
            </label>
          </div>

          {isStudentProgram && (
            <>
              <label className="block">
                <span className="mb-1.5 block text-sm text-white/90">{t('phoneLabel')}</span>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder={t('phonePlaceholder')}
                  className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-3 text-white outline-none focus:border-emerald-400"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm text-white/90">{t('crewLabel')}</span>
                <textarea
                  required
                  rows={4}
                  value={projectCrew}
                  onChange={(event) => setProjectCrew(event.target.value)}
                  placeholder={t('crewPlaceholder')}
                  className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-3 text-white outline-none focus:border-emerald-400"
                />
                <span className="mt-1.5 block text-xs text-white/40">{t('crewHint')}</span>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm text-white/90">{t('filmLinkLabel')}</span>
                <input
                  type="url"
                  required
                  value={filmLink}
                  onChange={(event) => setFilmLink(event.target.value)}
                  placeholder={t('filmLinkPlaceholder')}
                  className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-3 text-white outline-none focus:border-emerald-400"
                />
                <span className="mt-1.5 block text-xs text-white/40">{t('filmLinkHint')}</span>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm text-white/90">{t('studentIdLabel')}</span>
                <input
                  type="file"
                  required
                  accept=".pdf,.doc,.docx"
                  onChange={handleStudentIdChange}
                  className="w-full rounded-lg border border-dashed border-white/15 bg-[#0d0f14] px-4 py-3 text-sm text-white/80 file:mr-4 file:rounded-md file:border-0 file:bg-emerald-500 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[#07110d]"
                />
                {studentIdPreview && (
                  <span className="mt-1.5 block text-xs text-emerald-300/80">{studentIdPreview}</span>
                )}
                <span className="mt-1.5 block text-xs text-white/40">{t('studentIdHint')}</span>
              </label>
            </>
          )}

          <label className="block">
            <span className="mb-1.5 block text-sm text-white/90">{t('emailLabel')}</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-3 text-white outline-none focus:border-plooy-gold"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm text-white/90">{t('passwordLabel')}</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-3 text-white outline-none focus:border-plooy-gold"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm text-white/90">{t('bioLabel')}</span>
            <textarea
              rows={3}
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-3 text-white outline-none focus:border-plooy-gold"
            />
          </label>

          <div
            className={`rounded-xl border px-4 py-4 text-sm text-white/85 ${
              isStudentProgram
                ? 'border-emerald-500/25 bg-emerald-500/5'
                : 'border-plooy-gold/25 bg-plooy-gold/5'
            }`}
          >
            {feeNoticeText}
          </div>

          <div className="rounded-xl border border-white/10 bg-[#0d0f14] p-4">
            <p className="text-sm font-medium text-white">{t('legalHeading')}</p>
            <pre className="mt-3 max-h-48 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-plooy-muted">
              {documents['yapimci-sozlesmesi'].title + '\n\n' + documents['yapimci-sozlesmesi'].sections.map(s=>s.heading+'\n'+s.body).join('\n\n')}
            </pre>
            <label className="mt-4 flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={acceptLegal}
                onChange={(event) => setAcceptLegal(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-white/20 accent-plooy-gold"
              />
              <span className="text-sm text-white/90">{t('legalAccept')}</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full rounded-lg py-3 text-sm font-semibold disabled:opacity-60 ${
              isStudentProgram
                ? 'bg-emerald-500 text-[#07110d]'
                : 'bg-plooy-gold text-plooy-bg'
            }`}
          >
            {loading
              ? t('submitting')
              : isStudentProgram
                ? t('submitStudent')
                : t('submitStandard')}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-plooy-muted">
          {t('hasAccount')}{' '}
          <Link to={localizePath('/creator/giris')} className="text-plooy-gold hover:underline">
            {t('loginLink')}
          </Link>
        </p>
      </div>
      </div>
    </CreatorAuthLayout>
  )
}
