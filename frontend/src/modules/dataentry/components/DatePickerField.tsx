import React, { useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { vi } from "date-fns/locale";
import { format } from "date-fns";
import { Button } from "@/components/ui/button.tsx";
import { Calendar } from "@/components/ui/calendar.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { cn } from "@/utils/cn.ts";

interface DatePickerFieldProps {
  /** Tháng hiện tại (1-12) */
  month?: number | string;
  /** Ngày hiện tại (1-31) */
  day?: number | string;
  /** Callback khi chọn ngày — trả về tháng và ngày đã chọn */
  onChange: (month: number, day: number) => void;
  /** Lớp CSS tùy chỉnh cho trigger button */
  className?: string;
  /** Hiển thị lỗi */
  hasError?: boolean;
  /** Dạng hiển thị: compact (nhỏ gọn trong bảng) hoặc default */
  size?: "compact" | "default";
  /** Năm hiện tại để khởi tạo lịch */
  year?: number;
}

export const DatePickerField: React.FC<DatePickerFieldProps> = ({
  month,
  day,
  onChange,
  className,
  hasError,
  size = "default",
  year,
}) => {
  const [open, setOpen] = useState(false);

  // Xây dựng Date từ month + day (dùng năm hiện tại nếu không truyền)
  const currentYear = year ?? new Date().getFullYear();

  const selectedDate: Date | undefined = (() => {
    const m = Number(month);
    const d = Number(day);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return new Date(currentYear, m - 1, d);
    }
    return undefined;
  })();

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    onChange(date.getMonth() + 1, date.getDate());
    setOpen(false);
  };

  const label = selectedDate
    ? format(selectedDate, "dd/MM/yyyy")
    : size === "compact"
      ? "Chọn ngày"
      : "Chọn ngày tháng";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal gap-1.5",
            size === "compact"
              ? "h-8 w-full px-2 text-xs"
              : "h-9 w-full px-3 text-sm",
            !selectedDate && "text-muted-foreground",
            hasError &&
              "border-red-500 ring-1 ring-red-500 bg-red-50 dark:bg-red-950/20",
            "bg-white dark:bg-gray-900",
            className
          )}
        >
          <CalendarIcon
            className={cn(
              "shrink-0 text-muted-foreground",
              size === "compact" ? "w-3 h-3" : "w-4 h-4"
            )}
          />
          <span>{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
        sideOffset={4}
      >
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          defaultMonth={selectedDate ?? new Date(currentYear, (Number(month) || 1) - 1)}
          locale={vi}
          captionLayout="dropdown"
          startMonth={new Date(currentYear - 1, 0)}
          endMonth={new Date(currentYear + 1, 11)}
          className="rounded-md border-0"
        />
      </PopoverContent>
    </Popover>
  );
};
