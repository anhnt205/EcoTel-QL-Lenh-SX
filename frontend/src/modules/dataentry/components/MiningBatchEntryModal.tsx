import React, { useState, useRef, useEffect, useCallback } from "react";
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
import {
  Plus,
  Trash2,
  Upload,
  Download,
  Save,
  XCircle,
  Pickaxe,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useConfirmDialog } from "../../../components/ui/confirm-dialog.tsx";
import type { MiningRecord } from "@/modules/dataentry/types/thong-ke.ts";
import { saveMiningRecords } from "@/modules/dataentry/services/thongKeStorage.ts";
import { excelService } from "@/modules/report/utils/excel-exporter.ts";
import {
  lookupVehicleInfo,
  lookupOperatorInfo,
  MINING_UNITS,
  EXCAVATORS,
  PICKUP_LOCATIONS,
  MATERIALS,
  VEHICLE_NUMBERS,
  OPERATOR_BADGES,
} from "@/modules/dataentry/utils/lookup.ts";

// ─── Tải trọng options – radio buttons trong bảng chuyến ─────────────────
const LOAD_STATUS_OPTIONS = [
  { value: "Đủ tải",    label: "Đủ tải" },
  { value: "Roda (2/3)", label: "Roda (2/3)" },
  { value: "Khác",      label: "Khác" },
];

// ─── 1 dòng xe trong bảng Danh sách chuyến ──────────────────────────────
export interface TripRow {
  _tempId: string;
  vehicleNo: string;            // Số xe
  tripCount: number | "";       // Số chuyến
  material: string;             // Loại hàng
  loadStatus: string;           // Tải trọng (radio)
  loadStatusNote: string;       // Ghi chú khi "Khác" (vd: "1/2")
  vehicleManagementUnit: string; // Đơn vị quản lý thiết bị (auto-fill theo số xe)
  vehicleType: string;           // Chủng loại xe (auto-fill theo số xe)
}

// ─── 1 bản ghi = 1 ca + 1 máy xúc ──────────────────────────────────────
export interface MiningSessionDraft {
  _tempId: string;

  // === Header (nhập 1 lần / ca / máy xúc) ===
  workingDate: string;   // Thời gian (YYYY-MM-DD)
  shift: string;         // Ca: "1" | "2" | "3"
  miningUnit: string;    // Đơn vị khai thác
  pickupLocation: string; // Nơi chất tải
  excavator: string;     // Máy xúc
  totalScoops: number | ""; // Tổng xúc

  // === Danh sách chuyến ===
  trips: TripRow[];

  // === Nhiên liệu ===
  initialFuel: number | "";  // Nhiên liệu tồn đầu (lít)
  receivedFuel: number | ""; // Nhiên liệu lĩnh (lít)
  finalFuel: number | "";    // Nhiên liệu tồn cuối (lít)
  // fuelUsed = initialFuel + receivedFuel - finalFuel (tính tự động)

  // === Người vận hành ===
  operatorBadgeNo: string;  // Số thẻ lương
  operatorName: string;     // Họ và tên (auto-fill)
  operatorUnit: string;     // Đơn vị (auto-fill)
}

// ─── Utilities ───────────────────────────────────────────────────────────
const todayStr = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const computeFuelUsed = (s: MiningSessionDraft): number =>
  Math.max(0, (Number(s.initialFuel) || 0) + (Number(s.receivedFuel) || 0) - (Number(s.finalFuel) || 0));

