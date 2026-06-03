import * as React from "react"
import { Inbox } from "lucide-react"
import { cn } from "@/lib/utils"

type EmptyStateProps = React.ComponentProps<"div"> & {
  icon?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
}

export function EmptyState({ icon, title, description, action, className, ...props }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 p-6 text-center",
        className
      )}
      {...props}
    >
      <div className="mb-3 flex size-10 items-center justify-center rounded-lg border bg-background text-muted-foreground shadow-xs">
        {icon || <Inbox className="size-4" />}
      </div>
      <p className="text-sm font-medium">{title}</p>
      {description ? <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
