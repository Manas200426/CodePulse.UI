import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, CheckCircle, Server, Siren, WifiOff, XCircle } from 'lucide-react'
import { useSystemHealth } from '@/context/SystemHealthContext'
import { PageHeader } from '@/components/ui/page-header'
import { PulseStatCard, SkeletonStatCard } from '@/components/dashboard/PulseStatCard'
import { ServiceCard, SkeletonServiceCard } from '@/components/dashboard/ServiceCard'
import { LiveActivityFeed } from '@/components/dashboard/LiveActivityFeed'
import { TrendCharts } from '@/components/dashboard/TrendCharts'

export function Dashboard() {
  const { summary, status } = useSystemHealth()
  const isLoading = status === 'loading'
  const isError   = status === 'error'

  return (
    <div className="flex flex-col">
      <PageHeader title="Dashboard" description="Live overview of all monitored services" />

      {/* Two-column layout: [left: pulse + services + trends] | [right: activity feed] */}
      <div className="flex gap-6 p-6 min-h-0">

        {/* ── Left column ── */}
        <div className="flex min-w-0 flex-1 flex-col gap-6">

          {/* Error banner */}
          {isError && (
            <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <WifiOff size={15} />
              Cannot reach the backend. Make sure it&apos;s running on{' '}
              <code className="font-mono text-xs">localhost:5084</code>.
            </div>
          )}

          {/* ── System Pulse ── */}
          <section aria-label="System pulse">
            <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              System Pulse
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonStatCard key={i} />)
              ) : summary && (
                <>
                  <PulseStatCard label="Total Services"   value={summary.totalServices}   icon={Server} />
                  <PulseStatCard
                    label="Active Incidents" value={summary.activeIncidents} icon={Siren}
                    variant={summary.activeIncidents > 0 ? 'red' : 'default'}
                    to={summary.activeIncidents > 0 ? '/incidents' : undefined}
                  />
                  <PulseStatCard
                    label="Active Anomalies" value={summary.activeAnomalies} icon={AlertTriangle}
                    variant={summary.activeAnomalies > 0 ? 'yellow' : 'default'}
                    to={summary.activeAnomalies > 0 ? '/anomalies' : undefined}
                  />
                  <PulseStatCard
                    label="Healthy" value={summary.healthyServices} icon={CheckCircle}
                    variant={summary.healthyServices > 0 ? 'green' : 'default'}
                  />
                  <PulseStatCard
                    label="Down" value={summary.downServices} icon={XCircle}
                    variant={summary.downServices > 0 ? 'red' : 'default'}
                  />
                </>
              )}
            </div>
          </section>

          {/* ── Service Health Grid ── */}
          <section aria-label="Service health">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Service Health
              </h2>
              <Link
                to="/services"
                className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
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
                <Link
                  to="/services/new"
                  className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Add a service <ArrowRight size={12} />
                </Link>
              </div>
            )}
          </section>

          {/* ── Trend Charts ── */}
          {!isLoading && summary && summary.services.length > 0 && (
            <section aria-label="Trends">
              <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Trends
              </h2>
              <TrendCharts services={summary.services} />
            </section>
          )}

        </div>

        {/* ── Right column: activity feed (desktop only) ── */}
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
