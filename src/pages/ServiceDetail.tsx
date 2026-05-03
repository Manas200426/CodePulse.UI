import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Pencil, Play, ArrowLeft } from 'lucide-react'
import { api } from '@/lib/api'
import type { MonitoredService, ServiceMetrics } from '@/types'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'

function MetricItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
    </div>
  )
}

export function ServiceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const numId = Number(id)

  const [service, setService] = useState<MonitoredService | null>(null)
  const [metrics, setMetrics] = useState<ServiceMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([api.services.get(numId), api.services.metrics(numId)])
      .then(([svc, m]) => { setService(svc); setMetrics(m) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [numId])

  async function handleRunCheck() {
    setRunning(true)
    try { await api.services.runCheck(numId) } finally { setRunning(false) }
  }

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading...</div>
  if (error) return <div className="p-6 text-sm text-destructive">Error: {error}</div>
  if (!service) return null

  return (
    <div className="flex flex-col">
      <PageHeader
        title={service.name}
        description={`${service.baseUrl}${service.healthEndpoint}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/services')}>
              <ArrowLeft size={14} className="mr-1" />Back
            </Button>
            <Button variant="outline" size="sm" disabled={running} onClick={handleRunCheck}>
              <Play size={14} className="mr-1" />{running ? 'Running...' : 'Run Check'}
            </Button>
            <Button size="sm" asChild>
              <Link to={`/services/${id}/edit`}><Pencil size={14} className="mr-1" />Edit</Link>
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        <div>
          <h2 className="mb-3 text-sm font-semibold">Configuration</h2>
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {[
                  ['Check Interval', `${service.checkIntervalSeconds}s`],
                  ['Timeout', `${service.timeoutSeconds}s`],
                  ['Active', service.isActive ? 'Yes' : 'No'],
                  ['Created', new Date(service.createdAtUtc).toLocaleString()],
                  ['Updated', new Date(service.updatedAtUtc).toLocaleString()],
                ].map(([label, value]) => (
                  <tr key={label} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-2.5 text-muted-foreground w-40">{label}</td>
                    <td className="px-4 py-2.5 font-medium">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {metrics && (
          <div>
            <h2 className="mb-3 text-sm font-semibold">Metrics</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <MetricItem label="Uptime" value={`${metrics.uptimePercent.toFixed(2)}%`} />
              <MetricItem label="Avg Latency" value={`${metrics.avgLatencyMs.toFixed(0)}ms`} />
              <MetricItem label="P95 Latency" value={`${metrics.p95LatencyMs.toFixed(0)}ms`} />
              <MetricItem label="P99 Latency" value={`${metrics.p99LatencyMs.toFixed(0)}ms`} />
              <MetricItem label="Error Rate" value={`${(metrics.errorRate * 100).toFixed(1)}%`} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
