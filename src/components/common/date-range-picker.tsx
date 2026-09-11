"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { addDays, format, isBefore } from "date-fns";
import type { DateRange } from "react-day-picker";

import { cn } from "~/lib/utils";
import { Button, type ButtonProps } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { CalendarPlus, CalendarRangeIcon } from "lucide-react";

interface DateRangePickerProps
  extends React.ComponentPropsWithoutRef<typeof PopoverContent> {
  dateRange?: DateRange;
  dayCount?: number;
  placeholder?: string;
  triggerVariant?: Exclude<ButtonProps["variant"], "destructive" | "link">;
  triggerSize?: Exclude<ButtonProps["size"], "icon">;
  triggerClassName?: string;
}

export function DateRangePicker({
  dateRange,
  dayCount,
  placeholder = "Pick a date",
  triggerVariant = "outline",
  triggerSize = "default",
  triggerClassName,
  className,
  ...props
}: DateRangePickerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [date, setDate] = React.useState<DateRange | undefined>(() => {
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    let fromDay: Date | undefined;
    let toDay: Date | undefined;

    if (dateRange) {
      fromDay = dateRange.from;
      toDay = dateRange.to;
    } else if (dayCount) {
      toDay = new Date();
      fromDay = addDays(toDay, -dayCount);
    }

    return {
      from: fromParam ? new Date(fromParam) : fromDay,
      to: toParam ? new Date(toParam) : toDay,
    };
  });

  React.useEffect(() => {
    const newSearchParams = new URLSearchParams(searchParams);
    if (date?.from) {
      newSearchParams.set("from", format(date.from, "yyyy-MM-dd"));
    } else {
      newSearchParams.delete("from");
    }

    if (date?.to) {
      newSearchParams.set("to", format(date.to, "yyyy-MM-dd"));
    } else {
      newSearchParams.delete("to");
    }

    router.replace(`${pathname}?${newSearchParams.toString()}`, {
      scroll: false,
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date?.from, date?.to]);

  return (
    <div className="flex flex-row items-center justify-end space-x-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={triggerVariant}
            size={triggerSize}
            className={cn(
              "w-full justify-start truncate text-left font-normal",
              !date?.from && "text-muted-foreground",
              triggerClassName,
            )}
          >
            <CalendarPlus className="mr-2 size-4" />
            {date?.from ? (
              format(date.from, "LLL dd, y")
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className={cn("w-auto p-0", className)} {...props}>
          <Calendar
            initialFocus
            mode="single"
            defaultMonth={date?.from}
            selected={date?.from}
            onSelect={(fromDate) =>
              setDate((prev) => {
                const newRange: DateRange = {
                  from: fromDate,
                  to:
                    prev?.to && isBefore(fromDate!, prev.to)
                      ? fromDate
                      : prev?.to,
                };
                return newRange;
              })
            }
          />
        </PopoverContent>
      </Popover>

      {date?.from && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={triggerVariant}
              size={triggerSize}
              className={cn(
                "w-full justify-start truncate text-left font-normal",
                !date?.to && "text-muted-foreground",
                triggerClassName,
              )}
            >
              <CalendarRangeIcon className="mr-2 size-4" />
              {date?.to ? format(date.to, "LLL dd, y") : <span>To date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className={cn("w-auto p-0", className)} {...props}>
            {date?.to ? (
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.to || date?.from}
                selected={date}
                onSelect={(selectedRange) =>
                  setDate({
                    from: selectedRange!.from,
                    to: selectedRange!.to,
                  })
                }
                numberOfMonths={2}
              />
            ) : (
              <Calendar
                initialFocus
                mode="single"
                defaultMonth={date?.from}
                selected={date?.to}
                onSelect={(toDate) =>
                  setDate((prev) => ({
                    from: prev?.from || toDate,
                    to: toDate,
                  }))
                }
              />
            )}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
