import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Typography,
  TextField,
  MenuItem,
  Menu,
  ListItemText,
  Switch,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Breadcrumbs,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Settings,
} from "@mui/icons-material";
import { FormikProvider, useFormik } from "formik";
import { Shift } from "../../types";
import { LocalizationProvider, TimePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import {
  showConfirmAlert,
  showErrorAlert,
  showSuccessAlert,
} from "../../components/Alert";
import { useAtom } from "jotai";
import { userAtom } from "../../atoms/userAtoms";
import { shiftValidationSchema } from "../../utils/validation";
import ShiftService from "../../services/shiftService";
import { RoleEnum } from "../../enums";
import CustomDataGrid from "../../components/Table/CustomDataGrid";
import FieldInput from "../../components/field/FieldInput";

const Shifts: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [selectedShifts, setSelectedShifts] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [user] = useAtom(userAtom);

  const defaultColumns = [
    { id: "name", label: "Ca", width: 50 },
    { id: "startTime", label: "Thời gian bắt đầu" },
    { id: "endTime", label: "Thời gian kết thúc" },
    {
      id: "edit",
      label: "Sửa",
      width: 60,
      renderCell: (params: { row: any }) => (
        <IconButton
          color="primary"
          disabled={user?.role !== RoleEnum.ADMIN}
          onClick={async () => {
            if (user?.role !== RoleEnum.ADMIN) return;
            if (open) {
              const result = await showConfirmAlert(
                "Bạn đang cập nhật một mục. Nếu tiếp tục chỉnh sửa, dữ liệu hiện tại sẽ bị ghi đè. Bạn có chắc chắn muốn tiếp tục?",
              );
              if (result.isConfirmed) {
                handleOpen(params.row);
              }
            } else {
              handleOpen(params.row);
            }
          }}
        >
          <EditIcon />
        </IconButton>
      ),
      sortable: false,
      filterable: false,
    },
  ];

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  useEffect(() => {
    if (user) {
      let initialColumns: string[];

      if (user.role === RoleEnum.ADMIN) {
        initialColumns = defaultColumns.map((i) => i.id);
      } else {
        initialColumns = defaultColumns
          .filter((i) => i.id !== "edit")
          .map((i) => i.id);
      }

      setVisibleColumns(initialColumns);
    }
  }, [user, defaultColumns]);

  const handleToggleColumn = (columnId: string) => {
    setVisibleColumns((prev) =>
      prev.includes(columnId)
        ? prev.filter((id) => id !== columnId)
        : [...prev, columnId],
    );
  };

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ["shifts"],
    queryFn: () => ShiftService.getAll({}),
  });

  const createMutation = useMutation({
    mutationFn: ShiftService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      showSuccessAlert("Thêm ca làm việc thành công");
      handleClose();
    },
    onError: (error: any) => {
      showErrorAlert(error.response.data.message || error.message || "Lỗi");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ShiftService.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      showSuccessAlert("Cập nhật ca làm việc thành công");
      handleClose();
    },
    onError: (error: any) => {
      showErrorAlert(error.response.data.message || error.message || "Lỗi");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ShiftService.delete,
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      setSelectedShifts([]);
      showSuccessAlert(message || "Xóa thành công");
      handleClose();
    },
    onError: (error: any) => {
      showErrorAlert(error.response.data.message || error.message || "Lỗi");
    },
  });

  const formik = useFormik({
    initialValues: {
      name: undefined as number | undefined,
      startTime: "",
      endTime: "",
    },
    validationSchema: shiftValidationSchema,
    onSubmit: (values) => {
      if (selectedShift) {
        updateMutation.mutate({ ...values, _id: selectedShift._id });
      } else {
        createMutation.mutate(values);
      }
    },
  });

  const handleOpen = (shift?: Shift) => {
    if (shift) {
      setSelectedShift(shift);
      formik.setValues(shift);
    } else {
      setSelectedShift(null);
      formik.resetForm();
    }
    setExpanded(true);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedShift(null);
    setExpanded(false);
    formik.resetForm();
  };

  const handleDelete = () => {
    if (selectedShifts.length === 0) {
      showErrorAlert("Không tìm thấy bản ghi cần xóa");
      return;
    }
    showConfirmAlert(`Bạn có muốn xóa ${selectedShifts.length} bản ghi?`).then(
      (result) => {
        if (result.isConfirmed) {
          deleteMutation.mutate(selectedShifts);
        }
      },
    );
  };

  return (
    <Box>
      <Breadcrumbs aria-label="breadcrumb">
        <Typography>Danh mục</Typography>
        <Typography>Ca làm việc</Typography>
      </Breadcrumbs>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mt: 3,
          mb: 3,
        }}
      >
        <Typography variant="h3" color={"blue"}>
          Ca làm việc
        </Typography>
      </Box>
      <Accordion expanded={expanded}>
        <AccordionSummary
          expandIcon={<></>}
          aria-controls="panel1-content"
          id="panel1-header"
        >
          {user?.role === RoleEnum.ADMIN && (
            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpen()}
              >
                Thêm
              </Button>
              <Button
                variant="contained"
                startIcon={<DeleteIcon />}
                color="error"
                onClick={handleDelete}
              >
                Xóa
              </Button>
            </Box>
          )}
        </AccordionSummary>
        <AccordionDetails>
          <DialogTitle>
            {selectedShift ? "Sửa ca làm việc" : "Thêm ca làm việc"}
          </DialogTitle>
          <DialogContent>
            <FormikProvider value={formik}>
              <Box
                component="form"
                onSubmit={formik.handleSubmit}
                sx={{ mt: 2 }}
              >
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <FieldInput
                    type="number"
                    name="name"
                    title="Ca làm việc"
                    size="small"
                  />
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <TimePicker
                      label="Bắt đầu"
                      ampm={false}
                      value={
                        formik.values.startTime
                          ? dayjs(formik.values.startTime, "HH:mm")
                          : null
                      }
                      onChange={(value) => {
                        formik.setFieldValue(
                          "startTime",
                          value?.format("HH:mm") || "",
                        );
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          fullWidth
                          size="small"
                          error={
                            formik.touched.startTime &&
                            Boolean(formik.errors.startTime)
                          }
                          helperText={
                            formik.touched.startTime && formik.errors.startTime
                          }
                        />
                      )}
                    />

                    <TimePicker
                      label="Kết thúc"
                      ampm={false}
                      value={
                        formik.values.endTime
                          ? dayjs(formik.values.endTime, "HH:mm")
                          : null
                      }
                      onChange={(value) => {
                        formik.setFieldValue(
                          "endTime",
                          value?.format("HH:mm") || "",
                        );
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          fullWidth
                          size="small"
                          error={
                            formik.touched.endTime &&
                            Boolean(formik.errors.endTime)
                          }
                          helperText={
                            formik.touched.endTime && formik.errors.endTime
                          }
                        />
                      )}
                    />
                  </LocalizationProvider>
                </Box>
              </Box>
            </FormikProvider>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Hủy</Button>
            <Button onClick={() => formik.submitForm()} variant="contained">
              {selectedShift ? "Cập nhật" : "Thêm mới"}
            </Button>
          </DialogActions>
        </AccordionDetails>
      </Accordion>
      <Box display="flex" alignItems="center" sx={{ mb: 2, mt: 2 }}>
        <Typography variant="h4">Bảng ca làm việc</Typography>
        <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
          <Settings sx={{ fontSize: 30 }} />
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          sx={{ maxHeight: 400 }}
        >
          {defaultColumns.map((col) => (
            <MenuItem key={col.id} onClick={() => handleToggleColumn(col.id)}>
              <Switch checked={visibleColumns.includes(col.id)} />
              <ListItemText primary={col.label} />
            </MenuItem>
          ))}
        </Menu>
      </Box>

      <Paper sx={{ width: "100%", overflowX: "auto", mt: 3 }}>
        <CustomDataGrid
          rows={shifts}
          defaultColumns={defaultColumns.filter((c) =>
            visibleColumns.includes(c.id),
          )}
          rowCount={shifts.length}
          isAdmin={user?.role === RoleEnum.ADMIN}
          onEdit={handleOpen}
          onSelectionChange={setSelectedShifts}
          isLoading={isLoading}
        />
      </Paper>
    </Box>
  );
};

export default Shifts;
