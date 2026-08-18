export function browseScrollKey(pathname: string, search: string) {
  return `browse-scroll:${pathname}${search}`
}

export function saveBrowseScroll(pathname: string, search: string) {
  sessionStorage.setItem(browseScrollKey(pathname, search), String(window.scrollY))
}

export function restoreBrowseScroll(pathname: string, search: string) {
  const key = browseScrollKey(pathname, search)
  const saved = sessionStorage.getItem(key)
  if (saved === null) return

  sessionStorage.removeItem(key)
  const y = Number(saved)
  if (!Number.isFinite(y)) return

  const apply = () => window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior })
  requestAnimationFrame(apply)
  window.setTimeout(apply, 50)
  window.setTimeout(apply, 200)
}
