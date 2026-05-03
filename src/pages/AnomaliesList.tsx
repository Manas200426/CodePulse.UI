import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import type { Anomaly, AnomalyType } from '@/types'
import { PageHeader } from '@/components/ui/page-header'
import { Badge } from '@/components/ui/badge'

function anomalyTypeLabel(type: AnomalyType) {
  switch (type) {
    case 'LatencySpike': return 'Latency Spike'
    case 'ErrorRateSpike': return 'Error Rate Spike'
    case 'ConsecutiveFailures': return 'Consecutive Failures'
  }
}

export function AnomaliesList() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.anomalies.list()
      .then(setAnomalies)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Anomalies"
        description="Detected performance degradations and unusual patterns"
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
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Current</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Baseline</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Deviation</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Detected</th>
                </tr>
              </thead>
              <tbody>
                {anomalies.map(a => (
                  <tr key={a.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">#{a.id}</td>
                    <td className="px-4 py-3 font-medium">
                      <Link to={`/services/${a.serviceId}`} className="hover:underline text-foreground">
                        {a.serviceName ?? `Service #${a.serviceId}`}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{anomalyTypeLabel(a.type)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={a.status === 'Active' ? 'active' : 'resolved'}>{a.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{a.currentValue.toFixed(1)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.baselineValue.toFixed(1)}</td>
                    <td className="px-4 py-3">
                      <span className="text-red-600 dark:text-red-400 font-medium">
                        +{a.deviation.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(a.detectedAtUtc).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {anomalies.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      No anomalies detected.
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
