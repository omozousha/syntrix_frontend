import * as React from "react";

export function NdHero({
  children,
  size = "lg",
  className,
}: {
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
} & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={className}
      style={{
        fontFamily: "var(--font-nd-display), 'Doto', 'Space Mono', monospace",
        color: "var(--nd-text-display)",
        letterSpacing: "-0.02em",
        lineHeight: 1.05,
        fontWeight: 500,
        fontSize: size === "xl" ? 64 : size === "lg" ? 48 : size === "md" ? 36 : 24,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {children}
    </span>
  );
}
