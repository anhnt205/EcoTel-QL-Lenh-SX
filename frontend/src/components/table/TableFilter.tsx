import React from "react";
import { RotateCcw, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface FilterField {
  key: string;
  label: string;
  type: "text" | "select" | "date" | "number";
  options?: { label: string; value: string }[];
  placeholder?: string;
}

export interface FilterValue {
  [key: string]: string;
}

export interface TableFilterProps {
  open: boolean;
  fields: FilterField[];
  values: FilterValue;
  onChange: (values: FilterValue) => void;
  onReset: () => void;
}

const TableFilter: React.FC<TableFilterProps> = ({
  open,
  fields,
  values,
  onChange,
  onReset,
}) => {
  if (!open) return null;

  const handleFieldChange = (key: string, value: string) => {
    onChange({ ...values, [key]: value });
  };

  const handleRemoveFilter = (key: string) => {
    const newValues = { ...values };
    delete newValues[key];
    onChange(newValues);
  };

  const activeFilters = Object.entries(values).filter(([, v]) => v !== "");

  const renderFilterField = (field: FilterField) => {
    switch (field.type) {
      case "select":
        return (
          <div key={field.key} className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {field.label}
            </span>
            <Select
              value={values[field.key] || "all"}
              onValueChange={(val) =>
                handleFieldChange(field.key, val === "all" ? "" : val)
              }
            >
              <SelectTrigger className="h-9 w-full rounded-lg">
                <SelectValue placeholder="Tất cả" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                {field.options?.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      case "date":
        return (
          <div key={field.key} className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {field.label}
            </span>
            <Input
              type="date"
              className="h-9 w-full rounded-lg"
              value={values[field.key] || ""}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
            />
          </div>
        );
      case "number":
        return (
          <div key={field.key} className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {field.label}
            </span>
            <Input
              type="number"
              placeholder={field.placeholder}
              className="h-9 w-full rounded-lg"
              value={values[field.key] || ""}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
            />
          </div>
        );
      default:
        return (
          <div key={field.key} className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {field.label}
            </span>
            <Input
              placeholder={
                field.placeholder || `Nhập ${field.label.toLowerCase()}...`
              }
              className="h-9 w-full rounded-lg"
              value={values[field.key] || ""}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
            />
          </div>
        );
    }
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between border-b pb-3">
        <h4 className="text-sm font-semibold">Bộ lọc dữ liệu</h4>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs px-2 gap-1.5"
          onClick={onReset}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Đặt lại
        </Button>
      </div>

      {/* Filter Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map((field) => renderFilterField(field))}
      </div>

      {/* Active Filter Chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          {activeFilters.map(([key, value]) => {
            const field = fields.find((f) => f.key === key);
            const displayValue =
              field?.type === "select"
                ? field.options?.find((o) => o.value === value)?.label || value
                : value;
            return (
              <Badge
                key={key}
                variant="secondary"
                className="px-2 py-1 rounded-md text-xs flex items-center gap-1.5"
              >
                <span className="text-muted-foreground font-normal">
                  {field?.label}:
                </span>
                <span>{displayValue}</span>
                <X
                  className="h-3 w-3 cursor-pointer hover:text-destructive transition-colors"
                  onClick={() => handleRemoveFilter(key)}
                />
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TableFilter;
