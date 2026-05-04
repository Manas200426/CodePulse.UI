import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Clock, AlertTriangle, CheckCircle2, Zap } from 'lucide-react'
import { api } from '@/lib/api'
import type { Incident, IncidentCorrelation } from '@/types'
import { Button } from '@/components/ui/button'

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtTime(d: Date) {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function shortId(id: string) {
  return id.includes('-') ? id.split('-')[0] : id
}

function fmtDuration(startStr: string, endStr: string | null) {
  const ms = (endStr ? new Date(endStr) : new Date()).getTime() - new Date(startStr).getTime()
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} minute${m !== 1 ? 's' : ''}`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}

const SEVERITY_STYLES: Record<string, string> = {
  High:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Low:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
}

// ─── Timeline ────────────────────────────────────────────────────────────────

interface TimelineEvent {
  time: Date
  service: string
  description: string
  type: 'upstream' | 'current' | 'resolved'
}

function buildTimeline(incident: Incident, correlations: IncidentCorrelation[]): TimelineEvent[] {
  const events: TimelineEvent[] = []
  const start = new Date(incident.startedAtUtc)
  const currentName = incident.serviceName ?? `Service #${incident.serviceId}`

  // Upstream incidents (started before current, by timeDifferenceMinutes)
  for (const c of correlations) {
    const upstreamStart = new Date(start.getTime() - c.timeDifferenceMinutes * 60 * 1000)
    const upstreamName = c.upstreamServiceName ?? `Service #${c.upstreamServiceId}`
    // Approximate first failure ~(failureCount-1)*30s before incident opened
    events.push({
      time: new Date(upstreamStart.getTime() - 60 * 1000),
      service: upstreamName,
      description: 'First failure detected',
      type: 'upstream',
    })
    events.push({
      time: upstreamStart,
      service: upstreamName,
      description: 'Incident opened (3+ consecutive failures)',
      type: 'upstream',
    })
  }

  // Current service: first failure before incident opened
  if (incident.failureCount > 1) {
    events.push({
      time: new Date(start.getTime() - (incident.failureCount - 1) * 30 * 1000),
      service: currentName,
      description: 'First failure detected',
      type: 'current',
    })
  }

  events.push({
    time: start,
    service: currentName,
    description: `Incident opened (${incident.failureCount} consecutive failures)`,
    type: 'current',
  })

  if (incident.resolvedAtUtc) {
    events.push({
      time: new Date(incident.resolvedAtUtc),
      service: currentName,
      description: 'Incident resolved',
      type: 'resolved',
    })
  }

  events.sort((a, b) => a.time.getTime() - b.time.getTime())
  return events
}

