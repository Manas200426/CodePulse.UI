import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Play, Pencil, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import type { MonitoredService } from '@/types'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'

export function ServicesList() {
  const [services, setServices] = useState<MonitoredService[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [runningId, setRunningId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  function load() {
    setLoading(true)
    api.services.list()
      .then(setServices)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleRunCheck(id: number) {
    setRunningId(id)
    try { await api.services.runCheck(id) } finally { setRunningId(null) }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Delete "${name}"?`)) return
    setDeletingId(id)
    try {
      await api.services.delete(id)
      setServices(prev => prev.filter(s => s.id !== id))
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Services"
        description="Manage and monitor your services"
        actions={
          <Button asChild size="sm">
            <Link to="/services/new"><Plus size={14} className="mr-1" />Add Service</Link>
          </Button>
        }
      />

      <div className="p-6">
        {loading && <p className="text-muted-foreground text-sm">Loading...</p>}
        {error && <p className="text-destructive text-sm">Error: {error}</p>}

        {!loading && !error && (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">URL</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Interval</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Active</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.map(svc => (
                  <tr key={svc.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <Link to={`/services/${svc.id}`} className="font-medium text-foreground hover:underline">
                        {svc.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                      {svc.baseUrl}{svc.healthEndpoint}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{svc.checkIntervalSeconds}s</td>
                    <td className="px-4 py-3">
                      <span className={svc.isActive ? 'text-green-600' : 'text-muted-foreground'}>
                        {svc.isActive ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleRunCheck(svc.id)}
                          disabled={runningId === svc.id}
                          title="Run check now"
                          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                        >
                          <Play size={14} />
                        </button>
                        <Link
                          to={`/services/${svc.id}/edit`}
                          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Pencil size={14} />
                        </Link>
                        <button
                          onClick={() => handleDelete(svc.id, svc.name)}
                          disabled={deletingId === svc.id}
                          title="Delete service"
                          className="rounded p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {services.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No services yet.{' '}
                      <Link to="/services/new" className="underline text-foreground">Add one</Link>.
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
