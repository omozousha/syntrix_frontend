import * as React from "react";
import { cn } from "@/lib/utils";

export function NdCard({
  children,
  className,
  elevated = false,
  padding = "md",
}: {
  children: React.ReactNode;
  className?: string;
  elevated?: boolean;
  padding?: "sm" | "md" | "lg";
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(className)}
      style={{
        background: elevated
          ? "var(--nd-surface-raised)"
          : "var(--nd-surface)",
        border: "1px solid var(--nd-border)",
        borderRadius: 12,
        padding:
          padding === "sm" ? 12 : padding === "lg" ? 24 : 16,
      }}
    >
      {children}
    </div>
  );
}

export function NdCardSection({
  children,
  title,
  className,
}: {
  children: React.ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <section className={cn("space-y-2", className)}>
      {title && (
        <header className="space-y-1">
          <span
            className="nd-label"
            style={{ fontSize: 11, color: "var(--nd-text-secondary)" }}
          >
            {title}
          </span>
          <div
            style={{
              borderTop: "1px solid var(--nd-border-visible)",
              marginTop: 4,
            }}
          />
        </header>
      )}
      <div className="space-y-3">{children}</div>
    </section>
  );
}
