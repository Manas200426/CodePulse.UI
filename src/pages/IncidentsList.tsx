import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import type { Incident } from '@/types'
import { PageHeader } from '@/components/ui/page-header'
import { Badge } from '@/components/ui/badge'

export function IncidentsList() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.incidents.list()
      .then(setIncidents)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Incidents"
        description="Outages triggered by 3+ consecutive failures"
      />

      <div className="p-6">
        {loading && <p className="text-muted-foreground text-sm">Loading...</p>}
        {error && <p className="text-destructive text-sm">Error: {error}</p>}

        {!loading && !error && (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">ID</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Service</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Severity</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Failures</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Started</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Resolved</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map(inc => (
                  <tr key={inc.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <Link to={`/incidents/${inc.id}`} className="font-mono text-xs text-foreground hover:underline">
                        #{inc.id}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      <Link to={`/services/${inc.serviceId}`} className="hover:underline text-foreground">
                        {inc.serviceName ?? `Service #${inc.serviceId}`}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={inc.severity.toLowerCase() as 'low' | 'medium' | 'high'}>
                        {inc.severity}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={inc.status === 'Active' ? 'active' : 'resolved'}>
                        {inc.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{inc.failureCount}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(inc.startedAtUtc).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {inc.resolvedAtUtc ? new Date(inc.resolvedAtUtc).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
                {incidents.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No incidents recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
