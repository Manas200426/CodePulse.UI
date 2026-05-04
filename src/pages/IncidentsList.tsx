import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, CheckCircle2, TriangleAlert } from 'lucide-react'
import { api } from '@/lib/api'
import type { Incident, IncidentCorrelation } from '@/types'

type FilterTab = 'All' | 'Active' | 'Resolved'

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function fmtTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const SEVERITY_STYLES = {
  High:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Low:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
}

export function IncidentsList() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [correlationMap, setCorrelationMap] = useState<Map<string, IncidentCorrelation[]>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterTab>('All')

  useEffect(() => {
    api.incidents.list()
      .then(async incs => {
        setIncidents(incs)
        // Fetch correlations in parallel (active incidents first as they're most relevant)
        const results = await Promise.allSettled(
          incs.map(inc => api.incidents.correlations(inc.id).then(c => [inc.id, c] as const))
        )
        const map = new Map<string, IncidentCorrelation[]>()
        for (const r of results) {
          if (r.status === 'fulfilled') map.set(r.value[0], r.value[1])
        }
        setCorrelationMap(map)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(
    () => incidents.filter(i => filter === 'All' || i.status === filter),
    [incidents, filter],
  )

  const tabs: FilterTab[] = ['All', 'Active', 'Resolved']

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold">Incidents</h1>
            <p className="text-sm text-muted-foreground">Outages triggered by consecutive health check failures</p>
          </div>
          {/* Filter tabs */}
          <div className="flex items-center rounded-lg border border-border bg-muted/30 p-0.5">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                  filter === tab
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab}
                {tab !== 'All' && (
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    {incidents.filter(i => i.status === tab).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6">
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-sm text-destructive">Error: {error}</p>}

        {!loading && !error && (
          <div className="space-y-2">
            {filtered.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
                <CheckCircle2 size={28} strokeWidth={1.5} />
                <p className="text-sm">
                  {filter === 'All' ? 'No incidents recorded.' : `No ${filter.toLowerCase()} incidents.`}
                </p>
              </div>
            )}

            {filtered.map(inc => {
              const corrs = correlationMap.get(inc.id)
              const upstreamCorr = corrs?.find(c => c.downstreamIncidentId === inc.id)
              const isActive = inc.status === 'Active'

              return (
                <Link
                  key={inc.id}
                  to={`/incidents/${inc.id}`}
                  className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/30 hover:border-border/80"
                >
                  {/* Status dot */}
                  <div className="mt-0.5 shrink-0">
                    {isActive ? (
                      <span className="relative flex h-3 w-3 items-center justify-center">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                      </span>
                    ) : (
                      <span className="inline-flex h-3 w-3 items-center justify-center">
                        <span className="h-2 w-2 rounded-full bg-green-500" />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* Row 1: name + severity */}
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm text-foreground truncate">
                        {inc.serviceName ?? `Service #${inc.serviceId}`}
                        {isActive ? ' Down' : ' — Resolved'}
                      </p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${SEVERITY_STYLES[inc.severity]}`}>
                        {inc.severity}
                      </span>
                    </div>

                    {/* Row 2: timing */}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Started {fmtTime(inc.startedAtUtc)} · {timeAgo(inc.startedAtUtc)} · {inc.failureCount} failure{inc.failureCount !== 1 ? 's' : ''}
                      {inc.resolvedAtUtc && (
                        <> · Resolved {timeAgo(inc.resolvedAtUtc)}</>
                      )}
                    </p>

                    {/* Row 3: correlation hint */}
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                      {corrs === undefined ? null : upstreamCorr ? (
                        <>
                          <TriangleAlert size={12} className="text-yellow-500 shrink-0" />
                          <span className="text-yellow-700 dark:text-yellow-400">
                            Probable cause:{' '}
                            {upstreamCorr.upstreamServiceName ?? `Service #${upstreamCorr.upstreamServiceId}`} failure
                            {' '}({(upstreamCorr.confidenceScore * 100).toFixed(0)}% confidence)
                          </span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={12} className="text-green-500 shrink-0" />
                          <span className="text-muted-foreground">No upstream correlation found</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Incident ID */}
                  <span className="shrink-0 self-start font-mono text-[11px] text-muted-foreground">
                    #{inc.id.includes('-') ? inc.id.split('-')[0] : inc.id}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
