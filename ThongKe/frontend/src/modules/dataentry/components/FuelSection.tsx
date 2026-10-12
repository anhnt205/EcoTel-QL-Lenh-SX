import { Input } from "@/components/ui/input";
import React from "react";

interface FuelSectionProps {
  initialFuel: number | "";
  receivedFuel: number | "";
  finalFuel: number | "";
  fuelUsed: number;
  onChange: (patch: {
    initialFuel?: number | "";
    receivedFuel?: number | "";
    finalFuel?: number | "";
  }) => void;
  required?: boolean; // Mining bắt buộc (*), Transport không
}

export const FuelSection: React.FC<FuelSectionProps> = ({
  initialFuel,
  receivedFuel,
  finalFuel,
  fuelUsed,
  onChange,
  required = false,
}) => {
  const Star = () =>
    required ? <span className="text-red-500">*</span> : null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
          Nhiên liệu tồn đầu (lít) <Star />
        </label>
        <Input
          type="number"
          min={0}
          value={initialFuel}
          onChange={(e) =>
            onChange({
              initialFuel: e.target.value === "" ? "" : Number(e.target.value),
            })
          }
          className="h-9 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
          Nhiên liệu lĩnh (lít) <Star />
        </label>
        <Input
          type="number"
          min={0}
          value={receivedFuel}
          onChange={(e) =>
            onChange({
              receivedFuel: e.target.value === "" ? "" : Number(e.target.value),
            })
          }
          className="h-9 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
          Nhiên liệu tồn cuối (lít) <Star />
        </label>
        <Input
          type="number"
          min={0}
          value={finalFuel}
          onChange={(e) =>
            onChange({
              finalFuel: e.target.value === "" ? "" : Number(e.target.value),
            })
          }
          className="h-9 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
          Nhiên liệu sử dụng (lít)
        </label>
        <Input
          type="number"
          value={fuelUsed}
          readOnly
          disabled
          className="h-9 text-sm bg-gray-100 dark:bg-gray-800 font-semibold cursor-not-allowed border-gray-200 dark:border-gray-700"
        />
      </div>
    </div>
  );
};
