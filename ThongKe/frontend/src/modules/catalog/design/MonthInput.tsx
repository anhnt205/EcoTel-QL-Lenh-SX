import { useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Cột "Thời gian" của bảng nhập Mô hình / Tỷ trọng tính theo THÁNG/NĂM: "Từ tháng" = ngày 1 của tháng, "Đến tháng" = ngày cuối của tháng —
 * khoảng sau nối tiếp khoảng trước đúng vào ngày 1 tháng kế (dữ liệu vẫn lưu dạng ngày yyyy-MM-dd như cũ).
 */

const pad = (n: number) => String(n).padStart(2, "0");

/** Ngày cuối của tháng `yyyy-MM`. */
export const endOfMonth = (ym: string): string => {
  const [y, m] = ym.split("-").map(Number);
  return `${y}-${pad(m)}-${pad(new Date(Date.UTC(y, m, 0)).getUTCDate())}`;
};

/** Chia khoảng [from, to] (yyyy-MM-dd) thành hai khoảng liền kề theo THÁNG; null nếu khoảng chỉ có 1 tháng. */
export const splitByMonth = (from: string, to: string): { firstTo: string; secondFrom: string } | null => {
  const fy = Number(from.slice(0, 4));
  const fm = Number(from.slice(5, 7));
  const ty = Number(to.slice(0, 4));
  const tm = Number(to.slice(5, 7));
  const n = (ty * 12 + tm) - (fy * 12 + fm) + 1;
  if (!(n >= 2)) return null;
  const k = Math.ceil(n / 2); // số tháng của khoảng đầu
  const last = fy * 12 + (fm - 1) + k - 1; // chỉ số tháng cuối của khoảng đầu
  const ly = Math.floor(last / 12);
  const lm = (last % 12) + 1;
  const next = last + 1;
  return { firstTo: endOfMonth(`${ly}-${pad(lm)}`), secondFrom: `${Math.floor(next / 12)}-${pad((next % 12) + 1)}-01` };
};

const MONTHS_VI = Array.from({ length: 12 }, (_, i) => `Tháng ${i + 1}`);

/** yyyy-MM-dd → chỉ số tháng tuyệt đích (năm*12 + tháng-1); null nếu không hợp lệ. */
const idxOf = (iso: string): number | null => (/^\d{4}-\d{2}/.test(iso) ? Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7)) - 1 : null);
const labelOf = (idx: number) => `${pad((idx % 12) + 1)}/${Math.floor(idx / 12)}`;

/**
 * MỘT ô chọn khoảng thời gian theo tháng (lịch tiếng Việt): bấm ô → mở bảng 12 tháng; bấm lần 1 chọn "Từ tháng", bấm lần 2 chọn "Đến tháng"
 * (chọn tháng sớm hơn tháng đầu thì tự đảo lại). Hiện dạng `MM/yyyy – MM/yyyy`. `onChange` nhận cả hai ngày (đầu tháng đầu, cuối tháng cuối).
 */
export function MonthRangePicker({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const fi = idxOf(from);
  const ti = idxOf(to);
  const [viewYear, setViewYear] = useState(() => (fi != null ? Math.floor(fi / 12) : new Date().getFullYear()));
  /** Đang chờ bấm lần 2 (chọn "Đến tháng"): chỉ số tháng đã chọn ở lần 1. */
  const [anchor, setAnchor] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  const label = fi != null && ti != null ? `${labelOf(fi)} – ${labelOf(ti)}` : "Chọn thời gian";

  // khoảng hiển thị tô màu: đang chọn dở thì theo (lần 1 → vị trí rê chuột), không thì theo giá trị hiện có
  const rangeLo = anchor != null ? Math.min(anchor, hover ?? anchor) : fi;
  const rangeHi = anchor != null ? Math.max(anchor, hover ?? anchor) : ti;

  const pick = (idx: number) => {
    if (anchor == null) {
      setAnchor(idx);
      setHover(idx);
      return;
    }
    const lo = Math.min(anchor, idx);
    const hi = Math.max(anchor, idx);
    onChange(`${Math.floor(lo / 12)}-${pad((lo % 12) + 1)}-01`, endOfMonth(`${Math.floor(hi / 12)}-${pad((hi % 12) + 1)}`));
    setAnchor(null);
    setHover(null);
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        setAnchor(null);
        setHover(null);
        if (o && fi != null) setViewYear(Math.floor(fi / 12));
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-8 w-full min-w-0 justify-start gap-1.5 rounded-[8px] border-[#cfdbec] bg-white px-2.5 text-left text-xs font-normal",
            fi == null && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-gray-500" />
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="z-[200] w-[264px] p-3" align="start" sideOffset={4}>
        <div className="mb-2 flex items-center justify-between">
          <button type="button" className="rounded p-1 hover:bg-gray-100" aria-label="Năm trước" onClick={() => setViewYear((y) => y - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold">Năm {viewYear}</span>
          <button type="button" className="rounded p-1 hover:bg-gray-100" aria-label="Năm sau" onClick={() => setViewYear((y) => y + 1)}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-2 text-center text-xs text-gray-500">{anchor == null ? "Chọn tháng bắt đầu" : `Từ ${labelOf(anchor)} — chọn tháng kết thúc`}</p>
        <div className="grid grid-cols-3 gap-1">
          {MONTHS_VI.map((name, m) => {
            const idx = viewYear * 12 + m;
            const inRange = rangeLo != null && rangeHi != null && idx >= rangeLo && idx <= rangeHi;
            const edge = idx === rangeLo || idx === rangeHi;
            return (
              <button
                key={name}
                type="button"
                onClick={() => pick(idx)}
                onMouseEnter={() => anchor != null && setHover(idx)}
                className={cn(
                  "rounded-md px-1 py-2 text-xs transition-colors",
                  edge ? "bg-[#0954c7] font-semibold text-white" : inRange ? "bg-[#dde8f7] text-[#16294a]" : "hover:bg-gray-100",
                )}
              >
                {name}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
