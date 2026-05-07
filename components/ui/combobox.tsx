"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"

export type ComboboxOption = {
  label: string
  value: string
}

type ComboboxProps = {
  value: string
  onValueChange: (value: string) => void
  options: ComboboxOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  className?: string
  triggerClassName?: string
}

export function Combobox({
  value,
  onValueChange,
  options,
  placeholder = "Pilih opsi",
  searchPlaceholder = "Cari...",
  emptyText = "Tidak ada data.",
  disabled = false,
  className,
  triggerClassName,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")

  React.useEffect(() => {
    // Reset search when option set changes (for dependent combobox: province -> city).
    setQuery("")
  }, [options])

  const selectedLabel =
    options.find((option) => option.value === value)?.label || placeholder

  const filtered = React.useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return options
    return options.filter((option) => option.label.toLowerCase().includes(keyword))
  }, [options, query])

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) setQuery("")
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between font-normal", triggerClassName)}
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-(--radix-popover-trigger-width) p-2", className)} align="start">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          className="mb-2 h-8"
        />
        <ScrollArea className="h-64 pr-1">
          <div className="space-y-1">
            {filtered.length ? (
              filtered.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant="ghost"
                  className="w-full justify-start text-left"
                  onClick={() => {
                    onValueChange(option.value)
                    setOpen(false)
                    setQuery("")
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 size-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{option.label}</span>
                </Button>
              ))
            ) : (
              <p className="px-2 py-3 text-sm text-muted-foreground">{emptyText}</p>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
