import { Box } from "@mui/material";
import { StatusOrderEnum } from "../../enums";

export interface OrderStatusMeta {
  key: string;
  label: string;
  color: string; // chữ trên nền nhạt
  bg: string; // nền nhạt (nhãn trong bảng, ô đếm)
  dot: string; // chấm màu
  solid: string; // nền đặc khi nút lọc đang chọn
}

// Thứ tự = thứ tự nút lọc trạng thái. Nhãn dùng chung cho bộ lọc, bảng và chi tiết lệnh.
export const ORDER_STATUS_META: OrderStatusMeta[] = [
  {
    key: StatusOrderEnum.PENDING,
    label: "Chưa nhận",
    color: "#475569",
    bg: "#f1f3f6",
    dot: "#94a3b8",
    solid: "#64748b",
  },
  {
    key: StatusOrderEnum.INPROGRESS,
    label: "Đã nhận",
    color: "#1d4ed8",
    bg: "#e6efff",
    dot: "#3b82f6",
    solid: "#2563eb",
  },
  {
    key: StatusOrderEnum.WARNING,
    label: "Lỗi",
    color: "#c2410c",
    bg: "#fff1e0",
    dot: "#f97316",
    solid: "#ea580c",
  },
  {
    key: StatusOrderEnum.COMPLETED,
    label: "Đã kết thúc",
    color: "#15803d",
    bg: "#e3f6e8",
    dot: "#22c55e",
    solid: "#16a34a",
  },
  {
    key: StatusOrderEnum.CANCEL,
    label: "Đã hủy",
    color: "#7e22ce",
    bg: "#f3e8ff",
    dot: "#a855f7",
    solid: "#9333ea",
  },
];

// Trạng thái lạ rơi về "Đã hủy" — đúng như bảng cũ xử lý nhánh else cuối cùng.
export const orderStatusMeta = (status?: string): OrderStatusMeta =>
  ORDER_STATUS_META.find((s) => s.key === status) ??
  ORDER_STATUS_META[ORDER_STATUS_META.length - 1];

export const StatusPill = ({ status }: { status?: string }) => {
  const meta = orderStatusMeta(status);
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.75,
        px: 1.25,
        height: 24,
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: "nowrap",
        color: meta.color,
        bgcolor: meta.bg,
      }}
    >
      <Box
        component="span"
        sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: meta.dot }}
      />
      {meta.label}
    </Box>
  );
};
