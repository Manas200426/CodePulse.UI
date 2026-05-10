import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Clock, Siren, Wifi, WifiOff } from 'lucide-react'
import { cn, timeAgo } from '@/lib/utils'
import type { DashboardServiceSummary } from '@/types'

type ServiceStatus = DashboardServiceSummary['healthStatus']

const SVC_STYLES: Record<ServiceStatus, { border: string; dot: string; ping: string | null; badge: string }> = {
  Healthy:  { border: 'border-green-500/30 hover:border-green-500/50',   dot: 'bg-green-500',  ping: null,           badge: 'bg-green-500/10 text-green-700 dark:text-green-400' },
  Degraded: { border: 'border-yellow-500/40 hover:border-yellow-500/60', dot: 'bg-yellow-500', ping: 'bg-yellow-500', badge: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' },
  Down:     { border: 'border-red-500/50 hover:border-red-500/70',       dot: 'bg-red-500',    ping: 'bg-red-500',    badge: 'bg-red-500/10 text-red-700 dark:text-red-400' },
}

export function ServiceCard({ service }: { service: DashboardServiceSummary }) {
  const s = SVC_STYLES[service.healthStatus]

  return (
    <Link
      to={`/services/${service.id}`}
      className={cn(
        'group flex flex-col gap-4 rounded-xl border bg-card p-4',
        'transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5',
        s.border
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
            {s.ping && (
              <span className={cn('absolute h-3.5 w-3.5 animate-ping rounded-full opacity-30', s.ping)} />
            )}
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
            {service.healthStatus === 'Down'
              ? <span className="text-red-500">—</span>
              : `${service.latestResponseMs}ms`}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground">Last result</span>
          <span className={cn(
            'flex items-center gap-1 font-semibold',
            service.lastCheckSuccess ? 'text-green-600 dark:text-green-400' : 'text-red-500'
          )}>
            {service.lastCheckSuccess
              ? <><Wifi size={11} />Success</>
              : <><WifiOff size={11} />Failed</>}
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
            <span
              onClick={e => { e.preventDefault(); window.location.href = '/incidents' }}
              className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-600 transition-colors hover:bg-red-500/20 dark:text-red-400"
            >
              <Siren size={9} />Active Incident
            </span>
          )}
          {service.hasActiveAnomaly && (
            <span
              onClick={e => { e.preventDefault(); window.location.href = '/anomalies' }}
              className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-yellow-500/20 bg-yellow-500/10 px-2 py-0.5 text-[10px] font-semibold text-yellow-600 transition-colors hover:bg-yellow-500/20 dark:text-yellow-400"
            >
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

export function SkeletonServiceCard() {
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
