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
  Grid,
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
import { FormikProvider, useFormik } from "formik";
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
import DeviceService from "../../services/deviceService";
import DepartmentService from "../../services/departmentService";
import { DeviceTypeEnum, RoleEnum, StatusDeviceEnum } from "../../enums";
import CustomDataGrid from "../../components/Table/CustomDataGrid";
import { GridRenderCellParams } from "@mui/x-data-grid";
import { STATUS_DEVICE_OPTIONS } from "../../utils/const";
import FieldSearch from "../../components/field/FieldSearch";
import FieldAutoCompleted from "../../components/field/FieldAutoCompleted";
import FieldInput from "../../components/field/FieldInput";
import { deviceValidationSchema } from "../../utils/validation";

const containerStyle = {
  width: "100%",
  height: "300px",
};

const defaultCenter = {
  lat: 20.9926575,
  lng: 105.8437303,
};
type DeviceProps = {
  type: DeviceTypeEnum.MACHINE | DeviceTypeEnum.VEHICLE;
};

const Devices: React.FC<DeviceProps> = ({ type }) => {
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

  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0,
  });

  const [user] = useAtom(userAtom);
  const [expanded, setExpanded] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const label = type === DeviceTypeEnum.MACHINE ? "máy" : "xe";

  const defaultColumns = useMemo(
    () => [
      {
        id: "stt",
        label: "STT",
        width: 50,
        resizable: false,
      },
      { id: "code", label: "Biển số", minWidth: 100 },
      { id: "name", label: `Tên ${label}`, flex: 1, minWidth: 150 },
      { id: "vehicleNumber", label: `Số ${label}`, minWidth: 100 },
      {
        id: "category",
        label: `Loại ${label}`,
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
        id: "cumulativeHours",
        label: "Giờ hoạt động lũy kế",
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
    [label],
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

  const { data, isLoading } = useQuery({
    queryKey: ["devices", type, q, department, status, paginationModel],
    queryFn: () =>
      DeviceService.getDevices({
        type,
        q,
        department,
        status,
        page: paginationModel.page + 1,
        pageSize: paginationModel.pageSize,
      }),
    placeholderData: (previousData) => previousData,
  });

  const devices = data?.data ?? [];
  const statusCounts = data?.statusCounts ?? {};
  const totalDocs = data?.totalDocs;

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
      queryClient.invalidateQueries({ queryKey: ["devices"] });
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
    mutationFn: () =>
      DeviceService.exportDevicesFile(type, { q, department, status }),
    onSuccess: () => {},
    onError: (error: any) => {
      showErrorAlert(error.response?.data?.message || error.message || "Lỗi");
    },
  });

  const createMutation = useMutation({
    mutationFn: (newDevice: Partial<Device>) =>
      api.post("/devices", newDevice).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      showSuccessAlert(`Thêm thông tin ${label} thành công`);
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
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      showSuccessAlert(`Cập nhật thông tin ${label} thành công`);
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
      queryClient.invalidateQueries({ queryKey: ["devices"] });
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
    validationSchema: deviceValidationSchema,
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

  const statusOptions = useMemo(
    () => STATUS_DEVICE_OPTIONS.map((o) => ({ _id: o.label, name: o.value })),
    [],
  );

  return (
    <Box>
      <Breadcrumbs aria-label="breadcrumb">
        <Typography>Danh mục</Typography>
        <Typography>Thông tin {label}</Typography>
      </Breadcrumbs>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mb: 3,
          mt: 3,
        }}
      >
        <Typography variant="h3" color={"blue"}>
          Thông tin {label}
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
                <FieldSearch
                  titleSearch={`Tìm kiếm theo tên, biển số, số ${label}, chủng loại`}
                  searchValue={q}
                  setSearchValue={setQ}
                />
                {user?.role !== RoleEnum.MANAGER && (
                  <FieldAutoCompleted
                    title="Tìm kiếm theo đơn vị"
                    data={departments}
                    labelkey="code"
                    value={department}
                    setValue={setDepartment}
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
            {selectedDevice
              ? `Sửa thông tin ${label}`
              : `Thêm thông tin ${label}`}
          </DialogTitle>
          <DialogContent>
            <FormikProvider value={formik}>
              <Box
                component="form"
                onSubmit={formik.handleSubmit}
                sx={{ mt: 2 }}
              >
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <FieldInput name="code" title="Biển số" />
                  <FieldInput name="name" title={`Tên ${label}`} />
                  <FieldInput name="vehicleNumber" title={`Số ${label}`} />
                  <FieldAutoCompleted
                    title={`Loại ${label}`}
                    data={DeviceTypes.filter(
                      (p: DeviceType) => p.group === DeviceTypeEnum.MACHINE,
                    )}
                    labelkey="name"
                    name="category"
                  />
                  <FieldAutoCompleted
                    title="Chủng loại"
                    data={devicemodels}
                    labelkey="name"
                    name="material"
                  />
                  <FieldInput name="fuelType" title="Nhiên liệu" />
                  <FieldAutoCompleted
                    title="Trạng thái"
                    name="status"
                    data={statusOptions}
                    labelkey="name"
                    getOptionDisabled={(option) =>
                      option.id === StatusDeviceEnum.IN_USE &&
                      user?.role === RoleEnum.MANAGER
                    }
                  />
                  <FieldAutoCompleted
                    title="Đơn vị"
                    data={departments}
                    labelkey="name"
                    name="department"
                    disabled={user?.role === RoleEnum.MANAGER}
                  />
                  <FieldInput name="note" title="Ghi chú" />
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
            </FormikProvider>
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
            primary={`Tất cả (${statusCounts["all"] || 0})`}
            sx={{ color: "blue" }}
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
            primary={`Chờ điều động (${statusCounts[StatusDeviceEnum.AVAILABLE] || 0})`}
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
            primary={`Đang hoạt động (${statusCounts[StatusDeviceEnum.IN_USE] || 0})`}
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
            primary={`SC; BD (${statusCounts[StatusDeviceEnum.MAINTENANCE] || 0})`}
            sx={{ color: "orange" }}
          />
        </Box>
      </Box>
      <Box display="flex" alignItems="center" sx={{ mb: 2, mt: 2 }}>
        <Typography variant="h4">Bảng thông tin {label}</Typography>
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
      <Grid container>
        <Grid item xs={viewingDevice ? 4 : 12} sx={{ overflow: "hidden" }}>
          <CustomDataGrid
            rows={devices.map((sm, index) => ({
              ...sm,
              stt: index + 1,
            }))}
            defaultColumns={defaultColumns.filter((c: any) =>
              visibleColumns.includes(c.id),
            )}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            paginationMode="server"
            rowCount={totalDocs}
            isAdmin={user?.role === RoleEnum.ADMIN}
            onSelectionChange={(ids) => setSelectedDevices(ids)}
            isLoading={isLoading}
            getRowId={(row) => row._id}
          />
        </Grid>
        {viewingDevice && (
          <Grid
            item
            xs={8}
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
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default Devices;
