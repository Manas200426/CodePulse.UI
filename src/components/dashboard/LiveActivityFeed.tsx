import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, AlertTriangle, ArrowRight, CheckCircle, Siren } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn, fmtTime } from '@/lib/utils'
import { api } from '@/lib/api'
import type { Anomaly, Incident } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type FeedKind = 'incident_opened' | 'incident_resolved' | 'anomaly_detected' | 'anomaly_resolved'

interface FeedItem {
  id: string
  kind: FeedKind
  title: string
  subtitle: string
  timestamp: string
  isNew: boolean
}

// ─── Config ───────────────────────────────────────────────────────────────────

const FEED_CFG: Record<FeedKind, { icon: LucideIcon; dot: string; iconCls: string; bg: string }> = {
  incident_opened:   { icon: Siren,         dot: 'bg-red-500',    iconCls: 'text-red-500',    bg: 'bg-red-500/8' },
  incident_resolved: { icon: CheckCircle,   dot: 'bg-green-500',  iconCls: 'text-green-500',  bg: 'bg-green-500/8' },
  anomaly_detected:  { icon: AlertTriangle, dot: 'bg-yellow-500', iconCls: 'text-yellow-500', bg: 'bg-yellow-500/8' },
  anomaly_resolved:  { icon: CheckCircle,   dot: 'bg-green-500',  iconCls: 'text-green-500',  bg: 'bg-green-500/8' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function anomalyLabel(type: Anomaly['type']): string {
  if (type === 'LatencySpike')   return 'Latency spike detected'
  if (type === 'ErrorRateSpike') return 'Error rate spike detected'
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

// ─── FeedRow ──────────────────────────────────────────────────────────────────

function FeedRow({ item }: { item: FeedItem }) {
  const cfg = FEED_CFG[item.kind]
  const Icon = cfg.icon

  return (
    <div className={cn(
      'flex gap-3 px-4 py-3 transition-colors hover:bg-muted/40',
      item.isNew && 'animate-in slide-in-from-top-2 fade-in-0 duration-300'
    )}>
      <div className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', cfg.bg)}>
        <Icon size={13} className={cfg.iconCls} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-xs font-semibold text-foreground leading-tight">{item.title}</span>
        <span className="truncate text-[11px] text-muted-foreground">{item.subtitle}</span>
        <span className="text-[10px] text-muted-foreground/60">{fmtTime(item.timestamp)}</span>
      </div>
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

// ─── LiveActivityFeed ─────────────────────────────────────────────────────────

export function LiveActivityFeed() {
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
        <Link
          to="/incidents"
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          See all incidents <ArrowRight size={11} />
        </Link>
      </div>
    </div>
  )
}
