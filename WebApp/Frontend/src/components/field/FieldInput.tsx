import { TextField, Tooltip } from "@mui/material";
import { useField } from "formik";
import { useEffect, useState } from "react";
import { useDebounce } from "../../hooks/useDebounce";

interface Props {
  title?: string;
  type?: string;
  name: string;
  disabled?: boolean;
  InputProps?: any;
  InputLabelProps?: any;
  onChange?: (newValue: any) => void;
  onClick?: (e: any) => void;
  multiline?: boolean;
  rows?: number;
  noBorder?: boolean;
  sx?: any;
  placeholder?: string;
  debounce?: boolean;
  slotProps?: any;
  compactError?: boolean; // <-- thêm mới
  size?: "small" | "medium";
}

export default function FieldInput({
  title,
  type = "text",
  name,
  disabled = false,
  InputProps,
  InputLabelProps,
  onChange,
  onClick,
  multiline = false,
  rows = 1,
  noBorder = false,
  sx,
  placeholder,
  debounce = true,
  slotProps,
  compactError = false, // <-- mặc định false, giữ hành vi cũ
  size = "medium",
}: Props) {
  const [field, meta, helpers] = useField(name);
  const [localValue, setLocalValue] = useState(field.value ?? "");
  const debouncedValue = useDebounce(localValue, 300);

  useEffect(() => {
    if (debouncedValue !== field.value) {
      helpers.setValue(debouncedValue);
    }
  }, [debouncedValue]);

  useEffect(() => {
    setLocalValue(field.value ?? "");
  }, [field.value]);

  const hasError = Boolean(meta.touched && meta.error);

  const textField = (
    <TextField
      onClick={(e) => onClick && onClick(e)}
      disabled={disabled}
      fullWidth
      type={type}
      size={size}
      label={title}
      value={localValue}
      multiline={multiline}
      rows={rows}
      placeholder={placeholder}
      onChange={(e) => {
        if (debounce) {
          setLocalValue(e.target.value);
        } else {
          setLocalValue(e.target.value);
          helpers.setValue(e.target.value);
        }
        if (onChange) onChange(e.target.value);
      }}
      error={hasError}
      // compactError: không hiện helperText (dùng tooltip thay thế)
      helperText={compactError ? "" : meta.touched && meta.error}
      InputProps={InputProps}
      InputLabelProps={InputLabelProps}
      sx={{
        ...sx,
        "& .MuiOutlinedInput-root": {
          "& fieldset": {
            border: noBorder ? "none" : undefined,
            borderBottom: noBorder
              ? "1px solid rgba(0, 0, 0, 0.23)"
              : undefined,
            borderRadius: noBorder ? 0 : undefined,
          },
          "&:hover fieldset": {
            borderBottom: noBorder
              ? "1px solid rgba(0, 0, 0, 0.87)"
              : undefined,
          },
          "&.Mui-focused fieldset": {
            borderBottom: noBorder ? "2px solid #1976d2" : undefined,
          },
        },
      }}
    />
  );

  // Chỉ bọc Tooltip khi compactError = true (dùng trong table)
  if (compactError) {
    return (
      <Tooltip
        title={hasError ? meta.error : ""}
        open={hasError}
        arrow
        placement="bottom"
      >
        {/* Tooltip cần 1 child element duy nhất, span để không vỡ layout */}
        <span style={{ display: "block", width: "100%" }}>{textField}</span>
      </Tooltip>
    );
  }

  return textField;
}
