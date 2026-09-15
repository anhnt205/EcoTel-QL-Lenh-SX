import React, { useState, useEffect, useMemo } from "react";
import type {
  ReconciliationItem,
  DepartmentTarget,
} from "@/modules/dataentry/types/thong-ke";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { DatePickerString } from "@/components/common/DatePickerString";
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Download,
  Search,
  Clock,
  CheckCheck,
  FileEdit,
  Layers,
  XCircle,
} from "lucide-react";
import { ReconciliationComparisonTables } from "../components/ReconciliationComparisonTables";
import { RequestChangeModal } from "../components/RequestChangeModal";
import { excelService } from "@/modules/report/utils/excel-exporter";
import { toast } from "sonner";
import { currentMonthRange } from "@/lib/utils";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";

import { useMasterData } from "@/modules/dataentry/hooks/useMasterData";
import { useRoleStore } from "@/stores/useRoleStore";
import { useReconciliationLiveUpdates } from "../hooks/useReconciliationLiveUpdates";
import {
  useReconciliationSearchQuery,
  useSaveReconciliationDecisionMutation,
  useSaveReconciliationDecisionsBulkMutation,
  useUpdateReconciliationTripsBulkMutation,
  useResubmitReconciliationTripsMutation,
  mapRowResponseToReconciliationItem,
} from "../services/reconciliation.service";
import {
  type CardFilterType,
  KpiCard,
  type KpiCardConfig,
} from "@/modules/reconciliation/components/StaticCard.tsx";

const isMatchedItem = (item: ReconciliationItem) => {
  const t = item.transportRecord;
  const m = item.miningRecord;
  if (!t || !m) return false;
  return (
    (t.tripCount ?? 0) === (m.tripCount ?? 0) &&
    (t.cargoType || "").trim().toLowerCase() ===
      (m.material || "").trim().toLowerCase()
  );
};

// Cặp ghép KHÔNG xác định rõ ràng (backend đã từ chối duyệt/yêu cầu sửa cho
// cặp này ở API) — dùng ở CẢ nút đơn lẻ (reconciliationColumns.tsx) LẪN
// hàng loạt ở đây, để "Duyệt/Yêu cầu sửa hàng loạt" không lách được điều
// kiện đã chặn ở nút đơn lẻ. Quality Gate lượt 4 của Codex, 2026-09-15.
const isPairingAmbiguousItem = (item: ReconciliationItem) =>
  !!(item as any).backendRow?.pairingAmbiguous;

