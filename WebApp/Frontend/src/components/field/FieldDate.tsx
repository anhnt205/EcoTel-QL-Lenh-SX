import { TextField } from "@mui/material";
import React from "react";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/vi";
import { useField } from "formik";

export default function FieldDate({
  title,
  name,
  selectedDate,
  setSelectedDate,
  disabled = false,
  onChange,
  size = "medium",
}: {
  title: string;
  name?: string;
  selectedDate?: string;
  setSelectedDate?: React.Dispatch<React.SetStateAction<string>>;
  disabled?: boolean;
  onChange?: (newValue: any) => void;
  size?: "small" | "medium";
}) {
  const isFormikMode = Boolean(name);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [field, , helpers] = isFormikMode
    ? useField(name as string)
    : [undefined, undefined, undefined];

  const value = isFormikMode ? field!.value : selectedDate;

  const setValue = (val: string) => {
    if (isFormikMode && helpers) {
      helpers.setValue(val);
    } else {
      setSelectedDate?.(val);
    }
  };

  const dayjsValue: Dayjs | null = value ? dayjs(value) : null;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="vi">
      <DatePicker
        label={title}
        inputFormat="DD/MM/YYYY"
        views={["year", "month", "day"]}
        openTo="day"
        value={dayjsValue}
        disabled={disabled}
        onChange={(val) => {
          setValue(val ? dayjs(val).format("YYYY-MM-DD") : "");
          onChange?.(val ? dayjs(val).format("YYYY-MM-DD") : "");
        }}
        renderInput={(params) => (
          <TextField size={size} {...params} fullWidth />
        )}
      />
    </LocalizationProvider>
  );
}
