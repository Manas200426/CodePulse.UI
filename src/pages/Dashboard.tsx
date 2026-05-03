import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer,
} from 'recharts'
// recharts tooltip props — label is runtime-injected so we widen the type here
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RechartsTipProps = Record<string, any>
import {
  Server, CheckCircle, AlertTriangle, XCircle, Siren,
  ArrowRight, Clock, Wifi, WifiOff, Activity,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSystemHealth } from '@/context/SystemHealthContext'
import { api } from '@/lib/api'
import { PageHeader } from '@/components/ui/page-header'
import type { DashboardServiceSummary, Incident, Anomaly } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const secs = Math.floor(diff / 1000)
  if (secs < 5)  return 'just now'
  if (secs < 60) return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  return `${Math.floor(mins / 60)}h ago`
}

function fmtTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// Deterministic sin-wave value — no random(), stable across renders
function wave(base: number, hour: number, seed: number): number {
  return Math.max(0, Math.round(base + Math.sin(hour * 0.7 + seed * 1.3) * base * 0.25))
}

// ─── Count-up hook ────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 650): number {
  const [count, setCount] = useState(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (target === 0) { setCount(0); return }
    const start = performance.now()
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1)
      setCount(Math.round((1 - Math.pow(1 - t, 3)) * target))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return count
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION A — System Pulse Strip
// ═══════════════════════════════════════════════════════════════════════════════

type StatVariant = 'default' | 'red' | 'yellow' | 'green'

const STAT_STYLES: Record<StatVariant, { card: string; iconWrap: string; icon: string; value: string }> = {
  default: { card: 'bg-card border-border',                                      iconWrap: 'bg-muted',          icon: 'text-foreground',                    value: 'text-foreground' },
  red:     { card: 'bg-red-500/5 border-red-500/25 dark:bg-red-500/10',          iconWrap: 'bg-red-500/10',     icon: 'text-red-600 dark:text-red-400',     value: 'text-red-700 dark:text-red-300' },
  yellow:  { card: 'bg-yellow-500/5 border-yellow-500/25 dark:bg-yellow-500/10', iconWrap: 'bg-yellow-500/10',  icon: 'text-yellow-600 dark:text-yellow-400',value: 'text-yellow-700 dark:text-yellow-300' },
  green:   { card: 'bg-green-500/5 border-green-500/25 dark:bg-green-500/10',    iconWrap: 'bg-green-500/10',   icon: 'text-green-600 dark:text-green-400',  value: 'text-green-700 dark:text-green-300' },
}

function PulseStatCard({ label, value, icon: Icon, variant = 'default', to }: {
  label: string; value: number; icon: LucideIcon; variant?: StatVariant; to?: string
}) {
  const animated = useCountUp(value)
  const s = STAT_STYLES[variant]

  const inner = (
    <div className={cn(
      'group flex flex-col gap-3 rounded-xl border p-4 transition-all duration-200',
      s.card, to && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5'
    )}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', s.iconWrap)}>
          <Icon size={15} className={s.icon} />
        </div>
      </div>
      <div className="flex items-end gap-1.5">
        <span className={cn('text-3xl font-bold tabular-nums leading-none', s.value)}>{animated}</span>
        {to && <ArrowRight size={14} className="mb-0.5 text-muted-foreground/0 transition-all group-hover:text-muted-foreground/60 group-hover:translate-x-0.5" />}
      </div>
    </div>
  )

  return to ? <Link to={to} className="block">{inner}</Link> : inner
}

