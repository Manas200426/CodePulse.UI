import { PageHeader } from '@/components/ui/page-header'

export function Insights() {
  return (
    <div className="flex flex-col">
      <PageHeader
        title="Insights"
        description="Auto-generated system intelligence"
      />
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <span className="text-4xl">🧠</span>
        <p className="text-sm font-medium text-foreground">Coming soon</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          The Insights page will surface auto-generated conclusions — root cause champions,
          health scores, dependency maps, and anomaly frequency summaries.
        </p>
      </div>
    </div>
  )
}
