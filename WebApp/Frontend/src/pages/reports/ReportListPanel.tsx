import { useMemo, useState } from "react";
import {
  Box,
  ButtonBase,
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { ChevronRight, MenuOpen, Search } from "@mui/icons-material";

export interface ReportListItem {
  name: string;
  no: number;
}

// Bỏ dấu + đ/Đ để tìm "bao cao chuyen" vẫn ra "Báo cáo chuyến".
const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d");

const LINE = "#e5e9f0";

export default function ReportListPanel({
  items,
  selected,
  onSelect,
  onHide,
}: {
  items: ReportListItem[];
  selected: string;
  onSelect: (name: string) => void;
  onHide: () => void;
}) {
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = fold(query.trim());
    return q ? items.filter((i) => fold(i.name).includes(q)) : items;
  }, [items, query]);

  return (
    <Box
      sx={{
        border: `1px solid ${LINE}`,
        borderRadius: 2,
        bgcolor: "#fff",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: { md: "sticky" },
        top: { md: 76 },
        maxHeight: { md: "calc(100vh - 92px)" },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 1.5,
          py: 1.25,
          borderBottom: `1px solid ${LINE}`,
        }}
      >
        <Typography sx={{ fontWeight: 800, fontSize: 14 }}>
          Danh sách báo cáo
        </Typography>
        <Box
          sx={{
            px: 0.75,
            borderRadius: 1,
            bgcolor: "brand.chipBg",
            color: "brand.chipText",
            fontSize: 11,
            fontWeight: 700,
            lineHeight: "18px",
          }}
        >
          {items.length}
        </Box>
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Ẩn danh sách">
          <IconButton size="small" onClick={onHide} aria-label="Ẩn danh sách báo cáo">
            <MenuOpen fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ p: 1.25, borderBottom: `1px solid ${LINE}` }}>
        <TextField
          size="small"
          fullWidth
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm tên, mẫu báo cáo..."
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ fontSize: 18, color: "#94a3b8" }} />
              </InputAdornment>
            ),
            sx: { fontSize: 13, bgcolor: "#f8fafc" },
          }}
        />
      </Box>

      <Box sx={{ overflowY: "auto", p: 0.75, display: "flex", flexDirection: "column", gap: "2px" }}>
        {visible.length === 0 && (
          <Typography sx={{ p: 2, fontSize: 13, color: "#94a3b8", textAlign: "center" }}>
            Không có biểu mẫu phù hợp
          </Typography>
        )}
        {visible.map((item) => {
          const active = item.name === selected;
          return (
            <ButtonBase
              key={item.name}
              onClick={() => onSelect(item.name)}
              aria-current={active ? "true" : undefined}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                gap: 1.25,
                width: "100%",
                textAlign: "left",
                px: 1,
                py: 0.9,
                borderRadius: 1.5,
                color: active ? "brand.strong" : "#1e293b",
                bgcolor: active ? "brand.tint" : "transparent",
                "&:hover": { bgcolor: active ? "brand.tint" : "#f1f5f9" },
              }}
            >
              <Box
                component="span"
                sx={{
                  flexShrink: 0,
                  minWidth: 24,
                  textAlign: "center",
                  fontSize: 10.5,
                  fontWeight: 700,
                  lineHeight: "18px",
                  fontVariantNumeric: "tabular-nums",
                  border: "1px solid",
                  borderColor: active ? "brand.border" : "#dbe2ea",
                  borderRadius: "5px",
                  bgcolor: active ? "#fff" : "#f8fafc",
                  color: active ? "brand.strong" : "#64748b",
                }}
              >
                {String(item.no).padStart(2, "0")}
              </Box>
              <Typography
                component="span"
                sx={{
                  flex: 1,
                  fontSize: 13,
                  lineHeight: 1.35,
                  fontWeight: active ? 700 : 500,
                }}
              >
                {item.name}
              </Typography>
              {active && <ChevronRight sx={{ fontSize: 18, flexShrink: 0 }} />}
            </ButtonBase>
          );
        })}
      </Box>
    </Box>
  );
}
