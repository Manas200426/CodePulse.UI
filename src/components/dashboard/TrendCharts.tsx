import { useMemo } from 'react'
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer,
} from 'recharts'
// recharts tooltip props — label is runtime-injected so we widen the type here
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RechartsTipProps = Record<string, any>
import type { DashboardServiceSummary } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const CHART_COLORS = ['#6366f1', '#22c55e', '#eab308', '#ef4444', '#8b5cf6', '#06b6d4']

const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`)

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Deterministic sin-wave value — no random(), stable across renders
function wave(base: number, hour: number, seed: number): number {
  return Math.max(0, Math.round(base + Math.sin(hour * 0.7 + seed * 1.3) * base * 0.25))
}

// ─── ChartTooltip ─────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: RechartsTipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg text-xs">
      <p className="mb-1.5 font-semibold text-foreground">{label}</p>
      {payload.map((entry: { name: string; value: number; color: string }) => (
        <div key={entry.name} className="flex items-center gap-2 py-0.5">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground truncate max-w-[120px]">{entry.name}</span>
          <span className="ml-auto font-semibold text-foreground tabular-nums">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

// ─── TrendCharts ──────────────────────────────────────────────────────────────

export function TrendCharts({ services }: { services: DashboardServiceSummary[] }) {
  // Cap at 4 services for readable charts
  const displayed = services.slice(0, 4)

  const axisStyle = { fontSize: 10, fill: 'var(--muted-foreground)' }

  const latencyData = useMemo(() =>
    HOURS.map((hour, i) => {
      const point: Record<string, string | number> = { hour }
      displayed.forEach((svc, idx) => {
        const base = svc.latestResponseMs || (80 + idx * 40)
        // Simulate a spike in the 10–12 window if the service is struggling
        const spikeMult = (svc.healthStatus !== 'Healthy' && i >= 10 && i <= 12) ? 3.5 : 1
        point[svc.name] = Math.round(wave(base, i, idx) * spikeMult)
      })
      return point
    }),
  [displayed])

  const errorData = useMemo(() =>
    HOURS.map((hour, i) => {
      const point: Record<string, string | number> = { hour }
      displayed.forEach((svc, idx) => {
        const base = svc.healthStatus === 'Down' ? 55 : svc.healthStatus === 'Degraded' ? 12 : 0.8
        const spike = (svc.hasActiveIncident && i >= 10 && i <= 12) ? 35 : 0
        point[svc.name] = parseFloat(Math.min(100, wave(base, i, idx) + spike).toFixed(1))
      })
      return point
    }),
  [displayed])

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

      {/* Latency Chart */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-foreground">Avg Response Time</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Simulated 24h trend · ms</p>
          </div>
          <div className="flex flex-wrap justify-end gap-x-3 gap-y-1">
            {displayed.map((svc, i) => (
              <span key={svc.id} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i] }} />
                {svc.name}
              </span>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={latencyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
            <XAxis dataKey="hour" tick={axisStyle} tickLine={false} axisLine={false} interval={5} />
            <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={40} unit="ms" />
            <ReTooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border)', strokeWidth: 1 }} />
            {displayed.map((svc, i) => (
              <Line
                key={svc.id}
                type="monotone"
                dataKey={svc.name}
                stroke={CHART_COLORS[i]}
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Error Rate Chart */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-foreground">Error Rate</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Simulated 24h trend · %</p>
          </div>
          <div className="flex flex-wrap justify-end gap-x-3 gap-y-1">
            {displayed.map((svc, i) => (
              <span key={svc.id} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i] }} />
                {svc.name}
              </span>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={errorData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              {displayed.map((svc, i) => (
                <linearGradient key={svc.id} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={CHART_COLORS[i]} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={CHART_COLORS[i]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
            <XAxis dataKey="hour" tick={axisStyle} tickLine={false} axisLine={false} interval={5} />
            <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={35} unit="%" />
            <ReTooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border)', strokeWidth: 1 }} />
            {displayed.map((svc, i) => (
              <Area
                key={svc.id}
                type="monotone"
                dataKey={svc.name}
                stroke={CHART_COLORS[i]}
                strokeWidth={1.5}
                fill={`url(#grad-${i})`}
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

    </div>
  )
}
