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

export function NdLabel({
  children,
  required = false,
  hint = false,
  color = "secondary",
  className,
  ...rest
}: {
  children: React.ReactNode;
  required?: boolean;
  hint?: boolean;
  color?: NdTextColor;
} & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={className}
      style={{
        fontFamily: "var(--font-nd-mono), 'Space Mono', monospace",
        fontSize: "var(--nd-label-size)",
        lineHeight: 1.2,
        letterSpacing: "var(--nd-label-tracking)",
        textTransform: "uppercase",
        color: TEXT_COLOR[color],
        fontWeight: 400,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
      {...rest}
    >
      {children}
      {required ? (
        <span
          aria-hidden
          style={{ color: "var(--nd-accent)", fontFamily: "inherit" }}
        >
          *
        </span>
      ) : null}
      {hint ? (
        <span
          aria-hidden
          style={{
            color: "var(--nd-text-disabled)",
            fontFamily: "inherit",
            fontSize: 9,
            letterSpacing: "0.08em",
          }}
        >
          [HINT]
        </span>
      ) : null}
    </span>
  );
}
