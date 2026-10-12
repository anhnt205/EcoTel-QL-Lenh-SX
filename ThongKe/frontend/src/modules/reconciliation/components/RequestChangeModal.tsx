import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FileEdit,
  Send,
  Truck,
  HardHat,
  Trash2,
  Check,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
} from "lucide-react";
import type {
  DepartmentTarget,
  ReconciliationItem,
} from "@/modules/dataentry/types/thong-ke";

export interface RequestChangeRecord {
  item: ReconciliationItem;
  note: string;
  targetTransport: boolean;
  targetMining: boolean;
}

interface RequestChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ReconciliationItem[];
  onSubmit: (
      requests: {
        rowId: string;
        item: ReconciliationItem;
        note: string;
        target: DepartmentTarget;
      }[],
  ) => void;
}

// ponytail: dùng ĐÚNG logic khớp/sai lệch như bảng ngoài (ReconciliationComparisonTables /
// ReconciliationPage.isMatchedItem) — không tự tính lại theo cách khác để tránh lệch kết quả
// giữa modal và bảng chính.
const isMatched = (item: ReconciliationItem) => {
  const t = item.transportRecord;
  const m = item.miningRecord;
  if (!t || !m) return false;
  const sameTrips = (t.tripCount ?? 0) === (m.tripCount ?? 0);
  const sameCargo =
      (t.cargoType || "").trim().toLowerCase() ===
      (m.material || "").trim().toLowerCase();
  return sameTrips && sameCargo;
};

const formatLoadStatus = (record?: { loadStatus?: string; loadStatusNote?: string } | null) => {
  if (!record || !record.loadStatus) return "-";
  const note = (record as any).loadStatusNote;
  if (record.loadStatus === "Khác" && note) {
    return `Khác (${note})`;
  }
  return record.loadStatus;
};

