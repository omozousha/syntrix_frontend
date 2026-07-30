"use client";

import * as React from "react";
import { ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type SimpleDropdownOption = {
  label: string;
  value: string;
};

type SimpleDropdownProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: SimpleDropdownOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function SimpleDropdown({
  value,
  onValueChange,
  options,
  placeholder = "Pilih",
  disabled = false,
  className,
}: SimpleDropdownProps) {
  const selectedLabel = options.find((o) => o.value === value)?.label || placeholder;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button
          type="button"
          variant="outline"
          className={cn("w-full justify-between font-normal bg-background", className)}
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-(--radix-dropdown-menu-trigger-width)">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => onValueChange(option.value)}
            className={cn(value === option.value && "bg-accent font-medium")}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
