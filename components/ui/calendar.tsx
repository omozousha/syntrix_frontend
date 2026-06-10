"use client"

import * as React from "react"
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-2", className)}
      classNames={{
        root: "w-fit",
        months: "flex flex-col gap-4 md:flex-row",
        month: "space-y-4",
        nav: "absolute inset-x-0 top-2 flex items-center justify-between px-2",
        month_caption: "flex h-8 items-center justify-center px-8",
        caption_label: "text-sm font-medium",
        button_previous: cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "size-7"),
        button_next: cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "size-7"),
        chevron: "size-4",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-8 rounded-md text-[0.75rem] font-normal text-muted-foreground",
        week: "mt-1 flex w-full",
        day: "relative size-8 p-0 text-center text-sm",
        day_button: cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "size-8 p-0 font-normal"),
        range_start:
          "[&_button]:bg-primary [&_button]:text-primary-foreground [&_button]:hover:bg-primary [&_button]:hover:text-primary-foreground",
        range_end:
          "[&_button]:bg-primary [&_button]:text-primary-foreground [&_button]:hover:bg-primary [&_button]:hover:text-primary-foreground",
        range_middle: "[&_button]:bg-accent [&_button]:text-accent-foreground [&_button]:rounded-none",
        selected:
          "[&_button]:bg-primary [&_button]:text-primary-foreground [&_button]:hover:bg-primary [&_button]:hover:text-primary-foreground",
        today: "[&_button]:bg-accent [&_button]:text-accent-foreground",
        outside: "text-muted-foreground opacity-50",
        disabled: "text-muted-foreground opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClassName, ...chevronProps }) => {
          const Icon = orientation === "left" ? ChevronLeft : orientation === "right" ? ChevronRight : ChevronDown
          return <Icon className={cn("size-4", chevronClassName)} {...chevronProps} />
        },
      }}
      {...props}
    />
  )
}

export { Calendar }
