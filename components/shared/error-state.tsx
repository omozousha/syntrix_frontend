import * as React from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ErrorStateProps = React.ComponentProps<"div"> & {
  title?: React.ReactNode
  description?: React.ReactNode
  retryLabel?: string
  onRetry?: () => void
}

export function ErrorState({
  title = "Data gagal dimuat",
  description = "Periksa koneksi lalu coba lagi.",
  retryLabel = "Coba lagi",
  onRetry,
  className,
  ...props
}: ErrorStateProps) {
  return (
    <div className={cn("rounded-xl border border-destructive/20 bg-destructive/5 p-4", className)} {...props}>
      <div className="flex gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
          <AlertTriangle className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-destructive">{title}</p>
          {description ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p> : null}
          {onRetry ? (
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onRetry}>
              {retryLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
