// src/components/Modal/ExportTravelLogDialog.tsx
import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  TextField,
  Autocomplete,
  Typography,
  Chip,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers";
import DatePicker from "../../../components/design/DatePicker";
import { AdapterDayjs } from "../../../components/design/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import { Shift } from "../../../types";
import TravelLogService from "../../../services/travelLogService";
import { showErrorAlert } from "../../../components/Alert";
import { parseAxiosError } from "../../../utils/handleApiError";

type ExportMode = "has" | "no" | "both";

interface ExportTravelLogDialogProps {
  open: boolean;
  onClose: () => void;
  type: string; // acceptedProduct
  shifts: Shift[];
}

const ExportTravelLogDialog: React.FC<ExportTravelLogDialogProps> = ({
  open,
  onClose,
  type,
  shifts,
}) => {
  const [exportStart, setExportStart] = useState<Dayjs | null>(
    dayjs(new Date()),
  );
  const [exportEnd, setExportEnd] = useState<Dayjs | null>(dayjs(new Date()));
  const [exportShift, setExportShift] = useState<Shift | null>(null);
  const [exportMode, setExportMode] = useState<ExportMode>("both");

  const resetState = () => {
    setExportStart(dayjs(new Date()));
    setExportEnd(dayjs(new Date()));
    setExportShift(null);
    setExportMode("both");
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const exportExcel = useMutation({
    mutationFn: () =>
      TravelLogService.exportFile({
        type,
        startTime: exportStart ? dayjs(exportStart).format("YYYY-MM-DD") : "",
        endTime: exportEnd ? dayjs(exportEnd).format("YYYY-MM-DD") : "",
        shift: exportShift?._id || "",
        includeHasLog: exportMode === "has" || exportMode === "both",
        includeNoLog: exportMode === "no" || exportMode === "both",
      }),
    onSuccess: () => handleClose(),
    onError: async (error: any) => {
      const message = await parseAxiosError(error);
      showErrorAlert(message);
    },
  });

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md">
      <DialogTitle>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            flexWrap: "wrap",
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Xuất file cung độ
          </Typography>
          <Chip
            label={
              type === "Đất" ? "Vận chuyển đất" : "Vận chuyển than và SPNT"
            }
            color="primary"
            size="medium"
            sx={{ fontWeight: 600, fontSize: "1.1rem" }}
          />
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Từ ngày"
              value={exportStart}
              onChange={setExportStart}
              renderInput={(params) => <TextField {...params} fullWidth />}
            />
            <DatePicker
              label="Đến ngày"
              value={exportEnd}
              onChange={setExportEnd}
              renderInput={(params) => <TextField {...params} fullWidth />}
            />
          </LocalizationProvider>

          <Autocomplete
            options={shifts}
            getOptionLabel={(o: Shift) => `Ca ${o.name}`}
            value={exportShift}
            onChange={(_, v) => setExportShift(v)}
            renderInput={(params) => (
              <TextField {...params} label="Ca (bỏ trống = tất cả)" />
            )}
          />

          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={exportMode === "has"}
                  onChange={() => setExportMode("has")}
                />
              }
              label="Đã có cung độ"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={exportMode === "no"}
                  onChange={() => setExportMode("no")}
                />
              }
              label="Chưa có cung độ"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={exportMode === "both"}
                  onChange={() => setExportMode("both")}
                />
              }
              label="Cả 2"
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Hủy</Button>
        <Button
          variant="contained"
          disabled={exportExcel.isPending}
          onClick={() => exportExcel.mutate()}
        >
          Xuất file
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExportTravelLogDialog;
