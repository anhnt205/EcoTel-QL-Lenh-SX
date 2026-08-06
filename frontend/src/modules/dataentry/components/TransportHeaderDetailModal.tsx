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
import { Checkbox } from "../../../components/ui/checkbox.tsx";
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
  Truck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useConfirmDialog } from "../../../components/ui/confirm-dialog.tsx";
import type { TransportRecord } from "@/modules/dataentry/types/thong-ke.ts";
import { saveTransportRecords } from "@/modules/dataentry/services/thongKeStorage.ts";
import { excelService } from "@/modules/report/utils/excel-exporter.ts";
import {
  lookupVehicleInfo,
  lookupOperatorInfo,
  calculateBenchGroup,
  getExcavatorsForArea,
  getCargoGroup,
  EXCAVATION_AREAS,
  PICKUP_LOCATIONS,
  UNLOAD_LOCATIONS,
  CARGO_TYPES,
  VEHICLE_NUMBERS,
  OPERATOR_BADGES,
} from "@/modules/dataentry/utils/lookup.ts";

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

const newTripRow = (area: string = "Khe Chàm"): TransportTripRow => {
  const availableExcavators = getExcavatorsForArea(area);
  const bench = "-40";
  const benchGroup = calculateBenchGroup(area, bench);
  const cargoType = "Than";
  const cargoGroup = getCargoGroup(cargoType);
  const vehicleNo = "505 HD 465-7R";
  const vInfo = lookupVehicleInfo(vehicleNo);

  return {
    _tempId: `trip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    excavationArea: area,
    excavatorEquipment: availableExcavators[0] || "KC-MX01",
    pickupLocation: "11.ĐCS",
    pickupBench: bench,
    pickupBenchGroup: benchGroup ? `Nhóm ${benchGroup}` : "",
    unloadBench: "+10",
    fullRouteDistance: 5.5,
    fullRouteElevate: 100,
    localSlopeDist: 1.2,
    localSlopeDegree: 8,
    unloadLocationName: "Bãi sàng",
    cargoType,
    cargoGroup,
    vehicleNo,
    tripCount: 8,
    loadStatus: "Đủ tải",
    loadStatusNote: "",
    isRainyDay: true,
    isTraineeVehicle: true,
    equipmentUnit: vInfo.vehicleManagementUnit || "PXVT9",
    vehicleType: vInfo.vehicleType || "HD 465-7R",
  };
};

const newSession = (): TransportSessionDraft => {
  const badgeNo = "5251";
  const opInfo = lookupOperatorInfo(badgeNo);

  return {
    _tempId: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    workingDate: todayStr(),
    shift: "1",
    trips: [
      newTripRow("Khe Chàm"),
      {
        ...newTripRow("Khe Chàm"),
        pickupBench: "-25",
        pickupBenchGroup: `Nhóm ${calculateBenchGroup("Khe Chàm", "-25")}`,
        tripCount: 6,
        loadStatus: "Roda (2/3)",
        loadStatusNote: "2/3",
        isRainyDay: false,
        isTraineeVehicle: false,
      },
      {
        ...newTripRow("Khe Chàm"),
        pickupBench: "-10",
        pickupBenchGroup: `Nhóm ${calculateBenchGroup("Khe Chàm", "-10")}`,
        cargoType: "Đất",
        cargoGroup: getCargoGroup("Đất"),
        tripCount: 5,
        loadStatus: "Khác",
        loadStatusNote: "1/2",
        isRainyDay: true,
        isTraineeVehicle: false,
      },
    ],
    initialFuel: 330,
    receivedFuel: 400,
    finalFuel: 340,
    operatorBadgeNo: badgeNo,
    operatorName: opInfo.operatorName || "Trần Hồng Sơn",
    operatorUnit: opInfo.operatorUnit || "PXVT9",
  };
};

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
  const [sessions, setSessions] = useState<TransportSessionDraft[]>([
    newSession(),
  ]);
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
    (sIdx: number, patch: Partial<TransportSessionDraft>) => {
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
    (sIdx: number, tIdx: number, patch: Partial<TransportTripRow>) => {
      setSessions((prev) => {
        const next = [...prev];
        if (!next[sIdx]) return prev;
        const trips = [...next[sIdx].trips];
        if (!trips[tIdx]) return prev;

        const currentTrip = trips[tIdx];
        const updatedTrip = { ...currentTrip, ...patch };

        // Auto calculate nhóm tầng nhận tải
        if ("pickupBench" in patch || "excavationArea" in patch) {
          const area = patch.excavationArea ?? currentTrip.excavationArea;
          const bench = patch.pickupBench ?? currentTrip.pickupBench;
          const bg = calculateBenchGroup(area, bench);
          updatedTrip.pickupBenchGroup = bg !== "" ? `Nhóm ${bg}` : "";
        }

        // Auto calculate nhóm hàng
        if ("cargoType" in patch) {
          updatedTrip.cargoGroup = getCargoGroup(patch.cargoType!);
        }

        // Auto update danh sách máy xúc khi đổi khu vực xúc
        if ("excavationArea" in patch) {
          const available = getExcavatorsForArea(patch.excavationArea!);
          if (!available.includes(updatedTrip.excavatorEquipment)) {
            updatedTrip.excavatorEquipment = available[0] || "";
          }
        }

        // Auto-fill đơn vị QL + chủng loại xe theo số xe
        if ("vehicleNo" in patch) {
          const info = lookupVehicleInfo(patch.vehicleNo!);
          updatedTrip.equipmentUnit = info.vehicleManagementUnit;
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
  const handleAddTrip = useCallback((sIdx: number) => {
    setSessions((prev) => {
      const next = [...prev];
      if (!next[sIdx]) return prev;
      const lastTrip = next[sIdx].trips[next[sIdx].trips.length - 1];
      const area = lastTrip ? lastTrip.excavationArea : "Khe Chàm";
      next[sIdx] = {
        ...next[sIdx],
        trips: [...next[sIdx].trips, newTripRow(area)],
      };
      return next;
    });
    setTimeout(
      () => tableBottomRef.current?.scrollIntoView({ behavior: "smooth" }),
      60,
    );
  }, []);

  const handleRemoveTrip = (sIdx: number, tIdx: number) => {
    setSessions((prev) => {
      const next = [...prev];
      if (!next[sIdx]) return prev;
      if (next[sIdx].trips.length <= 1) {
        toast.error("Phải giữ ít nhất 1 chuyến xe!");
        return prev;
      }
      next[sIdx] = {
        ...next[sIdx],
        trips: next[sIdx].trips.filter((_, i) => i !== tIdx),
      };
      return next;
    });
  };

  // ── Thêm / xóa tab bản ghi ─────────────────────────────────────────────
  const handleAddSession = () => {
    setSessions((prev) => [...prev, newSession()]);
    setActiveIdx(sessions.length);
  };

  const handleRemoveSession = (sIdx: number) => {
    if (sessions.length <= 1) {
      toast.error("Cần giữ ít nhất 1 bản ghi!");
      return;
    }
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
      toast.error(
        `Lỗi đọc file Excel: ${err.message || "Không thể xử lý file"}`,
      );
    } finally {
      setIsImporting(false);
      e.target.value = "";
    }
  };

  // ── Lưu tất cả ─────────────────────────────────────────────────────────
  const handleSave = (andAddNew: boolean) => {
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

    if (validRecords.length === 0) {
      toast.error("Không có dữ liệu nào để lưu!");
      return;
    }

    saveTransportRecords(validRecords);
    toast.success(`Đã lưu ${validRecords.length} chuyến phân xưởng vận tải!`);
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
      description:
        "Dữ liệu đang nhập dở sẽ bị đóng. Bạn có chắc chắn muốn thoát?",
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
      if (e.key === "F3") {
        e.preventDefault();
        handleAddTrip(activeIdx);
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
              <Truck className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base font-bold text-gray-900 dark:text-gray-100 tracking-wide">
              THÊM MỚI BẢN GHI – BÁO CHUYẾN PHÂN XƯỞNG VẬN TẢI
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
                  Bản ghi {i + 1}
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
          {/* ── HÀNG THÔNG TIN CHUNG: Thời gian · Ca ─────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {/* Thời gian */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Thời gian <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={sess.workingDate}
                onChange={(e) =>
                  updateSession(activeIdx, { workingDate: e.target.value })
                }
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
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-center min-w-[90px]">
                      Cung độ toàn tuyến (km)
                    </th>
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-center min-w-[90px]">
                      Nâng tải toàn tuyến (m)
                    </th>
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-center min-w-[90px]">
                      Cung độ dốc cục bộ (km)
                    </th>
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-center min-w-[75px]">
                      Dốc cục bộ (m)
                    </th>
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-left min-w-[110px]">
                      Nơi dỡ tải
                    </th>
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-left min-w-[100px]">
                      Loại hàng
                    </th>
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-left min-w-[130px]">
                      Nhóm hàng
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
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-center min-w-[100px]">
                      Đơn vị quản lý thiết bị
                    </th>
                    <th className="px-2 py-2 border-r border-b border-gray-200 dark:border-gray-700 text-center min-w-[110px]">
                      Chủng loại
                    </th>
                    <th className="px-2 py-2 border-b border-gray-200 dark:border-gray-700 text-center w-15" />
                  </tr>
                </thead>

                <tbody>
                  {sess.trips.map((trip, tIdx) => {
                    const availableExcavators = getExcavatorsForArea(
                      trip.excavationArea,
                    );

                    return (
                      <tr
                        key={trip._tempId}
                        className={`${
                          tIdx % 2 === 0
                            ? "bg-white dark:bg-gray-950"
                            : "bg-gray-50/50 dark:bg-gray-900/40"
                        } hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-colors`}
                      >
                        {/* STT */}
                        <td className="px-2 py-1.5 border-r border-b border-gray-200 dark:border-gray-700 text-center text-gray-500 font-semibold">
                          {tIdx + 1}
                        </td>

                        {/* Khu vực xúc */}
                        <td className="px-1.5 py-1.5 border-r border-b border-gray-200 dark:border-gray-700">
                          <Select
                            value={trip.excavationArea}
                            onValueChange={(v) =>
                              updateTrip(activeIdx, tIdx, { excavationArea: v })
                            }
                          >
                            <SelectTrigger className="h-8 text-xs bg-white dark:bg-gray-900 w-full">
                              <SelectValue placeholder="Khu vực" />
                            </SelectTrigger>
                            <SelectContent>
                              {EXCAVATION_AREAS.map((a) => (
                                <SelectItem key={a} value={a}>
                                  {a}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>

                        {/* Máy xúc */}
                        <td className="px-1.5 py-1.5 border-r border-b border-gray-200 dark:border-gray-700">
                          <Select
                            value={trip.excavatorEquipment}
                            onValueChange={(v) =>
                              updateTrip(activeIdx, tIdx, {
                                excavatorEquipment: v,
                              })
                            }
                          >
                            <SelectTrigger className="h-8 text-xs bg-white dark:bg-gray-900 w-full">
                              <SelectValue placeholder="Máy xúc" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableExcavators.map((e) => (
                                <SelectItem key={e} value={e}>
                                  {e}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>

                        {/* Nơi nhận tải */}
                        <td className="px-1.5 py-1.5 border-r border-b border-gray-200 dark:border-gray-700">
                          <ComboboxInput
                            value={trip.pickupLocation}
                            onChange={(v) =>
                              updateTrip(activeIdx, tIdx, { pickupLocation: v })
                            }
                            options={PICKUP_LOCATIONS}
                            placeholder="Nơi nhận tải"
                          />
                        </td>

                        {/* Tầng nhận tải */}
                        <td className="px-1 py-1.5 border-r border-b border-gray-200 dark:border-gray-700">
                          <Input
                            type="text"
                            value={trip.pickupBench}
                            onChange={(e) =>
                              updateTrip(activeIdx, tIdx, {
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
                              updateTrip(activeIdx, tIdx, {
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
                              updateTrip(activeIdx, tIdx, {
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
                              updateTrip(activeIdx, tIdx, {
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
                              updateTrip(activeIdx, tIdx, {
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
                              updateTrip(activeIdx, tIdx, {
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
                          <Select
                            value={trip.unloadLocationName}
                            onValueChange={(v) =>
                              updateTrip(activeIdx, tIdx, {
                                unloadLocationName: v,
                              })
                            }
                          >
                            <SelectTrigger className="h-8 text-xs bg-white dark:bg-gray-900 w-full">
                              <SelectValue placeholder="Nơi dỡ" />
                            </SelectTrigger>
                            <SelectContent>
                              {UNLOAD_LOCATIONS.map((u) => (
                                <SelectItem key={u} value={u}>
                                  {u}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>

                        {/* Loại hàng */}
                        <td className="px-1.5 py-1.5 border-r border-b border-gray-200 dark:border-gray-700">
                          <Select
                            value={trip.cargoType}
                            onValueChange={(v) =>
                              updateTrip(activeIdx, tIdx, { cargoType: v })
                            }
                          >
                            <SelectTrigger className="h-8 text-xs bg-white dark:bg-gray-900 w-full">
                              <SelectValue placeholder="Loại hàng" />
                            </SelectTrigger>
                            <SelectContent>
                              {CARGO_TYPES.map((c) => (
                                <SelectItem key={c} value={c}>
                                  {c}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>

                        {/* Nhóm hàng (tự động) */}
                        <td className="px-1.5 py-1.5 border-r border-b border-gray-200 dark:border-gray-700">
                          <Input
                            type="text"
                            value={trip.cargoGroup}
                            readOnly
                            disabled
                            className="h-8 text-xs bg-gray-100 dark:bg-gray-800 text-left cursor-not-allowed border-gray-200 dark:border-gray-700"
                          />
                        </td>

                        {/* Số xe */}
                        <td className="px-1.5 py-1.5 border-r border-b border-gray-200 dark:border-gray-700">
                          <ComboboxInput
                            value={trip.vehicleNo}
                            onChange={(v) =>
                              updateTrip(activeIdx, tIdx, { vehicleNo: v })
                            }
                            options={VEHICLE_NUMBERS}
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
                                updateTrip(activeIdx, tIdx, {
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
                                        updateTrip(activeIdx, tIdx, {
                                          loadStatus: opt.value,
                                          loadStatusNote: isNoteOption
                                            ? trip.loadStatusNote
                                            : "",
                                        })
                                      }
                                      className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                        active
                                          ? "border-emerald-600 bg-emerald-600"
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

                                  {isNoteOption && (
                                    <Input
                                      type="text"
                                      value={active ? trip.loadStatusNote : ""}
                                      disabled={!active}
                                      onChange={(e) =>
                                        updateTrip(activeIdx, tIdx, {
                                          loadStatusNote: e.target.value,
                                        })
                                      }
                                      onClick={(e) => e.stopPropagation()}
                                      className="h-5 w-9 text-[10px] px-1 text-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 disabled:opacity-40"
                                      placeholder=""
                                    />
                                  )}
                                </label>
                              );
                            })}
                          </div>
                        </td>

                        {/* Ngày mưa */}
                        {/* Ngày mưa */}
                        <td className="px-1 py-1.5 border-r border-b border-gray-200 dark:border-gray-700 text-center min-w-[65px]">
                          <div className="flex justify-center pt-1">
                            <Checkbox
                              checked={trip.isRainyDay}
                              onCheckedChange={(c) =>
                                updateTrip(activeIdx, tIdx, {
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
                                updateTrip(activeIdx, tIdx, {
                                  isTraineeVehicle: Boolean(c),
                                })
                              }
                            />
                          </div>
                        </td>

                        {/* Đơn vị quản lý thiết bị (tự động, readonly) */}
                        <td className="px-1.5 py-1.5 border-r border-b border-gray-200 dark:border-gray-700">
                          <Input
                            type="text"
                            value={trip.equipmentUnit}
                            readOnly
                            disabled
                            className="h-8 text-xs bg-gray-100 dark:bg-gray-800 text-center cursor-not-allowed border-gray-200 dark:border-gray-700"
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
                        <td className="px-1.5 py-1.5 border-b border-gray-200 dark:border-gray-700 text-center">
                          <button
                            onClick={() => handleRemoveTrip(activeIdx, tIdx)}
                            title="Xóa chuyến"
                            className="text-gray-300 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50"
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
              <span className="text-emerald-600">{totalTripCountSum}</span>
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
                  updateSession(activeIdx, {
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
                  updateSession(activeIdx, {
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
                  updateSession(activeIdx, {
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
              <Select
                value={sess.operatorBadgeNo}
                onValueChange={(v) =>
                  updateSession(activeIdx, { operatorBadgeNo: v })
                }
              >
                <SelectTrigger className="h-9 text-sm w-full">
                  <SelectValue placeholder="Chọn số thẻ" />
                </SelectTrigger>
                <SelectContent>
                  {OPERATOR_BADGES.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
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
