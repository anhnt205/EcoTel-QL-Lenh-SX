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
import { Progress } from "../../../components/ui/progress.tsx";
import {
  Plus,
  Trash2,
  Save,
  XCircle,
  Truck,
  X,
} from "lucide-react";
import { toast } from "sonner";

import type { TransportRecord } from "@/modules/dataentry/types/thong-ke.ts";
import { saveTransportRecords } from "@/modules/dataentry/services/thongKeStorage.ts";
import { useMasterData } from "@/modules/dataentry/hooks/useMasterData.ts";
import { useFormTabNavigation } from "@/hooks/useFormTabNavigation.ts";
import { useTransportDraftStore } from "@/modules/dataentry/store/useTransportDraftStore.ts";
import {
  useCreateTransportReportMutation,
  useUpdateTransportReportMutation,
  buildTransportReportRequest,
} from "@/modules/dataentry/services/transportTripReportService";

// ─── Tải trọng options – radio buttons trong bảng chuyến ─────────────────
const LOAD_STATUS_OPTIONS = [
  { value: "Đủ tải", label: "Đủ tải" },
  { value: "Roda (2/3)", label: "Roda (2/3)" },
  { value: "Khác", label: "Khác" },
];

// ─── 1 dòng chuyến xe trong bảng Danh sách chuyến ────────────────────────
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
  vehicleNo: string; // Số xe
  tripCount: number | ""; // Số chuyến
  loadStatus: string; // Tải trọng (radio)
  loadStatusNote: string; // Ghi chú khi "Khác" (vd: "2/3", "1/2")
  isRainyDay: boolean; // Ngày mưa
  isTraineeVehicle: boolean; // Xe bổ túc
  equipmentUnit: string; // Đơn vị quản lý thiết bị (tự động theo số xe)
  vehicleType: string; // Chủng loại (tự động theo số xe)
}

// ─── 1 bản ghi = 1 ca phân xưởng vận tải ─────────────────────────────────
export interface TransportSessionDraft {
  _tempId: string;
  reportId?: number; // ID báo cáo khi chỉnh sửa từ API Backend

  // === Header (Thông tin chung) ===
  workingDate: string; // YYYY-MM-DD
  shift: string; // Ca: "1" | "2" | "3"

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
}

// ════════════════════════════════════════════════════════════════════════════
export const TransportHeaderDetailModal: React.FC<
  TransportHeaderDetailModalProps
