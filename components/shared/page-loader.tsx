import * as React from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type PageLoaderProps = React.ComponentProps<"div"> & {
  title?: React.ReactNode
}

export function PageLoader({ title = "Memuat halaman...", className, ...props }: PageLoaderProps) {
  return (
    <div
      className={cn("flex min-h-[60dvh] w-full items-center justify-center p-4", className)}
      {...props}
    >
      <div className="rounded-2xl border border-border/40 bg-muted/10 p-1.5 shadow-xs dark:bg-white/[0.02]">
        <div className="flex flex-col items-center justify-center gap-3 rounded-[calc(1.25rem-0.25rem)] border border-border/60 bg-background px-6 py-8 shadow-xs glass-inset min-w-[200px]">
          <Loader2 className="size-8 animate-spin text-primary" />
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{title}</span>
        </div>
      </div>
    </div>
  )
}
