import { useRef, useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import type { Dayjs } from "dayjs";
import { CalendarPopover } from "./CalendarPanel";

/**
 * Ô lọc ngày giống hệt ô "Thời gian bắt đầu / kết thúc" của màn Nhập liệu Khai thác (Thống kê, DatePickerString):
 * nhãn nhỏ phía trên, nút trắng 144×36 bo 7px, biểu tượng lịch (lucide) bên trái, chữ "dd/MM/yyyy" Arial 12px;
 * bấm vào ô mở hộp lịch CalendarPanel (cùng mẫu lịch). Kiểu CSS: styles/catalog-design.css (.date-field / .df-trigger).
 */
export default function DateFilterField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Dayjs | null;
  onChange: (v: Dayjs | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement | null>(null);
  const has = Boolean(value && value.isValid());
  return (
    <div className="date-field">
      <span className="date-field-label">{label}</span>
      <button ref={ref} type="button" className={"df-trigger" + (open ? " open" : "")} onClick={() => setOpen(true)}>
        <CalendarIcon size={14} />
        <span className={has ? "" : "ph"}>{has ? value!.format("DD/MM/YYYY") : "Chọn ngày"}</span>
      </button>
      <CalendarPopover anchorEl={ref.current} open={open} onClose={() => setOpen(false)} value={value} onChange={(v) => onChange(v)} />
    </div>
  );
}
