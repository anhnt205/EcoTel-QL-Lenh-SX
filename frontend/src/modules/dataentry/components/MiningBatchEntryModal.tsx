import React, { useRef, useCallback } from "react";
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

import { Plus, Trash2, Pickaxe, X, Upload, Download } from "lucide-react";
import * as XLSX from "xlsx";

import { toast } from "sonner";
import { useMasterData } from "@/modules/dataentry/hooks/useMasterData.ts";
import { useFormTabNavigation } from "@/hooks/useFormTabNavigation.ts";
import { useMiningDraftStore } from "@/modules/dataentry/store/useMiningDraftStore.ts";
import {
  buildExcavationReportRequest,
  buildExcavationTripRequestItem,
  useCreateExcavationTripReportMutation,
  useUpdateExcavationTripReportMutation,
  useUpdateExcavationTripMutation,
  useBulkCreateExcavationTripReportMutation,
  useBulkUpdateExcavationTripReportMutation,
  type ExcavationTripReportRequest,
  type ExcavationReportBulkUpdateItem,
} from "@/modules/dataentry/services/excavationTripReportService.ts";
import { computeFuelUsed } from "../shared/utils.ts";
import { SessionTabsBar } from "./SessionTabsBar.tsx";
import { LoadStatusRadioGroup } from "./LoadStatusRadioGroup.tsx";
import { FuelSection } from "./FuelSection.tsx";
import { OperatorSection } from "./OperatorSection.tsx";
import { ModalFooterActions } from "./ModalFooterActions.tsx";
import { useModalShortcuts } from "../hooks/useModalShortcuts.ts";

// ─── 1 dòng xe trong bảng Danh sách chuyến ──────────────────────────────
export interface TripRow {
  _tempId: string;
  vehicleNo: string; // Số xe
  vehicleManagementUnit: string; // Phân xưởng vận tải (auto-fill theo số xe)
  vehicleType: string; // Chủng loại xe (auto-fill theo số xe)
  tripCount: number | ""; // Số chuyến
  material: string; // Loại hàng
  loadStatus: string; // Tải trọng (radio)
  loadStatusNote: string; // Ghi chú khi "Khác" (vd: "1/2")
}

// ─── 1 bản ghi = 1 ca + 1 máy xúc ──────────────────────────────────────
export interface MiningSessionDraft {
  _tempId: string;
  reportId?: number; // ID bản ghi trên Backend (nếu đang ở chế độ Chỉnh sửa)
  singleTripId?: number; // ID chuyến đơn lẻ khi chỉnh sửa trực tiếp 1 chuyến

  // === Header (nhập 1 lần / ca / máy xúc) ===
  workingDate: string; // Thời gian (YYYY-MM-DD)
  shift: string; // Ca: "1" | "2" | "3"
  department?: string; // Đơn vị
  pickupLocation: string; // Nơi chất tải
  excavator: string; // Máy xúc
  excavatorManagementUnit: string; // Đơn vị quản lý thiết bị (máy xúc)
  totalScoops: number | ""; // Tầng xúc

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
// ─── Props ────────────────────────────────────────────────────────────────
interface MiningBatchEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode?: "add" | "edit";
}

