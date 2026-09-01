import { useEffect } from 'react'

/** İlk React render'ında boot spinner'ı "ready" olarak işaretler. */
export function BootMarker() {
  useEffect(() => {
    document.getElementById('root')?.setAttribute('data-plooy-boot', 'ready')
  }, [])

  return null
}
