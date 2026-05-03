import { createContext, useContext, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { DashboardSummary } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export type HealthStatus = 'healthy' | 'degraded' | 'down' | 'loading' | 'error'

interface SystemHealthContextValue {
  summary: DashboardSummary | null
  status: HealthStatus
}

// ─── Context ──────────────────────────────────────────────────────────────────

const SystemHealthContext = createContext<SystemHealthContextValue>({
  summary: null,
  status: 'loading',
})

// ─── Provider ─────────────────────────────────────────────────────────────────

interface SystemHealthProviderProps {
  children: React.ReactNode
  pollMs?: number
}

export function SystemHealthProvider({ children, pollMs = 15_000 }: SystemHealthProviderProps) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [status, setStatus] = useState<HealthStatus>('loading')

  useEffect(() => {
    let cancelled = false

    async function fetchHealth() {
      try {
        const data = await api.dashboard.summary()
        if (cancelled) return
        setSummary(data)
        if (data.downServices > 0) {
          setStatus('down')
        } else if (data.degradedServices > 0 || data.activeAnomalies > 0) {
          setStatus('degraded')
        } else {
          setStatus('healthy')
        }
      } catch {
        if (!cancelled) setStatus('error')
      }
    }

    fetchHealth()
    const id = setInterval(fetchHealth, pollMs)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [pollMs])

  return (
    <SystemHealthContext.Provider value={{ summary, status }}>
      {children}
    </SystemHealthContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSystemHealth() {
  return useContext(SystemHealthContext)
}
