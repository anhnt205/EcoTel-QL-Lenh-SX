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
        <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
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

      {/* Action Buttons */}
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

        {/* Upload Excel */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleUploadClick}
          disabled={isImporting}
          className="h-9 text-xs gap-1.5 border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300"
        >
          <Upload className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
          Tải lên (Excel)
        </Button>

        {/* Export Excel */}
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          disabled={isExporting}
          className="h-9 text-xs gap-1.5 border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300"
        >
          <Download className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
          Tải xuống (Excel)
        </Button>

        {/* Add Trip Modal Trigger */}
        <Button
          onClick={onAddNew}
          className="h-9 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Thêm chuyến (F3)
        </Button>

        {/* Edit Trip Button */}
        <Button
          onClick={onEdit}
          className="h-9 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm"
        >
          <Pencil className="w-3.5 h-3.5" />
          Chỉnh sửa
        </Button>

        {/* Delete Selected Rows */}
        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
          className="h-9 text-xs gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 dark:border-red-950 dark:hover:bg-red-950/30 font-medium"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Xóa chuyến {selectedCount > 0 ? `(${selectedCount})` : ""}
        </Button>
      </div>
    </div>
  );
};
