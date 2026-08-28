import { useEffect, useState } from 'react'
import { isTvDevice } from '../utils/tvDevice'

export function useTvMode() {
  const [tv, setTv] = useState(() => isTvDevice())

  useEffect(() => {
    const apply = () => {
      const next = isTvDevice()
      setTv(next)
      document.documentElement.dataset.device = next ? 'tv' : 'desktop'
      if (next) document.documentElement.dataset.tv = 'true'
      else delete document.documentElement.dataset.tv
    }

    apply()
    window.addEventListener('resize', apply)
    return () => {
      window.removeEventListener('resize', apply)
      delete document.documentElement.dataset.device
      delete document.documentElement.dataset.tv
    }
  }, [])

  return tv
}
