import { TextField } from "@mui/material";
import React from "react";
import { DesktopTimePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/vi";
import { useField } from "formik";

export default function FieldTime({
  title,
  name,
  selectedTime,
  setSelectedTime,
  disabled = false,
  onChange,
  size = "medium",
}: {
  title: string;
  name?: string;
  selectedTime?: string;
  setSelectedTime?: React.Dispatch<React.SetStateAction<string>>;
  disabled?: boolean;
  onChange?: (newValue: string) => void;
  size?: "small" | "medium";
}) {
  const isFormikMode = Boolean(name);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [field, , helpers] = isFormikMode
    ? useField(name as string)
    : [undefined, undefined, undefined];

  const value = isFormikMode ? field!.value : selectedTime;

  const setValue = (val: string) => {
    if (isFormikMode && helpers) {
      helpers.setValue(val);
    } else {
      setSelectedTime?.(val);
    }
  };

  // value lưu dạng "HH:mm" (string), khác FieldDate lưu "YYYY-MM-DD"
  const dayjsValue: Dayjs | null = value ? dayjs(value, "HH:mm") : null;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="vi">
      <DesktopTimePicker
        label={title}
        ampm={false}
        inputFormat="HH:mm"
        value={dayjsValue}
        disabled={disabled}
        onChange={(val) => {
          const formatted = val ? dayjs(val).format("HH:mm") : "";
          setValue(formatted);
          onChange?.(formatted);
        }}
        renderInput={(params) => (
          <TextField size={size} {...params} fullWidth />
        )}
      />
    </LocalizationProvider>
  );
}
