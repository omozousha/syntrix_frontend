import * as React from "react"
import { cn } from "@/lib/utils"

type SectionHeaderProps = React.ComponentProps<"div"> & {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
}

export function SectionHeader({ title, description, actions, className, ...props }: SectionHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between", className)} {...props}>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
        {description ? <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
