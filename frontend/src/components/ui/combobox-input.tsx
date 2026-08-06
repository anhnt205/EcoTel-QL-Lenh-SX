import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Input } from "./input";
import { Button } from "./button";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComboboxInputProps {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  hasError?: boolean;
}

export const ComboboxInput: React.FC<ComboboxInputProps> = ({
  value,
  onChange,
  options,
  placeholder = "Chọn hoặc nhập...",
  className,
  disabled = false,
  hasError = false,
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes((searchTerm || value || "").toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full flex items-center">
          <Input
            value={value || ""}
            disabled={disabled}
            onChange={(e) => {
              onChange(e.target.value);
              setSearchTerm(e.target.value);
              if (!open) setOpen(true);
            }}
            placeholder={placeholder}
            className={cn(
              "h-8 text-xs pr-8 bg-white dark:bg-gray-900 transition-colors",
              hasError && "border-red-500 ring-1 ring-red-500 bg-red-50/50 dark:bg-red-950/20",
              className
            )}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => setOpen(!open)}
            className="absolute right-0 top-0 h-8 w-7 px-0 text-gray-400 hover:text-gray-600 hover:bg-transparent"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </Button>
        </div>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[220px] p-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg max-h-56 overflow-y-auto"
      >
        <div className="text-[10px] text-gray-400 font-semibold px-2 py-1 uppercase tracking-wider">
          Gợi ý danh mục / Tự do
        </div>
        {filteredOptions.length === 0 ? (
          <div className="px-2 py-1.5 text-xs text-gray-500 italic">
            Nhấn Enter để dùng "{value}"
          </div>
        ) : (
          filteredOptions.map((opt) => (
            <div
              key={opt}
              onClick={() => {
                onChange(opt);
                setSearchTerm(opt);
                setOpen(false);
              }}
              className={cn(
                "flex items-center justify-between px-2.5 py-1.5 text-xs rounded cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors",
                value === opt && "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold"
              )}
            >
              <span>{opt}</span>
              {value === opt && <Check className="w-3.5 h-3.5 text-emerald-600" />}
            </div>
          ))
        )}
      </PopoverContent>
    </Popover>
  );
};
