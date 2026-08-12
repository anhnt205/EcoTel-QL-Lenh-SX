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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select.tsx";
import { ComboboxInput } from "../../../components/ui/combobox-input.tsx";
import { Progress } from "../../../components/ui/progress.tsx";
import { Plus, Trash2, Save, XCircle, Pickaxe, X } from "lucide-react";

import { toast } from "sonner";

import type { MiningRecord } from "@/modules/dataentry/types/thong-ke.ts";
import { saveMiningRecords } from "@/modules/dataentry/services/thongKeStorage.ts";
import { useMasterData } from "@/modules/dataentry/hooks/useMasterData.ts";
import { useFormTabNavigation } from "@/hooks/useFormTabNavigation.ts";
import { useMiningDraftStore } from "@/modules/dataentry/store/useMiningDraftStore.ts";
import {
  buildExcavationReportRequest,
  useCreateExcavationTripReportMutation,
  useUpdateExcavationTripReportMutation,
  useBulkCreateExcavationTripReportMutation,
  useBulkUpdateExcavationTripReportMutation,
  type ExcavationTripReportRequest,
  type ExcavationReportBulkUpdateItem,
} from "@/modules/dataentry/services/excavationTripReportService.ts";

// ─── Tải trọng options – radio buttons trong bảng chuyến ─────────────────
const LOAD_STATUS_OPTIONS = [
  { value: "Đủ tải", label: "Đủ tải" },
  { value: "Roda (2/3)", label: "Roda (2/3)" },
  { value: "Khác", label: "Khác" },
];

// ─── 1 dòng xe trong bảng Danh sách chuyến ──────────────────────────────
export interface TripRow {
  _tempId: string;
  vehicleNo: string; // Số xe
  tripCount: number | ""; // Số chuyến
  material: string; // Loại hàng
  loadStatus: string; // Tải trọng (radio)
  loadStatusNote: string; // Ghi chú khi "Khác" (vd: "1/2")
  vehicleManagementUnit: string; // Đơn vị quản lý thiết bị (auto-fill theo số xe)
  vehicleType: string; // Chủng loại xe (auto-fill theo số xe)
}

// ─── 1 bản ghi = 1 ca + 1 máy xúc ──────────────────────────────────────
export interface MiningSessionDraft {
  _tempId: string;
  reportId?: number; // ID bản ghi trên Backend (nếu đang ở chế độ Chỉnh sửa)

  // === Header (nhập 1 lần / ca / máy xúc) ===
  workingDate: string; // Thời gian (YYYY-MM-DD)
  shift: string; // Ca: "1" | "2" | "3"
  pickupLocation: string; // Nơi chất tải
  excavator: string; // Máy xúc
  totalScoops: number | ""; // Tổng xúc

  // === Danh sách chuyến ===
  trips: TripRow[];

  // === Nhiên liệu ===
  initialFuel: number | ""; // Nhiên liệu tồn đầu (lít)
  receivedFuel: number | ""; // Nhiên liệu lĩnh (lít)
  finalFuel: number | ""; // Nhiên liệu tồn cuối (lít)
  // fuelUsed = initialFuel + receivedFuel - finalFuel (tính tự động)

  // === Người vận hành ===
  operatorBadgeNo: string; // Số thẻ lương
  operatorName: string; // Họ và tên (auto-fill)
  operatorUnit: string; // Đơn vị (auto-fill)
}

// ─── Utilities ───────────────────────────────────────────────────────────
const computeFuelUsed = (s: MiningSessionDraft): number =>
  Math.max(
    0,
    (Number(s.initialFuel) || 0) +
      (Number(s.receivedFuel) || 0) -
      (Number(s.finalFuel) || 0),
  );

