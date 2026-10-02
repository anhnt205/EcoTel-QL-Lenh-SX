import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Typography,
  LinearProgress,
  TextField,
} from "@mui/material";
import { Save, Cancel } from "@mui/icons-material";
import dayjs, { Dayjs } from "dayjs";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  showConfirmAlert,
  showErrorAlert,
  showSuccessAlert,
} from "../../components/Alert";
import api from "../../config/api.config";
import CustomDataGrid from "../../components/Table/CustomDataGrid";

interface HistoryTimeSlot {
  id: string; // Dùng UUID hoặc một giá trị duy nhất
  startTime: Date | null;
  endTime: Date | null;
}
interface Props {
  materials: any[];
  devicemodels: any[];
  initialSlot: HistoryTimeSlot | null;
  timeSlots: HistoryTimeSlot[];
  onCancel: () => void;
  initValue: any[];
}

const ModelEditor: React.FC<Props> = ({
  materials,
  devicemodels,
  initialSlot,
  timeSlots,
  onCancel,
  initValue,
}) => {
  const [slot, setSlot] = useState<any | null>({
    id: Date.now().toString(),
    startTime: new Date(),
    endTime: new Date(),
  });
  const [rows, setRows] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (initialSlot) {
      setSlot(initialSlot);
    }
  }, [initialSlot]);

  const generateEmptyRows = () => {
    return materials.map((m: any) => {
      const row: any = {
        id: m._id,
        material: m.name,
        acceptedProduct: m.acceptedProduct,
        density: m.density,
        dryDensity: m.dryDensity,
      };
      devicemodels.forEach((d: any) => {
        const record = initValue.find(
          (mdl: any) => mdl.material === m._id && mdl.deviceModel === d._id,
        );
        row[d._id] = record ? record.value : "";
      });
      return row;
    });
  };

  useEffect(() => {
    setRows(generateEmptyRows());
  }, [materials, devicemodels, initValue]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await api.post("/models/bulk-upsert", {
        rows,
        startTime: dayjs
          .utc(dayjs(slot.startTime).format("YYYY-MM-DD"))
          .toDate(),
        endTime: dayjs.utc(dayjs(slot.endTime).format("YYYY-MM-DD")).toDate(),
        initSlot: initialSlot
          ? {
              startTime: dayjs(initialSlot.startTime).toISOString(),
              endTime: dayjs(initialSlot.endTime).toISOString(),
            }
          : null,
      });
    },
    onMutate: () => setIsUploading(true),
    onSuccess: () => {
      setIsUploading(false);
      showSuccessAlert("Lưu thành công");
      setRows(generateEmptyRows());
      queryClient.invalidateQueries({ queryKey: ["models"] });
      onCancel();
    },
    onError: (err: any) => {
      setIsUploading(false);
      showErrorAlert(err.response?.data?.message || "Lưu thất bại");
    },
  });

  const columns = [
    { id: "material", label: "Vật liệu", width: 120, sticky: true },
    {
      id: "acceptedProduct",
      label: "Sản phẩm nghiệm thu",
      width: 140,
      sticky: true,
    },
    ...devicemodels.map((d: any) => ({
      id: d._id,
      label: d.name,
      width: 120,
      renderCell: (params: any) => (
        <input
          type="number"
          style={{
            width: "100%",
            border: "none",
            textAlign: "center",
            outline: "none",
            background: "transparent",
          }}
          value={params.value ?? ""}
          onChange={(e) => {
            const newValue = e.target.value;
            setRows((prev) =>
              prev.map((r) =>
                r.id === params.row.id ? { ...r, [params.field]: newValue } : r,
              ),
            );
          }}
        />
      ),
    })),
  ];

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        {initValue.length ? "Chỉnh sửa mô hình" : "Tạo mới mô hình"}
      </Typography>
      {isUploading && <LinearProgress />}
      <Box display="flex" gap={2} mb={2}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            label="Ngày bắt đầu"
            inputFormat="DD/MM/YYYY"
            value={slot.startTime ? dayjs(slot.startTime) : null}
            onChange={(val) =>
              setSlot((prev: any) => ({
                ...prev,
                startTime: val?.toDate() ?? null,
              }))
            }
            renderInput={(params) => <TextField {...params} fullWidth />}
          />
          <DatePicker
            label="Ngày kết thúc"
            inputFormat="DD/MM/YYYY"
            value={slot.endTime ? dayjs(slot.endTime) : null}
            onChange={(val) =>
              setSlot((prev: any) => ({
                ...prev,
                endTime: val?.toDate() ?? null,
              }))
            }
            renderInput={(params) => <TextField {...params} fullWidth />}
          />
        </LocalizationProvider>
      </Box>

      <Box sx={{ mb: 2 }}>
        <CustomDataGrid
          rows={rows}
          defaultColumns={columns}
          rowCount={rows.length}
          isLoading={false}
          onSelectionChange={() => {}}
          sx={{
            '& .MuiDataGrid-columnHeader[data-field="material"]': {
              position: "sticky",
              left: 0,
              zIndex: 20,
              backgroundColor: "inherit",
            },
            '& .MuiDataGrid-cell[data-field="material"]': {
              position: "sticky",
              left: 0,
              zIndex: 19,
              backgroundColor: "inherit !important",
            },
            '& .MuiDataGrid-columnHeader[data-field="acceptedProduct"]': {
              position: "sticky",
              left: 100,
              zIndex: 20,
              backgroundColor: "inherit",
              boxShadow: "2px 0 4px rgba(0,0,0,0.1)",
            },
            '& .MuiDataGrid-cell[data-field="acceptedProduct"]': {
              position: "sticky",
              left: 100,
              zIndex: 19,
              backgroundColor: "inherit !important",
              boxShadow: "2px 0 4px rgba(0,0,0,0.1)",
            },
          }}
        />
      </Box>

      <Box display="flex" justifyContent="flex-end" gap={2}>
        <Button
          onClick={() => {
            setRows(generateEmptyRows());
            onCancel();
          }}
        >
          Hủy
        </Button>
        <Button
          variant="contained"
          disabled={saveMutation.isPending}
          onClick={async () => {
            const key = `${dayjs.utc(dayjs(slot.startTime).format("YYYY-MM-DD")).toISOString()}-${dayjs.utc(dayjs(slot.endTime).format("YYYY-MM-DD")).toISOString()}`;
            const keyMap = timeSlots.map((i) => i.id);

            if (keyMap.includes(key) && initValue.length === 0) {
              const confirm = await showConfirmAlert(
                "Khoảng thời gian đã tồn tại. Nếu tiếp tục dữ liệu sẽ bị ghi đè, bạn có muốn tiếp tục?",
              );
              if (confirm) {
                saveMutation.mutate();
              }
              onCancel();
            }
            saveMutation.mutate();
          }}
        >
          {initValue.length ? "Cập nhật" : "Thêm mới"}
        </Button>
      </Box>
    </Box>
  );
};

export default ModelEditor;