function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <div className="relative pl-6">
      {/* Vertical rail */}
      <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />

      {events.map((ev, i) => (
        <div key={i} className="relative mb-5 last:mb-0">
          {/* Rail dot */}
          <span
            className={`absolute -left-4 top-1 flex h-3 w-3 items-center justify-center rounded-full border-2 border-background ${
              ev.type === 'resolved' ? 'bg-green-500' :
              ev.type === 'upstream' ? 'bg-yellow-500' :
              'bg-red-500'
            }`}
          />
          <div>
            <p className="font-mono text-xs text-muted-foreground">{fmtTime(ev.time)}</p>
            <p className="mt-0.5 text-sm">
              <span className="font-medium">{ev.service}:</span>{' '}
              <span className="text-muted-foreground">{ev.description}</span>
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Correlation Graph ────────────────────────────────────────────────────────

const NODE_W = 160
const NODE_H = 72
const ARROW_H = 90
const PAD_X = 32
const GRAPH_ID = 'corr-arrow'

function CorrelationGraph({
  incident,
  correlations,
}: {
  incident: Incident
  correlations: IncidentCorrelation[]
}) {
  if (correlations.length === 0) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 px-5 py-4 text-sm text-muted-foreground">
        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-green-500" />
        No upstream dependencies identified. This appears to be an independent failure.
      </div>
    )
  }

  const n = correlations.length
  const upstreamRowW = n * NODE_W + (n - 1) * PAD_X
  const TOTAL_W = Math.max(upstreamRowW, NODE_W + 80)
  const TOTAL_H = NODE_H + ARROW_H + NODE_H

  const upX = (i: number) =>
    n === 1
      ? (TOTAL_W - NODE_W) / 2
      : (TOTAL_W - upstreamRowW) / 2 + i * (NODE_W + PAD_X)
  const downX = (TOTAL_W - NODE_W) / 2

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card p-6">
      <div className="mx-auto" style={{ width: TOTAL_W, position: 'relative', height: TOTAL_H }}>
        {/* SVG overlay — arrows only */}
        <svg
          style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
          width={TOTAL_W}
          height={TOTAL_H}
        >
          <defs>
            <marker
              id={GRAPH_ID}
              markerWidth="7"
              markerHeight="7"
              refX="6"
              refY="3.5"
              orient="auto"
            >
              <path d="M 0 0 L 7 3.5 L 0 7 z" fill="#6366f1" />
            </marker>
          </defs>

          {correlations.map((c, i) => {
            const x1 = upX(i) + NODE_W / 2
            const y1 = NODE_H
            const x2 = downX + NODE_W / 2
            const y2 = NODE_H + ARROW_H - 10
            const midX = (x1 + x2) / 2
            const midY = (y1 + y2) / 2
            const strokeW = 1.5 + c.confidenceScore * 2
            const opacity = 0.45 + c.confidenceScore * 0.55
            const pct = (c.confidenceScore * 100).toFixed(0)

            return (
              <g key={i}>
                {/* Bezier arrow */}
                <path
                  d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth={strokeW}
                  strokeOpacity={opacity}
                  markerEnd={`url(#${GRAPH_ID})`}
                />
                {/* Confidence label pill */}
                <rect
                  x={midX - 22}
                  y={midY - 10}
                  width={44}
                  height={18}
                  rx={9}
                  style={{ fill: 'var(--card)', stroke: '#6366f1', strokeOpacity: 0.4 }}
                  strokeWidth={1}
                />
                <text
                  x={midX}
                  y={midY + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={10}
                  fontWeight={600}
                  style={{ fill: '#6366f1' }}
                >
                  {pct}%
                </text>
              </g>
            )
          })}
        </svg>

        {/* Upstream nodes */}
        {correlations.map((c, i) => (
          <div
            key={i}
            style={{ position: 'absolute', left: upX(i), top: 0, width: NODE_W, height: NODE_H }}
          >
            <GraphNode
              serviceId={c.upstreamServiceId}
              name={c.upstreamServiceName ?? `Service #${c.upstreamServiceId}`}
              role="Root Cause"
              roleColor="text-yellow-600 dark:text-yellow-400"
            />
          </div>
        ))}

        {/* Downstream node — current service */}
        <div
          style={{
            position: 'absolute',
            left: downX,
            top: NODE_H + ARROW_H,
            width: NODE_W,
            height: NODE_H,
          }}
        >
          <GraphNode
            serviceId={incident.serviceId}
            name={incident.serviceName ?? `Service #${incident.serviceId}`}
            role="Impacted"
            roleColor="text-red-600 dark:text-red-400"
          />
        </div>
      </div>
    </div>
  )
}

function GraphNode({
  serviceId,
  name,
  role,
  roleColor,
}: {
  serviceId: number
  name: string
  role: string
  roleColor: string
}) {
  return (
    <Link
      to={`/services/${serviceId}`}
      className="flex h-full flex-col justify-center rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-primary/50 hover:shadow-sm"
    >
      <p className={`text-[10px] font-semibold uppercase tracking-wide ${roleColor}`}>{role}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-foreground">{name}</p>
    </Link>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function IncidentDetail() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [incident, setIncident] = useState<Incident | null>(null)
  const [correlations, setCorrelations] = useState<IncidentCorrelation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([api.incidents.get(id), api.incidents.correlations(id)])
      .then(([inc, corr]) => {
        setIncident(inc)
        setCorrelations(corr)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>
  if (error) return <div className="p-6 text-sm text-destructive">Error: {error}</div>
  if (!incident) return null

  const isActive = incident.status === 'Active'
  const timeline = buildTimeline(incident, correlations)
  // Correlations where this incident is the downstream (it received upstream causation)
  const upstreamCorrs = correlations.filter(c => c.downstreamIncidentId === id)

  return (
    <div className="flex flex-col">
      {/* ── Header ── */}
      <div className="border-b border-border px-6 py-4">
        <Button variant="ghost" size="sm" className="-ml-2 mb-3" onClick={() => navigate('/incidents')}>
          <ArrowLeft size={14} className="mr-1" />Back to Incidents
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">
              Incident #{shortId(incident.id)} — {incident.serviceName ?? `Service #${incident.serviceId}`}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              {/* Status */}
              <div className="flex items-center gap-1.5">
                {isActive ? (
                  <>
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                    </span>
                    <span className="font-medium text-red-600 dark:text-red-400">Active</span>
                  </>
                ) : (
                  <>
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
                    <span className="font-medium text-green-600 dark:text-green-400">Resolved</span>
                  </>
                )}
              </div>

              <span className="text-muted-foreground">·</span>

              {/* Severity */}
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_STYLES[incident.severity]}`}>
                {incident.severity} Severity
              </span>

              <span className="text-muted-foreground">·</span>

              {/* Duration */}
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock size={13} />
                {fmtDuration(incident.startedAtUtc, incident.resolvedAtUtc)}
              </span>
            </div>

            <p className="mt-2 text-sm text-muted-foreground">
              Reason: {incident.reason}
            </p>
          </div>

          <Link
            to={`/services/${incident.serviceId}`}
            className="shrink-0 text-sm text-primary hover:underline"
          >
            View service →
          </Link>
        </div>
      </div>

      <div className="space-y-8 p-6">
        {/* ── Timeline ── */}
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <Zap size={13} />Event Timeline
          </h2>
          <Timeline events={timeline} />
        </section>

        {/* ── Correlation Graph ── */}
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <AlertTriangle size={13} />Root Cause Analysis
          </h2>
          <CorrelationGraph incident={incident} correlations={upstreamCorrs} />
        </section>

        {/* ── Correlation Table ── */}
        {upstreamCorrs.length > 0 && (
          <section>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Upstream Correlations
            </h2>
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Upstream Service</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Upstream Incident</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Confidence</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Time Difference</th>
                  </tr>
                </thead>
                <tbody>
                  {upstreamCorrs.map(c => {
                    const pct = c.confidenceScore * 100
                    const td = c.timeDifferenceMinutes
                    const tdLabel =
                      td < 1 ? `${Math.round(td * 60)}s` : `${td.toFixed(1)}m`

                    return (
                      <tr key={c.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium">
                          <Link
                            to={`/services/${c.upstreamServiceId}`}
                            className="hover:underline text-foreground"
                          >
                            {c.upstreamServiceName ?? `Service #${c.upstreamServiceId}`}
                          </Link>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          <Link
                            to={`/incidents/${c.upstreamIncidentId}`}
                            className="text-foreground hover:underline"
                          >
                            #{shortId(c.upstreamIncidentId)}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-foreground">
                              {pct.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{tdLabel} before</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
