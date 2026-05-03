import { NavLink } from 'react-router-dom'
import { Tooltip, Separator } from 'radix-ui'
import {
  LayoutDashboard,
  Server,
  Siren,
  AlertTriangle,
  Lightbulb,
  Settings2,
  Circle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSystemHealth, type HealthStatus } from '@/context/SystemHealthContext'
import type { DashboardSummary } from '@/types'

// ─── Types ───────────────────────────────────────────────────────────────────

interface NavItem {
  to: string
  label: string
  description: string
  icon: React.ElementType
  end?: boolean
  badge?: (s: DashboardSummary) => number
}

// ─── Nav config ──────────────────────────────────────────────────────────────

const mainNav: NavItem[] = [
  {
    to: '/',
    label: 'Dashboard',
    description: 'Live system overview',
    icon: LayoutDashboard,
    end: true,
  },
  {
    to: '/services',
    label: 'Services',
    description: 'Manage monitored services',
    icon: Server,
  },
  {
    to: '/incidents',
    label: 'Incidents',
    description: 'Active and resolved outages',
    icon: Siren,
    badge: (s) => s.activeIncidents,
  },
  {
    to: '/anomalies',
    label: 'Anomalies',
    description: 'Detected performance degradations',
    icon: AlertTriangle,
    badge: (s) => s.activeAnomalies,
  },
  {
    to: '/insights',
    label: 'Insights',
    description: 'Auto-generated system intelligence',
    icon: Lightbulb,
  },
]

const bottomNav: NavItem[] = [
  {
    to: '/setup',
    label: 'Setup',
    description: 'Developer tools and database reset',
    icon: Settings2,
  },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function NavBadge({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-white tabular-nums">
      {count > 99 ? '99+' : count}
    </span>
  )
}

function NavButton({
  item,
  summary,
}: {
  item: NavItem
  summary: DashboardSummary | null
}) {
  const Icon = item.icon
  const badgeCount = summary && item.badge ? item.badge(summary) : 0

  return (
    <Tooltip.Root delayDuration={400}>
      <Tooltip.Trigger asChild>
        <NavLink
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              'group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-all duration-150 outline-none',
              'focus-visible:ring-2 focus-visible:ring-sidebar-ring',
              isActive
                ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-sm'
                : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon
                size={15}
                className={cn(
                  'shrink-0 transition-colors',
                  isActive
                    ? 'text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/50 group-hover:text-sidebar-foreground'
                )}
              />
              <span className="flex-1 truncate">{item.label}</span>
              <NavBadge count={badgeCount} />
            </>
          )}
        </NavLink>
      </Tooltip.Trigger>

      <Tooltip.Portal>
        <Tooltip.Content
          side="right"
          sideOffset={12}
          className={cn(
            'z-50 rounded-md border border-border bg-popover px-3 py-2 shadow-md',
            'animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            'data-[side=right]:slide-in-from-left-2'
          )}
        >
          <p className="text-xs font-semibold text-foreground">{item.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
          <Tooltip.Arrow className="fill-border" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

function SystemHealthStrip({
  status,
  summary,
}: {
  status: HealthStatus
  summary: DashboardSummary | null
}) {
  const config: Record<HealthStatus, { dot: string; label: string; sub: string }> = {
    healthy: {
      dot: 'bg-green-500',
      label: 'All systems healthy',
      sub: `${summary?.healthyServices ?? 0} services up`,
    },
    degraded: {
      dot: 'bg-yellow-500 animate-pulse',
      label: 'Degraded',
      sub: summary
        ? `${summary.activeAnomalies} anomal${summary.activeAnomalies === 1 ? 'y' : 'ies'} active`
        : 'Checking…',
    },
    down: {
      dot: 'bg-red-500 animate-pulse',
      label: 'Incident active',
      sub: summary
        ? `${summary.downServices} service${summary.downServices === 1 ? '' : 's'} down`
        : 'Checking…',
    },
    loading: {
      dot: 'bg-muted-foreground/40 animate-pulse',
      label: 'Connecting…',
      sub: 'Fetching status',
    },
    error: {
      dot: 'bg-muted-foreground/40',
      label: 'Offline',
      sub: 'Cannot reach API',
    },
  }

  const { dot, label, sub } = config[status]

  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5">
      {/* Dot with ping ring */}
      <div className="relative flex shrink-0 h-2 w-2 items-center justify-center">
        {(status === 'down' || status === 'degraded') && (
          <span
            className={cn(
              'absolute h-3.5 w-3.5 rounded-full opacity-35 animate-ping',
              status === 'down' ? 'bg-red-500' : 'bg-yellow-500'
            )}
          />
        )}
        <Circle
          size={8}
          className={cn(
            'relative fill-current',
            dot.replace('animate-pulse', '').trim()
          )}
        />
      </div>

      <div className="flex min-w-0 flex-col">
        <span className="truncate text-[11px] font-medium leading-tight text-sidebar-foreground">
          {label}
        </span>
        <span className="truncate text-[10px] leading-tight text-sidebar-foreground/50">
          {sub}
        </span>
      </div>
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function Sidebar() {
  // Consumes the single shared poll — no duplicate network requests
  const { summary, status } = useSystemHealth()

  return (
    <Tooltip.Provider>
      <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">

        {/* ── Logo header (height matches TopBar) ── */}
        <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-4">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary shadow-sm">
            <span className="text-[11px] font-bold tracking-tight text-primary-foreground">CP</span>
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
              CodePulse
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wide text-sidebar-foreground/40">
              Monitor
            </span>
          </div>
        </div>

        {/* ── Main nav ── */}
        <nav className="flex flex-col gap-0.5 p-2 pt-3">
          <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/35">
            Navigation
          </p>
          {mainNav.map((item) => (
            <NavButton key={item.to} item={item} summary={summary} />
          ))}
        </nav>

        {/* ── Push bottom nav down ── */}
        <div className="flex-1" />

        {/* ── Divider before Setup ── */}
        <Separator.Root decorative className="mx-3 h-px bg-sidebar-border" />

        {/* ── Setup (bottom) ── */}
        <nav className="flex flex-col gap-0.5 p-2">
          {bottomNav.map((item) => (
            <NavButton key={item.to} item={item} summary={summary} />
          ))}
        </nav>

        {/* ── Divider before health strip ── */}
        <Separator.Root decorative className="mx-3 h-px bg-sidebar-border" />

        {/* ── Live system health strip ── */}
        <SystemHealthStrip status={status} summary={summary} />

      </aside>
    </Tooltip.Provider>
  )
}
