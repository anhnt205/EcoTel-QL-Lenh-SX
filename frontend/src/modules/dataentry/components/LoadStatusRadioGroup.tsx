import React from "react";
import { LOAD_STATUS_OPTIONS } from "../shared/constants.ts";
import { Input } from "@/components/ui/input.tsx";

interface LoadStatusRadioGroupProps {
  value: string;
  note: string;
  onChange: (value: string, note: string) => void;
  onNoteChange: (note: string) => void;
  direction?: "row" | "column";
}

// Dùng chung cho cả bảng Mining (radio ngang) và Transport (radio dọc)
export const LoadStatusRadioGroup: React.FC<LoadStatusRadioGroupProps> = ({
  value,
  note,
  onChange,
  onNoteChange,
  direction = "row",
}) => {
  const isRow = direction === "row";

  return (
    <div
      className={
        isRow ? "flex items-center gap-5" : "flex flex-col gap-1 py-0.5"
      }
    >
      {LOAD_STATUS_OPTIONS.map((opt) => {
        const active = value === opt.value;
        const isNoteOption = opt.value === "Khác";

        return (
          <label
            key={opt.value}
            className={
              isRow
                ? "flex items-center gap-1.5 cursor-pointer select-none"
                : "flex items-center justify-between gap-1 cursor-pointer select-none"
            }
          >
            <div className="flex items-center gap-1.5">
              <div
                onClick={() => onChange(opt.value, isNoteOption ? note : "")}
                className={`${isRow ? "w-4 h-4" : "w-3.5 h-3.5"} rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  active
                    ? "border-blue-600 bg-blue-600"
                    : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                }`}
              >
                {active && (
                  <div
                    className={`${isRow ? "w-1.5 h-1.5" : "w-1 h-1"} rounded-full bg-white`}
                  />
                )}
              </div>
              <span className="text-[11px] text-gray-700 dark:text-gray-300 whitespace-nowrap">
                {opt.label}
              </span>
            </div>

            {isNoteOption && active && (
              <Input
                type="text"
                value={note}
                onChange={(e) => onNoteChange(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className={
                  isRow
                    ? "h-6 w-20 text-[11px] ml-1 px-1.5"
                    : "h-6 w-24 text-[11px] px-1.5 text-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
                }
                title="Chỉ chấp nhận kiểu phân số (ví dụ: 1/2, 2/3)"
              />
            )}
          </label>
        );
      })}
    </div>
  );
};
