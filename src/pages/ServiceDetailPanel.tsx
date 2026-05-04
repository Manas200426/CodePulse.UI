import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Pencil, Play, Trash2, ChevronDown, ChevronRight,
  AlertCircle, AlertTriangle, Loader2,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ReferenceArea, ResponsiveContainer,
} from 'recharts'
import { api } from '@/lib/api'
import type { MonitoredService, ServiceMetrics, Incident, Anomaly } from '@/types'
import { Button } from '@/components/ui/button'

interface Props {
  serviceId: string
  onDelete?: () => void
}

function StatusDot({ status }: { status: 'Healthy' | 'Degraded' | 'Down' | null }) {
  const colors: Record<string, string> = {
    Healthy: 'bg-green-500',
    Degraded: 'bg-yellow-500',
    Down: 'bg-red-500',
  }
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${status ? colors[status] : 'bg-muted-foreground/30'}`}
    />
  )
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function sinceTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function anomalyLabel(type: string) {
  return type.replace(/([A-Z])/g, ' $1').trim()
}

function findClosestTime(
  chartData: { time: string; timestamp: number }[],
  targetTs: number,
) {
  return chartData.reduce((prev, curr) =>
    Math.abs(curr.timestamp - targetTs) < Math.abs(prev.timestamp - targetTs) ? curr : prev,
  ).time
}

export function ServiceDetailPanel({ serviceId, onDelete }: Props) {
  const navigate = useNavigate()

  const [service, setService] = useState<MonitoredService | null>(null)
  const [metrics, setMetrics] = useState<ServiceMetrics | null>(null)
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError(null)
    setConfirmDelete(false)
    Promise.all([
      api.services.get(serviceId),
      api.services.metrics(serviceId),
      api.incidents.list(),
      api.anomalies.list(),
    ])
      .then(([svc, m, allIncidents, allAnomalies]) => {
        setService(svc)
        setMetrics(m)
        setIncidents(allIncidents.filter(i => i.serviceId === serviceId))
        setAnomalies(allAnomalies.filter(a => a.serviceId === serviceId))
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [serviceId])

  const activeIncident = incidents.find(i => i.status === 'Active') ?? null
  const activeAnomalies = anomalies.filter(a => a.status === 'Active')

  const serviceStatus = useMemo<'Healthy' | 'Degraded' | 'Down' | null>(() => {
    if (!service) return null
    if (activeIncident) return 'Down'
    if (activeAnomalies.length > 0) return 'Degraded'
    return 'Healthy'
  }, [service, activeIncident, activeAnomalies.length])

  // Simulated 24h latency — 48 points × 30min = 24h
  const chartData = useMemo(() => {
    if (!metrics) return []
    const now = Date.now()
    const avg = metrics.avgLatencyMs ?? 0
    return Array.from({ length: 48 }, (_, i) => {
      const timestamp = now - (47 - i) * 30 * 60 * 1000
      const wave = Math.sin((i / 48) * Math.PI * 6 + serviceId * 0.7) * (avg * 0.25)
      const spike = (i === 20 || i === 33) ? avg * 0.6 : 0
      const latency = Math.max(5, Math.round(avg + wave + spike))
      return {
        time: new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp,
        latency,
      }
    })
  }, [metrics, serviceId])

  // Map resolved incidents to chart red zones
  const incidentZones = useMemo(() => {
    if (!chartData.length) return []
    const chartStart = chartData[0].timestamp
    const chartEnd = chartData[chartData.length - 1].timestamp
    return incidents
      .map(inc => {
        const start = new Date(inc.startedAtUtc).getTime()
        const end = inc.resolvedAtUtc ? new Date(inc.resolvedAtUtc).getTime() : Date.now()
        if (start > chartEnd || end < chartStart) return null
        return {
          x1: findClosestTime(chartData, Math.max(start, chartStart)),
          x2: findClosestTime(chartData, Math.min(end, chartEnd)),
        }
      })
      .filter(Boolean) as { x1: string; x2: string }[]
  }, [incidents, chartData])

  async function handleRunCheck() {
    setRunning(true)
    try {
      await api.services.runCheck(serviceId)
    } finally {
      setRunning(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await api.services.delete(serviceId)
      onDelete?.()
      navigate('/services')
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Delete failed')
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        <Loader2 size={16} className="mr-2 animate-spin" /> Loading…
      </div>
    )
  }
  if (error) {
    return <div className="p-6 text-sm text-destructive">Error: {error}</div>
  }
  if (!service) return null

  const p95Warn = !!metrics && (metrics.p95LatencyMs ?? 0) > (metrics.avgLatencyMs ?? 0) * 2
  const p99Warn = !!metrics && (metrics.p99LatencyMs ?? 0) > (metrics.avgLatencyMs ?? 0) * 2
  const errorHigh = !!metrics && (metrics.errorRate ?? 0) > 0.05

  const statusColor =
    serviceStatus === 'Down' ? 'text-red-600 dark:text-red-400' :
    serviceStatus === 'Degraded' ? 'text-yellow-600 dark:text-yellow-400' :
    'text-green-600 dark:text-green-400'

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* ── Header ── */}
      <div className="border-b border-border px-6 py-4 shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold leading-tight truncate">{service.name}</h1>
            <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
              {service.baseUrl}{service.healthEndpoint}
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              <StatusDot status={serviceStatus} />
              <span className={`font-medium ${statusColor}`}>{serviceStatus ?? 'Unknown'}</span>
              {activeIncident && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">
                    Since {sinceTime(activeIncident.startedAtUtc)}
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">
                    {timeAgo(activeIncident.startedAtUtc)}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/services/${service.id}/edit`}>
                <Pencil size={13} className="mr-1" />Edit
              </Link>
            </Button>
            <Button variant="outline" size="sm" disabled={running} onClick={handleRunCheck}>
              {running
                ? <><Loader2 size={13} className="mr-1 animate-spin" />Running…</>
                : <><Play size={13} className="mr-1" />Run Check</>}
            </Button>
            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <Button size="sm" variant="destructive" disabled={deleting} onClick={handleDelete}>
                  {deleting ? <Loader2 size={13} className="animate-spin" /> : 'Confirm'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 size={13} />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        {/* ── Metrics bar ── */}
        {metrics && (
          <section>
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Metrics
            </h2>
            <div className="grid grid-cols-5 gap-2">
              {[
                { label: 'Uptime', value: `${(metrics.uptimePercent ?? 0).toFixed(1)}%`, warn: false, danger: false },
                { label: 'Avg',    value: `${(metrics.avgLatencyMs ?? 0).toFixed(0)}ms`, warn: false, danger: false },
                { label: 'P95',    value: `${(metrics.p95LatencyMs ?? 0).toFixed(0)}ms`, warn: p95Warn, danger: false },
                { label: 'P99',    value: `${(metrics.p99LatencyMs ?? 0).toFixed(0)}ms`, warn: p99Warn, danger: false },
                { label: 'Errors', value: `${((metrics.errorRate ?? 0) * 100).toFixed(1)}%`, warn: false, danger: errorHigh },
              ].map(({ label, value, warn, danger }) => (
                <div
                  key={label}
                  className={`rounded-lg border p-3 text-center ${
                    danger ? 'border-red-300 bg-red-50/60 dark:border-red-800 dark:bg-red-900/10' :
                    warn   ? 'border-yellow-300 bg-yellow-50/60 dark:border-yellow-700 dark:bg-yellow-900/10' :
                             'border-border bg-card'
                  }`}
                >
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
                  <p className={`mt-1 text-lg font-bold ${
                    danger ? 'text-red-600 dark:text-red-400' :
                    warn   ? 'text-yellow-700 dark:text-yellow-400' :
                             'text-foreground'
                  }`}>{value}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Latency chart ── */}
        {chartData.length > 0 && metrics && (
          <section>
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Latency — Last 24h
            </h2>
            <div className="rounded-lg border border-border bg-card p-4">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 4, right: 16, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.08} />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 10, opacity: 0.5 }}
                    tickLine={false}
                    interval={11}
                  />
                  <YAxis
                    tick={{ fontSize: 10, opacity: 0.5 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => `${v}ms`}
                    width={46}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      padding: '6px 10px',
                    }}
                    formatter={(v: number) => [`${v}ms`, 'Latency']}
                  />
                  {incidentZones.map((zone, i) => (
                    <ReferenceArea
                      key={i}
                      x1={zone.x1}
                      x2={zone.x2}
                      fill="#ef4444"
                      fillOpacity={0.12}
                      strokeOpacity={0}
                    />
                  ))}
                  <ReferenceLine
                    y={metrics.p95LatencyMs ?? 0}
                    stroke="#eab308"
                    strokeDasharray="4 3"
                    strokeWidth={1.5}
                    label={{ value: 'P95', position: 'insideTopRight', fontSize: 10, fill: '#eab308', dy: -4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="latency"
                    stroke="#6366f1"
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={{ r: 3, fill: '#6366f1' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* ── Active Issues ── */}
        {(activeIncident || activeAnomalies.length > 0) && (
          <section>
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Active Issues
            </h2>
            <div className="space-y-2">
              {activeIncident && (
                <Link
                  to={`/incidents/${activeIncident.id}`}
                  className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50/60 px-4 py-3 text-sm text-red-800 transition-colors hover:bg-red-50 dark:border-red-800 dark:bg-red-900/15 dark:text-red-300 dark:hover:bg-red-900/25"
                >
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">
                      Active Incident #{String(activeIncident.id).split('-')[0]}
                    </p>
                    <p className="mt-0.5 text-xs opacity-75">
                      {activeIncident.reason} · {activeIncident.severity} severity · {timeAgo(activeIncident.startedAtUtc)}
                    </p>
                  </div>
                </Link>
              )}
              {activeAnomalies.map(anomaly => (
                <Link
                  key={anomaly.id}
                  to="/anomalies"
                  className="flex items-start gap-3 rounded-lg border border-yellow-300 bg-yellow-50/60 px-4 py-3 text-sm text-yellow-800 transition-colors hover:bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900/15 dark:text-yellow-300 dark:hover:bg-yellow-900/25"
                >
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">{anomalyLabel(anomaly.type)}</p>
                    <p className="mt-0.5 text-xs opacity-75">
                      Current: {anomaly.currentValue.toFixed(1)} · Baseline: {anomaly.baselineValue.toFixed(1)} · {timeAgo(anomaly.detectedAtUtc)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Configuration (collapsible) ── */}
        <section>
          <button
            onClick={() => setConfigOpen(o => !o)}
            className="mb-3 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
          >
            {configOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            Configuration
          </button>
          {configOpen && (
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <table className="w-full text-xs">
                <tbody>
                  {[
                    ['Base URL', service.baseUrl],
                    ['Health Endpoint', service.healthEndpoint],
                    ['Check Interval', `${service.checkIntervalSeconds}s`],
                    ['Timeout', `${service.timeoutSeconds}s`],
                    ['Active', service.isActive ? 'Yes' : 'No'],
                  ].map(([label, value]) => (
                    <tr key={label} className="border-b border-border/50 last:border-0">
                      <td className="w-36 px-4 py-2.5 text-muted-foreground">{label}</td>
                      <td className="px-4 py-2.5 font-mono">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
