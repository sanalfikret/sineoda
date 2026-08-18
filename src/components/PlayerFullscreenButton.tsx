interface PlayerFullscreenButtonProps {
  isFullscreen: boolean
  onClick: () => void
}

export function PlayerFullscreenButton({ isFullscreen, onClick }: PlayerFullscreenButtonProps) {
  return (
    <button
      type="button"
      aria-label={isFullscreen ? 'Tam ekrandan çık' : 'Tam ekran'}
      onClick={onClick}
      className="rounded-full p-2 text-white transition hover:bg-white/10"
    >
      {isFullscreen ? <ExitFullscreenIcon /> : <EnterFullscreenIcon />}
    </button>
  )
}

function EnterFullscreenIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 3H5a2 2 0 00-2 2v3M21 8V5a2 2 0 00-2-2h-3M16 21h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ExitFullscreenIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 9H5V5M15 5h4v4M15 15h4v4M9 19H5v-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
