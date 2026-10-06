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
  Autocomplete,
  Menu,
  MenuItem,
  Switch,
  ListItemText,
  Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Breadcrumbs,
  InputAdornment,
  LinearProgress,
  Chip,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Settings,
  UploadFile,
  Download,
  Search,
  Visibility,
} from "@mui/icons-material";
import AssetEbook from "../../components/common/AssetEbook";
import { useFormik } from "formik";
import api from "../../config/api.config";
import { Department, Device, DeviceModel, DeviceType } from "../../types";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import LocationSelector from "../../fixLeafletIcon";
import { useAtom } from "jotai";
import { userAtom } from "../../atoms/userAtoms";
import {
  showConfirmAlert,
  showErrorAlert,
  showSuccessAlert,
} from "../../components/Alert";
import { StyledPopper } from "../../ui/poppers";
import { machineValidationSchema } from "../../utils/validation";
import DeviceService from "../../services/deviceService";
import DepartmentService from "../../services/departmentService";
import { DeviceTypeEnum, RoleEnum, StatusDeviceEnum } from "../../enums";
import CustomDataGrid from "../../components/Table/CustomDataGrid";
import { GridRenderCellParams } from "@mui/x-data-grid";
import { STATUS_DEVICE_OPTIONS } from "../../utils/const";

const containerStyle = {
  width: "100%",
  height: "300px",
};

const defaultCenter = {
  lat: 20.9926575,
  lng: 105.8437303,
};

