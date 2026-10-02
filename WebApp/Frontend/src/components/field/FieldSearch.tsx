import { IconButton, TextField } from "@mui/material";
import { useEffect, useState } from "react";
import { useDebounce } from "../../hooks/useDebounce";
import { Close, Search } from "@mui/icons-material";

export default function FieldSearch({
  searchValue,
  setSearchValue,
  titleSearch,
}: {
  searchValue?: string;
  setSearchValue?: (value: string) => void;
  titleSearch: string;
}) {
  // Local state để input mượt, debounce để set vào formik
  const [localValue, setLocalValue] = useState(searchValue || "");
  const debouncedValue = useDebounce(localValue, 500);

  useEffect(() => {
    if (!setSearchValue) return;
    setSearchValue(debouncedValue || "");
  }, [debouncedValue]);

  useEffect(() => {
    setLocalValue(searchValue || "");
  }, [searchValue]);
  return (
    <TextField
      // label={titleSearch}
      placeholder={titleSearch}
      fullWidth
      size="small"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      InputProps={{
        startAdornment: <Search sx={{ mr: 0.5 }} />,
        endAdornment: searchValue ? (
          <IconButton onClick={() => setSearchValue?.("")} size="small">
            <Close fontSize="small" />
          </IconButton>
        ) : null,
      }}
      sx={{
        "& .MuiOutlinedInput-root": {
          borderRadius: "10px",
        },
      }}
    />
  );
}
