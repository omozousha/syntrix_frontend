import * as React from "react";
import { cn } from "@/lib/utils";

export function NdDivider({
  className,
  vertical = false,
}: {
  className?: string;
  vertical?: boolean;
}) {
  return (
    <div
      className={cn(className)}
      style={{
        background: "var(--nd-border-visible)",
        ...(vertical
          ? { width: 1, height: "100%" }
          : { height: 1, width: "100%" }),
      }}
      role="separator"
      aria-orientation={vertical ? "vertical" : "horizontal"}
    />
  );
}