> = ({ isOpen, onClose, onSuccess }) => {
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
        vehicleNo: "",
        tripCount: "",
        loadStatus: "Đủ tải",
        loadStatusNote: "",
        isRainyDay: false,
        isTraineeVehicle: false,
        equipmentUnit: "",
        vehicleType: "",
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

  // Reset khi mở modal – chỉ chạy khi isOpen chuyển từ false → true
  const prevIsOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      initDrafts(createDefaultSession());
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, initDrafts, createDefaultSession]);

  // ── Cập nhật session header ─────────────────────────────────────────────
  const handleUpdateSession = useCallback(
    (patch: Partial<TransportSessionDraft>) => {
      updateActiveSession(patch, getOperatorDetails);
    },
    [updateActiveSession, getOperatorDetails],
  );

  // ── Cập nhật 1 dòng chuyến ──────────────────────────────────────────────
  const handleUpdateTrip = useCallback(
    (tIdx: number, patch: Partial<TransportTripRow>) => {
      updateTripRow(tIdx, patch, getVehicleDetails, getCargoGroupDetails);
    },
    [updateTripRow, getVehicleDetails, getCargoGroupDetails],
  );

  // ── Thêm / xóa dòng chuyến ─────────────────────────────────────────────
  const handleAddTripAction = useCallback(() => {
    const activeSess = sessions[activeIdx];
    const lastTrip = activeSess?.trips[activeSess.trips.length - 1];
    const area = lastTrip ? lastTrip.excavationArea : "";
    addTripRow(createDefaultTripRow(area));
    setTimeout(
      () => tableBottomRef.current?.scrollIntoView({ behavior: "smooth" }),
      60,
    );
  }, [addTripRow, createDefaultTripRow, sessions, activeIdx]);


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
        toast.error(`Bản ghi #${i + 1}: ${err.message || "Lỗi dữ liệu không hợp lệ"}`);
        setActiveIdx(i);
        return;
      }
    }

    let apiSuccessCount = 0;
    const apiErrors: string[] = [];

    // 2. Gọi API POST / PUT cho từng mẻ
    for (let i = 0; i < payloads.length; i++) {
      const sess = sessions[i];
      try {
        if (sess.reportId) {
          await updateReportMutation.mutateAsync({
            id: sess.reportId,
            payload: payloads[i],
          });
        } else {
          await createReportMutation.mutateAsync(payloads[i]);
        }
        apiSuccessCount++;
      } catch (err: any) {
        console.error(`[API Error] Lỗi khi gửi báo cáo ca ${i + 1}:`, err);
        const msg =
          err.response?.data?.message ||
          err.message ||
          "Lỗi kết nối máy chủ API";
        apiErrors.push(`Ca ${i + 1}: ${msg}`);
      }
    }

    // 3. Cũng lưu nháp local storage để giữ tương thích
    const validRecords: TransportRecord[] = [];
    sessions.forEach((sess) => {
      const dateObj = new Date(sess.workingDate);
      const month = dateObj.getMonth() + 1;
      const day = dateObj.getDate();

      sess.trips.forEach((trip) => {
        const record: TransportRecord = {
          month,
          day,
          shift: sess.shift,
          vehicleNo: trip.vehicleNo,
          vehicleType: trip.vehicleType,
          equipmentUnit: trip.equipmentUnit,
          operatorBadgeNo: sess.operatorBadgeNo,
          operatorName: sess.operatorName,
          operatorUnit: sess.operatorUnit,
          isRainyDay: trip.isRainyDay,
          isTraineeVehicle: trip.isTraineeVehicle,
          initialFuel: Number(sess.initialFuel) || 0,
          receivedFuel: Number(sess.receivedFuel) || 0,
          finalFuel: Number(sess.finalFuel) || 0,
          fuelConsumption: computeFuelUsed(sess),
          excavationArea: trip.excavationArea,
          excavatorEquipment: trip.excavatorEquipment,
          pickupLocation: trip.pickupLocation,
          pickupBench: trip.pickupBench,
          pickupBenchGroup: trip.pickupBenchGroup,
          unloadLocationName: trip.unloadLocationName,
          unloadBench: trip.unloadBench,
          fullRouteDistance: Number(trip.fullRouteDistance) || 0,
          fullRouteElevate: Number(trip.fullRouteElevate) || 0,
          localSlopeDist: Number(trip.localSlopeDist) || 0,
          localSlopeDegree: Number(trip.localSlopeDegree) || 0,
          cargoType: trip.cargoType,
          cargoGroup: trip.cargoGroup,
          tripCount: Number(trip.tripCount) || 1,
          loadStatus:
            trip.loadStatus === "Khác"
              ? `Khác${trip.loadStatusNote ? ` (${trip.loadStatusNote})` : ""}`
              : trip.loadStatus,
        };
        validRecords.push(record);
      });
    });

    if (validRecords.length > 0) {
      saveTransportRecords(validRecords);
    }

    if (apiSuccessCount > 0) {
      toast.success(
        `Đã gửi thành công ${apiSuccessCount} bản ghi!`,
      );
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
  const totalTripCountSum = sess.trips.reduce(
    (sum, t) => sum + (Number(t.tripCount) || 0),
    0,
  );

  // ════════════════════════════════════════════════════════════════════════
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleCancel(); }}>
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
              Thêm mới bản ghi – Báo chuyến Phân xưởng Vận tải
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
          {/* Thanh tổng quan tiến độ lô dữ liệu */}
          <div className="flex items-center justify-between text-xs gap-3 px-0.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-700 dark:text-gray-200 text-[11px]">
                Tiến độ nhập lô:
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
                <div key={s._tempId} className="flex items-center group shrink-0">
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
                        title={isValid ? "Đã hợp lệ" : "Chưa hoàn thành thông tin"}
                      />
                      <span>Bản ghi {i + 1}</span>
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
              onClick={handleAddSessionAction}
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
          {/* ── HÀNG THÔNG TIN CHUNG: Thời gian · Ca ─────────────────── */}
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
                  <SelectValue placeholder="Chọn ca" />
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
              <table className="w-full text-xs border-collapse min-w-[1680px]">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 text-[11px] font-semibold">
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-center w-10">
                      STT
                    </th>
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-left min-w-[110px]">
                      Khu vực xúc
                    </th>
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-left min-w-[100px]">
                      Máy xúc
                    </th>
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-left min-w-[100px]">
                      Nơi nhận tải
                    </th>
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-center min-w-[65px]">
                      Tầng nhận tải
                    </th>
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-center min-w-[95px]">
                      Nhóm tầng nhận tải
                    </th>
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-center min-w-[65px]">
                      Tầng dỡ tải
                    </th>
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-center min-w-[95px]">
                      Cung độ<br />toàn tuyến (km)
                    </th>
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-center min-w-[95px]">
                      Nâng tải<br />toàn tuyến (m)
                    </th>
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-center min-w-[95px]">
                      Cung độ dốc<br />cục bộ (km)
                    </th>
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-center min-w-[75px]">
                      Dốc cục bộ (m)
                    </th>
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-left min-w-[110px]">
                      Nơi dỡ tải
                    </th>
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-left min-w-[130px]">
                      Nhóm hàng
                    </th>
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-left min-w-[110px]">
                      Loại hàng
                    </th>
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-left min-w-[135px]">
                      Số xe
                    </th>
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-center min-w-[90px]">
                      Số chuyến
                    </th>
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-center min-w-[115px] w-32">
                      Tải trọng
                    </th>
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-center min-w-[70px]">
                      Ngày mưa
                    </th>
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-center min-w-[70px]">
                      Xe bổ túc
                    </th>
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-center min-w-[150px]">
                      Đơn vị quản lý<br />thiết bị
                    </th>
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-center min-w-[110px]">
                      Chủng loại
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
                            placeholder="Khu vực"
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
                            placeholder="Máy xúc"
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
                            placeholder="Nơi nhận tải"
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
                            placeholder="-40"
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
                            placeholder="+10"
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
                            placeholder="5.5"
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
                            placeholder="100"
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
                            placeholder="1.2"
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
                            placeholder="8"
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
                            placeholder="Nơi dỡ"
                          />
                        </td>

                        {/* Nhóm hàng */}
                        <td className="px-1.5 py-1.5 border-r border-b border-gray-200 dark:border-gray-700">
                          <ComboboxInput
                            options={cargoGroupValues}
                            value={trip.cargoGroup}
                            onChange={(v) => {
                              const validTypes = getCargoTypesByGroup(v);
                              const keepType = validTypes.includes(trip.cargoType) ? trip.cargoType : "";
                              handleUpdateTrip(tIdx, { cargoGroup: v, cargoType: keepType });
                            }}
                            placeholder="Nhóm hàng"
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
                            placeholder={trip.cargoGroup ? "Loại hàng" : "Chọn Nhóm trước"}
                          />
                        </td>

                        {/* Số xe */}
                        <td className="px-1.5 py-1.5 border-r border-b border-gray-200 dark:border-gray-700">
                          <ComboboxInput
                            options={vehicleValues}
                            value={trip.vehicleNo}
                            onChange={(v) =>
                              handleUpdateTrip(tIdx, { vehicleNo: v })
                            }
                            placeholder="Số xe"
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
                              placeholder="0"
                            />
                          </div>
                        </td>

                        {/* Tải trọng — 3 radio dọc */}
                        <td className="px-2 py-1 border-r border-b border-gray-200 dark:border-gray-700 min-w-[115px]">
                          <div className="flex flex-col gap-1 py-0.5">
                            {LOAD_STATUS_OPTIONS.map((opt) => {
                              const active = trip.loadStatus === opt.value;
                              const isNoteOption = opt.value === "Khác";
                              return (
                                <label
                                  key={opt.value}
                                  className="flex items-center justify-between gap-1 cursor-pointer select-none"
                                >
                                  <div className="flex items-center gap-1.5">
                                    <div
                                      onClick={() =>
                                        handleUpdateTrip(tIdx, {
                                          loadStatus: opt.value,
                                          loadStatusNote: isNoteOption
                                            ? trip.loadStatusNote
                                            : "",
                                        })
                                      }
                                      className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                        active
                                          ? "border-blue-600 bg-blue-600"
                                          : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                                      }`}
                                    >
                                      {active && (
                                        <div className="w-1 h-1 rounded-full bg-white" />
                                      )}
                                    </div>
                                    <span className="text-[11px] text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                      {opt.label}
                                    </span>
                                  </div>

                                  {isNoteOption && active && (
                                    <Input
                                      type="text"
                                      value={trip.loadStatusNote}
                                      onChange={(e) =>
                                        handleUpdateTrip(tIdx, {
                                          loadStatusNote: e.target.value,
                                        })
                                      }
                                      onClick={(e) => e.stopPropagation()}
                                      className="h-6 w-24 text-[11px] px-1.5 text-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
                                      placeholder="1/2…"
                                      title="Chỉ chấp nhận kiểu phân số (ví dụ: 1/2, 2/3)"
                                    />
                                  )}
                                </label>
                              );
                            })}
                          </div>
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

                        {/* Xe bổ túc */}
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

                        {/* Đơn vị quản lý thiết bị (tự động, readonly) */}
                        <td className="px-1.5 py-1.5 border-r border-b border-gray-200 dark:border-gray-700 min-w-[150px]">
                          <Input
                            type="text"
                            value={trip.equipmentUnit}
                            readOnly
                            disabled
                            title={trip.equipmentUnit}
                            className="h-auto min-h-[32px] text-xs bg-gray-100 dark:bg-gray-800 text-center cursor-not-allowed border-gray-200 dark:border-gray-700 py-1 px-1.5 whitespace-normal break-words leading-tight"
                          />
                        </td>

                        {/* Chủng loại (tự động, readonly) */}
                        <td className="px-1.5 py-1.5 border-r border-b border-gray-200 dark:border-gray-700">
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Nhiên liệu tồn đầu */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Nhiên liệu tồn đầu (lít)
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
                placeholder="0"
              />
            </div>

            {/* Nhiên liệu lĩnh */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Nhiên liệu lĩnh (lít)
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
                placeholder="0"
              />
            </div>

            {/* Nhiên liệu tồn cuối */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Nhiên liệu tồn cuối (lít)
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
                placeholder="0"
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
                placeholder="Chọn/nhập số thẻ"
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
                placeholder="Tự điền theo thẻ lương"
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
                placeholder="Tự điền theo thẻ lương"
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
            onClick={() => handleSave(true)}
            className="h-9 text-sm px-4 gap-1.5 border-blue-500 text-blue-700 hover:bg-blue-50 font-semibold"
          >
            <Plus className="w-4 h-4" />
            {sessions.length > 1
              ? `Lưu & Thêm mới (${sessions.length} bản ghi) (F2)`
              : "Lưu & Thêm mới (F2)"}
          </Button>

          {/* Lưu (F5) */}
          <Button
            onClick={() => handleSave(false)}
            className="h-9 text-sm px-6 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md transition-all"
          >
            <Save className="w-4 h-4" />
            {sessions.length > 1
              ? `Lưu (${sessions.length} bản ghi) (F5)`
              : "Lưu bản ghi (F5)"}
          </Button>
        </DialogFooter>



      </DialogContent>
    </Dialog>
  );
};