// ════════════════════════════════════════════════════════════════════════════
export const MiningBatchEntryModal: React.FC<MiningBatchEntryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  mode = "add",
}) => {
  const {
    shiftOptions,
    pickupPointValues,
    excavatorValues,
    vehicleValues,
    cargoTypeValues,
    operatorOptions,
    getVehicleDetails,
    getExcavatorDetails,
    getOperatorDetails,
    rawShifts,
    rawPickupPoints,
    rawExcavators,
    rawVehicles,
    rawUsers,
    rawCargoTypes,
  } = useMasterData({ enabled: isOpen });

  const createReportMutation = useCreateExcavationTripReportMutation();
  const updateReportMutation = useUpdateExcavationTripReportMutation();
  const updateExcavationTripMutation = useUpdateExcavationTripMutation();
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
      updateActiveSession(patch, getOperatorDetails, getExcavatorDetails);
    },
    [updateActiveSession, getOperatorDetails, getExcavatorDetails],
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

  // ── Xuất / nhập danh sách chuyến của PHIẾU ĐANG MỞ ─────────────────────
  // Khác với nút Excel ở trang danh sách (làm việc với nhiều báo cáo qua
  // API): hai nút này chỉ thao tác trên bảng chuyến của phiếu hiện tại.
  const tripFileInputRef = useRef<HTMLInputElement>(null);

  const handleExportTrips = useCallback(() => {
    const rows = (sessions[activeIdx]?.trips ?? []).map((t, i) => ({
      STT: i + 1,
      "Số xe": t.vehicleNo ?? "",
      "Số chuyến": t.tripCount ?? "",
      "Loại hàng": t.material ?? "",
      "Tải trọng":
        t.loadStatus === "Khác"
          ? `Khác (${t.loadStatusNote ?? ""})`
          : (t.loadStatus ?? ""),
      "Đơn vị quản lý thiết bị": t.vehicleManagementUnit ?? "",
      "Chủng loại xe": t.vehicleType ?? "",
    }));
    if (rows.length === 0) {
      toast.error("Chưa có chuyến nào để xuất!");
      return;
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Chuyen");
    const s = sessions[activeIdx];
    const name = ["danh-sach-chuyen", s?.workingDate, s?.excavator]
      .filter(Boolean)
      .join("_");
    XLSX.writeFile(wb, `${name}.xlsx`);
    toast.success(`Đã xuất ${rows.length} chuyến.`);
  }, [sessions, activeIdx]);

  const handleImportTrips = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = ""; // cho phép chọn lại đúng file đó lần sau
      if (!file) return;
      try {
        const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
        const pick = (r: Record<string, unknown>, ...keys: string[]) => {
          for (const k of keys) {
            if (r[k] !== undefined && r[k] !== null && String(r[k]) !== "")
              return String(r[k]).trim();
          }
          return "";
        };
        const parsed = raw
          .map((r) => ({
            vehicleNo: pick(r, "Số xe", "So xe", "vehicleNo"),
            tripCount: pick(r, "Số chuyến", "So chuyen", "tripCount"),
            material: pick(r, "Loại hàng", "Loai hang", "material"),
            loadStatus: pick(r, "Tải trọng", "Tai trong", "loadStatus"),
          }))
          .filter((r) => r.vehicleNo || r.tripCount || r.material);

        if (parsed.length === 0) {
          toast.error(
            "Không đọc được dòng nào. Cần các cột: Số xe, Số chuyến, Loại hàng, Tải trọng.",
          );
          return;
        }

        // Phiếu mới luôn có sẵn ĐÚNG MỘT dòng trống mặc định (xem
        // createDefaultSession() trong useMiningDraftStore.ts) — nếu cứ nối
        // thêm dòng sau nó thì dòng trống đó vẫn còn nguyên, và schema xác
        // thực (miningSessionDraftSchema) chặn lưu vì dòng nào cũng phải có
        // Số xe/Số chuyến/Loại hàng. Trước đây phải tự tay xoá dòng đó rồi
        // mới lưu được. removeTripRow() lại từ chối xoá khi đó là dòng CUỐI
        // CÙNG (không cho phiếu về 0 dòng), nên không xoá-trước-rồi-thêm
        // được — thay vào đó TÁI DÙNG đúng dòng trống đó cho dòng Excel đầu
        // tiên, chỉ thêm dòng mới cho phần còn lại.
        const existingTrips = sessions[activeIdx]?.trips ?? [];
        const isPristineEmptyRow = (r?: { vehicleNo: string; tripCount: number | ""; material: string }) =>
          !!r && !r.vehicleNo && r.tripCount === "" && !r.material;
        const reuseFirstRow = existingTrips.length === 1 && isPristineEmptyRow(existingTrips[0]);

        const startIdx = reuseFirstRow ? 0 : existingTrips.length;
        const rowsToAdd = reuseFirstRow ? parsed.length - 1 : parsed.length;
        for (let i = 0; i < rowsToAdd; i++) addTripRow();
        parsed.forEach((r, i) => {
          const isOther =
            r.loadStatus && !/^(đủ tải|du tai|roda)/i.test(r.loadStatus);
          updateTripRow(
            startIdx + i,
            {
              vehicleNo: r.vehicleNo,
              tripCount: r.tripCount === "" ? "" : Number(r.tripCount),
              material: r.material,
              loadStatus: /roda/i.test(r.loadStatus)
                ? "Roda (2/3)"
                : isOther
                  ? "Khác"
                  : "Đủ tải",
              loadStatusNote: isOther
                ? r.loadStatus.replace(/^khác\s*\(?|\)$/gi, "").trim()
                : "",
            },
            getVehicleDetails,
          );
        });
        toast.success(`Đã nhập ${parsed.length} chuyến vào phiếu.`);
      } catch (err) {
        console.error(err);
        toast.error("Không đọc được file Excel. Kiểm tra lại định dạng.");
      }
    },
    [sessions, activeIdx, addTripRow, updateTripRow, getVehicleDetails],
  );

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
        const tripPayload = buildExcavationTripRequestItem(tripRow, {
          rawVehicles,
          rawCargoTypes,
        });

        // Ngày/Ca/Máy xúc/Số thẻ lương nằm trên PHIẾU chứ không trên chuyến —
        // phải gửi kèm thì backend mới chuyển chuyến sang phiếu đúng được (bản
        // đối xứng của form Vận tải, cùng lỗi, cùng cách sửa). Chốt 2026-09-09.
        const shiftItem = rawShifts.find(
          (s: any) =>
            String(s.name) === String(sess.shift) ||
            String(s.id) === String(sess.shift),
        );
        const excavatorItem = rawExcavators.find(
          (d: any) =>
            d.code === sess.excavator ||
            d.name === sess.excavator ||
            String(d.id) === String(sess.excavator),
        );
        const userItem = rawUsers.find(
          (u: any) =>
            u.salaryCode === sess.operatorBadgeNo ||
            u.username === sess.operatorBadgeNo ||
            String(u.id) === String(sess.operatorBadgeNo),
        );

        await updateExcavationTripMutation.mutateAsync({
          tripId: sess.singleTripId!,
          payload: {
            ...tripPayload,
            reportDate: sess.workingDate || undefined,
            shiftId: shiftItem ? Number(shiftItem.id) : undefined,
            excavatorDeviceId: excavatorItem
              ? Number(excavatorItem.id)
              : undefined,
            employeeId: userItem ? Number(userItem.id) : undefined,
          },
        });
        toast.success("Đã cập nhật chuyến thành công!");
        onSuccess();
        if (andAddNew) {
          initDrafts();
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

    // Map dữ liệu & kiểm tra khớp Master Data cho từng session trong try/catch RIÊNG
    const payloads: ExcavationTripReportRequest[] = [];
    for (let i = 0; i < sessions.length; i++) {
      const sess = sessions[i];
      try {
        const payload = buildExcavationReportRequest(sess, {
          rawShifts,
          rawLocations: rawPickupPoints,
          rawExcavators,
          rawVehicles,
          rawUsers,
          rawCargoTypes,
        });
        payloads.push(payload);
      } catch (err: any) {
        console.error(`[Mapping Data Error] Lỗi bản ghi ca ${i + 1}:`, err);
        toast.error(
          `Bản ghi #${i + 1}: ${err.message || "Lỗi dữ liệu không hợp lệ"}`,
        );
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
    if (apiSuccessCount > 0) {
      toast.success(`Đã gửi thành công ${apiSuccessCount} bản ghi!`);
    } else {
      toast.success(
        `Đã lưu thành công ${sessions.length} bản ghi chuyến khai thác)!`,
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
  useModalShortcuts({
    isOpen,
    mode,
    onAddTrip: handleAddTripAction,
    onSave: handleSave,
  });

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
              {mode === "add"
                ? "Thêm mới bản ghi – Báo chuyến Công trường Khai thác"
                : "Chỉnh sửa bản ghi – Báo chuyến Công trường Khai thác"}
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
          <SessionTabsBar
            sessions={sessions}
            activeIdx={activeIdx}
            batchProgress={batchProgress}
            isSessionValid={isSessionValid}
            getSessionProgress={getSessionProgress}
            onSelect={setActiveIdx}
            onRemove={removeSession}
            onAdd={addSession}
            renderExtraLabel={(s) =>
              s.excavator
                ? ` – ${[s.excavator, s.trips?.[0]?.vehicleNo ? `Xe ${s.trips[0].vehicleNo}` : ""].filter(Boolean).join(" / ")}`
                : ""
            }
          />
        </div>

        {/* ══ BODY (cuộn) ════════════════════════════════════════════════ */}
        <div
          className="flex-1 overflow-y-auto px-5 py-4 space-y-5"
          onKeyDown={handleKeyDown}
        >
          {/* ── HÀNG THÔNG TIN CHUNG ──────────────────────────────────────
              Hàng 1: Thời gian · Ca          (cột 1-2, cột 3-5 để trống)
              Hàng 2: Nơi chất tải · Máy xúc · Tầng xúc  (cột 1-3)

              Dùng HAI grid rời nhau nhưng CÙNG `lg:grid-cols-5` + cùng gap
              nên các cột thẳng hàng theo chiều dọc, mỗi ô rộng đúng 1/5.
              (Trước đây gộp 1 grid rồi cho 2 ô đầu span 3/6 — ô bị kéo rộng
              nửa hàng và cột 2 hàng lệch nhau.) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Nơi chất tải */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Nơi chất tải <span className="text-red-500">*</span>
              </label>
              <ComboboxInput
                options={pickupPointValues}
                value={sess.pickupLocation}
                onChange={(v) => handleUpdateSession({ pickupLocation: v })}
                placeholder="Chọn nơi chất tải"
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
                placeholder="Chọn máy xúc"
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

                {/* Nhập / xuất danh sách chuyến của phiếu đang mở */}
                <input
                  type="file"
                  ref={tripFileInputRef}
                  accept=".xlsx,.xls"
                  onChange={handleImportTrips}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => tripFileInputRef.current?.click()}
                  className="h-8 text-xs gap-1.5 border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Import (Excel)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportTrips}
                  className="h-8 text-xs gap-1.5 border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export (Excel)
                </Button>
              </div>
            </div>

            {/* Bảng */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto">
              <table className="w-full text-xs border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 text-sm font-bold border-b border-gray-200 dark:border-gray-700">
                    <th className="px-3 py-2.5 border-r border-b border-gray-200 dark:border-gray-700 text-center w-10">
                      STT
                    </th>
                    <th className="px-3 py-2.5 border-r border-b border-gray-200 dark:border-gray-700 text-left min-w-[130px]">
                      Số xe <span className="text-red-500">*</span>
                    </th>
                    <th className="px-3 py-2.5 border-r border-b border-gray-200 dark:border-gray-700 text-center min-w-[100px]">
                      Số chuyến <span className="text-red-500">*</span>
                    </th>
                    <th className="px-3 py-2.5 border-r border-b border-gray-200 dark:border-gray-700 text-left min-w-[160px]">
                      Loại hàng <span className="text-red-500">*</span>
                    </th>
                    <th className="px-3 py-2.5 border-r border-b border-gray-200 dark:border-gray-700 text-center min-w-[300px]">
                      Tải trọng <span className="text-red-500">*</span>
                    </th>
                    <th className="px-3 py-2.5 border-r border-b border-gray-200 dark:border-gray-700 text-left min-w-[160px]">
                      Đơn vị quản lý thiết bị
                    </th>
                    <th className="px-3 py-2.5 border-r border-b border-gray-200 dark:border-gray-700 text-left min-w-[130px]">
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

                      {/* Số xe */}
                      <td className="px-2 py-1.5 border-r border-b border-gray-200 dark:border-gray-700">
                        <ComboboxInput
                          options={vehicleValues}
                          value={trip.vehicleNo}
                          onChange={(v) =>
                            handleUpdateTrip(tIdx, { vehicleNo: v })
                          }
                          placeholder="Chọn số xe"
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
                        <LoadStatusRadioGroup
                          direction="row"
                          value={trip.loadStatus}
                          note={trip.loadStatusNote}
                          onChange={(loadStatus, loadStatusNote) =>
                            handleUpdateTrip(tIdx, {
                              loadStatus,
                              loadStatusNote,
                            })
                          }
                          onNoteChange={(loadStatusNote) =>
                            handleUpdateTrip(tIdx, { loadStatusNote })
                          }
                        />
                      </td>

                      {/* Đơn vị quản lý thiết bị (tự động theo số xe) */}
                      <td className="px-2 py-1.5 border-r border-b border-gray-200 dark:border-gray-700">
                        <Input
                          type="text"
                          value={trip.vehicleManagementUnit || ""}
                          readOnly
                          disabled
                          title={trip.vehicleManagementUnit}
                          className="h-8 text-xs bg-gray-100 dark:bg-gray-800 cursor-not-allowed border-gray-200 dark:border-gray-700 truncate"
                        />
                      </td>

                      {/* Chủng loại xe (tự động theo số xe) */}
                      <td className="px-2 py-1.5 border-r border-b border-gray-200 dark:border-gray-700">
                        <Input
                          type="text"
                          value={trip.vehicleType || ""}
                          readOnly
                          disabled
                          title={trip.vehicleType}
                          className="h-8 text-xs bg-gray-100 dark:bg-gray-800 cursor-not-allowed border-gray-200 dark:border-gray-700 truncate"
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
          <FuelSection
            initialFuel={sess.initialFuel}
            receivedFuel={sess.receivedFuel}
            finalFuel={sess.finalFuel}
            fuelUsed={fuelUsed}
            onChange={handleUpdateSession}
            required
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
            isSaving={createReportMutation.isPending}
            onCancel={handleCancel}
            onSaveAndNew={() => handleSave(true)}
            onSave={() => handleSave(false)}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
