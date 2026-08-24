import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { useRowSelection } from "./useRowSelection";
import { useExcelImportExport, type ExcelImportResultData } from "./useExcelImportExport";

export interface UseEntryPageLogicOptions<
  TRow extends { id?: string | number; status?: string },
  TResponse = any,
  TDraft = any
> {
  // Domain / Service config
  title: string;
  filePrefix: string;
  startDate: string;
  endDate: string;
  tripRows: TRow[];
  fuelRows: TRow[];

  // API operations
  fetchReportById: (id: number) => Promise<{ data?: TResponse; success?: boolean }>;
  mapReportResponseToDraft: (data: TResponse) => TDraft;
  fetchTripById?: (tripId: number) => Promise<{ data?: any; success?: boolean }>;
  mapTripResponseToDraft?: (data: any, baseRecord?: TRow) => TDraft;
  bulkDeleteReport: (ids: number[]) => Promise<{ data?: { deletedCount?: number } } | any>;
  bulkDeleteTrips?: (ids: number[]) => Promise<{ data?: { deletedCount?: number } } | any>;
  refetch: () => Promise<any> | void;

  // Import / Export
  importReports: (file: File) => Promise<{ data?: ExcelImportResultData; success?: boolean; message?: string }>;
  exportReports: (params: { fromDate: string; toDate: string }) => Promise<Blob>;

  // Store actions
  loadSessionsForEdit: (drafts: TDraft[]) => void;
  initDrafts?: () => void;

  // Confirm dialog customization
  deleteDialogTitle?: string;
  deleteDialogDescription?: (count: number) => string;
}

export function useEntryPageLogic<
  TRow extends { id?: string | number; status?: string },
  TResponse = any,
  TDraft = any
