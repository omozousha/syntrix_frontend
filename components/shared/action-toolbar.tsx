import * as React from "react"
import { cn } from "@/lib/utils"

type ActionToolbarProps = React.ComponentProps<"div"> & {
  align?: "start" | "end" | "between"
}

export function ActionToolbar({ align = "end", className, ...props }: ActionToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        align === "end" && "justify-end",
        align === "between" && "justify-between",
        align === "start" && "justify-start",
        className
      )}
      {...props}
    />
  )
}