// ─── Props ────────────────────────────────────────────────────────────────
interface MiningBatchEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// ════════════════════════════════════════════════════════════════════════════
export const MiningBatchEntryModal: React.FC<MiningBatchEntryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const {
    shiftOptions,
    locationValues,
    excavatorValues,
    vehicleValues,
    cargoTypeValues,
    operatorOptions,
    getVehicleDetails,
    getOperatorDetails,
    rawShifts,
    rawLocations,
    rawExcavators,
    rawVehicles,
    rawUsers,
    rawCargoTypes,
  } = useMasterData({ enabled: isOpen });

  const createReportMutation = useCreateExcavationTripReportMutation();
  const updateReportMutation = useUpdateExcavationTripReportMutation();
  const bulkCreateReportMutation = useBulkCreateExcavationTripReportMutation();
  const bulkUpdateReportMutation = useBulkUpdateExcavationTripReportMutation();

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
  } = useMiningDraftStore();

  const batchProgress = getBatchProgress();
  const tableBottomRef = useRef<HTMLDivElement>(null);

  // ── Cập nhật session header ─────────────────────────────────────────────
  const handleUpdateSession = useCallback(
    (patch: Partial<MiningSessionDraft>) => {
      updateActiveSession(patch, getOperatorDetails);
    },
    [updateActiveSession, getOperatorDetails],
  );

  // ── Cập nhật 1 dòng chuyến ──────────────────────────────────────────────
  const handleUpdateTrip = useCallback(
    (tIdx: number, patch: Partial<TripRow>) => {
      updateTripRow(tIdx, patch, getVehicleDetails);
    },
    [updateTripRow, getVehicleDetails],
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

  // ── Keyboard Navigation (Tab / Enter) giữa các ô nhập liệu ────────────
  const { handleKeyDown } = useFormTabNavigation({
    onAddNewRow: handleAddTripAction,
  });

  // ── Lưu tất cả ─────────────────────────────────────────────────────────
  const handleSave = async (andAddNew: boolean) => {
    const validation = validateAllSessions();
    if (!validation.isValid) {
      toast.error(validation.firstErrorMsg || "Thông tin bản ghi chưa đầy đủ!");
      if (typeof validation.firstErrorIdx === "number") {
        setActiveIdx(validation.firstErrorIdx);
      }
      return;
    }

    // Map dữ liệu & kiểm tra khớp Master Data cho từng session trong try/catch RIÊNG
    const payloads: ExcavationTripReportRequest[] = [];
    for (let i = 0; i < sessions.length; i++) {
      const sess = sessions[i];
      try {
        const payload = buildExcavationReportRequest(sess, {
          rawShifts,
          rawLocations,
          rawExcavators,
          rawVehicles,
          rawUsers,
          rawCargoTypes,
        });
        payloads.push(payload);
      } catch (err: any) {
        console.error(`[Mapping Data Error] Lỗi bản ghi ca ${i + 1}:`, err);
        toast.error(`Bản ghi #${i + 1}: ${err.message || "Lỗi dữ liệu không hợp lệ"}`);
        setActiveIdx(i);
        return; // Dừng ngay lập tức, không gửi API và không lưu nháp local
      }
    }

    let apiSuccessCount = 0;
    const apiErrors: string[] = [];

    // Tách danh sách bản ghi tạo mới và bản ghi cập nhật
    const createItems: ExcavationTripReportRequest[] = [];
    const updateItems: ExcavationReportBulkUpdateItem[] = [];

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
        console.error("[API Create Error] Lỗi khi tạo mới báo cáo:", err);
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
        console.error("[API Update Error] Lỗi khi cập nhật báo cáo:", err);
        const msg =
          err.response?.data?.message ||
          err.message ||
          "Lỗi kết nối máy chủ API";
        apiErrors.push(`Cập nhật (${updateItems.length} bản ghi): ${msg}`);
      }
    }

    // Lưu vào bộ nhớ local nháp để bảo toàn dữ liệu UI
    const validRecords: MiningRecord[] = [];
    sessions.forEach((sess) => {
      const dateObj = new Date(sess.workingDate);
      sess.trips.forEach((trip) => {
        const record: MiningRecord = {
          month: dateObj.getMonth() + 1,
          day: dateObj.getDate(),
          shift: sess.shift,
          mineCode: sess.excavator,
          excavationBench: "",
          pickupLocation: sess.pickupLocation,
          dumpLocation: "",

          transportVehicleNo: trip.vehicleNo,
          vehicleType: trip.vehicleType,
          vehicleManagementUnit: trip.vehicleManagementUnit,
          tripCount: Number(trip.tripCount) || 1,
          material: trip.material,
          loadStatus:
            trip.loadStatus === "Khác"
              ? `Khác${trip.loadStatusNote ? ` (${trip.loadStatusNote})` : ""}`
              : trip.loadStatus,
          tempVolume: 0,
          tempWeight: 0,

          initialFuel: Number(sess.initialFuel) || 0,
          receivedFuel: Number(sess.receivedFuel) || 0,
          finalFuel: Number(sess.finalFuel) || 0,
          fuelConsumption: computeFuelUsed(sess),
          fuelNorm: 0,
          fuelDiff: 0,

          operatorBadgeNo: sess.operatorBadgeNo,
          operatorName: sess.operatorName,
          operatorUnit: sess.operatorUnit,
          createdBy: "Trần Hồng Sơn",
        };
        validRecords.push(record);
      });
    });

    saveMiningRecords(validRecords);

    if (apiSuccessCount > 0) {
      toast.success(
        `Đã gửi thành công ${apiSuccessCount} bản ghi!`,
      );
    } else if (apiErrors.length > 0) {
      toast.warning(
        `Đã lưu tạm (${validRecords.length} chuyến), nhưng lỗi kết nối API: ${apiErrors[0]}`,
      );
    } else {
      toast.success(
        `Đã lưu thành công ${sessions.length} bản ghi (${validRecords.length} chuyến khai thác)!`,
      );
    }

    onSuccess();

    if (andAddNew) {
      initDrafts();
    } else {
      onClose();
    }
  };

  const handleCancel = () => onClose();

  // ── Phím tắt: F3 = thêm chuyến, F2 = lưu & thêm mới, F5 = lưu ────────
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F3") {
        e.preventDefault();
        handleAddTripAction();
      }
      if (e.key === "F2") {
        e.preventDefault();
        handleSave(true);
      }
      if (e.key === "F5") {
        e.preventDefault();
        handleSave(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeIdx, sessions]);

  const sess = sessions[activeIdx] ?? sessions[0];
  if (!sess) return null;

  const fuelUsed = computeFuelUsed(sess);

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
              <Pickaxe className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base font-bold text-gray-900 dark:text-gray-100 tracking-wide">
              Thêm mới bản ghi – Báo chuyến Công trường Khai thác
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
        <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shrink-0 px-5 pb-1 space-y-1">
          {/* Thanh tổng quan tiến độ lô dữ liệu */}
          <div className="flex items-center justify-between text-xs gap-3 px-0.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-700 dark:text-gray-200 text-[11px]">
                Tiến độ nhập:
              </span>
              <span className="font-medium text-gray-500 dark:text-gray-400 text-[11px]">
                <strong className="text-blue-700 dark:text-blue-400 font-bold">
                  {batchProgress.validCount}
                </strong>
                /{batchProgress.totalCount} bản ghi đã hợp lệ
              </span>
            </div>
          </div>

          {/* Dải danh sách Tab pill */}
          <div className="flex items-center gap-5 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
            {sessions.map((s, i) => {
              const isValid = isSessionValid(i);
              const isActive = i === activeIdx;
              const progress = getSessionProgress(i);

              return (
                <div
                  key={s._tempId}
                  className="flex items-center group shrink-0"
                >
                  <button
                    onClick={() => setActiveIdx(i)}
                    className={`flex flex-col gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-xl border transition-all whitespace-nowrap min-w-[140px] ${
                      isActive
                        ? "border-blue-500 text-blue-900 dark:text-blue-200 bg-white dark:bg-gray-950 shadow-md ring-2 ring-blue-400/20"
                        : "border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 bg-white/70 dark:bg-gray-900/70 hover:bg-white dark:hover:bg-gray-800 hover:border-gray-300"
                    }`}
                  >
                    {/* Hàng trên: Chấm trạng thái + Tên bản ghi */}
                    <div className="flex items-center gap-2 w-full">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          isValid
                            ? "bg-blue-500 shadow-xs shadow-blue-500"
                            : "bg-amber-400 animate-pulse"
                        }`}
                        title={
                          isValid ? "Đã hợp lệ" : "Chưa hoàn thành thông tin"
                        }
                      />
                      <span>
                        Bản ghi {i + 1}
                        {s.excavator ? ` – ${s.excavator}` : ""}
                      </span>
                    </div>

                    {/* Hàng dưới: Thanh Progress bar ngay bên dưới chữ */}
                    <Progress
                      value={progress}
                      className={`h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800 ${
                        isValid
                          ? "[&>div]:bg-blue-500"
                          : "[&>div]:bg-amber-500"
                      }`}
                    />
                  </button>

                  {/* Nút xóa Tab (tăng khoảng cách lề hai bên rộng rãi) */}
                  {sessions.length > 1 && (
                    <button
                      onClick={() => removeSession(i)}
                      title="Xóa bản ghi này"
                      className="ml-3.5 mr-2 p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 border border-transparent hover:border-red-200 dark:hover:border-red-800 transition-all opacity-80 group-hover:opacity-100"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}

            <button
              onClick={addSession}
              className="px-4 py-2.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-xl transition-all flex items-center gap-1.5 border border-dashed border-blue-400 dark:border-blue-700 shrink-0 shadow-2xs"
            >
              <Plus className="w-4 h-4" /> Thêm bản ghi
            </button>
          </div>
        </div>

        {/* ══ BODY (cuộn) ════════════════════════════════════════════════ */}
        <div
          className="flex-1 overflow-y-auto px-5 py-4 space-y-5"
          onKeyDown={handleKeyDown}
        >
          {/* ── HÀNG 1: Thời gian · Ca ───────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">

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
                    ? String(sess.shift).replace(/^ca\s+/i, "").trim()
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
          </div>

          {/* ── HÀNG 2: Nơi chất tải · Máy xúc · Tổng xúc ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Nơi chất tải */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Nơi chất tải <span className="text-red-500">*</span>
              </label>
              <ComboboxInput
                options={locationValues}
                value={sess.pickupLocation}
                onChange={(v) => handleUpdateSession({ pickupLocation: v })}
                placeholder=""
              />
            </div>

            {/* Máy xúc */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Máy xúc <span className="text-red-500">*</span>
              </label>
              <ComboboxInput
                options={excavatorValues}
                value={sess.excavator}
                onChange={(v) => handleUpdateSession({ excavator: v })}
                placeholder=""
              />
            </div>

            {/* Tầng xúc */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Tầng xúc <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min={0}
                value={sess.totalScoops}
                onChange={(e) =>
                  handleUpdateSession({
                    totalScoops:
                      e.target.value === "" ? "" : Number(e.target.value),
                  })
                }
                className="h-9 text-sm"
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

            {/* Bảng */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto">
              <table className="w-full text-xs border-collapse min-w-[1020px]">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 text-sm font-bold border-b border-gray-200 dark:border-gray-700">
                    <th className="px-3 py-2.5 border-r border-b border-gray-200 dark:border-gray-700 text-center w-10">
                      STT
                    </th>
                    <th className="px-3 py-2.5 border-r border-b border-gray-200 dark:border-gray-700 text-left min-w-[145px]">
                      Số xe <span className="text-red-500">*</span>
                    </th>
                    <th className="px-3 py-2.5 border-r border-b border-gray-200 dark:border-gray-700 text-center min-w-[110px]">
                      Số chuyến <span className="text-red-500">*</span>
                    </th>
                    <th className="px-3 py-2.5 border-r border-b border-gray-200 dark:border-gray-700 text-left min-w-[170px]">
                      Loại hàng <span className="text-red-500">*</span>
                    </th>
                    <th className="px-3 py-2.5 border-r border-b border-gray-200 dark:border-gray-700 text-center min-w-[300px]">
                      Tải trọng <span className="text-red-500">*</span>
                    </th>
                    <th className="px-3 py-2.5 border-r border-b border-gray-200 dark:border-gray-700 text-center min-w-[170px]">
                      Đơn vị quản lý
                      <br />
                      thiết bị
                    </th>
                    <th className="px-3 py-2.5 border-r border-b border-gray-200 dark:border-gray-700 text-center min-w-[140px]">
                      Chủng loại xe
                    </th>
                    <th className="px-2 py-2.5 border-b border-gray-200 dark:border-gray-700 text-center w-10" />
                  </tr>
                </thead>

                <tbody>
                  {sess.trips.map((trip, tIdx) => (
                    <tr
                      key={trip._tempId}
                      className={`${
                        tIdx % 2 === 0
                          ? "bg-white dark:bg-gray-950"
                          : "bg-gray-50/50 dark:bg-gray-900/40"
                      } hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-colors`}
                    >
                      {/* STT */}
                      <td className="px-3 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-center text-gray-500 font-semibold">
                        {tIdx + 1}
                      </td>

                      {/* Số xe — ComboboxInput */}
                      <td className="px-2 py-1.5 border-r border-b border-gray-200 dark:border-gray-700">
                        <ComboboxInput
                          options={vehicleValues}
                          value={trip.vehicleNo}
                          onChange={(v) =>
                            handleUpdateTrip(tIdx, { vehicleNo: v })
                          }
                          placeholder=""
                        />
                      </td>

                      {/* Số chuyến */}
                      <td className="px-2 py-1.5 border-r border-b border-gray-200 dark:border-gray-700">
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
                          className="h-8 text-xs text-center"
                        />
                      </td>

                      {/* Loại hàng */}
                      <td className="px-2 py-1.5 border-r border-b border-gray-200 dark:border-gray-700">
                        <ComboboxInput
                          options={cargoTypeValues}
                          value={trip.material}
                          onChange={(v) =>
                            handleUpdateTrip(tIdx, { material: v })
                          }
                          placeholder=""
                        />
                      </td>

                      {/* Tải trọng — 3 radio ngang */}
                      <td className="px-3 py-2 border-r border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-5">
                          {LOAD_STATUS_OPTIONS.map((opt) => {
                            const active = trip.loadStatus === opt.value;
                            return (
                              <label
                                key={opt.value}
                                className="flex items-center gap-1.5 cursor-pointer select-none"
                              >
                                {/* Radio dot */}
                                <div
                                  onClick={() =>
                                    handleUpdateTrip(tIdx, {
                                      loadStatus: opt.value,
                                      loadStatusNote: "",
                                    })
                                  }
                                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                    active
                                      ? "border-blue-600 bg-blue-600"
                                      : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                                  }`}
                                >
                                  {active && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                  )}
                                </div>
                                <span className="text-[11px] text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                  {opt.label}
                                </span>
                                {/* Input ghi chú khi chọn "Khác" */}
                                {opt.value === "Khác" && active && (
                                  <Input
                                    type="text"
                                    value={trip.loadStatusNote}
                                    onChange={(e) =>
                                      handleUpdateTrip(tIdx, {
                                        loadStatusNote: e.target.value,
                                      })
                                    }
                                    onClick={(e) => e.stopPropagation()}
                                    className="h-6 w-20 text-[11px] ml-1 px-1.5"
                                    title="Chỉ chấp nhận kiểu phân số (ví dụ: 1/2, 2/3)"
                                  />
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </td>

                      {/* Đơn vị QL thiết bị (auto-fill, readonly) */}
                      <td className="px-2 py-1.5 border-r border-b border-gray-200 dark:border-gray-700 min-w-[150px]">
                        <Input
                          type="text"
                          value={trip.vehicleManagementUnit}
                          readOnly
                          disabled
                          title={trip.vehicleManagementUnit}
                          className="h-auto min-h-[32px] text-xs bg-gray-100 dark:bg-gray-800 text-center cursor-not-allowed border-gray-200 dark:border-gray-700 py-1 px-1.5 whitespace-normal break-words leading-tight"
                        />
                      </td>

                      {/* Chủng loại xe (auto-fill, readonly) */}
                      <td className="px-2 py-1.5 border-r border-b border-gray-200 dark:border-gray-700">
                        <Input
                          type="text"
                          value={trip.vehicleType}
                          readOnly
                          disabled
                          className="h-8 text-xs bg-gray-100 dark:bg-gray-800 text-center cursor-not-allowed border-gray-200 dark:border-gray-700"
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
                  ))}

                  {sess.trips.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-10 text-center text-xs text-gray-400"
                      >
                        Chưa có chuyến nào. Nhấn "+ Thêm chuyến (F3)" để thêm.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {/* Anchor để scroll tới cuối bảng khi thêm dòng */}
              <div ref={tableBottomRef} />
            </div>
          </div>

          {/* ══ NHIÊN LIỆU ═════════════════════════════════════════════ */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Nhiên liệu tồn đầu */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Nhiên liệu tồn đầu (lít) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min={0}
                value={sess.initialFuel}
                onChange={(e) =>
                  handleUpdateSession({
                    initialFuel:
                      e.target.value === "" ? "" : Number(e.target.value),
                  })
                }
                className="h-9 text-sm"
              />
            </div>

            {/* Nhiên liệu lĩnh */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Nhiên liệu lĩnh (lít) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min={0}
                value={sess.receivedFuel}
                onChange={(e) =>
                  handleUpdateSession({
                    receivedFuel:
                      e.target.value === "" ? "" : Number(e.target.value),
                  })
                }
                className="h-9 text-sm"
              />
            </div>

            {/* Nhiên liệu tồn cuối */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Nhiên liệu tồn cuối (lít){" "}
                <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min={0}
                value={sess.finalFuel}
                onChange={(e) =>
                  handleUpdateSession({
                    finalFuel:
                      e.target.value === "" ? "" : Number(e.target.value),
                  })
                }
                className="h-9 text-sm"
              />
            </div>

            {/* Nhiên liệu sử dụng (tự tính) */}
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

          {/* ══ NGƯỜI VẬN HÀNH ══════════════════════════════════════════ */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Số thẻ lương */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Số thẻ lương <span className="text-red-500">*</span>
              </label>
              <ComboboxInput
                options={operatorOptions}
                value={sess.operatorBadgeNo}
                onChange={(v) => handleUpdateSession({ operatorBadgeNo: v })}
                placeholder=""
              />
            </div>

            {/* Họ và tên (auto-fill, readonly) */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                Họ và tên
              </label>
              <Input
                type="text"
                value={sess.operatorName}
                readOnly
                disabled
                className="h-9 text-sm bg-gray-100 dark:bg-gray-800 cursor-not-allowed border-gray-200 dark:border-gray-700"
              />
            </div>

            {/* Đơn vị (auto-fill, readonly) */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                Đơn vị
              </label>
              <Input
                type="text"
                value={sess.operatorUnit}
                readOnly
                disabled
                className="h-9 text-sm bg-gray-100 dark:bg-gray-800 cursor-not-allowed border-gray-200 dark:border-gray-700"
              />
            </div>
          </div>
        </div>
        {/* end body */}

        {/* ══ FOOTER ══════════════════════════════════════════════════════ */}
        <DialogFooter className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shrink-0">
          {/* Hủy bỏ */}
          <Button
            variant="outline"
            onClick={handleCancel}
            className="h-9 text-sm px-4 gap-1.5 border-gray-300 text-gray-600 hover:bg-gray-100"
          >
            <XCircle className="w-4 h-4" />
            Hủy bỏ
          </Button>

          {/* Lưu & Thêm mới (F2) */}
          <Button
            variant="outline"
            disabled={createReportMutation.isPending}
            onClick={() => handleSave(true)}
            className="h-9 text-sm px-4 gap-1.5 border-blue-500 text-blue-700 hover:bg-blue-50 font-semibold"
          >
            <Plus className="w-4 h-4" />
            {createReportMutation.isPending
              ? "Đang lưu..."
              : sessions.length > 1
                ? `Lưu & Thêm mới (${sessions.length} bản ghi) (F2)`
                : "Lưu & Thêm mới (F2)"}
          </Button>

          <Button
            disabled={createReportMutation.isPending}
            onClick={() => handleSave(false)}
            className="h-9 text-sm px-6 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md transition-all"
          >
            <Save className="w-4 h-4" />
            {createReportMutation.isPending
              ? "Đang lưu..."
              : sessions.length > 1
                ? `Lưu (${sessions.length} bản ghi) (F5)`
                : "Lưu bản ghi (F5)"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