>({
  title,
  filePrefix,
  startDate,
  endDate,
  tripRows,
  fuelRows,
  fetchReportById,
  mapReportResponseToDraft,
  fetchTripById,
  mapTripResponseToDraft,
  bulkDeleteReport,
  bulkDeleteTrips,
  refetch,
  importReports,
  exportReports,
  loadSessionsForEdit,
  initDrafts,
  deleteDialogTitle = "Xác nhận xóa bản ghi",
  deleteDialogDescription,
}: UseEntryPageLogicOptions<TRow, TResponse, TDraft>) {
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [entryModalMode, setEntryModalMode] = useState<"add" | "edit">("add");

  // Selection hooks for 2 tables
  const tripSelection = useRowSelection(tripRows);
  const fuelSelection = useRowSelection(fuelRows);

  const selectedCount = tripSelection.selectedIds.size + fuelSelection.selectedIds.size;

  // Excel import / export hook
  const excel = useExcelImportExport({
    title,
    filePrefix,
    startDate,
    endDate,
    importFn: importReports,
    exportFn: exportReports,
    onSuccess: async () => {
      await refetch();
    },
  });

  // Open modal for Add
  const handleAddNew = () => {
    if (initDrafts) {
      initDrafts();
    }
    setEntryModalMode("add");
    setIsEntryModalOpen(true);
  };

  // Keyboard shortcut F3
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F3") {
        e.preventDefault();
        handleAddNew();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initDrafts]);

  // Edit selected records
  const handleEditSelected = async () => {
    // 1. Nếu chỉ chọn đúng 1 chuyến ở Bảng 1 (Chuyến) và có cung cấp API fetch chi tiết chuyến
    const isSingleTripSelected =
      tripSelection.selectedIds.size === 1 &&
      fuelSelection.selectedIds.size === 0 &&
      Boolean(fetchTripById) &&
      Boolean(mapTripResponseToDraft);

    if (isSingleTripSelected) {
      const selectedTripRow = tripRows.find(
        (r) => r.id && tripSelection.selectedIds.has(String(r.id)),
      );

      if (
        selectedTripRow?.status === "APPROVED" ||
        selectedTripRow?.status === "DA_DUYET"
      ) {
        toast.warning("Không thể chỉnh sửa chuyến đã được duyệt!");
        return;
      }

      const tripId =
        (selectedTripRow as any)?.tripId ??
        (typeof selectedTripRow?.id === "number"
          ? selectedTripRow.id
          : Number(String(selectedTripRow?.id).replace(/\D/g, "")));

      if (!tripId || isNaN(tripId)) {
        toast.warning("Không tìm thấy mã chuyến để chỉnh sửa!");
        return;
      }

      const toastId = toast.loading("Đang tải dữ liệu chi tiết chuyến...");
      try {
        const res = await fetchTripById!(tripId);
        if (!res?.data) {
          toast.error("Không tải được thông tin chi tiết của chuyến!", {
            id: toastId,
          });
          return;
        }

        const draft = mapTripResponseToDraft!(res.data, selectedTripRow);
        toast.dismiss(toastId);
        loadSessionsForEdit([draft]);
        setEntryModalMode("edit");
        setIsEntryModalOpen(true);
      } catch (err: any) {
        console.error("[Fetch Trip Detail Error]", err);
        toast.error(
          `Không thể tải chi tiết chuyến: ${err.message || "Lỗi máy chủ"}`,
          { id: toastId },
        );
      }
      return;
    }
    const selectedRows = [...tripRows, ...fuelRows].filter(
      (r) =>
        r.id &&
        (tripSelection.selectedIds.has(String(r.id)) ||
          fuelSelection.selectedIds.has(String(r.id))),
    );

    const selectedIdsArray = Array.from(
      new Set(
        selectedRows
          .map(
            (r: any) =>
              r.reportId ??
              (typeof r.id === "number"
                ? r.id
                : Number(String(r.id).replace(/\D/g, ""))),
          )
          .filter((id) => Boolean(id) && !isNaN(id)),
      ),
    );

    if (selectedIdsArray.length === 0) {
      toast.warning("Vui lòng chọn bản ghi để chỉnh sửa!");
      return;
    }

    // Kiểm tra xem có bản ghi đã duyệt trong danh sách chọn không
    const hasApprovedRecord = selectedRows.some(
      (r) => r.status === "APPROVED" || r.status === "DA_DUYET",
    );

    if (hasApprovedRecord) {
      toast.warning("Không thể chỉnh sửa các bản ghi đã được duyệt!");
      return;
    }

    const toastId = toast.loading(
      selectedIdsArray.length === 1
        ? "Đang tải dữ liệu chi tiết báo cáo..."
        : `Đang tải dữ liệu ${selectedIdsArray.length} báo cáo...`,
    );

    try {
      const responses = await Promise.all(
        selectedIdsArray.map((id) =>
          fetchReportById(id).catch((err) => {
            console.error(`Lỗi tải báo cáo #${id}:`, err);
            return null;
          }),
        ),
      );

      const drafts = responses
        .filter((res) => Boolean(res?.data))
        .map((res) => mapReportResponseToDraft(res!.data!));

      if (drafts.length === 0) {
        toast.error("Không tải được thông tin chi tiết của bản ghi nào!", {
          id: toastId,
        });
        return;
      }

      toast.dismiss(toastId);
      loadSessionsForEdit(drafts);
      setEntryModalMode("edit");
      setIsEntryModalOpen(true);
    } catch (err: any) {
      console.error("[Fetch Detail Error]", err);
      toast.error(
        `Không thể tải chi tiết báo cáo: ${err.message || "Lỗi máy chủ"}`,
        { id: toastId },
      );
    }
  };

  // Delete selected records
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();

  const handleDeleteSelected = async () => {
    const isOnlyTripSelected =
      tripSelection.selectedIds.size > 0 &&
      fuelSelection.selectedIds.size === 0 &&
      Boolean(bulkDeleteTrips);

    if (isOnlyTripSelected) {
      // Xóa ở cấp độ Chuyến xe (Bảng 1)
      const selectedTrips = tripRows.filter(
        (r) => r.id && tripSelection.selectedIds.has(String(r.id)),
      );

      const tripIds = Array.from(
        new Set(
          selectedTrips
            .map(
              (r: any) =>
                r.tripId ??
                (typeof r.id === "number"
                  ? r.id
                  : Number(String(r.id).replace(/\D/g, ""))),
            )
            .filter((id) => Boolean(id) && !isNaN(id)),
        ),
      );

      if (tripIds.length === 0) {
        toast.warning("Vui lòng chọn ít nhất 1 chuyến để xóa!");
        return;
      }

      const hasApprovedRecord = selectedTrips.some(
        (r) => r.status === "APPROVED" || r.status === "DA_DUYET",
      );

      if (hasApprovedRecord) {
        toast.warning("Không thể xóa các chuyến đã được duyệt!");
        return;
      }

      const description = deleteDialogDescription
        ? deleteDialogDescription(tripIds.length)
        : `Bạn có chắc chắn muốn xóa ${tripIds.length} chuyến xe đã chọn? Hành động này không thể hoàn tác trên CSDL.`;

      const isConfirmed = await confirm({
        title: deleteDialogTitle || "Xác nhận xóa chuyến",
        description,
        confirmText: "Xóa chuyến",
        cancelText: "Hủy bỏ",
        variant: "destructive",
      });

      if (isConfirmed) {
        const toastId = toast.loading("Đang xóa các chuyến đã chọn...");
        try {
          const res = await bulkDeleteTrips!(tripIds);
          tripSelection.clearSelection();
          const deletedCount = res?.data?.deletedCount ?? tripIds.length;
          toast.success(`Đã xóa thành công ${deletedCount} chuyến từ CSDL!`, {
            id: toastId,
          });
          await refetch();
        } catch (err: any) {
          console.error("[Delete Trip Error]", err);
          const msg =
            err.response?.data?.message || err.message || "Lỗi khi xóa chuyến";
          toast.error(`Xóa thất bại: ${msg}`, { id: toastId });
        }
      }
      return;
    }

    // Xóa ở cấp độ Báo cáo ca (Bảng 2 hoặc fallback)
    const selectedRows = [...tripRows, ...fuelRows].filter(
      (r) =>
        r.id &&
        (tripSelection.selectedIds.has(String(r.id)) ||
          fuelSelection.selectedIds.has(String(r.id))),
    );

    const selectedIdsArray = Array.from(
      new Set(
        selectedRows
          .map(
            (r: any) =>
              r.reportId ??
              (typeof r.id === "number"
                ? r.id
                : Number(String(r.id).replace(/\D/g, ""))),
          )
          .filter((id) => Boolean(id) && !isNaN(id)),
      ),
    );

    if (selectedIdsArray.length === 0) {
      toast.warning("Vui lòng chọn ít nhất 1 dòng để xóa!");
      return;
    }

    // Kiểm tra xem có bản ghi đã duyệt trong danh sách chọn không
    const hasApprovedRecord = selectedRows.some(
      (r) => r.status === "APPROVED" || r.status === "DA_DUYET",
    );

    if (hasApprovedRecord) {
      toast.warning("Không thể xóa các bản ghi đã được duyệt!");
      return;
    }

    const description = deleteDialogDescription
      ? deleteDialogDescription(selectedIdsArray.length)
      : `Bạn có chắc chắn muốn xóa ${selectedIdsArray.length} báo cáo đã chọn? Hành động này không thể hoàn tác trên CSDL.`;

    const isConfirmed = await confirm({
      title: deleteDialogTitle,
      description,
      confirmText: "Xóa báo cáo",
      cancelText: "Hủy bỏ",
      variant: "destructive",
    });

    if (isConfirmed) {
      const toastId = toast.loading("Đang xóa các báo cáo đã chọn...");
      try {
        const res = await bulkDeleteReport(selectedIdsArray);
        tripSelection.clearSelection();
        fuelSelection.clearSelection();
        const deletedCount = res?.data?.deletedCount ?? selectedIdsArray.length;
        toast.success(`Đã xóa thành công ${deletedCount} báo cáo từ CSDL!`, {
          id: toastId,
        });
        await refetch();
      } catch (err: any) {
        console.error("[Delete Report Error]", err);
        const msg =
          err.response?.data?.message || err.message || "Lỗi khi xóa báo cáo";
        toast.error(`Xóa thất bại: ${msg}`, { id: toastId });
      }
    }
  };

  return {
    isEntryModalOpen,
    entryModalMode,
    setIsEntryModalOpen,
    setEntryModalMode,
    handleAddNew,
    handleEditSelected,
    handleDeleteSelected,
    tripSelection,
    fuelSelection,
    selectedCount,
    excel,
    ConfirmDialogComponent,
  };
}
