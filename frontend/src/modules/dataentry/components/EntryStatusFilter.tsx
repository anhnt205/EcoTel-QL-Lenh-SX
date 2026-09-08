import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import type { ApprovalStatus } from "@/modules/dataentry/types/thong-ke";

interface StatusOption {
  status: ApprovalStatus;
  label: string;
  textClass: string;
  checkboxClass: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  {
    status: "APPROVED",
    label: "Đã gửi",
    textClass: "text-emerald-700 dark:text-emerald-400",
    checkboxClass:
      "data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600",
  },
  {
    status: "PENDING",
    label: "Chờ duyệt",
    textClass: "text-blue-700 dark:text-blue-400",
    checkboxClass:
      "data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600",
  },
  {
    status: "REVISION_REQUESTED",
    label: "Cần sửa",
    textClass: "text-orange-700 dark:text-orange-400",
    checkboxClass:
      "data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600",
  },
];

interface EntryStatusFilterProps {
  value: Set<ApprovalStatus>;
  onChange: (next: Set<ApprovalStatus>) => void;
}

/**
 * Bộ lọc trạng thái dạng checkbox cho Bảng báo chuyến — thay cho tab
 * "Tất cả/Cần sửa" trước đó. `value` rỗng == đang xem "Tất cả". Tick 1
 * hay nhiều trạng thái cụ thể sẽ lọc bảng chỉ còn đúng các dòng đó (lọc
 * OR); tick lại "Tất cả" hoặc bỏ tick hết sẽ quay về xem toàn bộ.
 */
export const EntryStatusFilter: React.FC<EntryStatusFilterProps> = ({
  value,
  onChange,
}) => {
  const isAll = value.size === 0;

  const toggleStatus = (status: ApprovalStatus, checked: boolean) => {
    const next = new Set(value);
    if (checked) next.add(status);
    else next.delete(status);
    onChange(next);
  };

  return (
    <div className="flex items-center gap-4 text-xs">
      <label className="flex items-center gap-1.5 cursor-pointer select-none">
        <Checkbox
          checked={isAll}
          onCheckedChange={() => onChange(new Set())}
          className="data-[state=checked]:bg-gray-900 data-[state=checked]:border-gray-900 dark:data-[state=checked]:bg-gray-100 dark:data-[state=checked]:border-gray-100"
        />
        <span className="font-semibold text-gray-900 dark:text-gray-100">
          Tất cả
        </span>
      </label>

      {STATUS_OPTIONS.map((opt) => (
        <label
          key={opt.status}
          className="flex items-center gap-1.5 cursor-pointer select-none"
        >
          <Checkbox
            checked={value.has(opt.status)}
            onCheckedChange={(checked) =>
              toggleStatus(opt.status, !!checked)
            }
            className={opt.checkboxClass}
          />
          <span className={`font-semibold ${opt.textClass}`}>
            {opt.label}
          </span>
        </label>
      ))}
    </div>
  );
};
