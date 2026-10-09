import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  TextField,
  InputAdornment,
  IconButton,
  TextFieldProps,
} from "@mui/material";
import { Search as SearchIcon, Close as CloseIcon } from "@mui/icons-material";

export interface SearchInputProps extends Omit<TextFieldProps, "onChange"> {
  /** Giá trị tìm kiếm (từ state bên ngoài) */
  value?: string;
  /** Callback được gọi khi debounce kết thúc hoặc khi Enter/Clear */
  onChange: (value: string) => void;
  /** Thời gian debounce tính bằng ms (mặc định: 350ms) */
  debounceMs?: number;
  /** Vị trí icon kính lúp (mặc định: 'end' theo giao diện chuẩn các danh mục) */
  iconPosition?: "start" | "end";
  /** Hiển thị nút xóa nhanh khi có ký tự (mặc định: true) */
  showClear?: boolean;
}

/**
 * Component ô tìm kiếm tùy chỉnh:
 * - Debounce tự động giảm tải request API khi gõ nhanh.
 * - Input mượt mà, phản hồi ngay lập tức không bị lag.
 * - Nút Xóa nhanh (Clear) và phím Enter để tìm kiếm tức thì.
 * - Đồng bộ linh hoạt khi state cha được reset từ bên ngoài.
 */
export const SearchInput: React.FC<SearchInputProps> = ({
  value = "",
  onChange,
  debounceMs = 350,
  iconPosition = "end",
  showClear = true,
  placeholder = "Tìm kiếm...",
  size = "small",
  fullWidth = true,
  InputProps,
  sx,
  ...rest
}) => {
  const [innerValue, setInnerValue] = useState<string>(value);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastEmittedValueRef = useRef<string>(value);

  // Đồng bộ khi giá trị bên ngoài thay đổi (ví dụ: reset bộ lọc từ trang cha)
  useEffect(() => {
    if (value !== undefined && value !== lastEmittedValueRef.current) {
      lastEmittedValueRef.current = value;
      setInnerValue(value);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [value]);

  // Dọn dẹp timer khi component unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const triggerChange = useCallback(
    (newVal: string) => {
      lastEmittedValueRef.current = newVal;
      onChange(newVal);
    },
    [onChange]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setInnerValue(newVal);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      triggerChange(newVal);
    }, debounceMs);
  };

  const handleClear = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setInnerValue("");
    triggerChange("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      triggerChange(innerValue);
    } else if (e.key === "Escape") {
      handleClear();
    }
    if (rest.onKeyDown) {
      rest.onKeyDown(e);
    }
  };

  const clearButton = showClear && Boolean(innerValue) && (
    <IconButton
      size="small"
      tabIndex={-1}
      aria-label="Xóa tìm kiếm"
      title="Xóa"
      onClick={handleClear}
      edge={iconPosition === "end" ? false : "end"}
      sx={{
        p: 0.25,
        mr: iconPosition === "end" ? 0.5 : 0,
        color: "text.secondary",
        "&:hover": { color: "text.primary" },
      }}
    >
      <CloseIcon sx={{ fontSize: 18 }} />
    </IconButton>
  );

  const searchIconElement = (
    <SearchIcon
      sx={{
        fontSize: size === "small" ? 22 : 24,
        color: "action.active",
      }}
    />
  );

  const startAdornment =
    iconPosition === "start" ? (
      <InputAdornment position="start">
        {searchIconElement}
        {InputProps?.startAdornment}
      </InputAdornment>
    ) : (
      InputProps?.startAdornment
    );

  const endAdornment =
    iconPosition === "end" ? (
      <InputAdornment position="end">
        {clearButton}
        {searchIconElement}
        {InputProps?.endAdornment}
      </InputAdornment>
    ) : (
      <InputAdornment position="end">
        {clearButton}
        {InputProps?.endAdornment}
      </InputAdornment>
    );

  return (
    <TextField
      fullWidth={fullWidth}
      size={size}
      value={innerValue}
      placeholder={placeholder}
      onChange={handleInputChange}
      onKeyDown={handleKeyDown}
      InputProps={{
        ...InputProps,
        startAdornment,
        endAdornment,
      }}
      sx={{
        "& .MuiOutlinedInput-root": {
          backgroundColor: "#fff",
        },
        ...sx,
      }}
      {...rest}
    />
  );
};

export default SearchInput;
