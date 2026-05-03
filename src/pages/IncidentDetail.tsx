import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { api } from '@/lib/api'
import type { Incident, IncidentCorrelation } from '@/types'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function IncidentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const numId = Number(id)

  const [incident, setIncident] = useState<Incident | null>(null)
  const [correlations, setCorrelations] = useState<IncidentCorrelation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([api.incidents.get(numId), api.incidents.correlations(numId)])
      .then(([inc, corr]) => { setIncident(inc); setCorrelations(corr) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [numId])

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading...</div>
  if (error) return <div className="p-6 text-sm text-destructive">Error: {error}</div>
  if (!incident) return null

  return (
    <div className="flex flex-col">
      <PageHeader
        title={`Incident #${incident.id}`}
        description={incident.reason}
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate('/incidents')}>
            <ArrowLeft size={14} className="mr-1" />Back
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        <div>
          <h2 className="mb-3 text-sm font-semibold">Details</h2>
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {[
                  ['Service', <Link to={`/services/${incident.serviceId}`} className="hover:underline text-foreground">{incident.serviceName ?? `Service #${incident.serviceId}`}</Link>],
                  ['Status', <Badge variant={incident.status === 'Active' ? 'active' : 'resolved'}>{incident.status}</Badge>],
                  ['Severity', <Badge variant={incident.severity.toLowerCase() as 'low' | 'medium' | 'high'}>{incident.severity}</Badge>],
                  ['Failure Count', incident.failureCount],
                  ['Started', new Date(incident.startedAtUtc).toLocaleString()],
                  ['Resolved', incident.resolvedAtUtc ? new Date(incident.resolvedAtUtc).toLocaleString() : '—'],
                ].map(([label, value]) => (
                  <tr key={String(label)} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-2.5 text-muted-foreground w-36">{label}</td>
                    <td className="px-4 py-2.5">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold">Root Cause Correlations</h2>
          {correlations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No correlations detected for this incident.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Upstream Service</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Upstream Incident</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Confidence</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Time Diff</th>
                  </tr>
                </thead>
                <tbody>
                  {correlations.map(c => (
                    <tr key={c.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">
                        <Link to={`/services/${c.upstreamServiceId}`} className="hover:underline">
                          {c.upstreamServiceName ?? `Service #${c.upstreamServiceId}`}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        <Link to={`/incidents/${c.upstreamIncidentId}`} className="hover:underline text-foreground">
                          #{c.upstreamIncidentId}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${c.confidenceScore * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {(c.confidenceScore * 100).toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{c.timeDifferenceMinutes}m</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
