function normalizeNewlines(content: string) {
  return content.replace(/\uFEFF/g, '').replace(/\r\n/g, '\n').trim()
}

export function srtToVtt(content: string) {
  const normalized = normalizeNewlines(content)
  if (!normalized) return 'WEBVTT\n\n'

  const blocks = normalized.split(/\n{2,}/)
  const cues: string[] = []

  for (const block of blocks) {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean)
    if (lines.length < 2) continue

    let timeIndex = 0
    if (/^\d+$/.test(lines[0])) timeIndex = 1

    const timeLine = lines[timeIndex]
    if (!timeLine?.includes('-->')) continue

    const vttTime = timeLine.replace(/,/g, '.')
    const text = lines.slice(timeIndex + 1).join('\n')
    cues.push(`${vttTime}\n${text}`)
  }

  return `WEBVTT\n\n${cues.join('\n\n')}\n`
}

export function subtitleToVtt(content: string, filename: string) {
  const ext = filename.toLowerCase().endsWith('.srt') ? 'srt' : 'vtt'
  if (ext === 'srt') return srtToVtt(content)
  return content.startsWith('WEBVTT') ? content : `WEBVTT\n\n${content}`
}
