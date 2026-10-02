import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
  TextField,
  MenuItem,
  Menu,
  Switch,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  InputAdornment,
  LinearProgress,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Settings,
  Search,
  UploadFile,
  Download,
} from "@mui/icons-material";
import { FieldArray, FormikProvider, useFormik } from "formik";
import { Material } from "../../../types";
import {
  showConfirmAlert,
  showErrorAlert,
  showSuccessAlert,
} from "../../../components/Alert";
import { useAtom } from "jotai";
import { userAtom } from "../../../atoms/userAtoms";
import { materialValidationSchema } from "../../../utils/validation";
import MaterialService from "../../../services/materialService";
import { RoleEnum } from "../../../enums";
import CustomDataGrid from "../../../components/Table/CustomDataGrid";
import { parseAxiosError } from "../../../utils/handleApiError";
import dayjs from "dayjs";
import FieldInput from "../../../components/field/FieldInput";
import FieldAutoCompleted from "../../../components/field/FieldAutoCompleted";
import FieldSearch from "../../../components/field/FieldSearch";

interface HistoryTimeSlot {
  id: string;
  startTime: Date | null;
  endTime: Date | null;
}

export default function MaterialType() {
  const [open, setOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(
    null,
  );
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [value, setValue] = useState("");
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [user] = useAtom(userAtom);

  const [selectedTimeSlot, setSelectedTimeSlot] =
    useState<HistoryTimeSlot | null>(null);
  const [timeSlots, setTimeSlots] = useState<HistoryTimeSlot[]>([]);

  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0,
  });

  const formRef = useRef<HTMLDivElement>(null);

  const defaultColumns = [
    { id: "name", label: "Tên vật liệu", align: "left" as "left" },
    { id: "density", label: "Tỷ trọng quy ẩm" },
    { id: "dryDensity", label: "Tỷ trọng không quy ẩm" },
    { id: "acceptedProduct", label: "Sản phẩm nghiệm thu" },
    {
      id: "startTime",
      label: "Thời gian bắt đầu",
      renderCell: (params: { row: any }) =>
        params.row?.startTime
          ? dayjs(params.row?.startTime).format("DD/MM/YYYY")
          : "",
    },
    {
      id: "endTime",
      label: "Thời gian kết thúc",
      renderCell: (params: { row: any }) =>
        params.row?.endTime
          ? dayjs(params.row?.endTime).format("DD/MM/YYYY")
          : "",
    },
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
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);

  const handleToggleColumn = (id: string) => {
    setVisibleColumns((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const {
    data: materials = { data: [], results: 0, totalDocs: 0 },
    isLoading,
  } = useQuery({
    queryKey: ["materials", value, selectedTimeSlot, paginationModel],
    queryFn: () =>
      MaterialService.getAll({
        name: value,
        startTime: selectedTimeSlot?.startTime
          ? selectedTimeSlot?.startTime.toISOString()
          : "",
        endTime: selectedTimeSlot?.endTime
          ? selectedTimeSlot?.endTime.toISOString()
          : "",
        page: paginationModel.page + 1,
        pageSize: paginationModel.pageSize,
      }),
    placeholderData: (previousData) => previousData,
  });

  useEffect(() => {
    if (materials.results > 0) {
      const allHistory: HistoryTimeSlot[] = [];
      const seen = new Set();

      materials.data.forEach((m: any) => {
        m.valueHistory?.forEach((h: any) => {
          const key = `${h.startTime}-${h.endTime}`;
          if (!seen.has(key)) {
            seen.add(key);
            allHistory.push({
              id: key,
              startTime: h.startTime ? new Date(h.startTime) : null,
              endTime: h.endTime ? new Date(h.endTime) : null,
            });
          }
        });
      });

      // sắp xếp giảm dần
      allHistory.sort((a, b) => {
        const aTime = a.startTime ? a.startTime.getTime() : 0;
        const bTime = b.startTime ? b.startTime.getTime() : 0;
        return bTime - aTime;
      });

      const normalizeTime = (slot: HistoryTimeSlot) => {
        const start = slot.startTime ? slot.startTime.getTime() : 0;
        let end = slot.endTime ? slot.endTime.getTime() : Infinity;

        if (slot.endTime) {
          const endDate = new Date(end);
          if (endDate.getHours() === 0 && endDate.getMinutes() === 0) {
            end += 24 * 60 * 60 * 1000 - 1;
          }
        }
        return { start, end };
      };

      setTimeSlots(allHistory);

      if (selectedTimeSlot === null) {
        const now = Date.now();
        let nearest: HistoryTimeSlot | null = null;

        // 1️⃣ lấy tất cả slot bao phủ now
        const active = allHistory.filter((s) => {
          const { start, end } = normalizeTime(s);
          return now >= start && now <= end;
        });

        if (active.length > 0) {
          // 2️⃣ chọn slot có start gần nhất
          nearest = active.reduce((latest, s) => {
            const start = s.startTime?.getTime() ?? 0;
            const latestStart = latest?.startTime?.getTime() ?? 0;
            return start > latestStart ? s : latest;
          });
        } else {
          // 3️⃣ chọn slot gần nhất về thời gian
          nearest = allHistory.reduce(
            (closest, s) => {
              const diff = Math.abs(now - (s.startTime?.getTime() ?? 0));
              const closestDiff = Math.abs(
                now - (closest?.startTime?.getTime() ?? 0),
              );
              return diff < closestDiff ? s : closest;
            },
            null as HistoryTimeSlot | null,
          );
        }

        if (nearest) setSelectedTimeSlot(nearest);
      }
    }
  }, [materials, selectedTimeSlot]);

  // Hàm xử lý khi chọn một slot lịch sử
  const handleSelectSlot = (slot: HistoryTimeSlot) => {
    setSelectedTimeSlot(slot);
  };

  const createMutation = useMutation({
    mutationFn: MaterialService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      showSuccessAlert("Thêm vật liệu thành công");
      handleClose();
    },
    onError: (error: any) => {
      showErrorAlert(error.response.data.message || error.message || "Lỗi");
    },
  });

  const updateMutation = useMutation({
    mutationFn: MaterialService.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      showSuccessAlert("Cập nhật vật liệu thành công");
      handleClose();
    },
    onError: (error: any) => {
      showErrorAlert(error.response.data.message || error.message || "Lỗi");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: MaterialService.delete,
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      setSelectedMaterials([]);
      showSuccessAlert(message || "Xóa thành công");
      handleClose();
    },
    onError: (error: any) => {
      showErrorAlert(error.response.data.message || error.message || "Lỗi");
    },
  });

  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const importFile = useMutation({
    mutationFn: (formData: FormData) =>
      MaterialService.importFile(formData, setProgress),
    onMutate: () => {
      setIsUploading(true);
      setProgress(0); // Reset tiến trình khi bắt đầu
    },
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      setIsUploading(false);
      showSuccessAlert(message || "Import thành công");
    },
    onError: (error: any) => {
      setIsUploading(false);
      showErrorAlert(error.response?.data?.message || "Lỗi khi import");
    },
  });

  const exportExcel = useMutation({
    mutationFn: MaterialService.exportFile,
    onSuccess: () => {},
    onError: async (error: any) => {
      const message = await parseAxiosError(error);
      showErrorAlert(message);
    },
  });

  const formik = useFormik({
    initialValues: {
      name: "",
      acceptedProduct: "",
    },
    // enableReinitialize: true,
    validationSchema: materialValidationSchema,
    onSubmit: (values) => {
      const material: Partial<Material> = {
        name: values.name,
        acceptedProduct: values.acceptedProduct,
      };
      if (selectedMaterial) {
        updateMutation.mutate({ ...material, _id: selectedMaterial._id });
      } else {
        createMutation.mutate({ ...material });
      }
    },
  });

  const handleOpen = (material?: Material) => {
    if (material) {
      setSelectedMaterial(material);
      formik.setValues({
        name: material.name,
        acceptedProduct: material.acceptedProduct ?? "",
      });
    } else {
      setSelectedMaterial(null);
      formik.resetForm();
    }
    setExpanded(true);
    setOpen(true);
    setTimeout(() => {
      if (formRef.current) {
        formRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 500);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedMaterial(null);
    setExpanded(false);
    formik.resetForm();
  };

  const handleDelete = () => {
    if (selectedMaterials.length === 0) {
      showErrorAlert("Không tìm thấy bản ghi cần xóa");
      return;
    }
    showConfirmAlert(
      `Bạn có muốn xóa ${selectedMaterials.length} bản ghi?`,
    ).then((result) => {
      if (result.isConfirmed) {
        deleteMutation.mutate(selectedMaterials);
      }
    });
  };

  const listLots = useMemo(
    () =>
      timeSlots.map((slot) => ({
        _id: slot.id,
        name: `Từ ${dayjs(slot.startTime).format("DD/MM/YYYY")} - Đến ${dayjs(slot.endTime).format("DD/MM/YYYY")}`,
        startTime: slot.startTime,
        endTime: slot.endTime,
      })),
    [timeSlots], // 👈 thêm dependency, tránh missing warning
  );
  return (
    <Box>
      <Accordion expanded={expanded} ref={formRef}>
        <AccordionSummary
          expandIcon={<></>}
          aria-controls="panel1-content"
          id="panel1-header"
          sx={{
            backgroundColor: "white",
            "&.Mui-focusVisible": {
              backgroundColor: "white",
            },
          }}
        >
          <Box
            sx={{
              display: "flex",
              gap: 2,
              alignItems: "center",
              width: "100%",
              flexDirection: {
                xs: "column",
                md: "row",
              },
            }}
          >
            {user?.role === RoleEnum.ADMIN && (
              <Box
                display={"flex"}
                gap={2}
                sx={{
                  flexDirection: {
                    xs: "column",
                    md: "row",
                  },
                  width: {
                    xs: "100%", // Group này chiếm 100% khi xếp dọc
                    md: "auto",
                  },
                }}
              >
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
            <Box
              flex={2}
              sx={{
                display: "flex",
                flexGrow: 1, // Chiếm hết phần còn lại của không gian
                gap: 2,
                alignItems: "center",
                flexDirection: {
                  xs: "column",
                  md: "row",
                },
                width: {
                  xs: "100%", // Group này chiếm 100% khi xếp dọc
                  md: "auto",
                },
              }}
            >
              <FieldSearch
                titleSearch={`Tìm kiếm theo tên vật liệu`}
                searchValue={value}
                setSearchValue={setValue}
              />
              <FieldAutoCompleted
                size="small"
                data={listLots}
                labelkey="name"
                title="Lọc theo thời gian"
                value={selectedTimeSlot?.id || ""}
                onChange={(value) => {
                  if (!value) return;
                  const slot = timeSlots.find((s) => s.id === value._id);
                  if (slot) handleSelectSlot(slot);
                }}
              />
              {/* <TextField
                fullWidth
                select
                size="small"
                value={selectedTimeSlot?.id || ""}
                label="Lọc theo thời gian"
                onChange={(e) => {
                  const slot = timeSlots.find((s) => s.id === e.target.value);
                  if (slot) handleSelectSlot(slot);
                }}
              >
                {timeSlots.map((slot) => (
                  <MenuItem key={slot.id} value={slot.id}>
                    {`Từ ${dayjs(slot.startTime).format("DD/MM/YYYY")} - Đến ${dayjs(slot.endTime).format("DD/MM/YYYY")}`}
                  </MenuItem>
                ))}
              </TextField> */}
            </Box>
            {user?.role === RoleEnum.ADMIN && (
              <Box
                display="flex"
                gap={2}
                sx={{
                  flexDirection: {
                    xs: "column",
                    md: "row",
                  },
                  width: {
                    xs: "100%", // Group này chiếm 100% khi xếp dọc
                    md: "auto",
                  },
                }}
              >
                <input
                  id="upload-excel"
                  type="file"
                  accept=".xlsx, .xls"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const formData = new FormData();
                      formData.append("file", file);
                      importFile.mutate(formData);
                    }
                    e.target.value = "";
                  }}
                />

                <label htmlFor="upload-excel">
                  <Button
                    fullWidth
                    component="span"
                    variant="contained"
                    startIcon={<UploadFile />}
                  >
                    Tải lên excel
                  </Button>
                </label>
                <Button
                  component="span"
                  variant="contained"
                  startIcon={<Download />}
                  onClick={() => exportExcel.mutate()}
                >
                  Tải xuống
                </Button>
              </Box>
            )}
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <DialogTitle>
            {selectedMaterial ? "Sửa vật liệu" : "Thêm vật liệu"}
          </DialogTitle>
          <DialogContent>
            <FormikProvider value={formik}>
              <Box
                component="form"
                onSubmit={formik.handleSubmit}
                sx={{ mt: 2 }}
              >
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <FieldInput name="name" title="Tên vật liệu" />
                  <FieldAutoCompleted
                    name="acceptedProduct"
                    title="Sản phẩm nghiệm thu"
                    data={[
                      { _id: "Đất", name: "Đất" },
                      { _id: "Than", name: "Than" },
                    ]}
                    labelkey="name"
                  />
                </Box>
              </Box>
            </FormikProvider>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Hủy</Button>
            <Button onClick={() => formik.submitForm()} variant="contained">
              {selectedMaterial ? "Cập nhật" : "Thêm mới"}
            </Button>
          </DialogActions>
        </AccordionDetails>
      </Accordion>
      {isUploading && (
        <Box sx={{ mt: 2 }}>
          {progress < 100 ? (
            <>
              <Typography variant="body2" align="center">
                Đang tải lên... {progress}%
              </Typography>
              <LinearProgress variant="determinate" value={progress} />
            </>
          ) : (
            <>
              <Typography variant="body2" align="center">
                Đang xử lý dữ liệu trên server...
              </Typography>
              <LinearProgress />
            </>
          )}
        </Box>
      )}
      <Box display="flex" alignItems="center" sx={{ mb: 2, mt: 2 }}>
        <Typography variant="h4">Bảng vật liệu</Typography>
        <IconButton onClick={(e) => setMenuAnchorEl(e.currentTarget)}>
          <Settings sx={{ fontSize: 30 }} />
        </IconButton>
        <Menu
          anchorEl={menuAnchorEl}
          open={Boolean(menuAnchorEl)}
          onClose={() => setMenuAnchorEl(null)}
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
      <CustomDataGrid
        rows={materials.data}
        defaultColumns={defaultColumns.filter((c) =>
          visibleColumns.includes(c.id),
        )}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        paginationMode="server"
        rowCount={materials.totalDocs}
        isAdmin={user?.role === RoleEnum.ADMIN}
        onEdit={handleOpen}
        onSelectionChange={setSelectedMaterials}
        isLoading={isLoading}
      />
    </Box>
  );
}
