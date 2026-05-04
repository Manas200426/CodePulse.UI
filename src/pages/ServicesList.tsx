import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search, ServerCrash } from 'lucide-react'
import { api } from '@/lib/api'
import type { MonitoredService, DashboardServiceSummary } from '@/types'
import { Button } from '@/components/ui/button'
import { ServiceDetailPanel } from './ServiceDetailPanel'

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isDesktop
}

type HealthStatus = 'Healthy' | 'Degraded' | 'Down'

function StatusDot({ status }: { status: HealthStatus | undefined }) {
  const colors: Record<HealthStatus, string> = {
    Healthy: 'bg-green-500',
    Degraded: 'bg-yellow-500',
    Down: 'bg-red-500',
  }
  return (
    <span
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${status ? colors[status] : 'bg-muted-foreground/30'}`}
    />
  )
}

function StatusBadge({ status }: { status: HealthStatus | undefined }) {
  if (!status) return null
  const styles: Record<HealthStatus, string> = {
    Healthy:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    Degraded: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    Down:     'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }
  return (
    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${styles[status]}`}>
      {status}
    </span>
  )
}

export function ServicesList() {
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()

  const [services, setServices] = useState<MonitoredService[]>([])
  const [healthMap, setHealthMap] = useState<Map<string, DashboardServiceSummary>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  function load() {
    setLoading(true)
    Promise.all([api.services.list(), api.dashboard.summary()])
      .then(([svcs, summary]) => {
        setServices(svcs)
        const map = new Map<string, DashboardServiceSummary>()
        for (const ds of summary.services) map.set(ds.id, ds)
        setHealthMap(map)
        if (svcs.length > 0 && selectedId === null) {
          setSelectedId(svcs[0].id)
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = services.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  )

  function handleServiceClick(svc: MonitoredService) {
    if (isDesktop) {
      setSelectedId(svc.id)
    } else {
      navigate(`/services/${svc.id}`)
    }
  }

  function handleDelete() {
    setServices(prev => prev.filter(s => s.id !== selectedId))
    setSelectedId(null)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Desktop master-detail ── */}
      <div className="hidden lg:flex h-full overflow-hidden">
        {/* Left panel */}
        <div className="flex w-80 shrink-0 flex-col border-r border-border bg-card">
          {/* Panel header */}
          <div className="border-b border-border px-4 py-3">
            <div className="flex items-center justify-between mb-2.5">
              <h1 className="text-sm font-semibold">Services</h1>
              <Button size="sm" asChild>
                <Link to="/services/new">
                  <Plus size={13} className="mr-1" />Add
                </Link>
              </Button>
            </div>
            {/* Search */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Filter services…"
                className="w-full rounded-md border border-border bg-background py-1.5 pl-8 pr-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          {/* Service list */}
          <div className="flex-1 overflow-y-auto">
            {loading && (
              <p className="px-4 py-6 text-center text-xs text-muted-foreground">Loading…</p>
            )}
            {error && (
              <p className="px-4 py-4 text-xs text-destructive">Error: {error}</p>
            )}
            {!loading && !error && filtered.length === 0 && (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-muted-foreground">
                <ServerCrash size={22} strokeWidth={1.5} />
                <p className="text-xs">
                  {search ? 'No services match your search.' : 'No services yet.'}
                </p>
                {!search && (
                  <Link to="/services/new" className="text-xs underline text-foreground">
                    Add one
                  </Link>
                )}
              </div>
            )}
            {!loading && filtered.map(svc => {
              const ds = healthMap.get(svc.id)
              const status = ds?.healthStatus
              const isSelected = selectedId === svc.id
              return (
                <button
                  key={svc.id}
                  onClick={() => handleServiceClick(svc)}
                  className={`flex w-full items-center gap-2.5 border-b border-border/50 px-4 py-3 text-left transition-colors last:border-0 ${
                    isSelected
                      ? 'bg-primary/8 dark:bg-primary/10'
                      : 'hover:bg-muted/40'
                  }`}
                >
                  <StatusDot status={status} />
                  <span className={`min-w-0 flex-1 truncate text-sm ${isSelected ? 'font-semibold' : 'font-medium'}`}>
                    {svc.name}
                  </span>
                  <StatusBadge status={status} />
                </button>
              )
            })}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 overflow-hidden">
          {selectedId !== null ? (
            <ServiceDetailPanel
              key={selectedId}
              serviceId={selectedId}
              onDelete={handleDelete}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <ServerCrash size={32} strokeWidth={1.25} />
              <p className="text-sm">Select a service to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile list-only view ── */}
      <div className="flex flex-col lg:hidden">
        {/* Header */}
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center justify-between mb-2.5">
            <h1 className="text-base font-semibold">Services</h1>
            <Button size="sm" asChild>
              <Link to="/services/new">
                <Plus size={13} className="mr-1" />Add Service
              </Link>
            </Button>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter services…"
              className="w-full rounded-md border border-border bg-background py-1.5 pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        <div className="divide-y divide-border/50">
          {loading && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">Loading…</p>
          )}
          {error && (
            <p className="px-4 py-4 text-sm text-destructive">Error: {error}</p>
          )}
          {!loading && !error && filtered.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-muted-foreground">
              <ServerCrash size={24} strokeWidth={1.5} />
              <p className="text-sm">
                {search ? 'No services match your search.' : (
                  <>No services yet. <Link to="/services/new" className="underline text-foreground">Add one</Link>.</>
                )}
              </p>
            </div>
          )}
          {!loading && filtered.map(svc => {
            const ds = healthMap.get(svc.id)
            const status = ds?.healthStatus
            return (
              <Link
                key={svc.id}
                to={`/services/${svc.id}`}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30"
              >
                <StatusDot status={status} />
                <span className="flex-1 font-medium text-sm">{svc.name}</span>
                <StatusBadge status={status} />
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
