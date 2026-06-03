import * as React from "react"
import { cn } from "@/lib/utils"

type MetricTileProps = React.ComponentProps<"div"> & {
  icon?: React.ReactNode
  label: React.ReactNode
  value: React.ReactNode
  description?: React.ReactNode
}

export function MetricTile({ icon, label, value, description, className, ...props }: MetricTileProps) {
  return (
    <div className={cn("rounded-xl border bg-card p-3 text-card-foreground shadow-xs", className)} {...props}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
        </div>
        {icon ? <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">{icon}</div> : null}
      </div>
      {description ? <p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p> : null}
    </div>
  )
}
