import * as React from "react"
import { Loader2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type LoadingStateProps = React.ComponentProps<"div"> & {
  variant?: "inline" | "card" | "table" | "page"
  label?: React.ReactNode
  rows?: number
}

export function LoadingState({ variant = "card", label = "Memuat data", rows = 4, className, ...props }: LoadingStateProps) {
  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)} {...props}>
        <Loader2 className="size-4 animate-spin" />
        <span>{label}</span>
      </div>
    )
  }

  if (variant === "table") {
    return (
      <div className={cn("space-y-2", className)} {...props}>
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex min-h-48 flex-col justify-center rounded-xl border bg-card p-4 text-card-foreground shadow-xs",
        variant === "page" && "min-h-[60dvh]",
        className
      )}
      {...props}
    >
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        <span>{label}</span>
      </div>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className={cn("h-9", index % 3 === 0 ? "w-3/4" : "w-full")} />
        ))}
      </div>
    </div>
  )
}
