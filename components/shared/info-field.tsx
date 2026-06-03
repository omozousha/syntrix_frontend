import * as React from "react"
import { cn } from "@/lib/utils"

type InfoFieldProps = React.ComponentProps<"div"> & {
  label: React.ReactNode
  value?: React.ReactNode
  hint?: React.ReactNode
}

export function InfoField({ label, value = "-", hint, className, ...props }: InfoFieldProps) {
  return (
    <div className={cn("rounded-xl border bg-card p-3 text-card-foreground shadow-xs", className)} {...props}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 break-words text-sm font-medium">{value || "-"}</div>
      {hint ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{hint}</p> : null}
    </div>
  )
}
