import * as React from "react";
import { cn } from "@/lib/utils";

export function NdSegmented<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
  size = "md",
  className,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      className={cn(
        "inline-flex items-stretch rounded-md border",
        className,
      )}
      style={{
        borderColor: "var(--nd-border-visible)",
        background: "var(--nd-surface-raised)",
        height: size === "sm" ? 32 : 40,
        overflow: "hidden",
      }}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            role="tab"
            aria-selected={isActive}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className="px-3 transition-colors"
            style={{
              fontFamily: "var(--font-nd-mono), 'Space Mono', monospace",
              fontSize: 11,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontWeight: 400,
              color: isActive
                ? disabled
                  ? "var(--nd-text-secondary)"
                  : "var(--nd-black)"
                : "var(--nd-text-secondary)",
              background: isActive ? "var(--nd-text-display)" : "transparent",
              borderRight: "1px solid var(--nd-border-visible)",
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled && !isActive ? 0.4 : 1,
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
