import { useEffect } from 'react'
import { isTvDevice } from '../utils/tvDevice'

function getRowFocusables(row: HTMLElement) {
  return Array.from(
    row.querySelectorAll<HTMLElement>(
      'a[href]:not([tabindex="-1"]), button:not([disabled]):not([tabindex="-1"]), [tabindex="0"]:not([disabled])',
    ),
  ).filter((el) => !el.closest('[aria-hidden="true"]'))
}

/** Kumanda ok tuşları — satırlar arası ve kartlar arası odak gezintisi. */
export function useTvBrowseNav() {
  useEffect(() => {
    if (!isTvDevice()) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return

      const target = event.target
      if (!(target instanceof HTMLElement)) return

      const row = target.closest('[data-tv-row]')
      if (!(row instanceof HTMLElement)) return

      const rows = Array.from(document.querySelectorAll<HTMLElement>('[data-tv-row]'))
      const rowIndex = rows.indexOf(row)
      if (rowIndex === -1) return

      const focusables = getRowFocusables(row)
      const index = focusables.indexOf(target)
      if (index === -1) return

      const focusAt = (element: HTMLElement) => {
        element.focus({ preventScroll: true })
        element.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' })
      }

      if (event.key === 'ArrowRight' && index < focusables.length - 1) {
        event.preventDefault()
        focusAt(focusables[index + 1])
        return
      }

      if (event.key === 'ArrowLeft' && index > 0) {
        event.preventDefault()
        focusAt(focusables[index - 1])
        return
      }

      if (event.key === 'ArrowDown' && rowIndex < rows.length - 1) {
        event.preventDefault()
        const nextRow = getRowFocusables(rows[rowIndex + 1])
        const nextIndex = Math.min(index, Math.max(nextRow.length - 1, 0))
        if (nextRow[nextIndex]) focusAt(nextRow[nextIndex])
        return
      }

      if (event.key === 'ArrowUp' && rowIndex > 0) {
        event.preventDefault()
        const prevRow = getRowFocusables(rows[rowIndex - 1])
        const prevIndex = Math.min(index, Math.max(prevRow.length - 1, 0))
        if (prevRow[prevIndex]) focusAt(prevRow[prevIndex])
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [])
}
