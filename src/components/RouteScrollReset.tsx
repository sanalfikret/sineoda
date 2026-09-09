import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'

export function scrollPageTop() {
  window.scrollTo({top:0,left:0,behavior:'instant'})
}

/** All route entries, including same-page navigation, start at the destination. */
export function RouteScrollReset() {
  const location = useLocation()
  useLayoutEffect(() => {
    const previous = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    return () => { window.history.scrollRestoration = previous }
  }, [])
  useLayoutEffect(() => {
    if (location.hash) {
      const frame = requestAnimationFrame(() => {
        let id = location.hash.slice(1)
        try { id = decodeURIComponent(id) } catch { /* use literal malformed hash */ }
        const target = document.getElementById(id)
        if (target) target.scrollIntoView({behavior:'instant',block:'start'})
        else scrollPageTop()
      })
      return () => cancelAnimationFrame(frame)
    }
    scrollPageTop()
  }, [location.key,location.pathname,location.search,location.hash])
  return null
}
