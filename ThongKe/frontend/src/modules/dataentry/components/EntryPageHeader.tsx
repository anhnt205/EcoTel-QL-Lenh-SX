import React from "react";
import { Button } from "@/components/ui/button";
import {
  Upload,
  Download,
  Plus,
  Pencil,
  Trash2,
  FileSpreadsheet,
} from "lucide-react";

export interface EntryPageHeaderProps {
  title: string;
  /** Dòng mô tả nhỏ dưới tiêu đề. Bỏ trống thì không hiển thị gì (giữ nguyên
   *  bố cục cũ cho các trang chưa dùng tới). */
  subtitle?: string;
  icon?: React.ReactNode;
  fileInputRef?: React.RefObject<HTMLInputElement | null>;
  onFileInputChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUpload?: () => void;
  onExport: () => void;
  onAddNew: () => void;
  onEdit: () => void;
  onDelete: () => void;
  selectedCount: number;
  isImporting?: boolean;
  isExporting?: boolean;
}

/**
 * Đầu trang Nhập liệu. Tên và vị trí nút ĐỒNG BỘ với mọi màn danh mục của phần mềm:
 *   Thêm mới · Chỉnh sửa · Xóa   |   Tải lên (Excel) · Tải xuống (Excel)
 */
export const EntryPageHeader: React.FC<EntryPageHeaderProps> = ({
  title,
  subtitle,
  icon,
  fileInputRef,
  onFileInputChange,
  onUpload,
  onExport,
  onAddNew,
  onEdit,
  onDelete,
  selectedCount,
  isImporting = false,
  isExporting = false,
}) => {
  const handleUploadClick = () => {
    if (onUpload) {
      onUpload();
    } else if (fileInputRef?.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 dark:border-gray-800">
      {/* Title & Icon */}
      <div className="flex items-center gap-3">
        <div className="tks-heading-icon p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
          {icon ?? <FileSpreadsheet className="w-7 h-7" />}
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Nút chức năng — cùng thứ tự/tên với các màn danh mục */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Hidden Excel file input if provided */}
        {fileInputRef && onFileInputChange && (
          <input
            type="file"
            ref={fileInputRef}
            accept=".xlsx,.xls"
            onChange={onFileInputChange}
            className="hidden"
          />
        )}

        <Button
          onClick={onAddNew}
          className="h-9 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Thêm mới (F3)
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
          className="h-9 text-xs gap-1.5 border-gray-300 text-blue-700 hover:bg-blue-50 font-bold"
        >
          <Pencil className="w-3.5 h-3.5" />
          Chỉnh sửa
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
          className="h-9 text-xs gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 dark:border-red-950 dark:hover:bg-red-950/30 font-bold"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Xóa {selectedCount > 0 ? `(${selectedCount})` : ""}
        </Button>

        <span className="mx-1 hidden h-6 w-px bg-gray-300 sm:inline-block" aria-hidden />

        <Button
          variant="outline"
          size="sm"
          onClick={handleUploadClick}
          disabled={isImporting}
          className="h-9 text-xs gap-1.5 border-gray-300 text-blue-700 hover:bg-blue-50 font-bold dark:border-gray-700"
        >
          <Upload className="w-3.5 h-3.5" />
          Tải lên (Excel)
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          disabled={isExporting}
          className="h-9 text-xs gap-1.5 border-gray-300 text-blue-700 hover:bg-blue-50 font-bold dark:border-gray-700"
        >
          <Download className="w-3.5 h-3.5" />
          Tải xuống (Excel)
        </Button>
      </div>
    </div>
  );
};
