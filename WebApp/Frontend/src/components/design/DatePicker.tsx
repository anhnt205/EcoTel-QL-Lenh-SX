import { useRef, useState } from "react";
import { DatePicker as MuiDatePicker } from "@mui/x-date-pickers";
import type { DatePickerProps } from "@mui/x-date-pickers";
import type { Dayjs } from "dayjs";
import { CalendarPopover } from "./CalendarPanel";

/**
 * Thay thế "DatePicker" của MUI X cho TOÀN BỘ Điều phối: dùng đúng API cũ (value, onChange, inputFormat, renderInput,
 * disabled, minDate…) nên các trang chỉ đổi dòng import — nhưng hộp lịch bật ra là CalendarPanel (đúng mẫu lịch của
 * Nhập liệu Khai thác: chọn tháng/năm bằng 2 ô thả xuống, số ngày đậm 32px…).
 * Ô nhập (gõ tay dd/MM/yyyy) vẫn là của MUI. Riêng bộ chọn THÁNG/NĂM (views không có "day", vd. Báo cáo) giữ nguyên MUI.
 */
export default function DatePicker<TInputDate = any, TDate = Dayjs>(allProps: DatePickerProps<TInputDate, TDate>) {
  const props: any = allProps;
  const { views, value, onChange, minDate, maxDate, disabled, readOnly, renderInput, open: _o, onOpen: _on, onClose: _oc, ...rest } = props;
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLElement | null>(null);

  if (Array.isArray(views) && !views.includes("day")) {
    return <MuiDatePicker {...props} />;
  }

  return (
    <>
      <MuiDatePicker
        {...rest}
        views={views}
        value={value}
        onChange={onChange}
        minDate={minDate}
        maxDate={maxDate}
        disabled={disabled}
        readOnly={readOnly}
        open={false}
        onOpen={() => {
          if (!disabled && !readOnly) setOpen(true);
        }}
        onClose={() => {}}
        renderInput={(p: any) => {
          const origRef = p.ref;
          return renderInput({
            ...p,
            ref: (node: HTMLElement | null) => {
              anchorRef.current = node;
              if (typeof origRef === "function") origRef(node);
              else if (origRef) origRef.current = node;
            },
          });
        }}
      />
      <CalendarPopover
        anchorEl={anchorRef.current}
        open={open}
        onClose={() => setOpen(false)}
        value={value}
        minDate={minDate}
        maxDate={maxDate}
        onChange={(v) => onChange?.(v, undefined)}
      />
    </>
  );
}
