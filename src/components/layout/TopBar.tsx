import { useEffect, useRef, useState } from 'react'
import { Separator, Tooltip } from 'radix-ui'
import { Search, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSystemHealth, type HealthStatus } from '@/context/SystemHealthContext'

// ─── Time range ───────────────────────────────────────────────────────────────

type TimeRange = '5m' | '1h' | '24h'

const TIME_RANGES: { label: string; value: TimeRange; title: string }[] = [
  { label: '5m',  value: '5m',  title: 'Last 5 minutes' },
  { label: '1h',  value: '1h',  title: 'Last 1 hour' },
  { label: '24h', value: '24h', title: 'Last 24 hours' },
]

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<HealthStatus, { dot: string; pill: string; label: string }> = {
  healthy:  { dot: 'bg-green-500',                        pill: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20', label: 'All Healthy'      },
  degraded: { dot: 'bg-yellow-500 animate-pulse',         pill: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20', label: 'Degraded'    },
  down:     { dot: 'bg-red-500 animate-pulse',            pill: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20', label: 'Incident Active' },
  loading:  { dot: 'bg-muted-foreground/40 animate-pulse',pill: 'bg-muted/60 text-muted-foreground border-border',                label: 'Connecting…'     },
  error:    { dot: 'bg-muted-foreground/30',              pill: 'bg-muted/60 text-muted-foreground border-border',                label: 'API Offline'     },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SearchBar() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)

  // ⌘K / Ctrl+K → focus search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        inputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-1.5 transition-all duration-200',
        'w-56 sm:w-72',
        focused
          ? 'border-ring bg-background ring-2 ring-ring/25'
          : 'border-input hover:border-ring/50 hover:bg-muted/60'
      )}
    >
      <Search size={13} className="shrink-0 text-muted-foreground" />
      <input
        ref={inputRef}
        type="text"
        placeholder="Search services, incidents…"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="flex-1 min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
      />
      {!focused && (
        <kbd className="hidden sm:flex items-center gap-px rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground shadow-sm">
          ⌘K
        </kbd>
      )}
    </div>
  )
}

function TimeRangeSelector() {
  const [active, setActive] = useState<TimeRange>('1h')

  return (
    <div
      role="group"
      aria-label="Time range"
      className="flex items-center rounded-md border border-input bg-muted/40 p-0.5"
    >
      {TIME_RANGES.map(({ label, value, title }) => (
        <Tooltip.Root key={value} delayDuration={600}>
          <Tooltip.Trigger asChild>
            <button
              aria-label={title}
              aria-pressed={active === value}
              onClick={() => setActive(value)}
              className={cn(
                'rounded px-2.5 py-1 text-xs font-medium transition-all duration-150 outline-none',
                'focus-visible:ring-2 focus-visible:ring-ring',
                active === value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {label}
            </button>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              sideOffset={8}
              className={cn(
                'z-50 rounded-md border border-border bg-popover px-2 py-1 text-xs text-foreground shadow-md',
                'animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95'
              )}
            >
              {title}
              <Tooltip.Arrow className="fill-border" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      ))}
    </div>
  )
}

function LiveStatusPill() {
  const { status, summary } = useSystemHealth()
  const { dot, pill, label } = STATUS_CFG[status]

  const sub =
    status === 'down'     ? `${summary?.downServices ?? 0} down`
    : status === 'degraded' ? `${summary?.activeAnomalies ?? 0} anomal${summary?.activeAnomalies === 1 ? 'y' : 'ies'}`
    : status === 'healthy'  ? `${summary?.healthyServices ?? 0} services`
    : ''

  return (
    <Tooltip.Root delayDuration={400}>
      <Tooltip.Trigger asChild>
        <div
          aria-label={`System status: ${label}`}
          className={cn(
            'flex cursor-default items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
            pill
          )}
        >
          {/* dot */}
          <span className="relative flex h-1.5 w-1.5 items-center justify-center">
            {(status === 'down' || status === 'degraded') && (
              <span
                className={cn(
                  'absolute h-2.5 w-2.5 rounded-full opacity-30 animate-ping',
                  status === 'down' ? 'bg-red-500' : 'bg-yellow-500'
                )}
              />
            )}
            <span className={cn('relative h-1.5 w-1.5 rounded-full', dot)} />
          </span>
          <span className="hidden sm:inline">{label}</span>
        </div>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          sideOffset={8}
          className={cn(
            'z-50 rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md',
            'animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95'
          )}
        >
          <p className="font-semibold text-foreground">{label}</p>
          {sub && <p className="text-muted-foreground mt-0.5">{sub}</p>}
          <Tooltip.Arrow className="fill-border" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

function RefreshIndicator() {
  const { status } = useSystemHealth()

  return (
    <Tooltip.Root delayDuration={600}>
      <Tooltip.Trigger asChild>
        <div
          aria-label="Auto-refreshing every 15 seconds"
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-default"
        >
          <RefreshCw
            size={13}
            className={cn(status === 'loading' && 'animate-spin')}
          />
        </div>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          sideOffset={8}
          className={cn(
            'z-50 rounded-md border border-border bg-popover px-2 py-1 text-xs text-foreground shadow-md',
            'animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95'
          )}
        >
          Auto-refreshing every 15s
          <Tooltip.Arrow className="fill-border" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

export function TopBar() {
  return (
    <Tooltip.Provider>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">

        {/* Search */}
        <SearchBar />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Time range */}
        <TimeRangeSelector />

        {/* Divider */}
        <Separator.Root
          orientation="vertical"
          decorative
          className="h-5 w-px shrink-0 bg-border"
        />

        {/* Refresh indicator */}
        <RefreshIndicator />

        {/* Divider */}
        <Separator.Root
          orientation="vertical"
          decorative
          className="h-5 w-px shrink-0 bg-border"
        />

        {/* Live status */}
        <LiveStatusPill />

      </header>
    </Tooltip.Provider>
  )
}
