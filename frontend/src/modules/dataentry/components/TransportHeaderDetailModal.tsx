import React, { useRef, useEffect, useCallback } from "react";
import { DatePickerString } from "@/components/common/DatePickerString";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../../components/ui/dialog.tsx";
import { Button } from "../../../components/ui/button.tsx";
import { Input } from "../../../components/ui/input.tsx";
import { Checkbox } from "../../../components/ui/checkbox.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select.tsx";
import { ComboboxInput } from "../../../components/ui/combobox-input.tsx";
import { Plus, Trash2, Truck, X } from "lucide-react";
import { toast } from "sonner";

import { useMasterData } from "@/modules/dataentry/hooks/useMasterData.ts";
import { useFormTabNavigation } from "@/hooks/useFormTabNavigation.ts";
import { useTransportDraftStore } from "@/modules/dataentry/store/useTransportDraftStore.ts";
import {
  useCreateTransportReportMutation,
  useUpdateTransportReportMutation,
  useUpdateTransportTripMutation,
  useBulkCreateTransportReportMutation,
  useBulkUpdateTransportReportMutation,
  buildTransportReportRequest,
  buildTransportTripRequestItem,
  type TransportReportRequest,
  type TransportReportBulkUpdateItem,
} from "@/modules/dataentry/services/transportTripReportService";
import { SessionTabsBar } from "./SessionTabsBar.tsx";
import { LoadStatusRadioGroup } from "./LoadStatusRadioGroup.tsx";
import { FuelSection } from "./FuelSection.tsx";
import { OperatorSection } from "./OperatorSection.tsx";
import { ModalFooterActions } from "./ModalFooterActions.tsx";
import { useModalShortcuts } from "../hooks/useModalShortcuts.ts";

// ─── 1 dòng chuyến xe trong bảng Danh sách chuyến ────────────────────────
// ponytail: trip row contains only trip data, vehicle moved to session header
export interface TransportTripRow {
  _tempId: string;
  excavationArea: string; // Khu vực xúc
  excavatorEquipment: string; // Máy xúc
  pickupLocation: string; // Nơi nhận tải
  pickupBench: string; // Tầng nhận tải
  pickupBenchGroup: number | string; // Nhóm tầng nhận tải (tự động)
  unloadBench: string; // Tầng dỡ tải
  fullRouteDistance: number | ""; // Cung độ toàn tuyến (km)
  fullRouteElevate: number | ""; // Nâng tải toàn tuyến (m)
  localSlopeDist: number | ""; // Cung độ dốc cục bộ (km)
  localSlopeDegree: number | ""; // Dốc cục bộ (m)
  unloadLocationName: string; // Nơi dỡ tải
  cargoType: string; // Loại hàng
  cargoGroup: string; // Nhóm hàng (tự động)
  tripCount: number | ""; // Số chuyến
  loadStatus: string; // Tải trọng (radio)
  loadStatusNote: string; // Ghi chú khi "Khác" (vd: "2/3", "1/2")
  isRainyDay: boolean; // Ngày mưa
  weighedWeightTon: number | ""; // Khối lượng qua cân (tấn)
  provisionalModel: number | ""; // Mô hình (tạm tính)
  provisionalDensity: number | ""; // Tỷ trọng (tạm tính)
  isTraineeVehicle: boolean; // Lái xe bổ túc
  deductionAmount: number | ""; // Trừ vơi (đất-m3, than-tấn)
}

// ─── 1 bản ghi = 1 ca phân xưởng vận tải ─────────────────────────────────
export interface TransportSessionDraft {
  _tempId: string;
  reportId?: number; // ID báo cáo khi chỉnh sửa từ API Backend
  singleTripId?: number; // ID chuyến đơn lẻ khi chỉnh sửa trực tiếp 1 chuyến

  // === Header (Thông tin chung) ===
  workingDate: string; // YYYY-MM-DD
  shift: string; // Ca: "1" | "2" | "3"
  department?: string; // Đơn vị
  vehicleNo: string; // Số xe
  equipmentUnit: string; // Đơn vị quản lý thiết bị (tự động theo số xe)
  vehicleType: string; // Chủng loại xe (tự động theo số xe)

  // === Danh sách chuyến ===
  trips: TransportTripRow[];

  // === Nhiên liệu ===
  initialFuel: number | ""; // Nhiên liệu tồn đầu (lít)
  receivedFuel: number | ""; // Nhiên liệu lĩnh (lít)
  finalFuel: number | ""; // Nhiên liệu tồn cuối (lít)

