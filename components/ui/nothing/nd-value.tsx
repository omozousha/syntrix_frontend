import * as React from "react";
import type { NdTextColor } from "./nothing-types";

const TEXT_COLOR: Record<NdTextColor, string> = {
  primary: "var(--nd-text-primary)",
  secondary: "var(--nd-text-secondary)",
  disabled: "var(--nd-text-disabled)",
  display: "var(--nd-text-display)",
  accent: "var(--nd-accent)",
  success: "var(--nd-success)",
  warning: "var(--nd-warning)",
  info: "var(--nd-info)",
};

export function NdValue({
  children,
  color = "primary",
  size = "md",
  unit,
  asLink = false,
  mono = true,
  className,
  ...rest
}: {
  children: React.ReactNode;
  color?: NdTextColor;
  size?: "sm" | "md" | "lg";
  unit?: string;
  asLink?: boolean;
  mono?: boolean;
} & React.HTMLAttributes<HTMLSpanElement>) {
  const fontSize = size === "sm" ? 12 : size === "lg" ? 18 : 14;
  return (
    <span
      className={className}
      style={{
        fontFamily: mono
          ? "var(--font-nd-mono), 'Space Mono', monospace"
          : "var(--font-nd-body), 'Space Grotesk', system-ui, sans-serif",
        fontSize,
        lineHeight: 1.3,
        color: asLink ? "var(--nd-interactive)" : TEXT_COLOR[color],
        textDecoration: asLink ? "underline" : "none",
        textUnderlineOffset: 2,
        fontVariantNumeric: "tabular-nums",
      }}
      {...rest}
    >
      {children}
      {unit ? (
        <span
          style={{
            fontFamily: "var(--font-nd-mono), 'Space Mono', monospace",
            fontSize: 9,
            letterSpacing: "0.08em",
            color: "var(--nd-text-disabled)",
            marginLeft: 6,
            textTransform: "uppercase",
          }}
        >
          {unit}
        </span>
      ) : null}
    </span>
  );
}
