import { useMemo, useState } from "react";
import { Popover } from "@mui/material";
import dayjs, { Dayjs } from "dayjs";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * LỊCH CHỌN NGÀY DÙNG CHUNG của Điều phối — dựng lại đúng mẫu lịch của màn Nhập liệu Khai thác (Thống kê, shadcn Calendar):
 * thanh trên "‹  Tháng 11 ∨  2026 ∨  ›" (2 ô chọn tháng/năm), hàng thứ "Th 2 … CN" xám, số ngày đậm trong ô 32px bo 8px,
 * ngày ngoài tháng xám, hôm nay nền xám nhạt, ngày đang chọn = ô xanh. Tuần bắt đầu Thứ 2.
 * Kiểu CSS: styles/calendar-design.css (.dpc*) — toàn cục vì hộp lịch nằm trong portal ngoài thân trang.
 */
const WEEK = ["Th 2", "Th 3", "Th 4", "Th 5", "Th 6", "Th 7", "CN"];
const YEAR_MIN = 1990;
const YEAR_MAX = 2100;

export interface CalendarPanelProps {
  value: Dayjs | null | undefined;
  /** Gọi với ngày được bấm (đầu ngày, chưa ghép giờ). */
  onSelect: (d: Dayjs) => void;
  minDate?: Dayjs | null;
  maxDate?: Dayjs | null;
}

export function CalendarPanel({ value, onSelect, minDate, maxDate }: CalendarPanelProps) {
  const valid = value && dayjs.isDayjs(value) && value.isValid() ? value : null;
  const [view, setView] = useState<Dayjs>(() => (valid ?? dayjs()).startOf("month"));
  const today = dayjs();

  const cells = useMemo(() => {
    const first = view.startOf("month");
    const lead = (first.day() + 6) % 7; // Thứ 2 = cột đầu
    const rows = Math.ceil((lead + first.daysInMonth()) / 7);
    const start = first.subtract(lead, "day");
    return Array.from({ length: rows * 7 }, (_, i) => start.add(i, "day"));
  }, [view]);

  const years = useMemo(() => {
    const lo = Math.min(YEAR_MIN, view.year());
    const hi = Math.max(YEAR_MAX, view.year());
    return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  }, [view]);

  const isDisabled = (d: Dayjs) =>
    Boolean((minDate && d.isBefore(minDate, "day")) || (maxDate && d.isAfter(maxDate, "day")));

  return (
    <div className="dpc">
      <div className="dpc-head">
        <button type="button" className="dpc-nav dpc-prev" aria-label="Tháng trước" onClick={() => setView(view.subtract(1, "month"))}>
          <ChevronLeft />
        </button>
        <span className="dpc-dd">
          Tháng {view.month() + 1}
          <ChevronDown />
          <select aria-label="Chọn tháng" value={view.month()} onChange={(e) => setView(view.month(Number(e.target.value)))}>
            {Array.from({ length: 12 }, (_, m) => (
              <option key={m} value={m}>
                Tháng {m + 1}
              </option>
            ))}
          </select>
        </span>
        <span className="dpc-dd">
          {view.year()}
          <ChevronDown />
          <select aria-label="Chọn năm" value={view.year()} onChange={(e) => setView(view.year(Number(e.target.value)))}>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </span>
        <button type="button" className="dpc-nav dpc-next" aria-label="Tháng sau" onClick={() => setView(view.add(1, "month"))}>
          <ChevronRight />
        </button>
      </div>
      <div className="dpc-wd">
        {WEEK.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      {Array.from({ length: cells.length / 7 }, (_, r) => (
        <div className="dpc-row" key={r}>
          {cells.slice(r * 7, r * 7 + 7).map((d) => {
            const outside = d.month() !== view.month();
            const selected = Boolean(valid && d.isSame(valid, "day"));
            const cls = ["dpc-day", outside ? "out" : "", selected ? "sel" : "", !selected && d.isSame(today, "day") ? "today" : ""]
              .filter(Boolean)
              .join(" ");
            return (
              <button type="button" key={d.format("YYYY-MM-DD")} className={cls} disabled={isDisabled(d)} onClick={() => onSelect(d.startOf("day"))}>
                {d.date()}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** Ghép ngày mới được chọn vào giá trị cũ (giữ nguyên giờ phút như MUI DatePicker). */
export function mergeDate(prev: Dayjs | null | undefined, picked: Dayjs): Dayjs {
  if (prev && dayjs.isDayjs(prev) && prev.isValid()) {
    return prev.year(picked.year()).month(picked.month()).date(picked.date());
  }
  return picked;
}

/** Hộp lịch nổi (Popover) bám vào `anchorEl`. */
export function CalendarPopover({
  anchorEl,
  open,
  onClose,
  value,
  onChange,
  minDate,
  maxDate,
}: {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  value: Dayjs | null | undefined;
  onChange: (v: Dayjs) => void;
  minDate?: Dayjs | null;
  maxDate?: Dayjs | null;
}) {
  return (
    <Popover
      open={open && Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      transformOrigin={{ vertical: "top", horizontal: "left" }}
      PaperProps={{ className: "dpc-paper", style: { marginTop: 4 } }}
    >
      <CalendarPanel
        value={value}
        minDate={minDate}
        maxDate={maxDate}
        onSelect={(d) => {
          onChange(mergeDate(value, d));
          onClose();
        }}
      />
    </Popover>
  );
}

export default CalendarPanel;