const newTripRow = (): TripRow => ({
  _tempId: `trip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  vehicleNo: "",
  tripCount: "",
  material: "Than",
  loadStatus: "Đủ tải",
  loadStatusNote: "",
  vehicleManagementUnit: "",
  vehicleType: "",
});

const newSession = (): MiningSessionDraft => ({
  _tempId: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  workingDate: todayStr(),
  shift: "1",
  miningUnit: MINING_UNITS[0] || "",
  pickupLocation: PICKUP_LOCATIONS[0] || "",
  excavator: EXCAVATORS[0] || "",
  totalScoops: "",
  trips: [newTripRow()],
  initialFuel: "",
  receivedFuel: "",
  finalFuel: "",
  operatorBadgeNo: "",
  operatorName: "",
  operatorUnit: "",
});

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
  const [sessions, setSessions] = useState<MiningSessionDraft[]>([newSession()]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tableBottomRef = useRef<HTMLDivElement>(null);

  // Reset khi mở modal
  useEffect(() => {
    if (isOpen) {
      setSessions([newSession()]);
      setActiveIdx(0);
    }
  }, [isOpen]);

  // ── Cập nhật session header ─────────────────────────────────────────────
  const updateSession = useCallback(
    (sIdx: number, patch: Partial<MiningSessionDraft>) => {
      setSessions((prev) => {
        const next = [...prev];
        if (!next[sIdx]) return prev;
        const updated = { ...next[sIdx], ...patch };
        // Auto-fill tên + đơn vị theo thẻ lương
        if ("operatorBadgeNo" in patch) {
          const info = lookupOperatorInfo(patch.operatorBadgeNo!);
          updated.operatorName = info.operatorName;
          updated.operatorUnit = info.operatorUnit;
        }
        next[sIdx] = updated;
        return next;
      });
    },
    [],
  );

  // ── Cập nhật 1 dòng chuyến ──────────────────────────────────────────────
  const updateTrip = useCallback(
    (sIdx: number, tIdx: number, patch: Partial<TripRow>) => {
      setSessions((prev) => {
        const next = [...prev];
        if (!next[sIdx]) return prev;
        const trips = [...next[sIdx].trips];
        if (!trips[tIdx]) return prev;
        const updatedTrip = { ...trips[tIdx], ...patch };
        // Auto-fill đơn vị QL + chủng loại xe theo số xe
        if ("vehicleNo" in patch) {
          const info = lookupVehicleInfo(patch.vehicleNo!);
          updatedTrip.vehicleManagementUnit = info.vehicleManagementUnit;
          updatedTrip.vehicleType = info.vehicleType;
        }
        trips[tIdx] = updatedTrip;
        next[sIdx] = { ...next[sIdx], trips };
        return next;
      });
    },
    [],
  );

  // ── Thêm / xóa dòng chuyến ─────────────────────────────────────────────
  const handleAddTrip = useCallback(
    (sIdx: number) => {
      setSessions((prev) => {
        const next = [...prev];
        if (!next[sIdx]) return prev;
        next[sIdx] = { ...next[sIdx], trips: [...next[sIdx].trips, newTripRow()] };
        return next;
      });
      setTimeout(() => tableBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
    },
    [],
  );

  const handleRemoveTrip = (sIdx: number, tIdx: number) => {
    setSessions((prev) => {
      const next = [...prev];
      if (!next[sIdx]) return prev;
      if (next[sIdx].trips.length <= 1) {
        toast.error("Phải giữ ít nhất 1 chuyến xe!");
        return prev;
      }
      next[sIdx] = { ...next[sIdx], trips: next[sIdx].trips.filter((_, i) => i !== tIdx) };
      return next;
    });
  };

  // ── Thêm / xóa tab bản ghi ─────────────────────────────────────────────
  const handleAddSession = () => {
    setSessions((prev) => [...prev, newSession()]);
    setActiveIdx(sessions.length);
  };

  const handleRemoveSession = (sIdx: number) => {
    if (sessions.length <= 1) { toast.error("Cần giữ ít nhất 1 bản ghi!"); return; }
    setSessions((prev) => prev.filter((_, i) => i !== sIdx));
    setActiveIdx((prev) => Math.min(prev, sessions.length - 2));
  };

  // ── Import Excel ────────────────────────────────────────────────────────
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      toast.error("Vui lòng chọn file Excel (.xlsx hoặc .xls)");
      e.target.value = "";
      return;
    }
    setIsImporting(true);
    try {
      const rawRows = await excelService.parseExcelFile(file);
      if (!rawRows || rawRows.length === 0) {
        toast.error("File Excel không chứa bản ghi nào!");
        return;
      }
      toast.success(`Đã nạp ${rawRows.length} dòng từ Excel!`);
    } catch (err: any) {
      toast.error(`Lỗi đọc file Excel: ${err.message || "Không thể xử lý file"}`);
    } finally {
      setIsImporting(false);
      e.target.value = "";
    }
  };

  // ── Lưu tất cả ─────────────────────────────────────────────────────────
  const handleSave = (andAddNew: boolean) => {
    const validRecords: MiningRecord[] = [];

    sessions.forEach((sess) => {
      const dateObj = new Date(sess.workingDate);
      sess.trips.forEach((trip) => {
        const record: MiningRecord = {
          // Thông tin chung
          month: dateObj.getMonth() + 1,
          day: dateObj.getDate(),
          shift: sess.shift,
          miningUnit: sess.miningUnit,         // Đơn vị khai thác
          mineCode: sess.excavator,             // Máy xúc
          excavationBench: "",                  // Tầng xúc (không có trong form này)
          pickupLocation: sess.pickupLocation,  // Nơi chất tải
          dumpLocation: "",

          // Thông tin chuyến
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

          // Nhiên liệu
          initialFuel: Number(sess.initialFuel) || 0,
          receivedFuel: Number(sess.receivedFuel) || 0,
          finalFuel: Number(sess.finalFuel) || 0,
          fuelConsumption: computeFuelUsed(sess),
          fuelNorm: 0,
          fuelDiff: 0,

          // Người vận hành
          operatorBadgeNo: sess.operatorBadgeNo,
          operatorName: sess.operatorName,
          operatorUnit: sess.operatorUnit,
        };
        validRecords.push(record);
      });
    });

    if (validRecords.length === 0) {
      toast.error("Không có dữ liệu nào để lưu!");
      return;
    }

    saveMiningRecords(validRecords);
    toast.success(`Đã lưu ${validRecords.length} chuyến khai thác!`);
    onSuccess();

    if (andAddNew) {
      setSessions([newSession()]);
      setActiveIdx(0);
    } else {
      onClose();
    }
  };

  const { confirm, ConfirmDialogComponent } = useConfirmDialog();

  const handleCancel = async () => {
    const confirmed = await confirm({
      title: "Xác nhận thoát",
      description: "Dữ liệu đang nhập dở sẽ bị đóng. Bạn có chắc chắn muốn thoát?",
      confirmText: "Đóng & Hủy nhập",
      cancelText: "Tiếp tục nhập",
      variant: "primary",
      icon: "warning",
    });
    if (confirmed) onClose();
  };

  // ── Phím tắt: F3 = thêm chuyến, F2 = lưu & thêm mới, F5 = lưu ────────
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F3") { e.preventDefault(); handleAddTrip(activeIdx); }
      if (e.key === "F2") { e.preventDefault(); handleSave(true); }
      if (e.key === "F5") { e.preventDefault(); handleSave(false); }
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
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent
        className="w-[99vw] max-w-[99vw] sm:max-w-[99vw] h-[96vh] max-h-[96vh] flex flex-col p-0
                   bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800
                   shadow-2xl rounded-xl overflow-hidden
                   [&>button:last-child]:hidden"
      >
        {/* ══ HEADER ══════════════════════════════════════════════════════ */}
        <DialogHeader className="flex flex-row items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              <Pickaxe className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base font-bold text-gray-900 dark:text-gray-100 tracking-wide">
              THÊM MỚI BẢN GHI – BÁO CHUYẾN CÔNG TRƯỜNG KHAI THÁC
            </DialogTitle>
          </div>
          <button
            onClick={handleCancel}
            className="rounded-md p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </DialogHeader>

        {/* ══ TABS (khi có nhiều bản ghi) ════════════════════════════════ */}
        {sessions.length > 1 && (
          <div className="flex items-center gap-1 px-5 pt-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 shrink-0 overflow-x-auto">
            {sessions.map((s, i) => (
              <div key={s._tempId} className="flex items-center">
                <button
                  onClick={() => setActiveIdx(i)}
                  className={`px-4 py-1.5 text-xs font-medium rounded-t-md border-b-2 transition-colors whitespace-nowrap ${
                    i === activeIdx
                      ? "border-emerald-500 text-emerald-700 bg-white dark:bg-gray-950"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-white dark:hover:bg-gray-900"
                  }`}
                >
                  Bản ghi {i + 1}{s.excavator ? ` – ${s.excavator}` : ""}
                </button>
                <button
                  onClick={() => handleRemoveSession(i)}
                  className="ml-0.5 p-0.5 rounded text-gray-300 hover:text-red-500 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <button
              onClick={handleAddSession}
              className="ml-2 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm bản ghi
            </button>
          </div>
        )}

        {/* ══ BODY (cuộn) ════════════════════════════════════════════════ */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* ── HÀNG 1: Thời gian · Ca ───────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {/* Thời gian */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Thời gian <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={sess.workingDate}
                onChange={(e) => updateSession(activeIdx, { workingDate: e.target.value })}
                className="h-9 text-sm"
              />
            </div>

            {/* Ca */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Ca <span className="text-red-500">*</span>
              </label>
              <Select
                value={sess.shift}
                onValueChange={(v) => updateSession(activeIdx, { shift: v })}
              >
                <SelectTrigger className="h-9 text-sm w-full">
                  <SelectValue placeholder="Chọn ca" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Ca 1</SelectItem>
                  <SelectItem value="2">Ca 2</SelectItem>
                  <SelectItem value="3">Ca 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── HÀNG 2: Đơn vị KT · Nơi chất tải · Máy xúc · Tổng xúc ── */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Đơn vị khai thác */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Đơn vị khai thác <span className="text-red-500">*</span>
              </label>
              <Select
                value={sess.miningUnit}
                onValueChange={(v) => updateSession(activeIdx, { miningUnit: v })}
              >
                <SelectTrigger className="h-9 text-sm w-full">
                  <SelectValue placeholder="Chọn đơn vị" />
                </SelectTrigger>
                <SelectContent>
                  {MINING_UNITS.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Nơi chất tải */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Nơi chất tải <span className="text-red-500">*</span>
              </label>
              <ComboboxInput
                value={sess.pickupLocation}
                onChange={(v) => updateSession(activeIdx, { pickupLocation: v })}
                options={PICKUP_LOCATIONS}
                placeholder="Chọn/nhập nơi chất tải"
              />
            </div>

            {/* Máy xúc */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Máy xúc <span className="text-red-500">*</span>
              </label>
              <ComboboxInput
                value={sess.excavator}
                onChange={(v) => updateSession(activeIdx, { excavator: v })}
                options={EXCAVATORS}
                placeholder="Chọn/nhập máy xúc"
              />
            </div>

            {/* Tổng xúc */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Tổng xúc <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min={0}
                value={sess.totalScoops}
                onChange={(e) =>
                  updateSession(activeIdx, {
                    totalScoops: e.target.value === "" ? "" : Number(e.target.value),
                  })
                }
                className="h-9 text-sm"
                placeholder="0"
              />
            </div>
          </div>

          {/* ══ DANH SÁCH CHUYẾN ═══════════════════════════════════════ */}
          <div>
            {/* Tiêu đề + nút */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 tracking-widest uppercase">
                Danh sách chuyến
              </span>
              <div className="flex items-center gap-2">
                {/* Import Excel */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx,.xls"
                  onChange={handleImportExcel}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  className="h-8 text-xs gap-1.5 border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Import (Excel)
                </Button>

                {/* Export Excel */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5 border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export (Excel)
                </Button>

                {/* Thêm chuyến */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddTrip(activeIdx)}
                  className="h-8 text-xs gap-1.5 border-emerald-500 text-emerald-700 hover:bg-emerald-50 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Thêm chuyến (F3)
                </Button>
              </div>
            </div>

            {/* Bảng */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto">
              <table className="w-full text-xs border-collapse min-w-[860px]">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 text-[11px] font-semibold">
                    <th className="px-3 py-2.5 border-r border-b border-gray-200 dark:border-gray-700 text-center w-10">
                      STT
                    </th>
                    <th className="px-3 py-2.5 border-r border-b border-gray-200 dark:border-gray-700 text-left min-w-[130px]">
                      Số xe <span className="text-red-500">*</span>
                    </th>
                    <th className="px-3 py-2.5 border-r border-b border-gray-200 dark:border-gray-700 text-center w-24">
                      Số chuyến <span className="text-red-500">*</span>
                    </th>
                    <th className="px-3 py-2.5 border-r border-b border-gray-200 dark:border-gray-700 text-left min-w-[110px]">
                      Loại hàng <span className="text-red-500">*</span>
                    </th>
                    <th className="px-3 py-2.5 border-r border-b border-gray-200 dark:border-gray-700 text-center min-w-[270px]">
                      Tải trọng <span className="text-red-500">*</span>
                    </th>
                    <th className="px-3 py-2.5 border-r border-b border-gray-200 dark:border-gray-700 text-center min-w-[120px]">
                      Đơn vị QL thiết bị
                    </th>
                    <th className="px-3 py-2.5 border-r border-b border-gray-200 dark:border-gray-700 text-center min-w-[120px]">
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
                      } hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-colors`}
                    >
                      {/* STT */}
                      <td className="px-3 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-center text-gray-500 font-semibold">
                        {tIdx + 1}
                      </td>

                      {/* Số xe — ComboboxInput (tìm nhanh + gõ tự do) */}
                      <td className="px-2 py-1.5 border-r border-b border-gray-200 dark:border-gray-700">
                        <ComboboxInput
                          value={trip.vehicleNo}
                          onChange={(v) => updateTrip(activeIdx, tIdx, { vehicleNo: v })}
                          options={VEHICLE_NUMBERS}
                          placeholder="Chọn/nhập số xe"
                        />
                      </td>

                      {/* Số chuyến */}
                      <td className="px-2 py-1.5 border-r border-b border-gray-200 dark:border-gray-700">
                        <Input
                          type="number"
                          min={1}
                          value={trip.tripCount}
                          onChange={(e) =>
                            updateTrip(activeIdx, tIdx, {
                              tripCount: e.target.value === "" ? "" : Number(e.target.value),
                            })
                          }
                          className="h-8 text-xs text-center"
                          placeholder="0"
                        />
                      </td>

                      {/* Loại hàng */}
                      <td className="px-2 py-1.5 border-r border-b border-gray-200 dark:border-gray-700">
                        <Select
                          value={trip.material}
                          onValueChange={(v) => updateTrip(activeIdx, tIdx, { material: v })}
                        >
                          <SelectTrigger className="h-8 text-xs bg-white dark:bg-gray-900 w-full">
                            <SelectValue placeholder="Loại hàng" />
                          </SelectTrigger>
                          <SelectContent>
                            {MATERIALS.map((m) => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                                    updateTrip(activeIdx, tIdx, {
                                      loadStatus: opt.value,
                                      loadStatusNote: "",
                                    })
                                  }
                                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                    active
                                      ? "border-emerald-600 bg-emerald-600"
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
                                      updateTrip(activeIdx, tIdx, {
                                        loadStatusNote: e.target.value,
                                      })
                                    }
                                    onClick={(e) => e.stopPropagation()}
                                    className="h-6 w-14 text-[11px] ml-1 px-1.5"
                                    placeholder="1/2…"
                                  />
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </td>

                      {/* Đơn vị QL thiết bị (auto-fill, readonly) */}
                      <td className="px-2 py-1.5 border-r border-b border-gray-200 dark:border-gray-700">
                        <Input
                          type="text"
                          value={trip.vehicleManagementUnit}
                          readOnly
                          disabled
                          className="h-8 text-xs bg-gray-100 dark:bg-gray-800 text-center cursor-not-allowed border-gray-200 dark:border-gray-700"
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
                          onClick={() => handleRemoveTrip(activeIdx, tIdx)}
                          title="Xóa chuyến"
                          className="text-gray-300 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {sess.trips.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-xs text-gray-400">
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
                  updateSession(activeIdx, {
                    initialFuel: e.target.value === "" ? "" : Number(e.target.value),
                  })
                }
                className="h-9 text-sm"
                placeholder="0"
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
                  updateSession(activeIdx, {
                    receivedFuel: e.target.value === "" ? "" : Number(e.target.value),
                  })
                }
                className="h-9 text-sm"
                placeholder="0"
              />
            </div>

            {/* Nhiên liệu tồn cuối */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Nhiên liệu tồn cuối (lít) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min={0}
                value={sess.finalFuel}
                onChange={(e) =>
                  updateSession(activeIdx, {
                    finalFuel: e.target.value === "" ? "" : Number(e.target.value),
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
              <Select
                value={sess.operatorBadgeNo}
                onValueChange={(v) => updateSession(activeIdx, { operatorBadgeNo: v })}
              >
                <SelectTrigger className="h-9 text-sm w-full">
                  <SelectValue placeholder="Chọn số thẻ" />
                </SelectTrigger>
                <SelectContent>
                  {OPERATOR_BADGES.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

        </div>{/* end body */}

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
            className="h-9 text-sm px-4 gap-1.5 border-emerald-500 text-emerald-700 hover:bg-emerald-50 font-semibold"
          >
            <Plus className="w-4 h-4" />
            Lưu &amp; Thêm mới (F2)
          </Button>

          {/* Lưu (F5) */}
          <Button
            onClick={() => handleSave(false)}
            className="h-9 text-sm px-6 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md"
          >
            <Save className="w-4 h-4" />
            Lưu (F5)
          </Button>
        </DialogFooter>

        {ConfirmDialogComponent}
      </DialogContent>
    </Dialog>
  );
};
