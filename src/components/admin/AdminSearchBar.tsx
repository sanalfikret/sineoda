interface AdminSearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  resultCount?: number
  totalCount?: number
}

export function AdminSearchBar({
  value,
  onChange,
  placeholder = 'Ara...',
  resultCount,
  totalCount,
}: AdminSearchBarProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative max-w-xl flex-1">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-plooy-muted"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path d="M20 20L16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-white/10 bg-[#0d0f14] py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-plooy-gold"
        />
      </div>
      {resultCount !== undefined && totalCount !== undefined && (
        <p className="text-sm text-plooy-muted">
          {resultCount} / {totalCount} sonuç
        </p>
      )}
    </div>
  )
}
