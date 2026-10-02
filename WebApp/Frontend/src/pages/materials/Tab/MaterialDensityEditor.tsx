import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Typography,
  LinearProgress,
  TextField,
} from "@mui/material";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  showConfirmAlert,
  showErrorAlert,
  showSuccessAlert,
} from "../../../components/Alert";
import CustomDataGrid from "../../../components/Table/CustomDataGrid";
import api from "../../../config/api.config";

interface Props {
  materials: any[];
  initialSlot: any;
  timeSlots: any[];
  onCancel: () => void;
}

const MaterialDensityEditor: React.FC<Props> = ({
  materials,
  initialSlot,
  timeSlots,
  onCancel,
}) => {
  const queryClient = useQueryClient();

  const [slot, setSlot] = useState<any>(
    initialSlot || { startTime: new Date(), endTime: new Date() },
  );

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 🟦 Khởi tạo bảng tỷ trọng
  useEffect(() => {
    // CASE: TẠO MỚI (initialSlot = null)
    if (!initialSlot) {
      setRows(
        materials.map((m: any) => ({
          id: m._id,
          material: m.name,
          acceptedProduct: m.acceptedProduct,
          density: "",
          dryDensity: "",
        })),
      );
      return; // DỪNG TẠI ĐÂY
    }

    // CASE: SỬA (initialSlot != null)
    setRows(
      materials.map((m: any) => ({
        id: m._id,
        material: m.name,
        acceptedProduct: m.acceptedProduct,
        density: m.density ?? "",
        dryDensity: m.dryDensity ?? "",
      })),
    );
  }, [materials, initialSlot]);

  // 🟦 Mutation save
  const saveMutation = useMutation({
    mutationFn: async (force: boolean) => {
      await api.post("/materials/save-timeslot", {
        startTime: dayjs
          .utc(dayjs(slot.startTime).format("YYYY-MM-DD"))
          .toDate(),
        endTime: dayjs.utc(dayjs(slot.endTime).format("YYYY-MM-DD")).toDate(),
        rows,
        initSlot: initialSlot
          ? {
              startTime: dayjs(initialSlot.startTime).toISOString(),
              endTime: dayjs(initialSlot.endTime).toISOString(),
            }
          : null,
        force,
      });
    },

    onSuccess: () => {
      showSuccessAlert("Lưu thành công");
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      onCancel();
    },

    onError: (error: any) =>
      showErrorAlert(error.response?.data?.message || error.message || "Lỗi"),
  });

  // 🟦 Columns
  const columns = [
    { id: "material", label: "Vật liệu", width: 150, sticky: true },
    { id: "acceptedProduct", label: "Sản phẩm NT", width: 160, sticky: true },

    {
      id: "density",
      label: "Tỷ trọng quy ẩm",
      width: 120,
      renderCell: ({ row, value }: any) => (
        <input
          value={value}
          type="number"
          onChange={(e) => {
            const newVal = e.target.value;
            setRows((prev) =>
              prev.map((r) =>
                r.id === row.id ? { ...r, density: newVal } : r,
              ),
            );
          }}
          style={{
            width: "100%",
            border: "none",
            textAlign: "center",
            outline: "none",
            background: "transparent",
          }}
        />
      ),
    },

    {
      id: "dryDensity",
      label: "Tỷ trọng không quy ẩm",
      width: 120,
      renderCell: ({ row, value }: any) => (
        <input
          value={value}
          type="number"
          onChange={(e) => {
            const newVal = e.target.value;
            setRows((prev) =>
              prev.map((r) =>
                r.id === row.id ? { ...r, dryDensity: newVal } : r,
              ),
            );
          }}
          style={{
            width: "100%",
            border: "none",
            textAlign: "center",
            outline: "none",
            background: "transparent",
          }}
        />
      ),
    },
  ];

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        {initialSlot ? "Chỉnh sửa tỷ trọng" : "Tạo mới tỷ trọng"}
      </Typography>

      {loading && <LinearProgress />}

      {/* CHỌN NGÀY */}
      <Box display="flex" gap={2} mb={2}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            label="Ngày bắt đầu"
            value={dayjs(slot.startTime)}
            onChange={(v) =>
              setSlot((s: any) => ({ ...s, startTime: v?.toISOString() }))
            }
            renderInput={(params) => <TextField {...params} fullWidth />}
          />

          <DatePicker
            label="Ngày kết thúc"
            value={dayjs(slot.endTime)}
            onChange={(v) =>
              setSlot((s: any) => ({ ...s, endTime: v?.toISOString() }))
            }
            renderInput={(params) => <TextField {...params} fullWidth />}
          />
        </LocalizationProvider>
      </Box>

      {/* BẢNG NHẬP TỶ TRỌNG */}
      <Box sx={{ mb: 2 }}>
        <CustomDataGrid
          rows={rows}
          defaultColumns={columns}
          rowCount={rows.length}
        />
      </Box>

      {/* BUTTON */}
      <Box display="flex" justifyContent="flex-end" gap={2}>
        <Button onClick={onCancel}>Hủy</Button>

        <Button
          variant="contained"
          onClick={async () => {
            const key = `${dayjs.utc(dayjs(slot.startTime).format("YYYY-MM-DD")).toISOString()}-${dayjs.utc(dayjs(slot.endTime).format("YYYY-MM-DD")).toISOString()}`;
            const existingKeys = timeSlots.map((t) => t.id);

            // == CASE TẠO MỚI TRÙNG ==
            if (!initialSlot && existingKeys.includes(key)) {
              const confirm = await showConfirmAlert(
                "Khoảng thời gian đã tồn tại. Ghi đè?",
              );
              if (!confirm.isConfirmed) return;
              return saveMutation.mutate(true); // *** FORCE OVERWRITE ***
            }

            // == TRƯỜNG HỢP KHÁC ==
            saveMutation.mutate(false);
          }}
        >
          {initialSlot ? "Cập nhật" : "Thêm mới"}
        </Button>
      </Box>
    </Box>
  );
};

export default MaterialDensityEditor;
