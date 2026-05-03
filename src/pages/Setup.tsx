import { useState } from 'react'
import { TriangleAlert, PlugZap } from 'lucide-react'
import { api } from '@/lib/api'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'

export function Setup() {
  const [resetting, setResetting] = useState(false)
  const [resetDone, setResetDone] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)

  async function handleReset() {
    if (!confirm('This will delete all monitoring data and reseed. Are you sure?')) return
    setResetting(true)
    setResetError(null)
    setResetDone(false)
    try {
      await api.setup.reset()
      setResetDone(true)
    } catch (e: unknown) {
      setResetError(e instanceof Error ? e.message : 'Reset failed')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Setup"
        description="Developer tools and database controls"
      />

      <div className="space-y-4 p-6 max-w-lg">

        {/* Connection card */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
              <PlugZap size={15} className="text-foreground" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-foreground">Backend Connection</p>
              <p className="text-xs text-muted-foreground font-mono">
                http://localhost:5084/api
              </p>
            </div>
          </div>
        </div>

        {/* Reset card */}
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-destructive/10">
              <TriangleAlert size={15} className="text-destructive" />
            </div>
            <div className="flex-1 space-y-2">
              <div>
                <p className="text-sm font-medium text-foreground">Database Reset</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Wipes all monitoring data and reseeds with sample services. Cannot be undone.
                </p>
              </div>

              {resetDone && (
                <p className="text-xs font-medium text-green-600 dark:text-green-400">
                  ✓ Database reset and reseeded successfully.
                </p>
              )}
              {resetError && (
                <p className="text-xs text-destructive">{resetError}</p>
              )}

              <Button
                variant="destructive"
                size="sm"
                onClick={handleReset}
                disabled={resetting}
              >
                {resetting ? 'Resetting…' : 'Reset Database'}
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
