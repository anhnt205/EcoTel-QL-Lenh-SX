import { ComboboxInput } from "@/components/ui/combobox-input";
import { Input } from "@/components/ui/input";
import React from "react";

interface OperatorSectionProps {
  operatorBadgeNo: string;
  operatorName: string;
  operatorUnit: string;
  operatorOptions: { value: string; label: string }[];
  onChangeBadgeNo: (v: string) => void;
}

export const OperatorSection: React.FC<OperatorSectionProps> = ({
  operatorBadgeNo,
  operatorName,
  operatorUnit,
  operatorOptions,
  onChangeBadgeNo,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
          Số thẻ lương <span className="text-red-500">*</span>
        </label>
        <ComboboxInput
          options={operatorOptions}
          value={operatorBadgeNo}
          onChange={onChangeBadgeNo}
          placeholder=""
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
          Họ và tên
        </label>
        <Input
          type="text"
          value={operatorName}
          readOnly
          disabled
          className="h-9 text-sm bg-gray-100 dark:bg-gray-800 cursor-not-allowed border-gray-200 dark:border-gray-700"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
          Đơn vị
        </label>
        <Input
          type="text"
          value={operatorUnit}
          readOnly
          disabled
          className="h-9 text-sm bg-gray-100 dark:bg-gray-800 cursor-not-allowed border-gray-200 dark:border-gray-700"
        />
      </div>
    </div>
  );
};
