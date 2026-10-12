import React, { useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { vi } from "date-fns/locale";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerStringProps {
  value?: string; // YYYY-MM-DD
  onChange: (value: string) => void; // YYYY-MM-DD
  className?: string;
  popoverClassName?: string;
  placeholder?: string;
}

export const DatePickerString: React.FC<DatePickerStringProps> = ({
  value,
  onChange,
  className,
  popoverClassName,
  placeholder = "Chọn ngày",
}) => {
  const [open, setOpen] = useState(false);

  const selectedDate: Date | undefined = (() => {
    if (!value) return undefined;
    const parts = value.split("-");
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return new Date(y, m, d);
      }
    }
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  })();

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    onChange(`${year}-${month}-${day}`);
    setOpen(false);
  };

  const label = selectedDate
    ? format(selectedDate, "dd/MM/yyyy")
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal gap-1.5 h-9 text-xs px-3 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800",
            !selectedDate && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="w-3.5 h-3.5 shrink-0 text-gray-500" />
          <span>{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-auto p-0 z-40", popoverClassName)} align="start" sideOffset={4}>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          defaultMonth={selectedDate ?? new Date()}
          locale={vi}
          captionLayout="dropdown"
          className="rounded-md border-0"
        />
      </PopoverContent>
    </Popover>
  );
};