export const ReconciliationPage: React.FC = () => {
  // Tự cập nhật khi Vận tải/Khai thác sửa dữ liệu, hoặc khi Thống kê
  // duyệt/yêu cầu sửa/gửi lại — không cần bấm tải lại trang (chốt 2026-09-10).
  useReconciliationLiveUpdates();

  const shiftAnchorRef = useComboboxAnchor();
  const vehicleAnchorRef = useComboboxAnchor();

  const masterData = useMasterData();
  const { rawShifts = [], rawVehicles = [] } = masterData;

  // Mặc định = tháng hiện tại (trước đây cứng "2026-08-01".."2026-08-31" —
  // dữ liệu ở tháng khác "biến mất" khỏi màn đối chiếu; cùng lỗi thật vừa
  // gặp ở màn Khai thác, 2026-09-08).
  const defaultDateRange = currentMonthRange();
  const [startDate, setStartDate] = useState(defaultDateRange.from);
  const [endDate, setEndDate] = useState(defaultDateRange.to);
  const [selectedShifts, setSelectedShifts] = useState<string[]>([]);
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [cardFilter, setCardFilter] = useState<CardFilterType>("all");

  const [rawItems, setRawItems] = useState<ReconciliationItem[]>([]);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [isBulkRequestModalOpen, setIsBulkRequestModalOpen] = useState(false);
  const { currentRole, setRole } = useRoleStore();

  // ponytail: confirm dialog for single & bulk approvals
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();

  const saveDecisionMutation = useSaveReconciliationDecisionMutation();
  const saveDecisionsBulkMutation =
    useSaveReconciliationDecisionsBulkMutation();
  const updateTripsBulkMutation = useUpdateReconciliationTripsBulkMutation();
  const resubmitTripsMutation = useResubmitReconciliationTripsMutation();

  // Map selected Shift names to Shift IDs for API
  const shiftIds = useMemo(() => {
    if (selectedShifts.length === 0) return undefined;
    return rawShifts
      .filter(
        (s) =>
          selectedShifts.includes(`Ca ${s.name}`) ||
          selectedShifts.includes(String(s.name)),
      )
      .map((s) => s.id);
  }, [selectedShifts, rawShifts]);

  // Map selected Vehicle numbers to Device IDs for API
  const deviceIds = useMemo(() => {
    if (selectedVehicles.length === 0) return undefined;
    return rawVehicles
      .filter(
        (v) =>
          selectedVehicles.includes(v.code) ||
          (v.vehicleNumber && selectedVehicles.includes(v.vehicleNumber)),
      )
      .map((v) => v.id);
  }, [selectedVehicles, rawVehicles]);

  const { data: apiResponse } = useReconciliationSearchQuery({
    fromDate: startDate,
    toDate: endDate,
    shiftIds,
    deviceIds,
  });

  useEffect(() => {
    if (apiResponse?.content) {
      // ponytail: map status accurately from backend decision
      const mapped = apiResponse.content.map((row, idx) => {
        return mapRowResponseToReconciliationItem(row, idx);
      });
      setRawItems(mapped);
    }
  }, [apiResponse]);

  const availableShifts = useMemo(() => {
    const set = new Set<string>();
    if (rawShifts && rawShifts.length > 0) {
      rawShifts.forEach((s) => set.add(`Ca ${s.name}`));
    } else {
      ["Ca 1", "Ca 2", "Ca 3"].forEach((s) => set.add(s));
    }
    rawItems.forEach((i) => {
      if (i.commonKey.shift) set.add(i.commonKey.shift);
    });
    return Array.from(set);
  }, [rawShifts, rawItems]);

  const availableVehicles = useMemo(() => {
    const set = new Set<string>();
    if (rawVehicles && rawVehicles.length > 0) {
      rawVehicles.forEach((v) => {
        if (v.code) set.add(v.code);
        if (v.vehicleNumber) set.add(v.vehicleNumber);
      });
    }
    rawItems.forEach((i) => {
      if (i.commonKey.vehicleNo) set.add(i.commonKey.vehicleNo);
    });
    return Array.from(set);
  }, [rawVehicles, rawItems]);

  const baseFilteredItems = useMemo(() => {
    return rawItems.filter((item) => {
      if (selectedShifts.length > 0) {
        const itemShift = item.commonKey.shift || "";
        if (!selectedShifts.includes(itemShift)) return false;
      }
      if (selectedVehicles.length > 0) {
        const itemVehicle = item.commonKey.vehicleNo || "";
        if (!selectedVehicles.includes(itemVehicle)) return false;
      }
      const v = (item.commonKey.vehicleNo || "").toLowerCase();
      const badge = (
        item.transportRecord?.operatorBadgeNo ||
        item.miningRecord?.operatorBadgeNo ||
        ""
      ).toLowerCase();
      const kw = searchKeyword.toLowerCase().trim();
      if (kw && !v.includes(kw) && !badge.includes(kw)) {
        return false;
      }
      return true;
    });
  }, [rawItems, selectedShifts, selectedVehicles, searchKeyword]);

  const displayItems = useMemo(() => {
    if (cardFilter === "pending") {
      // "Chờ đối soát" gộp cả AWAITING_REAPPROVAL (vàng nhạt — đã gửi lại,
      // đang chờ thống kê viên xem lại) vào chung nhóm "cần thống kê viên
      // xử lý", không tách card riêng.
      return baseFilteredItems.filter(
        (i) =>
          !i.reconciliationStatus ||
          i.reconciliationStatus === "PENDING" ||
          i.reconciliationStatus === "AWAITING_REAPPROVAL",
      );
    }
    if (cardFilter === "approved") {
      return baseFilteredItems.filter(
        (i) => i.reconciliationStatus === "APPROVED",
      );
    }
    if (cardFilter === "not_approved") {
      return baseFilteredItems.filter(
        (i) => i.reconciliationStatus === "REVISION_REQUESTED",
      );
    }
    if (cardFilter === "matched") {
      return baseFilteredItems.filter(isMatchedItem);
    }
    if (cardFilter === "mismatch") {
      return baseFilteredItems.filter((i) => !isMatchedItem(i));
    }
    return baseFilteredItems;
  }, [baseFilteredItems, cardFilter]);

  const totalAllCount = baseFilteredItems.length;

  const pendingCount = useMemo(() => {
    return baseFilteredItems.filter(
      (i) =>
        !i.reconciliationStatus ||
        i.reconciliationStatus === "PENDING" ||
        i.reconciliationStatus === "AWAITING_REAPPROVAL",
    ).length;
  }, [baseFilteredItems]);

  const approvedCount = useMemo(() => {
    return baseFilteredItems.filter(
      (i) => i.reconciliationStatus === "APPROVED",
    ).length;
  }, [baseFilteredItems]);

  const notApprovedCount = useMemo(() => {
    return baseFilteredItems.filter(
      (i) => i.reconciliationStatus === "REVISION_REQUESTED",
    ).length;
  }, [baseFilteredItems]);

  const matchedCount = useMemo(() => {
    return baseFilteredItems.filter(isMatchedItem).length;
  }, [baseFilteredItems]);

  const totalRows = baseFilteredItems.length;
  const matchedPct =
    totalRows > 0 ? Math.round((matchedCount / totalRows) * 100) : 0;
  const mismatchCount = totalRows - matchedCount;
  const mismatchPct = totalRows > 0 ? 100 - matchedPct : 0;

  const handleCardClick = (type: CardFilterType) => {
    setCardFilter((prev) => (prev === type ? "all" : type));
  };

  const handleExportExcel = () => {
    excelService.exportToExcel(displayItems, "DoiChieu_BaoChuyen", "ĐỐI CHIẾU");
    toast.success("Đã xuất báo cáo đối chiếu ra file Excel!");
  };

  const handleDeleteItem = (id: string) => {
    setRawItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleUpdateItem = async (updatedItem: ReconciliationItem) => {
    // Optimistic UI
    setRawItems((prev) =>
      prev.map((i) => (i.id === updatedItem.id ? updatedItem : i)),
    );

    const originalItem = rawItems.find((i) => i.id === updatedItem.id);
    const bRow =
      (updatedItem as any).backendRow || (originalItem as any)?.backendRow;

    if (!bRow) {
      console.warn("Không tìm thấy backendRow cho dòng:", updatedItem.id);
      return;
    }

    const isTransportRole = currentRole === "ROLE_TRANSPORT";
    const isMiningRole = currentRole === "ROLE_MINING";

    const isTransportChanged =
      Boolean(bRow.transportReportTripId) &&
      Boolean(updatedItem.transportRecord) &&
      (isTransportRole ||
        (!isMiningRole &&
          JSON.stringify(updatedItem.transportRecord) !==
            JSON.stringify(originalItem?.transportRecord)));

    const isMiningChanged =
      Boolean(bRow.excavationReportTripId) &&
      Boolean(updatedItem.miningRecord) &&
      (isMiningRole ||
        (!isTransportRole &&
          JSON.stringify(updatedItem.miningRecord) !==
            JSON.stringify(originalItem?.miningRecord)));

    if (!isTransportChanged && !isMiningChanged) {
      toast.info("Không có thay đổi dữ liệu cần lưu!");
      return;
    }

    const parseLoadLevel = (loadStatus?: string) => {
      if (!loadStatus || loadStatus === "Đủ tải") {
        return { type: "FULL_LOAD" as const, custom: undefined };
      }
      if (loadStatus === "Roda (2/3)") {
        return { type: "RODA_2_3" as const, custom: undefined };
      }
      const match = loadStatus.match(/Khác\s*\((.*)\)/);
      const customVal = match
        ? match[1]
        : loadStatus.replace(/^Khác\s*/, "") || undefined;
      return {
        type: "OTHER" as const,
        custom: customVal,
      };
    };

    try {
      const payload: any[] = [];

      if (isTransportChanged) {
        const tRec = updatedItem.transportRecord!;
        const loadInfo = parseLoadLevel(tRec.loadStatus);

        const cargoType = masterData.rawCargoTypes?.find(
          (c: any) =>
            c.name === tRec.cargoType ||
            String(c.id) === String(tRec.cargoType) ||
            c.name === bRow.transportData?.cargoTypeName,
        );

        const employee = masterData.rawUsers?.find(
          (u: any) =>
            (u.salaryCode && u.salaryCode === tRec.operatorBadgeNo) ||
            (u.username && u.username === tRec.operatorBadgeNo) ||
            (u.fullName && u.fullName === tRec.operatorName) ||
            String(u.id) === String(tRec.operatorBadgeNo),
        );

        payload.push({
          transportReportTripId: bRow.transportReportTripId,
          excavationReportTripId: undefined, // chỉ sửa bên vận tải
          cargoTypeId: cargoType?.id ? Number(cargoType.id) : undefined,
          tripCount: Number(
            tRec.tripCount ?? bRow.transportData?.tripCount ?? 1,
          ),
          loadLevelType: loadInfo.type,
          loadLevelCustomValue: loadInfo.custom,
          employeeId: employee?.id ? Number(employee.id) : undefined,
        });
      }

      if (isMiningChanged) {
        const mRec = updatedItem.miningRecord!;
        const loadInfo = parseLoadLevel(mRec.loadStatus);

        const cargoType = masterData.rawCargoTypes?.find(
          (c: any) =>
            c.name === mRec.material ||
            String(c.id) === String(mRec.material) ||
            c.name === bRow.excavationData?.cargoTypeName,
        );

        const employee = masterData.rawUsers?.find(
          (u: any) =>
            (u.salaryCode && u.salaryCode === mRec.operatorBadgeNo) ||
            (u.username && u.username === mRec.operatorBadgeNo) ||
            (u.fullName && u.fullName === mRec.operatorName) ||
            String(u.id) === String(mRec.operatorBadgeNo),
        );

        payload.push({
          transportReportTripId: undefined,
          excavationReportTripId: bRow.excavationReportTripId,
          cargoTypeId: cargoType?.id ? Number(cargoType.id) : undefined,
          tripCount: Number(
            mRec.tripCount ?? bRow.excavationData?.tripCount ?? 1,
          ),
          loadLevelType: loadInfo.type,
          loadLevelCustomValue: loadInfo.custom,
          employeeId: employee?.id ? Number(employee.id) : undefined,
        });
      }

      if (payload.length > 0) {
        await updateTripsBulkMutation.mutateAsync(payload);
        toast.success("Đã cập nhật chuyến thành công!");
      }
    } catch (err: any) {
      console.error("Lỗi khi cập nhật chuyến:", err);
      const msg =
        err.response?.data?.message || err.message || "Lỗi khi lưu chuyến";
      toast.error(`Cập nhật thất bại: ${msg}`);
    }
  };

  const handleApproveItem = async (rowId: string) => {
    const targetItem = rawItems.find((i) => i.id === rowId);
    if (!targetItem) return;

    if (targetItem.reconciliationStatus === "APPROVED") {
      toast.info("Bản ghi này đã được phê duyệt!");
      return;
    }

    const vehicleText = targetItem.commonKey?.vehicleNo
      ? `xe ${targetItem.commonKey.vehicleNo}`
      : "bản ghi này";

    // ponytail: xác nhận trước khi duyệt bản ghi đơn lẻ
    const isConfirmed = await confirm({
      title: "Xác nhận duyệt bản ghi đối chiếu",
      description: `Bạn có chắc chắn muốn phê duyệt kết quả đối chiếu cho ${vehicleText}?`,
      confirmText: "Phê duyệt",
      cancelText: "Hủy bỏ",
      variant: "primary",
      icon: "info",
    });

    if (!isConfirmed) return;

    // Optimistic update
    setRawItems((prev) =>
      prev.map((item) =>
        item.id === rowId
          ? { ...item, reconciliationStatus: "APPROVED" }
          : item,
      ),
    );

    const bRow =
      (targetItem as any)?.backendRow ||
      rawItems.find((i) => i.id === rowId)?.backendRow;
    if (!bRow) {
      toast.success("Đã duyệt bản ghi thành công!");
      return;
    }

    try {
      await saveDecisionMutation.mutateAsync({
        transportReportTripId: bRow.transportReportTripId,
        excavationReportTripId: bRow.excavationReportTripId,
        status: "APPROVED",
        // note không bắt buộc khi duyệt
      });
      toast.success("Đã duyệt bản ghi thành công!");
    } catch (err: any) {
      console.error("Lỗi khi duyệt chuyến:", err);
      toast.error("Duyệt thất bại!");
      // Revert optimistic update
      setRawItems((prev) =>
        prev.map((item) =>
          item.id === rowId
            ? { ...item, reconciliationStatus: targetItem.reconciliationStatus }
            : item,
        ),
      );
    }
  };

  const handleRequestChangeSubmit = async (
    rowId: string,
    note: string,
    target: DepartmentTarget,
  ) => {
    const targetRow = rawItems.find((i) => i.id === rowId);
    setRawItems((prev) =>
      prev.map((item) => {
        if (item.id === rowId) {
          return {
            ...item,
            reconciliationStatus: "REVISION_REQUESTED",
            requestNote: note,
            targetDepartment: target,
            requestedAt: new Date().toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          };
        }
        return item;
      }),
    );

    if (targetRow && (targetRow as any).backendRow) {
      const bRow = (targetRow as any).backendRow;
      let transportReportTripId = bRow.transportReportTripId;
      let excavationReportTripId = bRow.excavationReportTripId;

      if (target === "TRANSPORT") {
        excavationReportTripId = undefined;
      } else if (target === "MINING") {
        transportReportTripId = undefined;
      }

      try {
        await saveDecisionMutation.mutateAsync({
          transportReportTripId,
          excavationReportTripId,
          status: "REVISION_REQUESTED",
          note,
        });
      } catch (err: any) {
        console.error("Lỗi khi lưu quyết định yêu cầu chỉnh sửa:", err);
      }
    }
  };

  const handleResubmitItem = async (rowId: string) => {
    const targetItem = rawItems.find((i) => i.id === rowId);
    if (!targetItem) return;

    const bRow = (targetItem as any).backendRow;
    if (!bRow) return;

    // CHỈ gửi id của ĐÚNG BÊN vai trò đang đăng nhập, VÀ chỉ khi bên đó thật
    // sự đang REVISION_REQUESTED. Hai điều kiện đều bắt buộc — xác nhận thật
    // qua kiểm thử sống (2026-09-08): nếu chỉ lọc theo trạng thái mà không
    // lọc theo vai trò, bấm "Gửi lại" bên Vận tải khi CẢ 2 bên đang đỏ sẽ vô
    // tình gửi lại LUÔN cả bên Khai thác — sai, vì người bấm không hề chạm gì
    // tới dữ liệu Khai thác. Không gửi cả 2 id với status:PENDING như code cũ
    // (lỗi gốc: làm sai decision.status, xoá tín hiệu "đang chờ duyệt lại"
    // của bên kia). Không optimistic-update reconciliationStatus ở đây — kết
    // quả thật (đỏ/vàng/trắng) phụ thuộc CẢ 2 bên, để React Query
    // invalidate/refetch tự cập nhật đúng ngay sau khi mutation thành công.
    try {
      await resubmitTripsMutation.mutateAsync({
        transportReportTripId:
          currentRole === "ROLE_TRANSPORT" &&
          bRow.transportStatus === "REVISION_REQUESTED"
            ? bRow.transportReportTripId
            : undefined,
        excavationReportTripId:
          currentRole === "ROLE_MINING" &&
          bRow.excavationStatus === "REVISION_REQUESTED"
            ? bRow.excavationReportTripId
            : undefined,
      });
    } catch (err: any) {
      console.error("Lỗi khi gửi lại chuyến:", err);
    }
  };

  const selectedCount = useMemo(() => {
    return Object.values(rowSelection).filter(Boolean).length;
  }, [rowSelection]);

  const handleBulkApprove = async () => {
    const selectedIds = Object.keys(rowSelection).filter(
      (id) => rowSelection[id],
    );
    if (selectedIds.length === 0) {
      toast.warning("Vui lòng chọn ít nhất một dòng để duyệt!");
      return;
    }

    // Chưa đủ dữ liệu 2 bên (1 bên chưa nhập) HOẶC dữ liệu 2 bên chưa khớp
    // thì KHÔNG được duyệt — dùng đúng isMatchedItem (cùng logic quyết định
    // tam giác cảnh báo ở cột "Sai lệch" và nút Duyệt từng dòng), để "Duyệt
    // hàng loạt" không lách được điều kiện đã chặn ở nút đơn lẻ. Bỏ qua các
    // dòng đó thay vì chặn cả nút, vì 1 lượt chọn có thể lẫn cả dòng đủ điều
    // kiện lẫn chưa đủ. Chốt 2026-09-10.
    const selectedNotApproved = rawItems.filter(
      (i) =>
        selectedIds.includes(i.id) && i.reconciliationStatus !== "APPROVED",
    );
    // Bỏ qua CẢ dòng chưa khớp LẪN dòng ghép cặp không chắc chắn — cùng lý
    // do isMatchedItem ở trên: "Duyệt hàng loạt" không được lách qua điều
    // kiện đã chặn ở nút đơn lẻ.
    const unapprovedItems = selectedNotApproved
      .filter(isMatchedItem)
      .filter((i) => !isPairingAmbiguousItem(i));
    const skippedMismatchCount =
      selectedNotApproved.length - unapprovedItems.length;

    if (unapprovedItems.length === 0) {
      if (skippedMismatchCount > 0) {
        toast.warning(
          `Không có dòng nào đủ điều kiện duyệt — ${skippedMismatchCount} dòng đã chọn còn thiếu dữ liệu 1 bên hoặc chưa khớp.`,
        );
      } else {
        toast.info("Tất cả các dòng đã chọn đều đã được phê duyệt!");
      }
      return;
    }

    // ponytail: modal xác nhận khi duyệt nhiều bản ghi
    const isConfirmed = await confirm({
      title: "Xác nhận duyệt hàng loạt",
      description: `Bạn có chắc chắn muốn phê duyệt ${unapprovedItems.length} bản ghi đối chiếu đã chọn`,
      confirmText: `Duyệt (${unapprovedItems.length})`,
      cancelText: "Hủy bỏ",
      variant: "primary",
      icon: "info",
    });

    if (!isConfirmed) return;

    const unapprovedIds = unapprovedItems.map((i) => i.id);

    // Optimistic
    setRawItems((prev) =>
      prev.map((item) =>
        unapprovedIds.includes(item.id)
          ? { ...item, reconciliationStatus: "APPROVED" }
          : item,
      ),
    );
    setRowSelection({});

    const decisions = unapprovedItems
      .filter((item) => (item as any).backendRow)
      .map((item) => {
        const bRow = (item as any).backendRow;
        return {
          transportReportTripId: bRow.transportReportTripId,
          excavationReportTripId: bRow.excavationReportTripId,
          status: "APPROVED" as const,
        };
      });
    if (decisions.length > 0) {
      try {
        await saveDecisionsBulkMutation.mutateAsync({ decisions });
      } catch (err: any) {
        console.error("Lỗi khi duyệt hàng loạt:", err);
        toast.error("Không thể lưu duyệt hàng loạt lên máy chủ!");
        return;
      }
    }
    toast.success(`Đã duyệt thành công ${unapprovedItems.length} dòng!`);
    if (skippedMismatchCount > 0) {
      toast.warning(
        `Bỏ qua ${skippedMismatchCount} dòng còn thiếu dữ liệu 1 bên hoặc chưa khớp — chưa được duyệt.`,
      );
    }
  };

  const handleBulkRequestChangeSubmit = async (
    requests: {
      rowId: string;
      item: ReconciliationItem;
      note: string;
      target: DepartmentTarget;
    }[],
  ) => {
    // ponytail: update local state immediately
    setRawItems((prev) =>
      prev.map((item) => {
        const req = requests.find((r) => r.rowId === item.id);
        if (req) {
          return {
            ...item,
            reconciliationStatus: "REVISION_REQUESTED",
            requestNote: req.note,
            targetDepartment: req.target,
            requestedAt: new Date().toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          };
        }
        return item;
      }),
    );

    // target="BOTH" gửi CẢ HAI id cùng lúc -> backend coi đây là thao tác
    // trên 1 CẶP và từ chối nếu pairing không chắc chắn (Quality Gate lượt 4
    // của Codex, 2026-09-15) — chặn ở FE trước để không gửi request vô ích
    // và người dùng hiểu ngay lý do, thay vì chỉ thấy lỗi 400 chung chung.
    // target="TRANSPORT"/"MINING" chỉ gửi 1 id (xem bên dưới) nên KHÔNG bị
    // chặn — không giả định gì về pairing.
    const ambiguousBothTargets = requests.filter(
      (req) =>
        req.target === "BOTH" && isPairingAmbiguousItem(req.item),
    );
    const eligibleRequests = requests.filter(
      (req) => !ambiguousBothTargets.includes(req),
    );

    const decisions = eligibleRequests
      .filter((req) => (req.item as any).backendRow)
      .map((req) => {
        const bRow = (req.item as any).backendRow;
        let transportReportTripId = bRow.transportReportTripId;
        let excavationReportTripId = bRow.excavationReportTripId;

        if (req.target === "TRANSPORT") {
          excavationReportTripId = undefined;
        } else if (req.target === "MINING") {
          transportReportTripId = undefined;
        }

        return {
          transportReportTripId,
          excavationReportTripId,
          status: "REVISION_REQUESTED" as const,
          note: req.note,
        };
      });

    if (ambiguousBothTargets.length > 0) {
      toast.warning(
        `Bỏ qua ${ambiguousBothTargets.length} dòng ghép cặp không chắc chắn — cần làm rõ dữ liệu trước khi yêu cầu sửa cả 2 bên.`,
      );
    }

    if (decisions.length > 0) {
      try {
        await saveDecisionsBulkMutation.mutateAsync({ decisions });
        toast.success(
          `Đã gửi yêu cầu chỉnh sửa cho ${decisions.length} bản ghi!`,
        );
      } catch (err: any) {
        console.error("Lỗi khi gửi yêu cầu sửa hàng loạt:", err);
        toast.error("Không thể lưu yêu cầu chỉnh sửa lên máy chủ!");
      }
    }
    setRowSelection({});
    setIsBulkRequestModalOpen(false);
  };
  const kpiCards: KpiCardConfig[] = [
    {
      key: "all",
      label: "TẤT CẢ",
      icon: Layers,
      value: totalAllCount,
      colorClasses: {
        active:
          "bg-slate-100/90 dark:bg-slate-800/80 border-slate-500 ring-2 ring-slate-500/40 shadow-md scale-[1.01]",
        iconBg:
          "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
        label: "text-slate-800 dark:text-slate-200",
        value: "text-slate-900 dark:text-slate-100",
        hover: "hover:border-slate-400 hover:shadow-md",
      },
    },
    {
      key: "pending",
      label: "CHỜ ĐỐI SOÁT",
      icon: Clock,
      value: pendingCount,
      colorClasses: {
        active:
          "bg-blue-50/90 dark:bg-blue-950/70 border-blue-500 ring-2 ring-blue-500/40 shadow-md scale-[1.01]",
        iconBg:
          "bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400",
        label: "text-blue-900 dark:text-blue-300",
        value: "text-blue-700 dark:text-blue-300",
        hover: "hover:border-blue-400 hover:shadow-md",
      },
    },
    {
      key: "approved",
      label: "ĐÃ DUYỆT",
      icon: CheckCheck,
      value: approvedCount,
      colorClasses: {
        active:
          "bg-emerald-50/90 dark:bg-emerald-950/70 border-emerald-500 ring-2 ring-emerald-500/40 shadow-md scale-[1.01]",
        iconBg:
          "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400",
        label: "text-emerald-900 dark:text-emerald-300",
        value: "text-emerald-700 dark:text-emerald-300",
        hover: "hover:border-emerald-400 hover:shadow-md",
      },
    },
    {
      key: "not_approved",
      label: "CHỜ CHỈNH SỬA",
      icon: XCircle,
      value: notApprovedCount,
      colorClasses: {
        active:
          "bg-rose-50/90 dark:bg-rose-950/70 border-rose-500 ring-2 ring-rose-500/40 shadow-md scale-[1.01]",
        iconBg:
          "bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400",
        label: "text-rose-900 dark:text-rose-300",
        value: "text-rose-700 dark:text-rose-300",
        hover: "hover:border-rose-400 hover:shadow-md",
      },
    },
    {
      key: "matched",
      label: "KHỚP SỐ LIỆU",
      icon: CheckCircle2,
      value: matchedCount,
      suffix: `(${matchedPct}%)`,
      colorClasses: {
        active:
          "bg-teal-50/90 dark:bg-teal-950/70 border-teal-600 ring-2 ring-teal-600/40 shadow-md scale-[1.01]",
        iconBg:
          "bg-teal-100 dark:bg-teal-900/60 text-teal-600 dark:text-teal-400",
        label: "text-teal-900 dark:text-teal-300",
        value: "text-teal-700 dark:text-teal-300",
        hover: "hover:border-teal-400 hover:shadow-md",
      },
    },
    {
      key: "mismatch",
      label: "SAI LỆCH",
      icon: AlertTriangle,
      value: mismatchCount,
      suffix: `(${mismatchPct}%)`,
      colorClasses: {
        active:
          "bg-amber-50/90 dark:bg-amber-950/70 border-amber-600 ring-2 ring-amber-600/40 shadow-md scale-[1.01]",
        iconBg:
          "bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400",
        label: "text-amber-900 dark:text-amber-300",
        value: "text-amber-600 dark:text-amber-400",
        hover: "hover:border-amber-400 hover:shadow-md",
      },
    },
  ];
  return (
    <div className="p-6 space-y-5 bg-slate-50/50 min-h-screen">
      {/* ══ 1. TOP HEADER BAR ═════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            <FileSpreadsheet className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1e293b] dark:text-gray-100 tracking-tight">
              ĐỐI CHIẾU & TỔNG HỢP DỮ LIỆU BÁO CHUYẾN
            </h1>
          </div>
        </div>

        {/* Quick Role Switcher for testing */}
        <div className="flex items-center gap-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-1 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 pl-2 pr-1">
            Đang đóng vai test:
          </span>
          {(
            [
              {
                role: "ROLE_STATISTICIAN",
                label: "Thống kê",
                color: "bg-indigo-600 hover:bg-indigo-700",
              },
              {
                role: "ROLE_TRANSPORT",
                label: "Vận tải",
                color: "bg-blue-600 hover:bg-blue-700",
              },
              {
                role: "ROLE_MINING",
                label: "Khai thác",
                color: "bg-amber-600 hover:bg-amber-700",
              },
            ] as const
          ).map((item) => {
            const isSelected = currentRole === item.role;
            return (
              <button
                key={item.role}
                onClick={() => {
                  setRole(item.role);
                  toast.info(`Đã chuyển sang vai trò: ${item.label}`);
                }}
                className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                  isSelected
                    ? `${item.color} text-white shadow-xs`
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ══ 2. TOP FILTER BAR ═════════════════════════════════════════════ */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex flex-wrap items-end gap-3 text-xs">
          <div className="flex flex-col gap-1">
            <span className="font-medium text-gray-600 dark:text-gray-400">
              Thời gian bắt đầu
            </span>
            <DatePickerString
              value={startDate}
              onChange={(v) => setStartDate(v)}
              className="w-36"
            />
          </div>

          <span className="pb-2 text-gray-400 font-bold">-</span>

          <div className="flex flex-col gap-1">
            <span className="font-medium text-gray-600 dark:text-gray-400">
              Thời gian kết thúc
            </span>
            <DatePickerString
              value={endDate}
              onChange={(v) => setEndDate(v)}
              className="w-36"
            />
          </div>

          <div className="flex flex-col gap-1 min-w-52.5 max-w-85">
            <span className="font-medium text-gray-600 dark:text-gray-400">
              Ca
            </span>
            <Combobox
              items={availableShifts}
              multiple
              value={selectedShifts}
              onValueChange={setSelectedShifts}
            >
              <ComboboxChips
                ref={shiftAnchorRef}
                className="min-h-9 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-xs py-1"
              >
                <ComboboxValue placeholder="Tất cả ca">
                  {selectedShifts.map((item) => (
                    <ComboboxChip key={item} className="text-xs py-0.5">
                      {item}
                    </ComboboxChip>
                  ))}
                </ComboboxValue>
                <ComboboxChipsInput
                  placeholder={selectedShifts.length === 0 ? "Chọn ca..." : ""}
                  className="text-xs"
                />
              </ComboboxChips>
              <ComboboxContent
                anchor={shiftAnchorRef}
                sideOffset={4}
                align="start"
              >
                <ComboboxEmpty className="text-xs py-2 text-gray-400">
                  Không tìm thấy ca
                </ComboboxEmpty>
                <ComboboxList>
                  {(item) => (
                    <ComboboxItem
                      key={item}
                      value={item}
                      className="text-xs py-1.5"
                    >
                      {item}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>

          <div className="flex flex-col gap-1 min-w-52.5 max-w-85">
            <span className="font-medium text-gray-600 dark:text-gray-400">
              Số xe
            </span>
            <Combobox
              items={availableVehicles}
              multiple
              value={selectedVehicles}
              onValueChange={setSelectedVehicles}
            >
              <ComboboxChips
                ref={vehicleAnchorRef}
                className="min-h-9 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-xs py-1"
              >
                <ComboboxValue placeholder="Tất cả xe">
                  {selectedVehicles.map((item) => (
                    <ComboboxChip key={item} className="text-xs py-0.5">
                      {item}
                    </ComboboxChip>
                  ))}
                </ComboboxValue>
                <ComboboxChipsInput
                  placeholder={
                    selectedVehicles.length === 0 ? "Chọn số xe..." : ""
                  }
                  className="text-xs"
                />
              </ComboboxChips>
              <ComboboxContent
                anchor={vehicleAnchorRef}
                sideOffset={4}
                align="start"
              >
                <ComboboxEmpty className="text-xs py-2 text-gray-400">
                  Không tìm thấy xe
                </ComboboxEmpty>
                <ComboboxList>
                  {(item) => (
                    <ComboboxItem
                      key={item}
                      value={item}
                      className="text-xs py-1.5"
                    >
                      {item}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>

          <div className="flex flex-col gap-1 flex-1 min-w-45">
            <span className="font-medium text-gray-600 dark:text-gray-400">
              Tìm kiếm
            </span>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
              <Input
                placeholder="Nhập số xe, thẻ lương..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="h-9 text-xs pl-8 bg-white dark:bg-gray-900"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map((card) => (
          <KpiCard
            key={card.key}
            config={card}
            isActive={cardFilter === card.key}
            onClick={() => handleCardClick(card.key)}
          />
        ))}
      </div>

      {/* ══ 4. RECONCILIATION TABLE ═══════════════════════════════════════ */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
            Bảng danh sách kết quả đối chiếu
          </span>

          <div className="flex items-center gap-2.5 ml-auto">
            {selectedCount > 0 && (
              <>
                <Button
                  onClick={handleBulkApprove}
                  disabled={saveDecisionsBulkMutation.isPending}
                  className="h-9 px-4 text-xs font-bold gap-2 shadow-xs bg-blue-600 hover:bg-blue-700 text-white cursor-pointer transition-all animate-in fade-in zoom-in-95 duration-200"
                >
                  <CheckCheck className="w-4 h-4" />
                  Duyệt các dòng đã chọn ({selectedCount})
                </Button>

                <Button
                  onClick={() => {
                    const eligible = rawItems.filter(
                      (i) =>
                        rowSelection[i.id] &&
                        i.reconciliationStatus !== "REVISION_REQUESTED",
                    );
                    if (eligible.length === 0) {
                      toast.warning(
                        "Tất cả các dòng đã chọn đều đang chờ đơn vị chỉnh sửa lại!",
                      );
                      return;
                    }
                    setIsBulkRequestModalOpen(true);
                  }}
                  disabled={saveDecisionsBulkMutation.isPending}
                  className="h-9 px-4 text-xs font-bold gap-2 shadow-xs bg-blue-600 hover:bg-blue-700 text-white cursor-pointer transition-all animate-in fade-in zoom-in-95 duration-200"
                >
                  <FileEdit className="w-4 h-4" />
                  Yêu cầu sửa ({selectedCount})
                </Button>
              </>
            )}

            <Button
              onClick={handleExportExcel}
              className="h-9 px-5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Tải xuống (Excel)
            </Button>
          </div>
        </div>

        <ReconciliationComparisonTables
          items={displayItems}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          onDeleteItem={handleDeleteItem}
          onUpdateItem={handleUpdateItem}
          onApproveItem={handleApproveItem}
          onRequestChangeSubmit={handleRequestChangeSubmit}
          onResubmitItem={handleResubmitItem}
        />

        {/* Modal Yêu cầu sửa hàng loạt — bỏ qua các dòng ĐANG chờ đơn vị sửa
            (gửi lại lần nữa là thừa). Dòng ĐÃ DUYỆT vẫn gửi được: theo QĐ-17
            đó là con đường DUY NHẤT để sửa lại số liệu đã duyệt. */}
        <RequestChangeModal
          isOpen={isBulkRequestModalOpen}
          onClose={() => setIsBulkRequestModalOpen(false)}
          items={rawItems.filter(
            (i) =>
              rowSelection[i.id] &&
              i.reconciliationStatus !== "REVISION_REQUESTED",
          )}
          onSubmit={handleBulkRequestChangeSubmit}
        />
        {ConfirmDialogComponent}
      </div>
    </div>
  );
};
