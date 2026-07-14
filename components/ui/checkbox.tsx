"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

/**
 * Standard Shadcn-styled checkbox component.
 * Supports controlled (`checked` + `onCheckedChange`) usage.
 */
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    return (
      <label
        className={cn(
          "inline-flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-sm border transition-colors",
          checked
            ? "bg-primary border-primary text-primary-foreground"
            : "border-input bg-background hover:border-foreground/40",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      >
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          onChange={(event) => {
            if (onCheckedChange) {
              onCheckedChange(event.target.checked);
            }
          }}
          className="sr-only"
          {...props}
        />
        {checked && <Check className="size-3" strokeWidth={3} aria-hidden />}
      </label>
    );
  },
);
Checkbox.displayName = "Checkbox";
