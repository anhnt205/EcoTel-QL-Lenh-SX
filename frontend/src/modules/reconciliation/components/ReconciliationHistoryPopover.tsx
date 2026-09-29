import React, { useState } from "react";
import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useReconciliationHistoryQuery } from "@/modules/reconciliation/services/reconciliation.service";

interface ReconciliationHistoryPopoverProps {
  transportReportTripId?: number;
  excavationReportTripId?: number;
}

const SIDE_LABEL: Record<string, string> = {
  TRANSPORT: "Vận tải",
  EXCAVATION: "Khai thác",
};

const LOAD_LEVEL_LABEL: Record<string, string> = {
  FULL_LOAD: "Đủ tải",
  RODA_2_3: "Roda (2/3)",
};

function formatLoadLevel(type?: string, customValue?: string) {
  if (!type) return "-";
  if (type === "OTHER") return customValue ? `Khác (${customValue})` : "Khác";
  return LOAD_LEVEL_LABEL[type] || type;
}

function formatDateTime(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Icon "i" ở cột Sai lệch — bấm mở danh sách các lần yêu cầu sửa trước, hiện
 * dữ liệu Vận tải/Khai thác cũ tại thời điểm đó (đã lưu vào lịch sử, không
 * phải xóa thật). Chỉ nên render khi có ít nhất 1 lần lịch sử.
 */
export const ReconciliationHistoryPopover: React.FC<
  ReconciliationHistoryPopoverProps
> = ({ transportReportTripId, excavationReportTripId }) => {
  const [open, setOpen] = useState(false);
  const { data: entries, isLoading } = useReconciliationHistoryQuery(
    { transportReportTripId, excavationReportTripId },
    open,
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
          title="Xem lịch sử các lần yêu cầu sửa trước"
          onClick={(e) => e.stopPropagation()}
        >
          <Info className="w-3 h-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 max-h-96 overflow-y-auto text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-bold text-sm mb-2 text-gray-900 dark:text-gray-100">
          Lịch sử yêu cầu sửa
        </div>
        {isLoading && (
          <div className="text-gray-400 py-2">Đang tải...</div>
        )}
        {!isLoading && (!entries || entries.length === 0) && (
          <div className="text-gray-400 py-2">Chưa có lịch sử.</div>
        )}
        <div className="flex flex-col gap-2.5">
          {entries?.map((entry) => (
            <div
              key={entry.id}
              className="rounded-lg border border-gray-200 dark:border-gray-800 p-2.5 bg-gray-50/60 dark:bg-gray-900/40"
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                    entry.side === "TRANSPORT"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                  }`}
                >
                  {SIDE_LABEL[entry.side] || entry.side}
                </span>
                <span className="text-gray-400">
                  {formatDateTime(entry.createdAt)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-gray-700 dark:text-gray-300">
                <div>
                  Loại hàng: <strong>{entry.cargoTypeName || "-"}</strong>
                </div>
                <div>
                  Số chuyến: <strong>{entry.tripCount ?? "-"}</strong>
                </div>
                <div>
                  Tải trọng:{" "}
                  <strong>
                    {formatLoadLevel(entry.loadLevelType, entry.loadLevelCustomValue)}
                  </strong>
                </div>
                <div>
                  Số thẻ lương: <strong>{entry.employeeSalaryCode || "-"}</strong>
                </div>
                <div className="col-span-2">
                  Người nhập chuyến: <strong>{entry.employeeFullName || "-"}</strong>
                </div>
              </div>
              {entry.note && (
                <div className="mt-1.5 pt-1.5 border-t border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400">
                  <span className="font-semibold">Lý do: </span>
                  {entry.note}
                </div>
              )}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
