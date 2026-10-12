import React from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export interface FilterResetButtonProps {
  onReset: () => void;
  title?: string;
  className?: string;
}

export const FilterResetButton: React.FC<FilterResetButtonProps> = ({
  onReset,
  title = "Làm mới bộ lọc",
  className,
}) => {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onReset}
        title={title}
        className={`h-9 w-9 p-0 border-gray-300 dark:border-gray-700 ${className || ""}`}
      >
        <RefreshCw className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
      </Button>
    </div>
  );
};
