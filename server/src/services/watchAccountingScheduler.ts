import { ensureMonthlyRollover, monthKey } from './watchAccounting.js'

const ISTANBUL_TZ = 'Europe/Istanbul'
const CHECK_INTERVAL_MS = 15 * 60 * 1000

function istanbulNowParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ISTANBUL_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
  }
}

function msUntilNextIstanbulRollover(date = new Date()) {
  let candidate = date.getTime() + 60_000
  for (let step = 0; step < 48 * 60; step += 1) {
    const probe = new Date(candidate)
    const parts = istanbulNowParts(probe)
    if (parts.hour === 0 && parts.minute === 5 && probe.getTime() > date.getTime() + 1000) {
      return probe.getTime() - date.getTime()
    }
    candidate += 60_000
  }
  return 60 * 60 * 1000
}

function runRollover(reason: string) {
  try {
    const result = ensureMonthlyRollover()
    if (result.finalizedMonths.length > 0) {
      console.log(
        `[watch-accounting] ${reason}: kapandi=[${result.finalizedMonths.join(', ')}], aktif=${result.currentMonth}`,
      )
    }
    return result
  } catch (error) {
    console.error(`[watch-accounting] ${reason} failed:`, error)
    return null
  }
}

export function startWatchAccountingScheduler() {
  let lastKnownMonth = monthKey()

  runRollover('startup')

  const interval = setInterval(() => {
    const current = monthKey()
    if (current !== lastKnownMonth) {
      const result = runRollover('ay-degisti')
      if (result) lastKnownMonth = result.currentMonth
      return
    }
    runRollover('periyodik')
  }, CHECK_INTERVAL_MS)

  if (typeof interval.unref === 'function') {
    interval.unref()
  }

  const scheduleDaily = () => {
    const delay = msUntilNextIstanbulRollover()
    const timer = setTimeout(() => {
      const result = runRollover('gunluk-0005-istanbul')
      if (result) lastKnownMonth = result.currentMonth
      scheduleDaily()
    }, delay)
    if (typeof timer.unref === 'function') {
      timer.unref()
    }
  }

  scheduleDaily()
  console.log('[watch-accounting] zamanlayici aktif (15 dk + gunluk 00:05 Europe/Istanbul)')
}
