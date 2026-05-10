import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCountUp } from '@/hooks/useCountUp'

export type StatVariant = 'default' | 'red' | 'yellow' | 'green'

const STAT_STYLES: Record<StatVariant, { card: string; iconWrap: string; icon: string; value: string }> = {
  default: { card: 'bg-card border-border',                                      iconWrap: 'bg-muted',          icon: 'text-foreground',                     value: 'text-foreground' },
  red:     { card: 'bg-red-500/5 border-red-500/25 dark:bg-red-500/10',          iconWrap: 'bg-red-500/10',     icon: 'text-red-600 dark:text-red-400',      value: 'text-red-700 dark:text-red-300' },
  yellow:  { card: 'bg-yellow-500/5 border-yellow-500/25 dark:bg-yellow-500/10', iconWrap: 'bg-yellow-500/10',  icon: 'text-yellow-600 dark:text-yellow-400', value: 'text-yellow-700 dark:text-yellow-300' },
  green:   { card: 'bg-green-500/5 border-green-500/25 dark:bg-green-500/10',    iconWrap: 'bg-green-500/10',   icon: 'text-green-600 dark:text-green-400',   value: 'text-green-700 dark:text-green-300' },
}

interface PulseStatCardProps {
  label: string
  value: number
  icon: LucideIcon
  variant?: StatVariant
  to?: string
}

export function PulseStatCard({ label, value, icon: Icon, variant = 'default', to }: PulseStatCardProps) {
  const animated = useCountUp(value)
  const s = STAT_STYLES[variant]

  const inner = (
    <div className={cn(
      'group flex flex-col gap-3 rounded-xl border p-4 transition-all duration-200',
      s.card, to && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5'
    )}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', s.iconWrap)}>
          <Icon size={15} className={s.icon} />
        </div>
      </div>
      <div className="flex items-end gap-1.5">
        <span className={cn('text-3xl font-bold tabular-nums leading-none', s.value)}>{animated}</span>
        {to && (
          <ArrowRight
            size={14}
            className="mb-0.5 text-muted-foreground/0 transition-all group-hover:text-muted-foreground/60 group-hover:translate-x-0.5"
          />
        )}
      </div>
    </div>
  )

  return to ? <Link to={to} className="block">{inner}</Link> : inner
}

export function SkeletonStatCard() {
  return (
    <div className="flex animate-pulse flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 rounded-md bg-muted" />
        <div className="h-8 w-8 rounded-lg bg-muted" />
      </div>
      <div className="h-8 w-12 rounded-md bg-muted" />
    </div>
  )
}
