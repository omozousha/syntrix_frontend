import * as React from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type InlineLoaderProps = React.ComponentProps<"span"> & {
  label?: React.ReactNode
}

export function InlineLoader({ label = "Memuat...", className, ...props }: InlineLoaderProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)} {...props}>
      <Loader2 className="size-4 animate-spin text-muted-foreground" />
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
    </span>
  )
}

type ButtonLoaderProps = React.ComponentProps<typeof Loader2>

export function ButtonLoader({ className, ...props }: ButtonLoaderProps) {
  return <Loader2 className={cn("size-4 animate-spin", className)} {...props} />
}
