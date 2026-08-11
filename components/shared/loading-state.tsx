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
      <div className={cn("flex items-center gap-2", className)} {...props}>
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
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

  const isPage = variant === "page"

  return (
    <div
      className={cn(
        "flex flex-col justify-center rounded-2xl border border-border/60 bg-card shadow-2xs glass-inset",
        isPage ? "min-h-[60dvh]" : "min-h-48",
        className
      )}
      {...props}
    >
      <div className="mb-4 flex items-center gap-2 px-4 pt-4">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
      </div>
      <div className="space-y-2 px-4 pb-4">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className={cn("h-9", index % 3 === 0 ? "w-3/4" : "w-full")} />
        ))}
      </div>
    </div>
  )
}