const Machines: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [department, setDepartment] = useState("");
  const [mapCoords, setMapCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [viewingDevice, setViewingDevice] = useState<Device | null>(null);

  const [user] = useAtom(userAtom);
  const [expanded, setExpanded] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const defaultColumns = useMemo(
    () => [
      {
        id: "stt",
        label: "STT",
        width: 50,
        resizable: false,
      },
      { id: "code", label: "Biển số", minWidth: 100 },
      { id: "name", label: "Tên máy", flex: 1, minWidth: 150 },
      { id: "vehicleNumber", label: "Số máy", minWidth: 100 },
      {
        id: "category",
        label: "Loại máy",
        renderCell: (params: GridRenderCellParams<Device>) => {
          const category = params.row.category as any;
          return typeof category === "object"
            ? category?.name || ""
            : category || "";
        },
      },
      {
        id: "material",
        label: "Chủng loại",
        renderCell: (params: GridRenderCellParams<Device>) => {
          const material = params.row.material as any;
          return typeof material === "object"
            ? material?.name || ""
            : material || "";
        },
      },
      { id: "fuelType", label: "Nhiên liệu", minWidth: 120 },
      {
        id: "coordinates",
        label: "Vị trí",
        renderCell: (params: GridRenderCellParams<Device>) => {
          const coordsData = params.row.coordinates as any;
          const coords = coordsData?.coordinates;
          return coords && coords.length === 2
            ? `${coords[1]}, ${coords[0]}`
            : "Không có tọa độ";
        },
      },
      {
        id: "department",
        label: "Đơn vị",
        renderCell: (params: GridRenderCellParams<Device>) => {
          const dept = params.row.department as any;
          return typeof dept === "object"
            ? dept?.name || ""
            : dept || "Chưa có";
        },
      },
      {
        id: "status",
        label: "Trạng thái",
        renderCell: (params: GridRenderCellParams<Device>) => {
          const s = params.row.status;
          return (
            <Chip
              sx={{ width: "120px" }}
              label={
                s === StatusDeviceEnum.IN_USE
                  ? "Đang hoạt động"
                  : s === StatusDeviceEnum.MAINTENANCE
                    ? "SC; BD"
                    : s === StatusDeviceEnum.RETIRED
                      ? "Niêm cất"
                      : s === StatusDeviceEnum.AVAILABLE
                        ? "Chờ điều động"
                        : s
              }
              color={
                s === StatusDeviceEnum.IN_USE
                  ? "error"
                  : s === StatusDeviceEnum.MAINTENANCE
                    ? "warning"
                    : s === StatusDeviceEnum.RETIRED
                      ? "secondary"
                      : s === StatusDeviceEnum.AVAILABLE
                        ? "success"
                        : "default"
              }
            />
          );
        },
      },
      {
        id: "view",
        label: "Xem",
        width: 60,
        renderCell: (params: { row: any }) => (
          <IconButton
            color="info"
            onClick={() => {
              setViewingDevice(
                viewingDevice?._id === params.row._id ? null : params.row,
              );
            }}
          >
            <Visibility />
          </IconButton>
        ),
        sortable: false,
        filterable: false,
      },
      {
        id: "edit",
        label: "Sửa",
        width: 60,
        renderCell: (params: { row: any }) => (
          <IconButton
            color="primary"
            onClick={async () => {
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
    ],
    [],
  );

  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  useEffect(() => {
    if (user) {
      let initialColumns: string[];

      initialColumns = defaultColumns.map((i: any) => i.id);

      setVisibleColumns(initialColumns);
    }
  }, [user, defaultColumns]);

  const handleToggleColumn = (id: string) => {
    setVisibleColumns((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };
  const handleChange = (value: string) => {
    setStatus((prev) => (prev === value ? "" : value)); // bỏ chọn nếu click lại
  };

  const queryClient = useQueryClient();

  const { data: machines = [], isLoading } = useQuery({
    queryKey: ["machines", q, department, status],
    queryFn: () =>
      DeviceService.getMachines({
        q: q,
        department: department,
        status: status,
      }),
  });
  const { data: allMachines = [] } = useQuery({
    queryKey: ["allMachines", q, department],
    queryFn: () => DeviceService.getMachines({ q: q, department: department }),
  });
  const { data: DeviceTypes = [] } = useQuery({
    queryKey: ["DeviceTypes"],
    queryFn: () => api.get(`/DeviceTypes`).then((res) => res.data.data),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: () => DepartmentService.getAll(),
  });
  const { data: devicemodels = [] } = useQuery({
    queryKey: ["devicemodels"],
    queryFn: () => api.get("/devicemodels").then((res) => res.data.data),
  });

  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const importFile = useMutation({
    mutationFn: (fd: FormData) =>
      DeviceService.importDevicesFile(fd, setProgress),
    onMutate: () => {
      setIsUploading(true);
      setProgress(0);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["allMachines"] });
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      setIsUploading(false);
      let combinedMessage = `Import dữ liệu hoàn tất. Đã xử lý ${data.summary.totalProcessed} bản ghi.`;
      combinedMessage += `\nĐã thêm mới: ${data.summary.insertedCount}`;
      combinedMessage += `\nĐã cập nhật: ${data.summary.updatedCount}`;

      // Thêm chi tiết lỗi nếu có
      if (data.invalidRows && data.invalidRows.length > 0) {
        combinedMessage += `\n\n--- CÓ LỖI XẢY RA TRONG QUÁ TRÌNH IMPORT ---`;
        combinedMessage += `\n${data.invalidRows.length} bản ghi không hợp lệ:`;

        // Liệt kê chi tiết một vài lỗi đầu tiên
        data.invalidRows.slice(0, 5).forEach((item: any, index: number) => {
          combinedMessage += `\n- Dòng ${index + 1}: Lỗi "${item.error}"`;
        });

        // Thông báo nếu còn nhiều lỗi hơn
        if (data.invalidRows.length > 5) {
          combinedMessage += `\n... và ${data.invalidRows.length - 5} lỗi khác.`;
        }
      }

      showSuccessAlert(combinedMessage);
    },
    onError: (error: any) => {
      setIsUploading(false);
      showErrorAlert(error.response?.data?.message || "Lỗi khi import");
    },
  });

  const exportExcel = useMutation({
    mutationFn: () => DeviceService.exportDevicesFile(machines),
    onSuccess: () => {},
    onError: (error: any) => {
      showErrorAlert(error.response?.data?.message || error.message || "Lỗi");
    },
  });

  const createMutation = useMutation({
    mutationFn: (newDevice: Partial<Device>) =>
      api.post("/devices", newDevice).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      showSuccessAlert("Thêm thông tin máy thành công");
      handleClose();
    },
    onError: (error: any) => {
      showErrorAlert(error.response.data.message || error.message || "Lỗi");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (updatedDevice: Partial<Device>) => {
      return api
        .put(`/devices/${updatedDevice._id}`, updatedDevice)
        .then((res) => res.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      showSuccessAlert("Cập nhật thông tin máy thành công");
      handleClose();
    },
    onError: (error: any) => {
      showErrorAlert(error.response.data.message || error.message || "Lỗi");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) =>
      api.delete(`/devices`, { data: { ids } }).then((res) => res.data.message),
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      setSelectedDevices([]);
      showSuccessAlert(message || "Xóa thành công");
      handleClose();
    },
    onError: (error: any) => {
      showErrorAlert(error.response.data.message || error.message || "Lỗi");
    },
  });
  const formik = useFormik({
    initialValues: {
      name: "",
      code: "",
      vehicleNumber: "",
      category: "",
      material: undefined,
      fuelType: "",
      note: "",
      // power: undefined as number | undefined,
      department: user?.role === RoleEnum.MANAGER ? user?.department?._id : "",
      status: StatusDeviceEnum.AVAILABLE,
      coordinates: { lat: 0, lng: 0 },
      ...selectedDevice,
    },
    validationSchema: machineValidationSchema,
    onSubmit: (values) => {
      const submitValues = {
        ...values,
        status: values.status as Device["status"],
        coordinates: values.coordinates,
      };
      if (selectedDevice) {
        updateMutation.mutate({ ...submitValues, _id: submitValues._id });
        setMapCoords(values.coordinates);
      } else {
        createMutation.mutate(submitValues);
      }
    },
  });
  // Đồng bộ coordinates khi mapCoords thay đổi
  useEffect(() => {
    if (mapCoords) {
      formik.setFieldValue("coordinates", mapCoords);
    }
  }, [mapCoords]);
  const handleOpen = (device?: any) => {
    if (device) {
      const [lng, lat] = device.coordinates.coordinates;
      setSelectedDevice(device);
      formik.setValues({
        ...device,
        coordinates: {
          lat,
          lng,
        },
        material:
          device.material !== null && typeof device.material === "object"
            ? device.material._id
            : device.material || undefined,
        department:
          device.department !== null && typeof device.department === "object"
            ? device.department._id
            : device.department || undefined,
        category:
          device.category !== null && typeof device.category === "object"
            ? device.category._id
            : device.category || "",
      });
      setMapCoords({
        lat,
        lng,
      });
    } else {
      setSelectedDevice(null);
      formik.resetForm();
      setMapCoords(null);
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
    setSelectedDevice(null);
    setExpanded(false);
    formik.resetForm();
    setMapCoords(null);
  };

  const handleDelete = () => {
    if (selectedDevices.length === 0) {
      showErrorAlert("Không tìm thấy bản ghi cần xóa");
      return;
    }
    showConfirmAlert(`Bạn có muốn xóa ${selectedDevices.length} bản ghi?`).then(
      (result) => {
        if (result.isConfirmed) {
          deleteMutation.mutate(selectedDevices);
        }
      },
    );
  };

  return (
    <Box>
      <Breadcrumbs aria-label="breadcrumb">
        <Typography>Danh mục</Typography>
        <Typography>Thông tin máy</Typography>
      </Breadcrumbs>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mb: 3,
          mt: 3,
        }}
      >
        <Typography variant="h3" color="brand.title">
          Thông tin máy
        </Typography>
      </Box>
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
              flex={1}
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
              <Box sx={{ display: "flex", gap: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  value={q}
                  placeholder="Tìm kiếm theo tên, biển số, số máy, chủng loại"
                  onChange={(e) => setQ(e.target.value)}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Search sx={{ fontSize: 24 }} />
                      </InputAdornment>
                    ),
                  }}
                ></TextField>
                {user?.role !== RoleEnum.MANAGER && (
                  <Autocomplete
                    fullWidth
                    size="small"
                    options={departments}
                    getOptionLabel={(option: Department) => option.code || ""}
                    onChange={(event, newValue) => {
                      setDepartment(newValue?._id || "");
                    }}
                    PopperComponent={StyledPopper}
                    renderInput={(params) => (
                      <TextField {...params} label="Tìm kiếm theo đơn vị" />
                    )}
                  />
                )}
              </Box>
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
            {selectedDevice ? "Sửa thông tin máy" : "Thêm thông tin máy"}
          </DialogTitle>
          <DialogContent>
            <Box component="form" onSubmit={formik.handleSubmit} sx={{ mt: 2 }}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <TextField
                  fullWidth
                  id="code"
                  name="code"
                  label="Biển số"
                  value={formik.values.code}
                  onChange={formik.handleChange}
                  error={formik.touched.code && Boolean(formik.errors.code)}
                  helperText={formik.touched.code && formik.errors.code}
                />
                <TextField
                  fullWidth
                  id="name"
                  name="name"
                  label="Tên máy"
                  value={formik.values.name}
                  onChange={formik.handleChange}
                  error={formik.touched.name && Boolean(formik.errors.name)}
                  helperText={formik.touched.name && formik.errors.name}
                />
                <TextField
                  fullWidth
                  id="vehicleNumber"
                  name="vehicleNumber"
                  label="Số máy"
                  value={formik.values.vehicleNumber}
                  onChange={formik.handleChange}
                  error={
                    formik.touched.vehicleNumber &&
                    Boolean(formik.errors.vehicleNumber)
                  }
                  helperText={
                    formik.touched.vehicleNumber && formik.errors.vehicleNumber
                  }
                />
                <Autocomplete
                  fullWidth
                  options={DeviceTypes.filter(
                    (p: DeviceType) => p.group === DeviceTypeEnum.MACHINE,
                  )}
                  getOptionLabel={(option: DeviceType) => option.name || ""}
                  value={
                    DeviceTypes.find(
                      (p: DeviceType) => p._id === formik.values.category,
                    ) || null
                  }
                  onChange={(event, newValue) => {
                    formik.setFieldValue("category", newValue?._id || "");
                  }}
                  PopperComponent={StyledPopper}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Loại máy"
                      error={
                        formik.touched.category &&
                        Boolean(formik.errors.category)
                      }
                      helperText={
                        formik.touched.category &&
                        typeof formik.errors.category === "string"
                          ? formik.errors.category
                          : ""
                      }
                    />
                  )}
                />
                <Autocomplete
                  fullWidth
                  options={devicemodels}
                  getOptionLabel={(option: DeviceModel) => option.name || ""}
                  value={
                    devicemodels.find(
                      (p: DeviceModel) => p._id === formik.values.material,
                    ) || null
                  }
                  onChange={(event, newValue) => {
                    formik.setFieldValue("material", newValue?._id || "");
                  }}
                  PopperComponent={StyledPopper}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Chủng loại"
                      error={
                        formik.touched.material &&
                        Boolean(formik.errors.material)
                      }
                      helperText={
                        formik.touched.material &&
                        typeof formik.errors.material === "string"
                          ? formik.errors.material
                          : ""
                      }
                    />
                  )}
                />
                <TextField
                  fullWidth
                  id="fuelType"
                  name="fuelType"
                  label="Nhiên liệu"
                  value={formik.values.fuelType}
                  onChange={formik.handleChange}
                  error={
                    formik.touched.fuelType && Boolean(formik.errors.fuelType)
                  }
                  helperText={formik.touched.fuelType && formik.errors.fuelType}
                />
                <TextField
                  fullWidth
                  select
                  id="status"
                  name="status"
                  label="Trạng thái"
                  value={formik.values.status || StatusDeviceEnum.AVAILABLE}
                  onChange={formik.handleChange}
                  error={formik.touched.status && Boolean(formik.errors.status)}
                  helperText={formik.touched.status && formik.errors.status}
                >
                  {STATUS_DEVICE_OPTIONS.map((o) => (
                    <MenuItem
                      key={o.label}
                      value={o.label}
                      disabled={
                        o.label === StatusDeviceEnum.IN_USE &&
                        user?.role === RoleEnum.MANAGER
                      }
                    >
                      {o.value}
                    </MenuItem>
                  ))}
                </TextField>
                <Autocomplete
                  fullWidth
                  options={departments}
                  getOptionLabel={(option: Department) => option.name || ""}
                  value={
                    departments.find(
                      (p: any) =>
                        p._id ===
                        (user?.role === RoleEnum.MANAGER
                          ? user?.department?._id
                          : formik.values.department),
                    ) || null
                  }
                  readOnly={user?.role === RoleEnum.MANAGER}
                  // disabled
                  onChange={(event, newValue) => {
                    formik.setFieldValue("department", newValue?._id || "");
                  }}
                  PopperComponent={StyledPopper}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Đơn vị"
                      error={
                        formik.touched.department &&
                        Boolean(formik.errors.department)
                      }
                      helperText={
                        formik.touched.department &&
                        typeof formik.errors.department === "string"
                          ? formik.errors.department
                          : ""
                      }
                    />
                  )}
                />
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  id="note"
                  name="note"
                  label="Ghi chú"
                  value={formik.values.note}
                  onChange={formik.handleChange}
                  error={formik.touched.note && Boolean(formik.errors.note)}
                  helperText={formik.touched.note && formik.errors.note}
                />
                <TextField
                  fullWidth
                  id="coordinates"
                  name="coordinates"
                  label="Tọa độ (lng, lat)"
                  value={`${formik.values.coordinates.lat}, ${formik.values.coordinates.lng}`}
                  onChange={(e) => {
                    const [latStr, lngStr] = e.target.value.split(",");
                    const lng = parseFloat(lngStr.trim());
                    const lat = parseFloat(latStr.trim());
                    if (!isNaN(lat) && !isNaN(lng)) {
                      const coords = { lat, lng };
                      formik.setFieldValue("coordinates", coords);
                      setMapCoords(coords);
                    }
                  }}
                  error={
                    formik.touched.coordinates &&
                    Boolean(formik.errors.coordinates)
                  }
                  helperText={
                    (formik.touched.coordinates?.lat &&
                      formik.errors.coordinates?.lat) ||
                    (formik.touched.coordinates?.lng &&
                      formik.errors.coordinates?.lng)
                  }
                />

                <MapContainer
                  center={[defaultCenter.lat, defaultCenter.lng]}
                  zoom={18}
                  style={containerStyle}
                >
                  {/* Giao diện bản đồ giống Google Maps (CartoDB) */}
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="&copy; OpenStreetMap contributors"
                  />
                  <LocationSelector
                    onSelect={(coords) => setMapCoords(coords)}
                  />
                  {mapCoords && <Marker position={mapCoords} />}
                </MapContainer>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Hủy</Button>
            <Button onClick={() => formik.handleSubmit()} variant="contained">
              {selectedDevice ? "Cập nhật" : "Thêm mới"}
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
      <Box
        display="flex"
        gap={2}
        alignItems={"center"}
        justifyContent="flex-end"
      >
        <Box display="flex" alignItems={"center"}>
          <Checkbox
            color="info"
            name="status"
            checked={status === ""}
            onChange={() => handleChange("")}
          />
          <ListItemText
            primary={`Tất cả (${allMachines.length})`}
            sx={{ color: "brand.title" }}
          />
        </Box>
        <Box display="flex" alignItems={"center"}>
          <Checkbox
            color="success"
            name="status"
            checked={status === StatusDeviceEnum.AVAILABLE}
            onChange={() => handleChange(StatusDeviceEnum.AVAILABLE)}
          />
          <ListItemText
            primary={`Chờ điều động (${allMachines.filter((o: Device) => o.status === StatusDeviceEnum.AVAILABLE).length})`}
            sx={{ color: "green" }}
          />
        </Box>
        <Box display="flex" alignItems={"center"}>
          <Checkbox
            color="error"
            name="status"
            checked={status === StatusDeviceEnum.IN_USE}
            onChange={() => handleChange(StatusDeviceEnum.IN_USE)}
          />
          <ListItemText
            primary={`Đang hoạt động (${allMachines.filter((o: Device) => o.status === StatusDeviceEnum.IN_USE).length})`}
            sx={{ color: "red" }}
          />
        </Box>
        <Box display="flex" alignItems={"center"}>
          <Checkbox
            color="warning"
            name="status"
            checked={status === StatusDeviceEnum.MAINTENANCE}
            onChange={() => handleChange(StatusDeviceEnum.MAINTENANCE)}
          />
          <ListItemText
            primary={`SC; BD (${allMachines.filter((o: Device) => o.status === StatusDeviceEnum.MAINTENANCE).length})`}
            sx={{ color: "orange" }}
          />
        </Box>
      </Box>
      <Box display="flex" alignItems="center" sx={{ mb: 2, mt: 2 }}>
        <Typography variant="h4">Bảng thông tin máy</Typography>
        <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
          <Settings sx={{ fontSize: 30 }} />
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          sx={{ maxHeight: 400 }}
        >
          {defaultColumns.map((col: any) => (
            <MenuItem key={col.id} onClick={() => handleToggleColumn(col.id)}>
              <Switch checked={visibleColumns.includes(col.id)} />
              <ListItemText primary={col.label} />
            </MenuItem>
          ))}
        </Menu>
      </Box>
      <Box display="flex" gap={2}>
        <Box
          flex={viewingDevice ? 1 : "none"}
          width={viewingDevice ? "50%" : "100%"}
          sx={{ overflow: "hidden" }}
        >
          <CustomDataGrid
            rows={machines.map((sm, index) => ({
              ...sm,
              stt: index + 1,
            }))}
            defaultColumns={defaultColumns.filter((c: any) =>
              visibleColumns.includes(c.id),
            )}
            isAdmin={user?.role === RoleEnum.ADMIN}
            onSelectionChange={(ids) => setSelectedDevices(ids)}
            isLoading={isLoading}
            getRowId={(row) => row._id}
          />
        </Box>
        {viewingDevice && (
          <Box
            flex={1}
            width="50%"
            sx={{
              height: "calc(100vh)",
              overflow: "hidden",
              borderLeft: "1px solid #ddd",
              paddingLeft: 2,
            }}
          >
            <AssetEbook
              asset={viewingDevice}
              onClose={() => setViewingDevice(null)}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default Machines;