  // === Người vận hành ===
  operatorBadgeNo: string; // Số thẻ lương
  operatorName: string; // Họ và tên (tự động)
  operatorUnit: string; // Đơn vị (tự động)
}

// ─── Utilities ───────────────────────────────────────────────────────────
const todayStr = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const computeFuelUsed = (s: TransportSessionDraft): number =>
  Math.max(
    0,
    (Number(s.initialFuel) || 0) +
      (Number(s.receivedFuel) || 0) -
      (Number(s.finalFuel) || 0),
  );

// ─── Props ────────────────────────────────────────────────────────────────
interface TransportHeaderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode?: "add" | "edit";
}

// ════════════════════════════════════════════════════════════════════════════
export const TransportHeaderDetailModal: React.FC<
  TransportHeaderDetailModalProps
> = ({ isOpen, onClose, onSuccess, mode = "add" }) => {
  const masterData = useMasterData({ enabled: isOpen });
  const {
    shiftOptions,
    locationValues,
    excavatorValues,
    vehicleValues,
    cargoGroupValues,
    operatorOptions,
    getVehicleDetails,
    getOperatorDetails,
    getCargoGroupDetails,
    getCargoTypesByGroup,
    rawShifts = [],
    rawLocations = [],
    rawExcavators = [],
    rawVehicles = [],
    rawUsers = [],
    rawCargoTypes = [],
    rawDepartments = [],
  } = masterData;

  const createReportMutation = useCreateTransportReportMutation();
  const updateReportMutation = useUpdateTransportReportMutation();
  const updateTransportTripMutation = useUpdateTransportTripMutation();
  const bulkCreateReportMutation = useBulkCreateTransportReportMutation();
  const bulkUpdateReportMutation = useBulkUpdateTransportReportMutation();

  const {
    sessions,
    activeIdx,
    initDrafts,
    addSession,
    removeSession,
    setActiveIdx,
    updateActiveSession,
    updateTripRow,
    addTripRow,
    removeTripRow,
    validateAllSessions,
    isSessionValid,
    getSessionProgress,
    getBatchProgress,
  } = useTransportDraftStore();

  const batchProgress = getBatchProgress();

  const createDefaultTripRow = useCallback(
    (area?: string): TransportTripRow => {
      return {
        _tempId: `trip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        excavationArea: area || "",
        excavatorEquipment: "",
        pickupLocation: "",
        pickupBench: "",
        pickupBenchGroup: "",
        unloadBench: "",
        fullRouteDistance: "",
        fullRouteElevate: "",
        localSlopeDist: "",
        localSlopeDegree: "",
        unloadLocationName: "",
        cargoType: "",
        cargoGroup: "",
        tripCount: "",
        loadStatus: "Đủ tải",
        loadStatusNote: "",
        isRainyDay: false,
        weighedWeightTon: "",
        provisionalModel: "",
        provisionalDensity: "",
        isTraineeVehicle: false,
        deductionAmount: "",
      };
    },
    [],
  );

  const firstShift = shiftOptions[0]?.value || "1";

  const createDefaultSession = useCallback((): TransportSessionDraft => {
    return {
      _tempId: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      workingDate: todayStr(),
      shift: firstShift,
      department: "",
      vehicleNo: "",
      equipmentUnit: "",
      vehicleType: "",
      trips: [createDefaultTripRow()],
      initialFuel: "",
      receivedFuel: "",
      finalFuel: "",
      operatorBadgeNo: "",
      operatorName: "",
      operatorUnit: "",
    };
  }, [firstShift, createDefaultTripRow]);

  const tableBottomRef = useRef<HTMLDivElement>(null);

  // ── Khởi tạo dữ liệu khi mở modal ───────────────────────────────────────
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      if (mode === "add") {
        initDrafts(createDefaultSession());
      } else {
        if (sessions.length === 0) {
          initDrafts(createDefaultSession());
        }
      }
    }
    wasOpenRef.current = isOpen;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode]);

  // ── Cập nhật session header ─────────────────────────────────────────────
  const handleUpdateSession = useCallback(
    (patch: Partial<TransportSessionDraft>) => {
      updateActiveSession(patch, getOperatorDetails, getVehicleDetails);
    },
    [updateActiveSession, getOperatorDetails, getVehicleDetails],
  );

  // ── Cập nhật 1 dòng chuyến ──────────────────────────────────────────────
  const handleUpdateTrip = useCallback(
    (tIdx: number, patch: Partial<TransportTripRow>) => {
      updateTripRow(tIdx, patch, getCargoGroupDetails);
    },
    [updateTripRow, getCargoGroupDetails],
  );

  // ── Thêm / xóa dòng chuyến ─────────────────────────────────────────────
  const handleAddTripAction = useCallback(() => {
    addTripRow();
    setTimeout(
      () => tableBottomRef.current?.scrollIntoView({ behavior: "smooth" }),
      60,
    );
  }, [addTripRow]);

  const handleRemoveTripAction = (tIdx: number) => {
    const success = removeTripRow(tIdx);
    if (!success) {
      toast.error("Phải giữ ít nhất 1 chuyến xe!");
    }
  };

  // ── Thêm / xóa tab bản ghi ─────────────────────────────────────────────
  const handleAddSessionAction = () => {
    addSession(createDefaultSession());
  };

  // ── Keyboard Navigation (Tab / Enter) giữa các ô nhập liệu ────────────
  const { handleKeyDown } = useFormTabNavigation({
    onAddNewRow: handleAddTripAction,
  });

  // ── Lưu tất cả ─────────────────────────────────────────────────────────
  const handleSave = async (andAddNew: boolean) => {
    // Trường hợp chỉnh sửa 1 chuyến đơn lẻ (Single-trip edit mode)
    if (sessions.length === 1 && sessions[0].singleTripId) {
      const sess = sessions[0];
      const tripRow = sess.trips[0];
      if (!tripRow) {
        toast.error("Không tìm thấy dữ liệu chuyến để cập nhật!");
        return;
      }
      try {
        const tripPayload = buildTransportTripRequestItem(tripRow, {
          rawLocations,
          rawExcavators,
          rawCargoTypes,
          rawDepartments,
        });
        await updateTransportTripMutation.mutateAsync({
          tripId: sess.singleTripId!,
          payload: tripPayload,
        });
        toast.success("Đã cập nhật chuyến thành công!");
        onSuccess();
        if (andAddNew) {
          initDrafts(createDefaultSession());
        } else {
          onClose();
        }
      } catch (err: any) {
        console.error("[API Update Trip Error] Lỗi khi cập nhật chuyến:", err);
        const msg =
          err.response?.data?.message ||
          err.message ||
          "Lỗi kết nối máy chủ API";
        toast.error(`Cập nhật chuyến thất bại: ${msg}`);
      }
      return;
    }

    const validation = validateAllSessions();
    if (!validation.isValid) {
      toast.error(validation.firstErrorMsg || "Thông tin bản ghi chưa đầy đủ!");
      if (typeof validation.firstErrorIdx === "number") {
        setActiveIdx(validation.firstErrorIdx);
      }
      return;
    }

    // 1. Map dữ liệu tất cả mẻ sang API request payload
    const payloads: any[] = [];
    for (let i = 0; i < sessions.length; i++) {
      try {
        const payload = buildTransportReportRequest(sessions[i], {
          rawShifts,
          rawLocations,
          rawExcavators,
          rawVehicles,
          rawUsers,
          rawCargoTypes,
          rawDepartments,
        });
        payloads.push(payload);
      } catch (err: any) {
        console.error(`[Mapping Data Error] Lỗi bản ghi ca ${i + 1}:`, err);
        toast.error(
          `Bản ghi #${i + 1}: ${err.message || "Lỗi dữ liệu không hợp lệ"}`,
        );
        setActiveIdx(i);
        return;
      }
    }

    let apiSuccessCount = 0;
    const apiErrors: string[] = [];

    // Tách danh sách bản ghi tạo mới và bản ghi cập nhật
    const createItems: TransportReportRequest[] = [];
    const updateItems: TransportReportBulkUpdateItem[] = [];

    for (let i = 0; i < payloads.length; i++) {
      const sess = sessions[i];
      if (sess.reportId) {
        updateItems.push({
          id: sess.reportId,
          data: payloads[i],
        });
      } else {
        createItems.push(payloads[i]);
      }
    }

    // Gọi API Tạo mới (đơn lẻ hoặc bulk)
    if (createItems.length > 0) {
      try {
        if (createItems.length === 1) {
          await createReportMutation.mutateAsync(createItems[0]);
        } else {
          await bulkCreateReportMutation.mutateAsync(createItems);
        }
        apiSuccessCount += createItems.length;
      } catch (err: any) {
        console.error(
          "[API Create Error] Lỗi khi tạo mới báo cáo vận tải:",
          err,
        );
        const msg =
          err.response?.data?.message ||
          err.message ||
          "Lỗi kết nối máy chủ API";
        apiErrors.push(`Tạo mới (${createItems.length} bản ghi): ${msg}`);
      }
    }

    // Gọi API Cập nhật (đơn lẻ hoặc bulk)
    if (updateItems.length > 0) {
      try {
        if (updateItems.length === 1) {
          await updateReportMutation.mutateAsync({
            id: updateItems[0].id,
            payload: updateItems[0].data,
          });
        } else {
          await bulkUpdateReportMutation.mutateAsync(updateItems);
        }
        apiSuccessCount += updateItems.length;
      } catch (err: any) {
        console.error(
          "[API Update Error] Lỗi khi cập nhật báo cáo vận tải:",
          err,
        );
        const msg =
          err.response?.data?.message ||
          err.message ||
          "Lỗi kết nối máy chủ API";
        apiErrors.push(`Cập nhật (${updateItems.length} bản ghi): ${msg}`);
      }
    }
    if (apiSuccessCount > 0) {
      toast.success(`Đã gửi thành công ${apiSuccessCount} bản ghi!`);
      onSuccess();

      if (andAddNew) {
        initDrafts(createDefaultSession());
      } else {
        onClose();
      }
    } else {
      toast.error(`Lỗi kết nối API:\n${apiErrors.join("\n")}`);
    }
  };

  const handleCancel = () => onClose();

  // ── Phím tắt: F3 = thêm chuyến, F2 = lưu & thêm mới, F5 = lưu ────────
  useModalShortcuts({
    isOpen,
    mode,
    onAddTrip: handleAddTripAction,
    onSave: handleSave,
  });

  const sess = sessions[activeIdx] ?? sessions[0];
  if (!sess) return null;

  const fuelUsed = computeFuelUsed(sess);
  const totalTripCountSum = sess.trips.reduce(
    (sum, t) => sum + (Number(t.tripCount) || 0),
    0,
  );

  // ════════════════════════════════════════════════════════════════════════
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleCancel();
      }}
    >
      <DialogContent
        className="w-[99vw] max-w-[99vw] sm:max-w-[99vw] h-[96vh] max-h-[96vh] flex flex-col p-0
                   bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800
                   shadow-2xl rounded-xl overflow-hidden
                   [&>button:last-child]:hidden"
      >
        {/* ══ HEADER ══════════════════════════════════════════════════════ */}
        <DialogHeader className="flex flex-row items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              <Truck className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base font-bold text-gray-900 dark:text-gray-100 tracking-wide">
              {mode === "add"
                ? "Thêm mới bản ghi – Báo chuyến Phân xưởng Vận tải"
                : "Chỉnh sửa bản ghi – Báo chuyến Phân xưởng Vận tải"}
            </DialogTitle>
          </div>
          <button
            onClick={handleCancel}
            className="rounded-md p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </DialogHeader>

        {/* ══ TABS & BATCH PROGRESS HEADER ════════════════════════════════ */}
        <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shrink-0 px-5 pt-1.5 pb-1 space-y-1">
          <SessionTabsBar
            sessions={sessions}
            activeIdx={activeIdx}
            batchProgress={batchProgress}
            isSessionValid={isSessionValid}
            getSessionProgress={getSessionProgress}
            onSelect={setActiveIdx}
            onRemove={removeSession}
            onAdd={handleAddSessionAction}
            renderExtraLabel={(s) => (s.vehicleNo ? ` – Xe ${s.vehicleNo}` : "")}
            progressLabel="Tiến độ nhập lô:"
          />
        </div>

        {/* ══ BODY (cuộn) ════════════════════════════════════════════════ */}
        <div
          className="flex-1 overflow-y-auto px-5 py-4 space-y-5"
          onKeyDown={handleKeyDown}
        >
          {/* ── HÀNG THÔNG TIN CHUNG: Thời gian · Ca · Số xe · Đơn vị QLTB · Chủng loại ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Thời gian */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Thời gian <span className="text-red-500">*</span>
              </label>
              <DatePickerString
                value={sess.workingDate}
                onChange={(val) => handleUpdateSession({ workingDate: val })}
                className="w-full"
                popoverClassName="z-[110]"
              />
            </div>

            {/* Ca */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Ca <span className="text-red-500">*</span>
              </label>
              <Select
                value={
                  sess.shift
                    ? String(sess.shift)
                        .replace(/^ca\s+/i, "")
                        .trim()
                    : undefined
                }
                onValueChange={(v) => handleUpdateSession({ shift: v })}
              >
                <SelectTrigger className="h-9 text-sm w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[110]">
                  {shiftOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Số xe */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Số xe <span className="text-red-500">*</span>
              </label>
              <ComboboxInput
                options={vehicleValues}
                value={sess.vehicleNo}
                onChange={(v) => handleUpdateSession({ vehicleNo: v })}
                placeholder="Chọn số xe"
              />
            </div>

            {/* Đơn vị quản lý thiết bị (tự động, readonly) */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Đơn vị quản lý thiết bị
              </label>
              <Input
                type="text"
                value={sess.equipmentUnit || ""}
                readOnly
                disabled
                title={sess.equipmentUnit}
                className="h-9 text-sm bg-gray-100 dark:bg-gray-800 cursor-not-allowed border-gray-200 dark:border-gray-700 truncate"
              />
            </div>

            {/* Chủng loại (tự động, readonly) */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Chủng loại
              </label>
              <Input
                type="text"
                value={sess.vehicleType || ""}
                readOnly
                disabled
                className="h-9 text-sm bg-gray-100 dark:bg-gray-800 cursor-not-allowed border-gray-200 dark:border-gray-700 truncate"
              />
            </div>
          </div>

          {/* ══ DANH SÁCH CHUYẾN ═══════════════════════════════════════ */}
          <div>
            {/* Tiêu đề + nút */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-blue-700 dark:text-blue-400 tracking-widest uppercase">
                Danh sách chuyến
              </span>
              <div className="flex items-center gap-2">
                {/* Thêm chuyến */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddTripAction}
                  className="h-8 text-xs gap-1.5 border-blue-500 text-blue-700 hover:bg-blue-50 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Thêm chuyến (F3)
                </Button>
              </div>
            </div>

            {/* Bảng chuyến vận tải */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto">
              <table className="w-full text-xs border-collapse min-w-[1760px]">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 text-sm font-bold border-b border-gray-200 dark:border-gray-700">
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-center w-10">
                      STT
                    </th>
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-left min-w-[135px]">
                      Khu vực xúc
                    </th>
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-left min-w-[125px]">
                      Máy xúc
                    </th>
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-left min-w-[130px]">
                      Nơi nhận tải
                    </th>
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-center min-w-[100px]">
                      Tầng nhận tải
                    </th>
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-center min-w-[140px]">
                      Nhóm tầng nhận tải
                    </th>
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-center min-w-[100px]">
                      Tầng dỡ tải
                    </th>
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-center min-w-[145px]">
                      Cung độ
                      <br />
                      toàn tuyến (km)
                    </th>
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-center min-w-[145px]">
                      Nâng tải
                      <br />
                      toàn tuyến (m)
                    </th>
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-center min-w-[145px]">
                      Cung độ dốc
                      <br />
                      cục bộ (km)
                    </th>
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-center min-w-[125px]">
                      Dốc cục bộ (m)
                    </th>
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-left min-w-[130px]">
                      Nơi dỡ tải
                    </th>
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-left min-w-[140px]">
                      Nhóm hàng
                    </th>
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-left min-w-[130px]">
                      Loại hàng
                    </th>
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-center min-w-[105px]">
                      Số chuyến
                    </th>
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-center min-w-[125px] w-32">
                      Tải trọng
                    </th>
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-center min-w-[80px]">
                      Ngày mưa
                    </th>
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-center min-w-[125px]">
                      Khối lượng
                      <br />
                      qua cân (tấn)
                    </th>
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-center min-w-[110px]">
                      Mô hình
                      <br />
                      (tạm tính)
                    </th>
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-center min-w-[110px]">
                      Tỷ trọng
                      <br />
                      (tạm tính)
                    </th>
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-center min-w-[80px]">
                      Lái xe
                      <br />
                      bổ túc
                    </th>
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-center min-w-[125px]">
                      Trừ vơi
                      <br />
                      (đất-m3, than-tấn)
                    </th>
                    <th className="px-2 py-2 border-b border-gray-200 dark:border-gray-700 text-center w-15" />
                  </tr>
                </thead>

                <tbody>
                  {sess.trips.map((trip, tIdx) => {
                    return (
                      <tr
                        key={trip._tempId}
                        className={`${
                          tIdx % 2 === 0
                            ? "bg-white dark:bg-gray-950"
                            : "bg-gray-50/50 dark:bg-gray-900/40"
                        } hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-colors`}
                      >
                        {/* STT */}
                        <td className="px-2 py-1.5 border-r border-b border-gray-200 dark:border-gray-700 text-center text-gray-500 font-semibold">
                          {tIdx + 1}
                        </td>

                        {/* Khu vực xúc */}
                        <td className="px-1.5 py-1.5 border-r border-b border-gray-200 dark:border-gray-700">
                          <ComboboxInput
                            options={locationValues}
                            value={trip.excavationArea}
                            onChange={(v) =>
                              handleUpdateTrip(tIdx, { excavationArea: v })
                            }
                            placeholder=""
                          />
                        </td>

                        {/* Máy xúc */}
                        <td className="px-1.5 py-1.5 border-r border-b border-gray-200 dark:border-gray-700">
                          <ComboboxInput
                            options={excavatorValues}
                            value={trip.excavatorEquipment}
                            onChange={(v) =>
                              handleUpdateTrip(tIdx, {
                                excavatorEquipment: v,
                              })
                            }
                            placeholder=""
                          />
                        </td>

                        {/* Nơi nhận tải */}
                        <td className="px-1.5 py-1.5 border-r border-b border-gray-200 dark:border-gray-700">
                          <ComboboxInput
                            options={locationValues}
                            value={trip.pickupLocation}
                            onChange={(v) =>
                              handleUpdateTrip(tIdx, { pickupLocation: v })
                            }
                            placeholder=""
                          />
                        </td>

                        {/* Tầng nhận tải */}
                        <td className="px-1 py-1.5 border-r border-b border-gray-200 dark:border-gray-700">
                          <Input
                            type="text"
                            value={trip.pickupBench}
                            onChange={(e) =>
                              handleUpdateTrip(tIdx, {
                                pickupBench: e.target.value,
                              })
                            }
                            className="h-8 text-xs text-center px-1"
                          />
                        </td>

                        {/* Nhóm tầng nhận tải (tự động) */}
                        <td className="px-1 py-1.5 border-r border-b border-gray-200 dark:border-gray-700">
                          <Input
                            type="text"
                            value={trip.pickupBenchGroup}
                            readOnly
                            disabled
                            className="h-8 text-xs bg-gray-100 dark:bg-gray-800 text-center cursor-not-allowed border-gray-200 dark:border-gray-700 px-1"
                          />
                        </td>

                        {/* Tầng dỡ tải */}
                        <td className="px-1 py-1.5 border-r border-b border-gray-200 dark:border-gray-700">
                          <Input
                            type="text"
                            value={trip.unloadBench}
                            onChange={(e) =>
                              handleUpdateTrip(tIdx, {
                                unloadBench: e.target.value,
                              })
                            }
                            className="h-8 text-xs text-center px-1"
                          />
                        </td>

                        {/* Cung độ toàn tuyến (km) */}
                        <td className="px-1 py-1.5 border-r border-b border-gray-200 dark:border-gray-700">
                          <Input
                            type="number"
                            step="0.1"
                            value={trip.fullRouteDistance}
                            onChange={(e) =>
                              handleUpdateTrip(tIdx, {
                                fullRouteDistance:
                                  e.target.value === ""
                                    ? ""
                                    : Number(e.target.value),
                              })
                            }
                            className="h-8 text-xs text-center px-1"
                          />
                        </td>

                        {/* Nâng tải toàn tuyến (m) */}
                        <td className="px-1 py-1.5 border-r border-b border-gray-200 dark:border-gray-700">
                          <Input
                            type="number"
                            value={trip.fullRouteElevate}
                            onChange={(e) =>
                              handleUpdateTrip(tIdx, {
                                fullRouteElevate:
                                  e.target.value === ""
                                    ? ""
                                    : Number(e.target.value),
                              })
                            }
                            className="h-8 text-xs text-center px-1"
                          />
                        </td>

                        {/* Cung độ dốc cục bộ (km) */}
                        <td className="px-1 py-1.5 border-r border-b border-gray-200 dark:border-gray-700">
                          <Input
                            type="number"
                            step="0.1"
                            value={trip.localSlopeDist}
                            onChange={(e) =>
                              handleUpdateTrip(tIdx, {
                                localSlopeDist:
                                  e.target.value === ""
                                    ? ""
                                    : Number(e.target.value),
                              })
                            }
                            className="h-8 text-xs text-center px-1"
                          />
                        </td>

                        {/* Dốc cục bộ (m) */}
                        <td className="px-1 py-1.5 border-r border-b border-gray-200 dark:border-gray-700">
                          <Input
                            type="number"
                            value={trip.localSlopeDegree}
                            onChange={(e) =>
                              handleUpdateTrip(tIdx, {
                                localSlopeDegree:
                                  e.target.value === ""
                                    ? ""
                                    : Number(e.target.value),
                              })
                            }
                            className="h-8 text-xs text-center px-1"
                          />
                        </td>

                        {/* Nơi dỡ tải */}
                        <td className="px-1.5 py-1.5 border-r border-b border-gray-200 dark:border-gray-700">
                          <ComboboxInput
                            options={locationValues}
                            value={trip.unloadLocationName}
                            onChange={(v) =>
                              handleUpdateTrip(tIdx, {
                                unloadLocationName: v,
                              })
                            }
                            placeholder=""
                          />
                        </td>

                        {/* Nhóm hàng */}
                        <td className="px-1.5 py-1.5 border-r border-b border-gray-200 dark:border-gray-700">
                          <ComboboxInput
                            options={cargoGroupValues}
                            value={trip.cargoGroup}
                            onChange={(v) => {
                              const validTypes = getCargoTypesByGroup(v);
                              const keepType = validTypes.includes(
                                trip.cargoType,
                              )
                                ? trip.cargoType
                                : "";
                              handleUpdateTrip(tIdx, {
                                cargoGroup: v,
                                cargoType: keepType,
                              });
                            }}
                            placeholder=""
                          />
                        </td>

                        {/* Loại hàng (được lọc theo Nhóm hàng) */}
                        <td className="px-1.5 py-1.5 border-r border-b border-gray-200 dark:border-gray-700">
                          <ComboboxInput
                            options={getCargoTypesByGroup(trip.cargoGroup)}
                            value={trip.cargoType}
                            onChange={(v) =>
                              handleUpdateTrip(tIdx, { cargoType: v })
                            }
                            placeholder=""
                          />
                        </td>

                        {/* Số chuyến */}
                        <td className="px-1 py-1.5 border-r border-b border-gray-200 dark:border-gray-700 min-w-[80px] ">
                          <div className="flex items-center justify-center h-full">
                            <Input
                              type="number"
                              min={1}
                              value={trip.tripCount}
                              onChange={(e) =>
                                handleUpdateTrip(tIdx, {
                                  tripCount:
                                    e.target.value === ""
                                      ? ""
                                      : Number(e.target.value),
                                })
                              }
                              className="h-8 text-xs text-center font-bold px-1 w-full"
                            />
                          </div>
                        </td>

                        {/* Tải trọng — 3 radio dọc */}
                        <td className="px-2 py-1 border-r border-b border-gray-200 dark:border-gray-700 min-w-[115px]">
                          <LoadStatusRadioGroup
                            value={trip.loadStatus}
                            note={trip.loadStatusNote}
                            onChange={(val, not) =>
                              handleUpdateTrip(tIdx, {
                                loadStatus: val,
                                loadStatusNote: not,
                              })
                            }
                            onNoteChange={(not) =>
                              handleUpdateTrip(tIdx, {
                                loadStatusNote: not,
                              })
                            }
                            direction="column"
                          />
                        </td>

                        {/* Ngày mưa */}
                        <td className="px-1 py-1.5 border-r border-b border-gray-200 dark:border-gray-700 text-center min-w-[65px]">
                          <div className="flex justify-center pt-1">
                            <Checkbox
                              checked={trip.isRainyDay}
                              onCheckedChange={(c) =>
                                handleUpdateTrip(tIdx, {
                                  isRainyDay: Boolean(c),
                                })
                              }
                            />
                          </div>
                        </td>

                        {/* Khối lượng qua cân (tấn) */}
                        <td className="px-1 py-1.5 border-r border-b border-gray-200 dark:border-gray-700">
                          <Input
                            type="number"
                            step="any"
                            value={trip.weighedWeightTon}
                            onChange={(e) =>
                              handleUpdateTrip(tIdx, {
                                weighedWeightTon:
                                  e.target.value === "" ? "" : Number(e.target.value),
                              })
                            }
                            className="h-8 text-xs text-center px-1 w-full"
                          />
                        </td>

                        {/* Mô hình (tạm tính) */}
                        <td className="px-1 py-1.5 border-r border-b border-gray-200 dark:border-gray-700">
                          <Input
                            type="number"
                            step="any"
                            value={trip.provisionalModel}
                            onChange={(e) =>
                              handleUpdateTrip(tIdx, {
                                provisionalModel:
                                  e.target.value === "" ? "" : Number(e.target.value),
                              })
                            }
                            className="h-8 text-xs text-center px-1 w-full"
                          />
                        </td>

                        {/* Tỷ trọng (tạm tính) */}
                        <td className="px-1 py-1.5 border-r border-b border-gray-200 dark:border-gray-700">
                          <Input
                            type="number"
                            step="any"
                            value={trip.provisionalDensity}
                            onChange={(e) =>
                              handleUpdateTrip(tIdx, {
                                provisionalDensity:
                                  e.target.value === "" ? "" : Number(e.target.value),
                              })
                            }
                            className="h-8 text-xs text-center px-1 w-full"
                          />
                        </td>

                        {/* Lái xe bổ túc */}
                        <td className="px-1 py-1.5 border-r border-b border-gray-200 dark:border-gray-700 text-center min-w-[65px]">
                          <div className="flex justify-center pt-1">
                            <Checkbox
                              checked={trip.isTraineeVehicle}
                              onCheckedChange={(c) =>
                                handleUpdateTrip(tIdx, {
                                  isTraineeVehicle: Boolean(c),
                                })
                              }
                            />
                          </div>
                        </td>

                        {/* Trừ vơi (đất-m3, than-tấn) */}
                        <td className="px-1 py-1.5 border-r border-b border-gray-200 dark:border-gray-700">
                          <Input
                            type="number"
                            step="any"
                            value={trip.deductionAmount}
                            onChange={(e) =>
                              handleUpdateTrip(tIdx, {
                                deductionAmount:
                                  e.target.value === "" ? "" : Number(e.target.value),
                              })
                            }
                            className="h-8 text-xs text-center px-1 w-full"
                          />
                        </td>

                        {/* Nút xóa dòng */}
                        <td className="px-2 py-1.5 border-b border-gray-200 dark:border-gray-700 text-center">
                          <button
                            onClick={() => handleRemoveTripAction(tIdx)}
                            title="Xóa chuyến"
                            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {sess.trips.length === 0 && (
                    <tr>
                      <td
                        colSpan={22}
                        className="py-10 text-center text-xs text-gray-400"
                      >
                        Chưa có chuyến nào. Nhấn "+ Thêm chuyến (F3)" để thêm.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div ref={tableBottomRef} />
            </div>

            {/* Tổng số chuyến */}
            <div className="mt-2 text-xs font-bold text-gray-800 dark:text-gray-200">
              Tổng số chuyến:{" "}
              <span className="text-blue-600">{totalTripCountSum}</span>
            </div>
          </div>

          {/* ══ NHIÊN LIỆU ═════════════════════════════════════════════ */}
          <FuelSection
            initialFuel={sess.initialFuel}
            receivedFuel={sess.receivedFuel}
            finalFuel={sess.finalFuel}
            fuelUsed={fuelUsed}
            onChange={handleUpdateSession}
            required={false}
          />

          {/* ══ NGƯỜI VẬN HÀNH ══════════════════════════════════════════ */}
          <OperatorSection
            operatorBadgeNo={sess.operatorBadgeNo}
            operatorName={sess.operatorName}
            operatorUnit={sess.operatorUnit}
            operatorOptions={operatorOptions}
            onChangeBadgeNo={(v) => handleUpdateSession({ operatorBadgeNo: v })}
          />
        </div>
        {/* end body */}

        {/* ══ FOOTER ══════════════════════════════════════════════════════ */}
        <DialogFooter className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shrink-0">
          <ModalFooterActions
            mode={mode}
            sessionsCount={sessions.length}
            isSaving={
              createReportMutation.isPending || updateReportMutation.isPending
            }
            onCancel={handleCancel}
            onSaveAndNew={() => handleSave(true)}
            onSave={() => handleSave(false)}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
