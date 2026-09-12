import { useEffect, useState, type FormEvent } from 'react'
import {
  bulkGiftAdminSubscription,
  fetchAdminGiftHistory,
  giftAdminUserSubscription,
  type GiftAudience,
  type GiftHistoryEntry,
} from '../../api/client'

const PRESETS = [1, 3, 6, 12]
const inputClass =
  'rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-sm text-white outline-none focus:border-plooy-gold'

function clampMonths(value: number) {
  return Math.max(1, Math.min(36, Math.round(value) || 1))
}

export function formatExpiry(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function membershipState(expiresAt: string | null | undefined, status?: string | null) {
  if (!expiresAt) return { label: status === 'active' ? 'Aktif (süresiz)' : 'Üyelik yok', active: status === 'active' }
  const active = new Date(expiresAt) > new Date()
  return { label: active ? `Aktif · bitiş ${formatExpiry(expiresAt)}` : `Süresi doldu · ${formatExpiry(expiresAt)}`, active }
}

interface MembershipGiftFormProps {
  userId: string
  currentExpiresAt?: string | null
  currentStatus?: string | null
  compact?: boolean
  onGranted?: (expiresAt: string) => void | Promise<void>
}

/** Tek kişiye üyelik ekleme (izleyici veya yapımcı). */
export function MembershipGiftForm({ userId, currentExpiresAt, currentStatus, compact, onGranted }: MembershipGiftFormProps) {
  const [months, setMonths] = useState(1)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [history, setHistory] = useState<GiftHistoryEntry[]>([])
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    setNotice('')
    setError('')
    setShowHistory(false)
    setHistory([])
  }, [userId])

  const loadHistory = async () => {
    try {
      const { history: entries } = await fetchAdminGiftHistory(userId)
      setHistory(entries)
    } catch {
      setHistory([])
    }
  }

  const submit = async (event?: FormEvent) => {
    event?.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const { gift } = await giftAdminUserSubscription(userId, months, note)
      setNotice(`${months} ay eklendi. Yeni bitiş: ${formatExpiry(gift.expiresAt)}. Üyeye bildirim gönderildi.`)
      setNote('')
      if (showHistory) void loadHistory()
      if (onGranted) await onGranted(gift.expiresAt)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Üyelik uzatılamadı.')
    } finally {
      setBusy(false)
    }
  }

  const state = membershipState(currentExpiresAt, currentStatus)

  return (
    <section className={`space-y-3 ${compact ? '' : 'rounded-xl border border-white/10 bg-[#0d0f14] p-4'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-white">Üyelik uzat / hediye ver</h3>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${state.active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>
          {state.label}
        </span>
      </div>
      <p className="text-xs text-plooy-muted">Aktif üyelikte bitişin üstüne eklenir; süresi dolmuşsa bugünden başlar.</p>
      <form onSubmit={(event) => void submit(event)} className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setMonths(preset)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                months === preset ? 'bg-plooy-gold text-plooy-bg' : 'border border-plooy-gold/40 text-plooy-gold hover:bg-plooy-gold/10'
              }`}
            >
              +{preset} ay
            </button>
          ))}
          <label className="flex items-center gap-2 text-xs text-plooy-muted">
            Özel:
            <input
              type="number"
              min={1}
              max={36}
              value={months}
              onChange={(event) => setMonths(clampMonths(Number(event.target.value)))}
              className={`${inputClass} w-20`}
            />
            ay
          </label>
        </div>
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Not (isteğe bağlı, örn. Kampanya hediyesi)"
          maxLength={200}
          className={`${inputClass} w-full`}
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-plooy-gold px-4 py-2 text-sm font-semibold text-plooy-bg disabled:opacity-60"
          >
            {busy ? 'Ekleniyor…' : `${months} ay ekle`}
          </button>
          <button
            type="button"
            onClick={() => {
              const next = !showHistory
              setShowHistory(next)
              if (next) void loadHistory()
            }}
            className="text-xs text-plooy-gold hover:underline"
          >
            {showHistory ? 'Geçmişi gizle' : 'Hediye geçmişi'}
          </button>
        </div>
      </form>
      {notice && <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">{notice}</p>}
      {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
      {showHistory && (
        <ul className="space-y-1 text-xs">
          {history.length === 0 && <li className="text-plooy-muted">Henüz hediye kaydı yok.</li>}
          {history.map((entry) => (
            <li key={entry.id} className="flex flex-wrap justify-between gap-2 text-white/80">
              <span>
                +{entry.months} ay{entry.note ? ` · ${entry.note}` : ''}
                {entry.grantedBy ? <span className="text-plooy-muted"> · {entry.grantedBy}</span> : null}
              </span>
              <span className="text-plooy-muted">
                {new Date(entry.createdAt).toLocaleString('tr-TR')} → {formatExpiry(entry.expiresAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

interface BulkMembershipGiftBarProps {
  audiences: Array<{ id: GiftAudience; label: string }>
  selectedIds: string[]
  onClearSelection: () => void
  onDone?: () => void | Promise<void>
}

/** Toplu üyelik uzatma: kitle seçimi veya listeden işaretlenenler. */
export function BulkMembershipGiftBar({ audiences, selectedIds, onClearSelection, onDone }: BulkMembershipGiftBarProps) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'selected' | GiftAudience>(audiences[0]?.id ?? 'viewers_all')
  const [months, setMonths] = useState(1)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (selectedIds.length > 0) {
      setMode('selected')
      setOpen(true)
    } else if (mode === 'selected') {
      setMode(audiences[0]?.id ?? 'viewers_all')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds.length])

  const targetLabel = mode === 'selected' ? `seçili ${selectedIds.length} kişi` : audiences.find((a) => a.id === mode)?.label ?? ''

  const run = async () => {
    if (busy) return
    if (mode === 'selected' && selectedIds.length === 0) {
      setError('Listeden en az bir kişi işaretleyin.')
      return
    }
    if (!window.confirm(`${targetLabel} için ${months} ay üyelik eklensin mi? Her kişiye bildirim gönderilir.`)) return
    setBusy(true)
    setError('')
    setResult('')
    try {
      const response = await bulkGiftAdminSubscription({
        months,
        note,
        ...(mode === 'selected' ? { userIds: selectedIds } : { audience: mode }),
      })
      setResult(
        `${response.granted} kişiye ${months} ay eklendi` +
          (response.skipped.length > 0 ? ` · ${response.skipped.length} atlandı (${response.skipped[0]?.reason ?? ''})` : '') +
          '.',
      )
      setNote('')
      if (mode === 'selected') onClearSelection()
      if (onDone) await onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Toplu uzatma yapılamadı.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl border border-plooy-gold/25 bg-plooy-gold/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-white">Toplu üyelik uzat</p>
          <p className="text-xs text-plooy-muted">
            Kitle seçin veya listeden kişileri işaretleyin{selectedIds.length > 0 ? ` · ${selectedIds.length} kişi seçili` : ''}.
          </p>
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <button type="button" onClick={onClearSelection} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:bg-white/5">
              Seçimi temizle
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="rounded-lg border border-plooy-gold/40 bg-plooy-gold/10 px-3 py-1.5 text-xs font-semibold text-plooy-gold hover:bg-plooy-gold/20"
          >
            {open ? 'Kapat' : 'Aç'}
          </button>
        </div>
      </div>
      {open && (
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_120px_1fr_auto]">
          <select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)} className={inputClass}>
            <option value="selected">Listeden seçilenler ({selectedIds.length})</option>
            {audiences.map((audience) => (
              <option key={audience.id} value={audience.id}>
                {audience.label}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-xs text-plooy-muted">
            <input
              type="number"
              min={1}
              max={36}
              value={months}
              onChange={(event) => setMonths(clampMonths(Number(event.target.value)))}
              className={`${inputClass} w-20`}
            />
            ay
          </label>
          <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Not (isteğe bağlı)" maxLength={200} className={inputClass} />
          <button
            type="button"
            disabled={busy}
            onClick={() => void run()}
            className="rounded-lg bg-plooy-gold px-4 py-2 text-sm font-semibold text-plooy-bg disabled:opacity-60"
          >
            {busy ? 'Uygulanıyor…' : 'Uygula'}
          </button>
        </div>
      )}
      {result && <p className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">{result}</p>}
      {error && <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
    </div>
  )
}