function SkeletonStatCard() {
  return (
    <div className="flex animate-pulse flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 rounded-md bg-muted" />
        <div className="h-8 w-8 rounded-lg bg-muted" />
      </div>
      <div className="h-8 w-12 rounded-md bg-muted" />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION B — Service Health Grid
// ═══════════════════════════════════════════════════════════════════════════════

type ServiceStatus = DashboardServiceSummary['healthStatus']

const SVC_STYLES: Record<ServiceStatus, { border: string; dot: string; ping: string | null; badge: string }> = {
  Healthy:  { border: 'border-green-500/30 hover:border-green-500/50',  dot: 'bg-green-500',  ping: null,            badge: 'bg-green-500/10 text-green-700 dark:text-green-400' },
  Degraded: { border: 'border-yellow-500/40 hover:border-yellow-500/60',dot: 'bg-yellow-500', ping: 'bg-yellow-500',  badge: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' },
  Down:     { border: 'border-red-500/50 hover:border-red-500/70',      dot: 'bg-red-500',    ping: 'bg-red-500',     badge: 'bg-red-500/10 text-red-700 dark:text-red-400' },
}

function ServiceCard({ service }: { service: DashboardServiceSummary }) {
  const s = SVC_STYLES[service.healthStatus]
  return (
    <Link to={`/services/${service.id}`} className={cn(
      'group flex flex-col gap-4 rounded-xl border bg-card p-4',
      'transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5',
      s.border
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
            {s.ping && <span className={cn('absolute h-3.5 w-3.5 animate-ping rounded-full opacity-30', s.ping)} />}
            <span className={cn('relative h-2 w-2 rounded-full', s.dot)} />
          </span>
          <span className="truncate text-sm font-semibold text-foreground">{service.name}</span>
        </div>
        <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', s.badge)}>
          {service.healthStatus}
        </span>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground">Latency</span>
          <span className="font-semibold tabular-nums text-foreground">
            {service.healthStatus === 'Down' ? <span className="text-red-500">—</span> : `${service.latestResponseMs}ms`}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground">Last result</span>
          <span className={cn('flex items-center gap-1 font-semibold', service.lastCheckSuccess ? 'text-green-600 dark:text-green-400' : 'text-red-500')}>
            {service.lastCheckSuccess ? <><Wifi size={11} />Success</> : <><WifiOff size={11} />Failed</>}
          </span>
        </div>
        <div className="col-span-2 flex items-center gap-1 text-muted-foreground">
          <Clock size={11} className="shrink-0" />
          <span>{timeAgo(service.lastCheckedAtUtc)}</span>
        </div>
      </div>

      {/* Alert badges */}
      {(service.hasActiveIncident || service.hasActiveAnomaly) && (
        <div className="flex flex-wrap gap-1.5 border-t border-border/60 pt-3">
          {service.hasActiveIncident && (
            <span onClick={e => { e.preventDefault(); window.location.href = '/incidents' }}
              className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-600 transition-colors hover:bg-red-500/20 dark:text-red-400">
              <Siren size={9} />Active Incident
            </span>
          )}
          {service.hasActiveAnomaly && (
            <span onClick={e => { e.preventDefault(); window.location.href = '/anomalies' }}
              className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-yellow-500/20 bg-yellow-500/10 px-2 py-0.5 text-[10px] font-semibold text-yellow-600 transition-colors hover:bg-yellow-500/20 dark:text-yellow-400">
              <AlertTriangle size={9} />Anomaly
            </span>
          )}
        </div>
      )}

      {/* Hover reveal */}
      <div className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100">
        View Details <ArrowRight size={12} />
      </div>
    </Link>
  )
}

function SkeletonServiceCard() {
  return (
    <div className="flex animate-pulse flex-col gap-4 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="h-4 w-32 rounded-md bg-muted" />
        <div className="h-5 w-16 rounded-full bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="h-8 rounded-md bg-muted" />
        <div className="h-8 rounded-md bg-muted" />
        <div className="col-span-2 h-3 w-24 rounded-md bg-muted" />
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION C — Live Activity Feed
// ═══════════════════════════════════════════════════════════════════════════════

type FeedKind = 'incident_opened' | 'incident_resolved' | 'anomaly_detected' | 'anomaly_resolved'

interface FeedItem {
  id: string
  kind: FeedKind
  title: string
  subtitle: string
  timestamp: string
  isNew: boolean
}

const FEED_CFG: Record<FeedKind, { icon: LucideIcon; dot: string; iconCls: string; bg: string }> = {
  incident_opened:   { icon: Siren,         dot: 'bg-red-500',    iconCls: 'text-red-500',    bg: 'bg-red-500/8' },
  incident_resolved: { icon: CheckCircle,   dot: 'bg-green-500',  iconCls: 'text-green-500',  bg: 'bg-green-500/8' },
  anomaly_detected:  { icon: AlertTriangle, dot: 'bg-yellow-500', iconCls: 'text-yellow-500', bg: 'bg-yellow-500/8' },
  anomaly_resolved:  { icon: CheckCircle,   dot: 'bg-green-500',  iconCls: 'text-green-500',  bg: 'bg-green-500/8' },
}

function anomalyLabel(type: Anomaly['type']): string {
  if (type === 'LatencySpike')        return 'Latency spike detected'
  if (type === 'ErrorRateSpike')      return 'Error rate spike detected'
  return 'Consecutive failures detected'
}

function buildFeed(incidents: Incident[], anomalies: Anomaly[], prevIds: Set<string>): FeedItem[] {
  const items: FeedItem[] = []

  for (const inc of incidents) {
    const name = inc.serviceName ?? `Service #${inc.serviceId}`
    items.push({
      id: `inc-open-${inc.id}`,
      kind: 'incident_opened',
      title: 'Incident opened',
      subtitle: `${name} · ${inc.severity} severity`,
      timestamp: inc.startedAtUtc,
      isNew: false,
    })
    if (inc.resolvedAtUtc) {
      items.push({
        id: `inc-res-${inc.id}`,
        kind: 'incident_resolved',
        title: 'Incident resolved',
        subtitle: name,
        timestamp: inc.resolvedAtUtc,
        isNew: false,
      })
    }
  }

  for (const a of anomalies) {
    const name = a.serviceName ?? `Service #${a.serviceId}`
    items.push({
      id: `ano-det-${a.id}`,
      kind: 'anomaly_detected',
      title: anomalyLabel(a.type),
      subtitle: `${name} · +${a.deviation.toFixed(1)}× baseline`,
      timestamp: a.detectedAtUtc,
      isNew: false,
    })
    if (a.resolvedAtUtc) {
      items.push({
        id: `ano-res-${a.id}`,
        kind: 'anomaly_resolved',
        title: 'Anomaly resolved',
        subtitle: name,
        timestamp: a.resolvedAtUtc,
        isNew: false,
      })
    }
  }

  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  const top30 = items.slice(0, 30)

  return top30.map(item => ({ ...item, isNew: !prevIds.has(item.id) }))
}

function FeedRow({ item }: { item: FeedItem }) {
  const cfg = FEED_CFG[item.kind]
  const Icon = cfg.icon

  return (
    <div className={cn(
      'flex gap-3 px-4 py-3 transition-colors hover:bg-muted/40',
      item.isNew && 'animate-in slide-in-from-top-2 fade-in-0 duration-300'
    )}>
      {/* Icon */}
      <div className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', cfg.bg)}>
        <Icon size={13} className={cfg.iconCls} />
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-xs font-semibold text-foreground leading-tight">{item.title}</span>
        <span className="truncate text-[11px] text-muted-foreground">{item.subtitle}</span>
        <span className="text-[10px] text-muted-foreground/60">{fmtTime(item.timestamp)}</span>
      </div>

      {/* Status dot */}
      <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', cfg.dot)} />
    </div>
  )
}

function SkeletonFeedRow() {
  return (
    <div className="flex animate-pulse gap-3 px-4 py-3">
      <div className="mt-0.5 h-7 w-7 shrink-0 rounded-lg bg-muted" />
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="h-3 w-28 rounded bg-muted" />
        <div className="h-2.5 w-36 rounded bg-muted" />
        <div className="h-2 w-16 rounded bg-muted" />
      </div>
    </div>
  )
}

function LiveActivityFeed() {
  const [items, setItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const prevIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [incidents, anomalies] = await Promise.all([
          api.incidents.list(),
          api.anomalies.list(),
        ])
        if (cancelled) return
        const feed = buildFeed(incidents, anomalies, prevIds.current)
        prevIds.current = new Set(feed.map(f => f.id))
        setItems(feed)
      } catch {
        // silent fail — feed is supplementary
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    const id = setInterval(load, 10_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Live Activity
          </span>
        </div>
        {/* Live pulse indicator */}
        <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute h-1.5 w-1.5 animate-ping rounded-full bg-green-500 opacity-50" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-green-500" />
          </span>
          Live
        </span>
      </div>

      {/* Feed list */}
      <div className="max-h-[calc(100vh-280px)] min-h-[200px] overflow-y-auto divide-y divide-border/50">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonFeedRow key={i} />)
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Activity size={24} className="text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">No activity yet</p>
          </div>
        ) : (
          items.map(item => <FeedRow key={item.id} item={item} />)
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-4 py-2.5">
        <Link to="/incidents" className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
          See all incidents <ArrowRight size={11} />
        </Link>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION D — Trend Charts
// ═══════════════════════════════════════════════════════════════════════════════

const CHART_COLORS = ['#6366f1', '#22c55e', '#eab308', '#ef4444', '#8b5cf6', '#06b6d4']

const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`)

function ChartTooltip({ active, payload, label }: RechartsTipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg text-xs">
      <p className="mb-1.5 font-semibold text-foreground">{label}</p>
      {payload.map((entry: { name: string; value: number; color: string }) => (
        <div key={entry.name} className="flex items-center gap-2 py-0.5">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground truncate max-w-[120px]">{entry.name}</span>
          <span className="ml-auto font-semibold text-foreground tabular-nums">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

function TrendCharts({ services }: { services: DashboardServiceSummary[] }) {
  // Cap at 4 services for readable charts
  const displayed = services.slice(0, 4)

  const latencyData = useMemo(() =>
    HOURS.map((hour, i) => {
      const point: Record<string, string | number> = { hour }
      displayed.forEach((svc, idx) => {
        const base = svc.latestResponseMs || (80 + idx * 40)
        // Simulate a spike in the 10–12 window if the service is struggling
        const spikeMult = (svc.healthStatus !== 'Healthy' && i >= 10 && i <= 12) ? 3.5 : 1
        point[svc.name] = Math.round(wave(base, i, idx) * spikeMult)
      })
      return point
    }),
  [displayed])

  const errorData = useMemo(() =>
    HOURS.map((hour, i) => {
      const point: Record<string, string | number> = { hour }
      displayed.forEach((svc, idx) => {
        const base = svc.healthStatus === 'Down' ? 55 : svc.healthStatus === 'Degraded' ? 12 : 0.8
        const spike = (svc.hasActiveIncident && i >= 10 && i <= 12) ? 35 : 0
        point[svc.name] = parseFloat(Math.min(100, wave(base, i, idx) + spike).toFixed(1))
      })
      return point
    }),
  [displayed])

  const axisStyle = { fontSize: 10, fill: 'var(--muted-foreground)' }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

      {/* Latency Chart */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-foreground">Avg Response Time</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Simulated 24h trend · ms</p>
          </div>
          <div className="flex flex-wrap justify-end gap-x-3 gap-y-1">
            {displayed.map((svc, i) => (
              <span key={svc.id} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i] }} />
                {svc.name}
              </span>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={latencyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
            <XAxis dataKey="hour" tick={axisStyle} tickLine={false} axisLine={false} interval={5} />
            <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={40} unit="ms" />
            <ReTooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border)', strokeWidth: 1 }} />
            {displayed.map((svc, i) => (
              <Line
                key={svc.id}
                type="monotone"
                dataKey={svc.name}
                stroke={CHART_COLORS[i]}
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Error Rate Chart */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-foreground">Error Rate</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Simulated 24h trend · %</p>
          </div>
          <div className="flex flex-wrap justify-end gap-x-3 gap-y-1">
            {displayed.map((svc, i) => (
              <span key={svc.id} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i] }} />
                {svc.name}
              </span>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={errorData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              {displayed.map((svc, i) => (
                <linearGradient key={svc.id} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={CHART_COLORS[i]} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={CHART_COLORS[i]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
            <XAxis dataKey="hour" tick={axisStyle} tickLine={false} axisLine={false} interval={5} />
            <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={35} unit="%" />
            <ReTooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border)', strokeWidth: 1 }} />
            {displayed.map((svc, i) => (
              <Area
                key={svc.id}
                type="monotone"
                dataKey={svc.name}
                stroke={CHART_COLORS[i]}
                strokeWidth={1.5}
                fill={`url(#grad-${i})`}
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export function Dashboard() {
  const { summary, status } = useSystemHealth()
  const isLoading = status === 'loading'
  const isError   = status === 'error'

  return (
    <div className="flex flex-col">
      <PageHeader title="Dashboard" description="Live overview of all monitored services" />

      {/* Two-column layout: [left: A + B + D] | [right: C] */}
      <div className="flex gap-6 p-6 min-h-0">

        {/* ── Left column ── */}
        <div className="flex min-w-0 flex-1 flex-col gap-6">

          {/* Error banner */}
          {isError && (
            <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <WifiOff size={15} />
              Cannot reach the backend. Make sure it's running on{' '}
              <code className="font-mono text-xs">localhost:5084</code>.
            </div>
          )}

          {/* ── A: System Pulse ── */}
          <section aria-label="System pulse">
            <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              System Pulse
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => <SkeletonStatCard key={i} />)
                : summary && <>
                    <PulseStatCard label="Total Services"   value={summary.totalServices}   icon={Server}       />
                    <PulseStatCard label="Active Incidents" value={summary.activeIncidents} icon={Siren}        variant={summary.activeIncidents > 0 ? 'red'    : 'default'} to={summary.activeIncidents > 0 ? '/incidents' : undefined} />
                    <PulseStatCard label="Active Anomalies" value={summary.activeAnomalies} icon={AlertTriangle} variant={summary.activeAnomalies > 0 ? 'yellow' : 'default'} to={summary.activeAnomalies > 0 ? '/anomalies' : undefined} />
                    <PulseStatCard label="Healthy"          value={summary.healthyServices} icon={CheckCircle}  variant={summary.healthyServices > 0 ? 'green'  : 'default'} />
                    <PulseStatCard label="Down"             value={summary.downServices}    icon={XCircle}      variant={summary.downServices > 0 ? 'red'      : 'default'} />
                  </>
              }
            </div>
          </section>

          {/* ── B: Service Health Grid ── */}
          <section aria-label="Service health">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Service Health
              </h2>
              <Link to="/services" className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                All services <ArrowRight size={12} />
              </Link>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonServiceCard key={i} />)}
              </div>
            ) : summary && summary.services.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {summary.services.map(svc => <ServiceCard key={svc.id} service={svc} />)}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
                <Server size={32} className="text-muted-foreground/30" />
                <div>
                  <p className="text-sm font-medium text-foreground">No services yet</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Add your first service to start monitoring.</p>
                </div>
                <Link to="/services/new" className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                  Add a service <ArrowRight size={12} />
                </Link>
              </div>
            )}
          </section>

          {/* ── D: Trend Charts ── */}
          {!isLoading && summary && summary.services.length > 0 && (
            <section aria-label="Trends">
              <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Trends
              </h2>
              <TrendCharts services={summary.services} />
            </section>
          )}

        </div>

        {/* ── Right column: Section C (desktop only) ── */}
        <div className="hidden lg:block w-72 xl:w-80 shrink-0">
          <div className="sticky top-6">
            <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Activity
            </h2>
            <LiveActivityFeed />
          </div>
        </div>

      </div>
    </div>
  )
}
