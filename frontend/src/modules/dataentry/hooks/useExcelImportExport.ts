import React, { useRef, useState } from "react";
import { toast } from "sonner";

export interface ExcelImportResultData {
  totalRows?: number;
  successReportCount?: number;
  errorRowCount?: number;
  errors?: string[];
}

export interface UseExcelImportExportOptions {
  title: string; // e.g. "Vận tải" or "Khai thác"
  filePrefix: string; // e.g. "Bao-cao-van-tai" or "bao-cao-khai-thac"
  startDate: string;
  endDate: string;
  importFn: (file: File) => Promise<{ data?: ExcelImportResultData; success?: boolean; message?: string }>;
  exportFn: (params: { fromDate: string; toDate: string }) => Promise<Blob>;
  onSuccess?: () => Promise<any> | void;
}

export function useExcelImportExport({
  title,
  filePrefix,
  startDate,
  endDate,
  importFn,
  exportFn,
  onSuccess,
}: UseExcelImportExportOptions) {
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleDirectFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      toast.error("Vui lòng chọn file Excel (.xlsx hoặc .xls)");
      e.target.value = "";
      return;
    }

    setIsImporting(true);
    const toastId = toast.loading(`Đang nạp dữ liệu file Excel ${title} lên máy chủ...`);

    try {
      const response = await importFn(file);
      const data = response.data;

      if (data) {
        if (data.errorRowCount && data.errorRowCount > 0 && data.errors && data.errors.length > 0) {
          toast.warning(
            `Nhập dữ liệu hoàn tất! Thành công: ${data.successReportCount ?? 0}/${data.totalRows ?? 0} báo cáo. Có ${data.errorRowCount} dòng lỗi:\n${data.errors.slice(0, 3).join("\n")}${data.errors.length > 3 ? "\n..." : ""}`,
            { id: toastId, duration: 6000 },
          );
        } else {
          toast.success(
            `Đã nạp thành công ${data.successReportCount ?? 0}/${data.totalRows ?? 0} báo cáo từ file "${file.name}"!`,
            { id: toastId },
          );
        }
      } else {
        toast.success(`Đã nạp dữ liệu từ file "${file.name}" thành công!`, {
          id: toastId,
        });
      }

      if (onSuccess) {
        await onSuccess();
      }
    } catch (err: any) {
      console.error(`Lỗi import Excel ${title}:`, err);
      toast.error(
        `Lỗi khi nạp file Excel: ${err.response?.data?.message || err.message || "Lỗi máy chủ"}`,
        { id: toastId },
      );
    } finally {
      setIsImporting(false);
      e.target.value = "";
    }
  };

  const handleExportData = async () => {
    if (!startDate || !endDate) {
      toast.warning(
        "Vui lòng chọn thời gian bắt đầu và kết thúc để xuất Excel!",
      );
      return;
    }

    setIsExporting(true);
    const toastId = toast.loading(`Đang xuất file Excel báo cáo ${title} từ máy chủ...`);

    try {
      const blob = await exportFn({
        fromDate: startDate,
        toDate: endDate,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filePrefix}_${startDate}_${endDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Đã xuất danh sách báo chuyến ${title} ra file Excel!`, {
        id: toastId,
      });
    } catch (err: any) {
      console.error(`Lỗi xuất Excel ${title}:`, err);
      toast.error(
        `Lỗi khi xuất file Excel: ${err.response?.data?.message || err.message || "Lỗi máy chủ"}`,
        { id: toastId },
      );
    } finally {
      setIsExporting(false);
    }
  };

  return {
    fileInputRef,
    isImporting,
    isExporting,
    triggerUpload,
    handleDirectFileUpload,
    handleExportData,
  };
}
