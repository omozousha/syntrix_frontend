import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type StatusTone = "neutral" | "info" | "success" | "warning" | "danger"

type StatusBadgeProps = React.ComponentProps<typeof Badge> & {
  status?: string | null
  tone?: StatusTone
}

function inferTone(status?: string | null): StatusTone {
  const value = String(status || "").toLowerCase()
  if (!value) return "neutral"
  if (value.includes("reject") || value.includes("invalid") || value.includes("failed") || value.includes("down")) return "danger"
  if (value.includes("pending") || value.includes("ongoing") || value.includes("draft") || value.includes("warning")) return "warning"
  if (value.includes("valid") || value.includes("approve") || value.includes("active") || value.includes("success")) return "success"
  if (value.includes("review") || value.includes("progress")) return "info"
  return "neutral"
}

const toneClass: Record<StatusTone, string> = {
  neutral: "border-border bg-muted text-muted-foreground",
  info: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/35 dark:text-blue-200",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/35 dark:text-emerald-200",
  warning: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-200",
  danger: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/35 dark:text-rose-200",
}

export function StatusBadge({ status, tone, className, children, ...props }: StatusBadgeProps) {
  const resolvedTone = tone || inferTone(status)
  return (
    <Badge variant="outline" className={cn("capitalize", toneClass[resolvedTone], className)} {...props}>
      {children || String(status || "-").replaceAll("_", " ")}
    </Badge>
  )
}
