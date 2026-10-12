import React from "react";
import { SearchX, AlertCircle, Plus, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface TableEmptyProps {
  /** Title message */
  title?: string;
  /** Description message */
  description?: string;
  /** Type of empty state */
  type?: "empty" | "no-results" | "error";
  /** Custom icon to display */
  icon?: React.ReactNode;
  /** Action button label */
  actionLabel?: string;
  /** Callback when action button is clicked */
  onAction?: () => void;
  /** Minimum height of the empty state container */
  minHeight?: number;
}

const TableEmpty: React.FC<TableEmptyProps> = ({
  title,
  description,
  type = "empty",
  icon,
  actionLabel,
  onAction,
  minHeight = 300,
}) => {
  const getDefaultContent = () => {
    switch (type) {
      case "no-results":
        return {
          icon: <SearchX className="h-16 w-16 text-muted-foreground/40" />,
          title: "Không tìm thấy kết quả",
          description: "Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc",
        };
      case "error":
        return {
          icon: (
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
          ),
          title: "Đã xảy ra lỗi",
          description: "Không thể tải dữ liệu. Vui lòng thử lại sau.",
        };
      default:
        return {
          icon: <Inbox className="h-16 w-16 text-muted-foreground/40" />,
          title: "Chưa có dữ liệu",
          description: "Bắt đầu bằng cách thêm bản ghi mới",
        };
    }
  };

  const defaults = getDefaultContent();

  return (
    <div
      className="flex flex-col items-center justify-center text-center py-12 px-6"
      style={{ minHeight }}
    >
      <div className="mb-4 transition-transform hover:scale-105 duration-300">
        {icon || defaults.icon}
      </div>

      <h3 className="text-lg font-semibold tracking-tight">
        {title || defaults.title}
      </h3>

      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        {description || defaults.description}
      </p>

      {onAction && (actionLabel || type === "empty") && (
        <Button onClick={onAction} className="gap-2 px-6 rounded-lg">
          <Plus className="h-4 w-4" />
          {actionLabel || "Thêm mới"}
        </Button>
      )}
    </div>
  );
};

export default TableEmpty;
