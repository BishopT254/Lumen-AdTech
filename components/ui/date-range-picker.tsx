"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DatePickerWithRangeProps {
  className?: string
  // Support both 'dateRange' and 'value' props for compatibility
  dateRange?: DateRange
  value?: DateRange
  // Support both 'onDateRangeChange' and 'onChange' props
  onDateRangeChange?: (dateRange: DateRange | undefined) => void
  onChange?: (dateRange: DateRange | undefined) => void
  // Add additional props that might be passed from parent components
  align?: string
  locale?: string
  placeholder?: string
}

export function DatePickerWithRange({
  className,
  dateRange,
  value,
  onDateRangeChange,
  onChange,
  align = "start",
  locale,
  placeholder = "Pick a date range",
  ...otherProps
}: DatePickerWithRangeProps) {
  // Use either value or dateRange, with value taking precedence
  const initialRange = value || dateRange
  const [date, setDate] = React.useState<DateRange | undefined>(initialRange)

  // Update internal state if external value/dateRange changes
  React.useEffect(() => {
    const newValue = value || dateRange
    if (newValue && (
      date?.from !== newValue.from || 
      date?.to !== newValue.to
    )) {
      setDate(newValue)
    }
  }, [value, dateRange, date])

  const handleDateChange = (newDate: DateRange | undefined) => {
    setDate(newDate)
    // Call both onChange handlers for maximum compatibility
    if (onDateRangeChange) {
      onDateRangeChange(newDate)
    }
    if (onChange) {
      onChange(newDate)
    }
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn("w-[300px] justify-start text-left font-normal", !date && "text-muted-foreground")}
            {...otherProps}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align={align}>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleDateChange}
            numberOfMonths={2}
            locale={locale}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}