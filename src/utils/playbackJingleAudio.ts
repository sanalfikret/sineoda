import { PLAYBACK_JINGLE_MS, PLAYBACK_JINGLE_SRC } from '../constants/playback'

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

/** MP3 yoksa geçici placeholder — public/brand/plooy-jingle.mp3 eklenince otomatik o çalar */
async function playProceduralFallback(durationMs: number) {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) {
      await wait(durationMs)
      return
    }

    const ctx = new AudioCtx()
    const master = ctx.createGain()
    master.gain.value = 0.22
    master.connect(ctx.destination)

    const notes = [
      { freq: 196, at: 0, dur: 0.55 },
      { freq: 262, at: 0.42, dur: 0.75 },
      { freq: 392, at: 1.05, dur: 1.4 },
    ]

    for (const note of notes) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = note.freq
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + note.at)
      gain.gain.exponentialRampToValueAtTime(0.9, ctx.currentTime + note.at + 0.08)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + note.at + note.dur)
      osc.connect(gain)
      gain.connect(master)
      osc.start(ctx.currentTime + note.at)
      osc.stop(ctx.currentTime + note.at + note.dur + 0.05)
    }

    await wait(Math.min(durationMs, 2800))
    await ctx.close().catch(() => undefined)
    const remaining = durationMs - 2800
    if (remaining > 0) await wait(remaining)
  } catch {
    await wait(durationMs)
  }
}

export async function playPlaybackJingle(durationMs = PLAYBACK_JINGLE_MS) {
  const audio = new Audio(PLAYBACK_JINGLE_SRC)
  audio.preload = 'auto'

  const canPlay = await new Promise<boolean>((resolve) => {
    const fail = () => resolve(false)
    audio.addEventListener('canplaythrough', () => resolve(true), { once: true })
    audio.addEventListener('error', fail, { once: true })
    window.setTimeout(fail, 2500)
    audio.load()
  })

  if (canPlay) {
    try {
      await audio.play()
      await new Promise<void>((resolve) => {
        let done = false
        const finish = () => {
          if (done) return
          done = true
          audio.pause()
          resolve()
        }
        audio.addEventListener('ended', finish, { once: true })
        window.setTimeout(finish, durationMs)
      })
      return
    } catch {
      audio.pause()
    }
  }

  await playProceduralFallback(durationMs)
}
