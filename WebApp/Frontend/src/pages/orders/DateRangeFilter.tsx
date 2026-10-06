import { useState } from "react";
import { Box, Button, Popover, TextField } from "@mui/material";
import { CalendarMonth, ExpandMore } from "@mui/icons-material";
import dayjs, { Dayjs } from "dayjs";

const LINE = "#e5e9f0";
const INK = "#0f172a";
const MUTED = "#64748b";

/**
 * Nút chọn khoảng ngày kiểu "01/10/2026 – 06/10/2026": bấm mở khung có các lựa chọn nhanh
 * (Hôm nay, Hôm qua, 7 ngày qua, Tháng này) và 2 ô ngày. Giá trị trả về là đầu ngày / cuối ngày
 * (máy chủ cũng tự đặt endTime về 23:59:59 nên an toàn với mọi múi giờ).
 */
export default function DateRangeFilter({
  startTime,
  endTime,
  onChange,
}: {
  startTime: Dayjs | null;
  endTime: Dayjs | null;
  onChange: (from: Dayjs | null, to: Dayjs | null) => void;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const today = dayjs();
  const presets = [
    { label: "Hôm nay", from: today.startOf("day"), to: today.endOf("day") },
    {
      label: "Hôm qua",
      from: today.subtract(1, "day").startOf("day"),
      to: today.subtract(1, "day").endOf("day"),
    },
    {
      label: "7 ngày qua",
      from: today.subtract(6, "day").startOf("day"),
      to: today.endOf("day"),
    },
    { label: "Tháng này", from: today.startOf("month"), to: today.endOf("day") },
  ];
  const isActive = (p: { from: Dayjs; to: Dayjs }) =>
    !!startTime &&
    !!endTime &&
    dayjs(startTime).isSame(p.from, "day") &&
    dayjs(endTime).isSame(p.to, "day");

  const label =
    startTime || endTime
      ? `${startTime ? dayjs(startTime).format("DD/MM/YYYY") : "…"} – ${
          endTime ? dayjs(endTime).format("DD/MM/YYYY") : "…"
        }`
      : "Tất cả thời gian";

  return (
    <>
      <Button
        onClick={(e) => setAnchor(e.currentTarget)}
        startIcon={<CalendarMonth sx={{ color: MUTED }} />}
        endIcon={<ExpandMore sx={{ color: MUTED }} />}
        sx={{
          flex: "1 1 230px",
          minWidth: 210,
          height: 40,
          px: 1.5,
          justifyContent: "space-between",
          textTransform: "none",
          fontWeight: 500,
          fontSize: 13.5,
          color: INK,
          bgcolor: "#fff",
          border: `1px solid ${LINE}`,
          borderRadius: "8px",
          "&:hover": { bgcolor: "#f8fafc", borderColor: "#cbd5e1" },
          "& .MuiButton-startIcon": { mr: 0 },
        }}
      >
        <Box component="span" sx={{ flex: 1, textAlign: "left", ml: 1 }}>
          {label}
        </Box>
      </Button>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        PaperProps={{ sx: { p: 2, width: 340, borderRadius: 2 } }}
      >
        <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mb: 1.5 }}>
          {presets.map((p) => (
            <Button
              key={p.label}
              size="small"
              variant={isActive(p) ? "contained" : "outlined"}
              onClick={() => onChange(p.from, p.to)}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              {p.label}
            </Button>
          ))}
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.25 }}>
          <TextField
            size="small"
            type="date"
            label="Từ ngày"
            InputLabelProps={{ shrink: true }}
            value={startTime ? dayjs(startTime).format("YYYY-MM-DD") : ""}
            onChange={(e) =>
              onChange(
                e.target.value ? dayjs(e.target.value).startOf("day") : null,
                endTime,
              )
            }
          />
          <TextField
            size="small"
            type="date"
            label="Đến ngày"
            InputLabelProps={{ shrink: true }}
            value={endTime ? dayjs(endTime).format("YYYY-MM-DD") : ""}
            onChange={(e) =>
              onChange(
                startTime,
                e.target.value ? dayjs(e.target.value).endOf("day") : null,
              )
            }
          />
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1.5 }}>
          <Button
            size="small"
            onClick={() => onChange(null, null)}
            sx={{ textTransform: "none" }}
          >
            Tất cả thời gian
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={() => setAnchor(null)}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Xong
          </Button>
        </Box>
      </Popover>
    </>
  );
}
