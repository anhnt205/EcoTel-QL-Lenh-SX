import React, { useState, useRef, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover.tsx";
import { Input } from "./input.tsx";
import { Button } from "./button.tsx";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils.ts";

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxInputProps {
  value: string;
  onChange: (val: string) => void;
  options: (string | ComboboxOption)[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  hasError?: boolean;
}

export const ComboboxInput: React.FC<ComboboxInputProps> = ({
  value,
  onChange,
  options,
  placeholder = "",
  className,
  disabled = false,
  hasError = false,
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const normalizedOptions: ComboboxOption[] = options.map((opt) =>
    typeof opt === "string" ? { value: opt, label: opt } : opt,
  );

  const filteredOptions = normalizedOptions.filter(
    (opt) =>
      opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opt.value.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Auto reset highlightedIndex to 0 whenever search term, open state, or filtered options change
  useEffect(() => {
    if (open && filteredOptions.length > 0) {
      setHighlightedIndex(0);
    } else {
      setHighlightedIndex(-1);
    }
  }, [searchTerm, open, filteredOptions.length]);

  // Scroll active/highlighted item into view
  useEffect(() => {
    if (open && listRef.current && highlightedIndex >= 0) {
      const items = listRef.current.querySelectorAll<HTMLDivElement>("[data-combobox-item]");
      const activeEl = items[highlightedIndex];
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, open]);

  const handleSelect = (optVal: string) => {
    onChange(optVal);
    setSearchTerm("");
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setOpen(true);
        setHighlightedIndex(0);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (filteredOptions.length > 0) {
        setHighlightedIndex((prev) => (prev + 1) % filteredOptions.length);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (filteredOptions.length > 0) {
        setHighlightedIndex(
          (prev) => (prev - 1 + filteredOptions.length) % filteredOptions.length
        );
      }
    } else if (e.key === "Enter") {
      if (filteredOptions.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        const targetIdx =
          highlightedIndex >= 0 && highlightedIndex < filteredOptions.length
            ? highlightedIndex
            : 0;
        const targetOpt = filteredOptions[targetIdx];
        if (targetOpt) {
          handleSelect(targetOpt.value);
        }
      } else {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
      }
    } else if (e.key === "Tab") {
      if (filteredOptions.length > 0) {
        const targetIdx =
          highlightedIndex >= 0 && highlightedIndex < filteredOptions.length
            ? highlightedIndex
            : 0;
        const targetOpt = filteredOptions[targetIdx];
        if (targetOpt) {
          handleSelect(targetOpt.value);
        }
      } else {
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setSearchTerm("");
        }
      }}
    >
      <PopoverTrigger asChild>
        <div className="relative w-full flex items-center">
          <Input
            ref={inputRef}
            value={value || ""}
            disabled={disabled}
            onChange={(e) => {
              onChange(e.target.value);
              setSearchTerm(e.target.value);
              if (!open) setOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={cn(
              "h-9 text-sm pr-8 bg-white dark:bg-gray-900 transition-colors",
              hasError &&
                "border-red-500 ring-1 ring-red-500 bg-red-50/50 dark:bg-red-950/20",
              className,
            )}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            tabIndex={-1}
            disabled={disabled}
            onClick={(e) => {
              e.preventDefault();
              setOpen((prev) => !prev);
              if (!open) {
                setTimeout(() => inputRef.current?.focus(), 10);
              }
            }}
            className="absolute right-0 top-0 h-full w-7 px-0 text-gray-400 hover:text-gray-600 hover:bg-transparent"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </Button>
        </div>
      </PopoverTrigger>
      <PopoverContent
        ref={listRef}
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="w-[var(--radix-popover-trigger-width)] min-w-[200px] p-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg max-h-56 min-h-0 overflow-y-auto overscroll-contain z-[9999]"
        onWheel={(e) => e.stopPropagation()}
      >
        {filteredOptions.length === 0 ? (
          <div className="px-2.5 py-2 text-xs text-gray-500 italic text-center">
            {value ? `Dùng giá trị: "${value}"` : "Không tìm thấy"}
          </div>
        ) : (
          filteredOptions.map((opt, index) => {
            const isHighlighted = index === highlightedIndex;
            const isSelected = value === opt.value || value === opt.label;
            return (
              <div
                key={opt.value}
                data-combobox-item
                onMouseDown={(e) => {
                  e.preventDefault();
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => handleSelect(opt.value)}
                className={cn(
                  "flex items-center justify-between px-2.5 py-1.5 text-xs rounded cursor-pointer transition-colors",
                  isHighlighted
                    ? "bg-blue-100 dark:bg-blue-900/60 text-blue-900 dark:text-blue-100 font-medium"
                    : "hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-700 dark:hover:text-blue-300",
                  isSelected &&
                    !isHighlighted &&
                    "bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-semibold",
                )}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-1" />
                )}
              </div>
            );
          })
        )}
      </PopoverContent>
    </Popover>
  );
};
