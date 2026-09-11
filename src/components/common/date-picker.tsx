"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";

import { cn } from "~/lib/utils";
import { Button, type ButtonProps } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { CalendarPlus } from "lucide-react";

interface DatePickerProps
  extends React.ComponentPropsWithoutRef<typeof PopoverContent> {
  date: Date | undefined;
  placeholder?: string;
  triggerVariant?: Exclude<ButtonProps["variant"], "destructive" | "link">;
  triggerSize?: Exclude<ButtonProps["size"], "icon">;
  triggerClassName?: string;
}

export function DatePicker({
  date,
  placeholder = "Pick a date",
  triggerVariant = "outline",
  triggerSize = "default",
  triggerClassName,
  className,
  ...props
}: DatePickerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    () => {
      const onParam = searchParams.get("on");
      return onParam ? new Date(onParam) : date;
    },
  );

  React.useEffect(() => {
    const newSearchParams = new URLSearchParams(searchParams);
    if (selectedDate) {
      newSearchParams.set("on", format(selectedDate, "yyyy-MM-dd"));
    } else {
      newSearchParams.delete("on");
    }

    router.replace(`${pathname}?${newSearchParams.toString()}`, {
      scroll: false,
    });
  }, [selectedDate, pathname, router, searchParams]);

  return (
    <div className="flex flex-row items-center justify-end space-x-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={triggerVariant}
            size={triggerSize}
            className={cn(
              "w-full justify-start truncate text-left font-normal",
              !selectedDate && "text-muted-foreground",
              triggerClassName,
            )}
          >
            <CalendarPlus className="mr-2 h-4 w-4" />
            {selectedDate ? (
              format(selectedDate, "LLL dd, y")
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className={cn("w-auto p-0", className)} {...props}>
          <Calendar
            initialFocus
            mode="single"
            defaultMonth={selectedDate}
            selected={selectedDate}
            onSelect={(dte) => {
              setSelectedDate(dte);
              // Optionally close the Popover after selection
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