export const RequestChangeModal: React.FC<RequestChangeModalProps> = ({
                                                                         isOpen,
                                                                         onClose,
                                                                         items,
                                                                         onSubmit,
                                                                       }) => {
  const [records, setRecords] = useState<RequestChangeRecord[]>([]);

  useEffect(() => {
    if (isOpen && items && items.length > 0) {
      setRecords(
          items.map((item) => ({
            item,
            note: item.requestNote || "",
            targetTransport: true,
            targetMining: true,
          })),
      );
    } else if (!isOpen) {
      setRecords([]);
    }
  }, [isOpen, items]);

  if (!isOpen || records.length === 0) return null;

  const handleUpdateRecord = (
      index: number,
      updater: (prev: RequestChangeRecord) => RequestChangeRecord,
  ) => {
    setRecords((prev) =>
        prev.map((rec, i) => (i === index ? updater(rec) : rec)),
    );
  };

  const handleRemoveRecord = (index: number) => {
    setRecords((prev) => prev.filter((_, i) => i !== index));
  };

  const isFormValid =
      records.length > 0 &&
      records.every(
          (r) =>
              r.note.trim().length > 0 && (r.targetTransport || r.targetMining),
      );

  const handleSubmit = () => {
    if (!isFormValid) return;

    const requests = records.map((r) => {
      let target: DepartmentTarget = "BOTH";
      if (r.targetTransport && !r.targetMining) target = "TRANSPORT";
      else if (!r.targetTransport && r.targetMining) target = "MINING";

      return {
        rowId: r.item.id,
        item: r.item,
        note: r.note.trim(),
        target,
      };
    });

    onSubmit(requests);
    onClose();
  };

  return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[95vw] w-[95vw] max-h-[92vh] h-[92vh] flex flex-col p-0 overflow-hidden border border-slate-300 dark:border-gray-800 shadow-2xl rounded-2xl bg-white dark:bg-gray-950 text-slate-900 dark:text-gray-100">
          {/* ══ HEADER BAR ═════════════════════════════════════════════════════ */}
          <div className="p-4 sm:p-5 pb-3 bg-white dark:bg-gray-950 border-b border-slate-200 dark:border-gray-800 shrink-0 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 shrink-0">
                <FileEdit className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-gray-100 flex items-center gap-3.5">
                  Yêu cầu chỉnh sửa số liệu đối chiếu
                  <Badge
                      variant="outline"
                      className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900 text-xs px-2.5 py-0.5 font-bold"
                  >
                    {records.length} bản ghi
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-slate-900 dark:text-gray-200 font-medium mt-1">
                  Xem chi tiết toàn bộ số liệu 2 bên (Vận tải vs Khai thác) và gửi thông báo yêu cầu điều chỉnh
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* ══ BODY: LIST OF COMPREHENSIVE RECORD CARDS ═══════════════════════ */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50/60 dark:bg-gray-950/50">
            {records.map((rec, idx) => {
              const item = rec.item;
              const t = item.transportRecord;
              const m = item.miningRecord;
              const matched = isMatched(item);

              // Chuẩn hóa hiển thị Ca (tránh trùng lặp "Ca Ca 2")
              const shiftRaw = String(item.commonKey?.shift || "1");
              const shiftNum = shiftRaw.replace(/^ca\s+/i, "");

              return (
                  <div
                      key={item.id}
                      className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 shadow-sm transition-all space-y-4 text-slate-900 dark:text-gray-100"
                  >
                    {/* 1. Header Card: General Metadata & Department Target Toggles */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-gray-800">
                      <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm">
                    <span className="font-extrabold text-base text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-gray-800 px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-gray-700">
                      Xe {item.commonKey?.vehicleNo || "N/A"}
                    </span>
                        <span className="font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-gray-700">
                      Ca {shiftNum}
                    </span>
                        <span className="text-slate-900 dark:text-slate-100 font-bold">
                      Ngày: {item.commonKey?.day}/{item.commonKey?.month}/2026
                    </span>

                        {(t?.operatorName || m?.operatorName) && (
                            <span className="text-slate-900 dark:text-slate-100 font-semibold hidden md:inline">
                        • Lái xe:{" "}
                              <strong className="text-slate-900 dark:text-slate-100 font-extrabold">
                          {t?.operatorName || m?.operatorName}
                        </strong>{" "}
                                (Thẻ: {t?.operatorBadgeNo || m?.operatorBadgeNo || "-"})
                      </span>
                        )}

                        {(t?.operatorUnit || m?.operatorUnit) && (
                            <span className="text-slate-900 dark:text-slate-100 hidden lg:inline font-semibold">
                        • Đơn vị: {t?.operatorUnit || m?.operatorUnit}
                      </span>
                        )}

                        {(t?.vehicleType || m?.vehicleType) && (
                            <span className="text-slate-900 dark:text-slate-100 hidden xl:inline font-semibold">
                        • Chủng loại: {t?.vehicleType || m?.vehicleType}
                      </span>
                        )}

                        {matched ? (
                            <Badge
                                variant="outline"
                                className="bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 gap-1 text-xs sm:text-sm font-bold"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                              Trùng khớp
                            </Badge>
                        ) : (
                            <Badge
                                variant="outline"
                                className="bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 gap-1 text-xs sm:text-sm font-extrabold"
                            >
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                              Có sai lệch
                            </Badge>
                        )}
                      </div>

                      {/* Chọn bên nhận yêu cầu sửa — CHECKBOX (chủ dự án chốt
                          2026-09-09): tick Vận tải, tick Khai thác, hoặc tick
                          cả 2. Mặc định tick sẵn cả 2. Phải tick ít nhất 1 bên
                          mới gửi được (xem isFormValid). */}
                      <div className="flex items-center gap-3 ml-auto">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mr-1">
                      Gửi đến:
                    </span>
                        <label
                            className="flex items-center gap-1.5 cursor-pointer select-none h-8 px-3 rounded-lg border border-slate-300 dark:border-gray-700 bg-slate-50 dark:bg-gray-800/60 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
                            title="Gửi yêu cầu cho Phân xưởng Vận tải"
                        >
                          <Checkbox
                              checked={rec.targetTransport}
                              onCheckedChange={(checked) =>
                                  handleUpdateRecord(idx, (prev) => ({
                                    ...prev,
                                    targetTransport: !!checked,
                                  }))
                              }
                              className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                          />
                          <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                            Vận tải
                          </span>
                        </label>

                        <label
                            className="flex items-center gap-1.5 cursor-pointer select-none h-8 px-3 rounded-lg border border-slate-300 dark:border-gray-700 bg-slate-50 dark:bg-gray-800/60 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
                            title="Gửi yêu cầu cho Công trường Khai thác"
                        >
                          <Checkbox
                              checked={rec.targetMining}
                              onCheckedChange={(checked) =>
                                  handleUpdateRecord(idx, (prev) => ({
                                    ...prev,
                                    targetMining: !!checked,
                                  }))
                              }
                              className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                          />
                          <HardHat className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                            Khai thác
                          </span>
                        </label>

                        {records.length > 1 && (
                            <button
                                type="button"
                                onClick={() => handleRemoveRecord(idx)}
                                className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                                title="Bỏ bản ghi này khỏi danh sách gửi"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                      </div>
                    </div>

                    {/* 2. Bảng đối chiếu - CHỮ ĐEN RÕ RÀNG (TEXT-SLATE-900) */}
                    <div className="border border-slate-200 dark:border-gray-800 rounded-xl overflow-x-auto shadow-2xs">
                      <table className="w-full text-xs sm:text-sm border-collapse">
                        <thead>
                        {/* Tiêu đề nhóm (Hàng 1) */}
                        <tr className="border-b border-slate-200 dark:border-gray-800 bg-slate-100 dark:bg-gray-800">
                          <th
                              colSpan={5}
                              className="px-3 py-2.5 text-slate-900 dark:text-slate-100 font-extrabold text-center border-r border-slate-200 dark:border-gray-700 text-sm sm:text-base tracking-wide"
                          >
                            <div className="flex items-center justify-center gap-2">
                              <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              <span>SỐ LIỆU BÁO CHUYẾN (VẬN TẢI)</span>
                            </div>
                          </th>
                          <th
                              colSpan={5}
                              className="px-3 py-2.5 text-slate-900 dark:text-slate-100 font-extrabold text-center border-r border-slate-200 dark:border-gray-700 text-sm sm:text-base tracking-wide"
                          >
                            <div className="flex items-center justify-center gap-2">
                              <HardHat className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              <span>SỐ LIỆU BÁO CHUYẾN (KHAI THÁC)</span>
                            </div>
                          </th>
                          <th
                              colSpan={2}
                              className="px-3 py-2.5 text-slate-900 dark:text-slate-100 font-extrabold text-center text-sm sm:text-base tracking-wide"
                          >
                            KẾT QUẢ ĐỐI CHIẾU
                          </th>
                        </tr>
                        {/* Tiêu đề cột (Hàng 2) */}
                        <tr className="border-b border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/60">
                          <th className="px-2.5 py-2 text-slate-900 dark:text-slate-100 font-bold text-center border-r border-slate-200 dark:border-gray-700 whitespace-nowrap text-xs sm:text-sm">
                            Loại hàng
                          </th>
                          <th className="px-2.5 py-2 text-slate-900 dark:text-slate-100 font-bold text-center border-r border-slate-200 dark:border-gray-700 whitespace-nowrap text-xs sm:text-sm">
                            Số chuyến
                          </th>
                          <th className="px-2.5 py-2 text-slate-900 dark:text-slate-100 font-bold text-center border-r border-slate-200 dark:border-gray-700 whitespace-nowrap text-xs sm:text-sm">
                            Tải trọng
                          </th>
                          <th className="px-2.5 py-2 text-slate-900 dark:text-slate-100 font-bold text-center border-r border-slate-200 dark:border-gray-700 whitespace-nowrap text-xs sm:text-sm">
                            Số thẻ lương
                          </th>
                          <th className="px-2.5 py-2 text-slate-900 dark:text-slate-100 font-bold text-center border-r border-slate-200 dark:border-gray-700 whitespace-nowrap text-xs sm:text-sm">
                            Người nhập chuyến
                          </th>
                          <th className="px-2.5 py-2 text-slate-900 dark:text-slate-100 font-bold text-center border-r border-slate-200 dark:border-gray-700 whitespace-nowrap text-xs sm:text-sm">
                            Loại hàng
                          </th>
                          <th className="px-2.5 py-2 text-slate-900 dark:text-slate-100 font-bold text-center border-r border-slate-200 dark:border-gray-700 whitespace-nowrap text-xs sm:text-sm">
                            Số chuyến
                          </th>
                          <th className="px-2.5 py-2 text-slate-900 dark:text-slate-100 font-bold text-center border-r border-slate-200 dark:border-gray-700 whitespace-nowrap text-xs sm:text-sm">
                            Tải trọng
                          </th>
                          <th className="px-2.5 py-2 text-slate-900 dark:text-slate-100 font-bold text-center border-r border-slate-200 dark:border-gray-700 whitespace-nowrap text-xs sm:text-sm">
                            Số thẻ lương
                          </th>
                          <th className="px-2.5 py-2 text-slate-900 dark:text-slate-100 font-bold text-center border-r border-slate-200 dark:border-gray-700 whitespace-nowrap text-xs sm:text-sm">
                            Người nhập chuyến
                          </th>
                          <th className="px-2.5 py-2 text-slate-900 dark:text-slate-100 font-bold text-center border-r border-slate-200 dark:border-gray-700 whitespace-nowrap text-xs sm:text-sm">
                            Khớp
                          </th>
                          <th className="px-2.5 py-2 text-slate-900 dark:text-slate-100 font-bold text-center whitespace-nowrap text-xs sm:text-sm">
                            Sai lệch
                          </th>
                        </tr>
                        </thead>
                        <tbody>
                        <tr className="bg-white dark:bg-gray-900">
                          <td className="px-2.5 py-2.5 text-center border-r border-slate-200 dark:border-gray-800 whitespace-nowrap text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {t?.cargoType || "-"}
                          </td>
                          <td className="px-2.5 py-2.5 text-center border-r border-slate-200 dark:border-gray-800 whitespace-nowrap text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100">
                            {t?.tripCount ?? "-"}
                          </td>
                          <td className="px-2.5 py-2.5 text-center border-r border-slate-200 dark:border-gray-800 whitespace-nowrap text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {formatLoadStatus(t)}
                          </td>
                          <td className="px-2.5 py-2.5 text-center border-r border-slate-200 dark:border-gray-800 whitespace-nowrap text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {t?.operatorBadgeNo || "-"}
                          </td>
                          <td className="px-2.5 py-2.5 text-center border-r border-slate-200 dark:border-gray-800 whitespace-nowrap text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {t?.employeeFullName ?? t?.createdByName ?? t?.operatorName ?? t?.createdBy ?? "-"}
                          </td>
                          <td className="px-2.5 py-2.5 text-center border-r border-slate-200 dark:border-gray-800 whitespace-nowrap text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {m?.material || "-"}
                          </td>
                          <td className="px-2.5 py-2.5 text-center border-r border-slate-200 dark:border-gray-800 whitespace-nowrap text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100">
                            {m?.tripCount ?? "-"}
                          </td>
                          <td className="px-2.5 py-2.5 text-center border-r border-slate-200 dark:border-gray-800 whitespace-nowrap text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {formatLoadStatus(m)}
                          </td>
                          <td className="px-2.5 py-2.5 text-center border-r border-slate-200 dark:border-gray-800 whitespace-nowrap text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {m?.operatorBadgeNo || "-"}
                          </td>
                          <td className="px-2.5 py-2.5 text-center border-r border-slate-200 dark:border-gray-800 whitespace-nowrap text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {m?.employeeFullName ?? m?.createdByName ?? m?.operatorName ?? m?.createdBy ?? "-"}
                          </td>
                          <td className="px-2.5 py-2.5 text-center border-r border-slate-200 dark:border-gray-800">
                            {matched ? (
                                <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 flex items-center justify-center mx-auto font-bold">
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </div>
                            ) : (
                                <span className="text-slate-400 font-bold">-</span>
                            )}
                          </td>
                          <td className="px-2.5 py-2.5 text-center">
                            {!matched ? (
                                <div className="w-5 h-5 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400 flex items-center justify-center mx-auto">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                </div>
                            ) : (
                                <span className="text-slate-400 font-bold">-</span>
                            )}
                          </td>
                        </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* 3. Reason / Note input for this record */}
                    <div className="space-y-1.5">
                      <label className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span>Nội dung / Lý do yêu cầu chỉnh sửa cho xe {item.commonKey?.vehicleNo}:</span>
                      </label>
                      <Input
                          value={rec.note}
                          onChange={(e) =>
                              handleUpdateRecord(idx, (prev) => ({
                                ...prev,
                                note: e.target.value,
                              }))
                          }
                          placeholder="Nhập chi tiết lý do yêu cầu điều chỉnh..."
                          className="h-9 text-xs sm:text-sm text-slate-900 dark:text-slate-100 font-semibold bg-slate-50/50 dark:bg-gray-950 border-slate-300 dark:border-gray-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                      />
                      {!rec.targetTransport && !rec.targetMining && (
                          <span className="text-[11px] text-rose-600 font-bold block pt-0.5">
                      * Vui lòng chọn ít nhất 1 bên nhận (Vận tải hoặc Khai thác) ở trên
                    </span>
                      )}
                    </div>
                  </div>
              );
            })}
          </div>

          {/* ══ FOOTER BAR ═════════════════════════════════════════════════════ */}
          <DialogFooter className="p-4 sm:p-5 bg-white dark:bg-gray-950 border-t border-slate-200 dark:border-gray-800 flex items-center justify-between gap-3 shrink-0">
          <span className="text-xs sm:text-sm text-slate-900 dark:text-slate-100 font-semibold hidden sm:inline">
            Tổng cộng:{" "}
            <strong className="text-slate-900 dark:text-slate-100 font-extrabold">
              {records.length} bản ghi
            </strong>{" "}
            sẽ được gửi yêu cầu chỉnh sửa
          </span>

            <div className="flex items-center gap-3 ml-auto">
              <Button
                  variant="outline"
                  onClick={onClose}
                  className="h-9 px-4 text-xs sm:text-sm font-bold border-slate-300 dark:border-gray-700 text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-gray-800"
              >
                Hủy bỏ
              </Button>

              <Button
                  onClick={handleSubmit}
                  disabled={!isFormValid}
                  className="h-9 px-6 text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white gap-2 shadow-xs transition-all rounded-lg disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                Gửi yêu cầu chỉnh sửa ({records.length})
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
};