interface AdminCekimNotlariPublishButtonProps {
  published: boolean
  loading?: boolean
  onClick: () => void
}

export function AdminCekimNotlariPublishButton({
  published,
  loading = false,
  onClick,
}: AdminCekimNotlariPublishButtonProps) {
  if (published) {
    return (
      <button
        type="button"
        disabled={loading}
        onClick={onClick}
        className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-200 hover:bg-amber-500/20 disabled:opacity-50"
      >
        {loading ? '...' : 'Yayından Al'}
      </button>
    )
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      className="rounded-md bg-emerald-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-400 disabled:opacity-50"
    >
      {loading ? '...' : 'Yayınla'}
    </button>
  )
}
