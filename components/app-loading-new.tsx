"use client";

import * as React from "react";
import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type AppLoadingVariant =
  | "card"
  | "fullscreen"
  | "page"
  | "table"
  | "inline"
  | "button"
  | "loading"
  | "empty"
  | "error";

export type AppLoadingStatus = "loading" | "empty" | "error";

export type AppLoadingProps = React.ComponentProps<"div"> & {
  variant?: AppLoadingVariant;
  status?: AppLoadingStatus;
  label?: React.ReactNode;
  fullscreen?: boolean;
  rows?: number;
};

export function AppLoading({
  variant = "card",
  status,
  label = "Sedang memuat data...",
  fullscreen = false,
  rows = 4,
  className,
  ...props
}: AppLoadingProps) {
  // Normalize legacy variant ("loading" | "empty" | "error") to status
  let resolvedStatus: AppLoadingStatus = status || "loading";
  let resolvedVariant: AppLoadingVariant = variant;

  if (variant === "empty" || variant === "error" || variant === "loading") {
    resolvedStatus = variant;
    resolvedVariant = fullscreen ? "fullscreen" : "card";
  } else if (fullscreen) {
    resolvedVariant = "fullscreen";
  }

  // 1. Button spinner (bare spinner for inside buttons)
  if (resolvedVariant === "button") {
    return (
      <Loader2
        className={cn("size-4 animate-spin shrink-0 [prefers-reduced-motion:reduce]:animate-none", className)}
        aria-hidden="true"
      />
    );
  }

  // 2. Inline spinner with label
  if (resolvedVariant === "inline") {
    return (
      <span
        className={cn("inline-flex items-center gap-2", className)}
        role="status"
        aria-live="polite"
      >
        <Loader2
          className="size-4 animate-spin text-muted-foreground shrink-0 [prefers-reduced-motion:reduce]:animate-none"
          aria-hidden="true"
        />
        {label ? (
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            {label}
          </span>
        ) : null}
      </span>
    );
  }

  // 3. Table skeleton rows
  if (resolvedVariant === "table") {
    return (
      <div
        className={cn("space-y-2", className)}
        role="status"
        aria-live="polite"
        {...props}
      >
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full rounded-xl" />
        ))}
        <span className="sr-only">{typeof label === "string" ? label : "Memuat tabel..."}</span>
      </div>
    );
  }

  // 4. Fullscreen or Page-level loader (Double-Bezel architecture)
  if (resolvedVariant === "fullscreen" || resolvedVariant === "page") {
    const isFullscreen = resolvedVariant === "fullscreen";
    return (
      <div
        className={cn(
          "flex w-full items-center justify-center p-4",
          isFullscreen ? "min-h-dvh bg-background" : "min-h-[60dvh]",
          className
        )}
        role="status"
        aria-live="polite"
        {...props}
      >
        <div className="rounded-2xl border border-border/40 bg-muted/10 p-1.5 shadow-xs dark:bg-white/[0.02]">
          <div className="flex min-w-[220px] flex-col items-center justify-center gap-3 rounded-[calc(1.25rem-0.25rem)] border border-border/60 bg-background px-8 py-6 shadow-xs glass-inset text-center">
            {resolvedStatus === "error" ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-2.5 text-destructive shadow-2xs">
                <AlertTriangle className="size-6" />
              </div>
            ) : resolvedStatus === "empty" ? (
              <div className="rounded-xl border border-border/50 bg-muted/30 p-2.5 text-muted-foreground shadow-2xs">
                <Inbox className="size-6" />
              </div>
            ) : (
              <Loader2 className="size-6 animate-spin text-primary [prefers-reduced-motion:reduce]:animate-none" />
            )}
            {label ? (
              <p
                className={cn(
                  "font-mono text-[10px] uppercase tracking-[0.15em]",
                  resolvedStatus === "error" ? "text-destructive" : "text-muted-foreground"
                )}
              >
                {label}
              </p>
            ) : null}
          </div>
        </div>
        <span className="sr-only">{typeof label === "string" ? label : "Memuat..."}</span>
      </div>
    );
  }

  // 5. Default Card loader (rounded-2xl glass-inset)
  return (
    <div
      className={cn(
        "relative flex min-h-28 flex-col items-center justify-center rounded-2xl border border-border/60 bg-card px-4 py-6 text-center shadow-2xs glass-inset",
        className
      )}
      role="status"
      aria-live="polite"
      {...props}
    >
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        {resolvedStatus === "error" ? (
          <div className="mb-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-2 text-destructive shadow-2xs">
            <AlertTriangle className="size-5" />
          </div>
        ) : resolvedStatus === "empty" ? (
          <div className="mb-2.5 rounded-xl border border-border/50 bg-muted/30 p-2 text-muted-foreground shadow-2xs">
            <Inbox className="size-5" />
          </div>
        ) : (
          <div className="mb-2.5 rounded-xl border border-border/50 bg-muted/30 p-2 text-primary shadow-2xs">
            <Loader2 className="size-5 animate-spin [prefers-reduced-motion:reduce]:animate-none" />
          </div>
        )}
        {label ? (
          <p
            className={cn(
              "font-mono text-[10px] uppercase tracking-[0.12em]",
              resolvedStatus === "error" ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {label}
          </p>
        ) : null}
      </div>
      <span className="sr-only">{typeof label === "string" ? label : "Memuat..."}</span>
    </div>
  );
}

// Named ergonomic helpers — all point to AppLoading
export function InlineLoader({ label = "Memuat...", className }: { label?: React.ReactNode; className?: string }) {
  return <AppLoading variant="inline" label={label} className={className} />;
}

export function ButtonLoader({ className }: { className?: string }) {
  return <AppLoading variant="button" className={className} />;
}

export function PageLoader({ title = "Memuat halaman...", className }: { title?: React.ReactNode; className?: string }) {
  return <AppLoading variant="page" label={title} className={className} />;
}

export function LoadingState({
  variant = "card",
  label = "Memuat data",
  rows = 4,
  className,
}: {
  variant?: "inline" | "card" | "table" | "page";
  label?: React.ReactNode;
  rows?: number;
  className?: string;
}) {
  return <AppLoading variant={variant} label={label} rows={rows} className={className} />;
}

export default AppLoading;
