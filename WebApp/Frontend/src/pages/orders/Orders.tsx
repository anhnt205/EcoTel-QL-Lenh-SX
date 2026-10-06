import React, { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Button,
  Grid,
  IconButton,
  Typography,
  Chip,
  Checkbox,
  TextField,
  MenuItem,
  Tooltip,
  Autocomplete,
  Menu,
  Switch,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  InputAdornment,
  CircularProgress,
  AlertColor,
  LinearProgress,
} from "@mui/material";
import { format } from "date-fns";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search,
  FileDownload,
  InfoOutlined,
  SyncAlt,
  Visibility,
  CancelOutlined,
  RotateLeft,
  VisibilityOff,
  CloudUpload,
} from "@mui/icons-material";
import { Order } from "../../types";
import OrderFormAdd from "./OrderFormAdd";
import OrderFormEdit from "./OrderFormEdit";
import OrderFormTransfer from "./OrderFormTransfer";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import {
  AlertSnackbar,
  showConfirmAlert,
  showErrorAlert,
  showSuccessAlert,
} from "../../components/Alert";
import { useAtom } from "jotai";
import { userAtom } from "../../atoms/userAtoms";
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
  GridToolbar,
} from "@mui/x-data-grid";
import { StyledPopper } from "../../ui/poppers";
import { JobTypeEnum, RoleEnum, StatusOrderEnum } from "../../enums/index";
import OrderHistories from "../../components/Modal/OrderHistories";
import ShiftReport from "../../components/Modal/ShiftReport";
import DepartmentService from "../../services/departmentService";
import OrderService from "../../services/orderService";
import { parseAxiosError } from "../../utils/handleApiError";
import { Route } from "lucide-react";

const Orders: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState(false);
  const [shiftReport, setShiftReport] = useState(false);
  const [transfer, setTransfer] = useState(false);
  const [status, setStatus] = useState("");
  const [startTime, setStartTime] = useState<Dayjs | null>(null);
  const [endTime, setEndTime] = useState<Dayjs | null>(null);
  const [department, setDepartment] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [selectedRow, setSelectedRow] = useState<any | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<any[]>([]);
  const [value, setValue] = useState("");
  const [user] = useAtom(userAtom);
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [info, setInfo] = useState(false);

  const formRef = useRef<HTMLDivElement>(null);

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const [paginationModel, setPaginationModel] = useState({
    pageSize: 50,
    page: 0,
  });
  const [total, setTotal] = useState(0);
  const [orders, setOrders] = useState<any[]>([]);
  const [statusCounts, setStatusCounts] = useState<any>({
    all: 0,
    pending: 0,
    in_progress: 0,
    warning: 0,
    completed: 0,
    cancel: 0,
  });

  const defaultColumns = [
    { id: "number", label: "Số thứ tự" },
    { id: "assignedTo", label: "Người nhận lệnh" },
    { id: "salaryCode", label: "Số thẻ" },
    { id: "workingDate", label: "Ngày làm việc" },
    { id: "shift", label: "Ca" },
    { id: "job", label: "Công việc" },
    { id: "content", label: "Nội dung lệnh" },
    { id: "device", label: "Thiết bị" },
    { id: "repairVehicles", label: "Thiết bị sửa chữa" },
    { id: "excavator", label: "Máy xúc" },
    { id: "material", label: "Vật liệu" },
    { id: "location", label: "Điểm đổ" },
    { id: "createdBy", label: "Người ra lệnh" },
    { id: "createdAt", label: "Thời gian tạo lệnh" },
    { id: "startTime", label: "Bắt đầu" },
    { id: "endTime", label: "Kết thúc" },
    { id: "status", label: "Trạng thái lệnh" },
    { id: "deviceStatus", label: "Tình trạng thiết bị" },
    { id: "view", label: "Xem" },
    { id: "edit", label: "Sửa" },
    { id: "cancel", label: "Hủy" },
    { id: "transfer", label: "Chuyển ca" },
  ];
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    defaultColumns.map((i) => i.id),
  );

  const handleToggleColumn = (id: string) => {
    setVisibleColumns((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleChange = (value: string) => {
    setStatus((prev) => (prev === value ? "" : value)); // bỏ chọn nếu click lại
  };

  const [serverFilters, setServerFilters] = useState<
    Record<string, string | null>
  >({});

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: () => DepartmentService.getAll(),
  });

  const {
    data,
    refetch: refetchOrder,
    isLoading,
  } = useQuery({
    queryKey: [
      "orders",
      paginationModel,
      value,
      status,
      department,
      startTime,
      endTime,
      serverFilters,
    ],
    queryFn: () =>
      OrderService.getAll({
        page: paginationModel.page + 1,
        limit: paginationModel.pageSize,
        department: department,
        status: status || undefined,
        startTime: startTime ? startTime.toISOString() : "",
        endTime: endTime ? endTime.toISOString() : "",
        q: value,

        // filters từ Table
        assignedTo: serverFilters.assignedTo || undefined,
        salaryCode: serverFilters.salaryCode || undefined,
        createdBy: serverFilters.createdBy || undefined,
        shift: serverFilters.shift || undefined,
        job: serverFilters.job || undefined,
        device: serverFilters.device || undefined,
        material: serverFilters.material || undefined,
      }),
  });
  useEffect(() => {
    if (data) {
      setOrders(data.data); // mảng order
      setTotal(data.totalDocs); // tổng số bản ghi từ API
      setStatusCounts({
        all: data.statusCounts.all,
        pending: data.statusCounts.pending,
        in_progress: data.statusCounts.in_progress,
        warning: data.statusCounts.warning,
        completed: data.statusCounts.completed,
        cancel: data.statusCounts.cancel,
      });
    }
  }, [data]);

  const isSelectAll =
    orders.length > 0 && selectedOrders.length === orders.length;

  const createMutation = useMutation({
    mutationFn: OrderService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      handleClose();
    },
    onError: (error: any) => {
      showErrorAlert(error.response.data.message || error.message || "Lỗi");
    },
  });
  const [isDownloadLoading, setIsDownloadLoading] = useState(false);
  const reportExcel = useMutation({
    mutationFn: () => OrderService.exportFile(selectedOrders),
    onMutate: () => {
      setIsDownloadLoading(true);
    },
    onSuccess: () => {
      showSuccessAlert("Xuất file thành công");
      setSelectedOrders([]);
      setIsDownloadLoading(false);
    },
    onError: async (error: any) => {
      setIsDownloadLoading(false);
      const message = await parseAxiosError(error);
      showErrorAlert(message);
    },
  });

  const reportListorderExcel = useMutation({
    mutationFn: () =>
      OrderService.exportFileList(selectedOrders, isSelectAll, status),
    onMutate: () => {
      setIsDownloadLoading(true);
    },
    onSuccess: () => {
      showSuccessAlert("Xuất file thành công");
      setSelectedOrders([]);
      setIsDownloadLoading(false);
    },
    onError: async (error: any) => {
      setIsDownloadLoading(false);
      const message = await parseAxiosError(error);
      showErrorAlert(message);
    },
  });

  const reportTravelogExcel = useMutation({
    mutationFn: () => OrderService.exportFileListTravelog(),
    onMutate: () => {
      setIsDownloadLoading(true);
    },
    onSuccess: () => {
      showSuccessAlert("Xuất file thành công");
      setSelectedOrders([]);
      setIsDownloadLoading(false);
    },
    onError: async (error: any) => {
      setIsDownloadLoading(false);
      const message = await parseAxiosError(error);
      showErrorAlert(message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: OrderService.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      showSuccessAlert("Cập nhật lệnh sản xuất thành công");
      handleClose();
    },
    onError: (error: any) => {
      showErrorAlert(error.response.data.message || error.message || "Lỗi");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: OrderService.delete,
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setSelectedOrders([]);
      showSuccessAlert(message || "Xóa thành công");
      handleClose();
    },
    onError: (error: any) => {
      showErrorAlert(error.response.data.message || error.message || "Lỗi");
    },
  });

  const handleCancel = (order: any) => {
    if (order.status === StatusOrderEnum.INPROGRESS) {
      return showErrorAlert("Lệnh đang thực hiện không thể hủy");
    }
    if (order.status === StatusOrderEnum.COMPLETED) {
      return showErrorAlert("Lệnh đã hoàn thành không thể hủy");
    }
    showConfirmAlert(
      "Bạn có chắc chắn muốn hủy lệnh sản xuất này?. Bạn sẽ không thể thay đổi",
    ).then((result) => {
      if (result.isConfirmed) {
        updateMutation.mutate({
          _id: order._id,
          status: StatusOrderEnum.CANCEL,
        });
      }
    });
  };

  const handleOpen = (order?: any) => {
    if (order) {
      setSelectedOrder(order);
    } else {
      setSelectedOrder(null);
    }
    setTransfer(false);
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
    setTransfer(false);
    setSelectedOrder(null);
    setExpanded(false);
  };

  const handleSubmit = (values: Partial<Order>) => {
    if (selectedOrder) {
      updateMutation.mutate({ ...values, _id: selectedOrder._id });
    } else {
      createMutation.mutate(values);
    }
  };
  const handleDelete = () => {
    if (selectedOrders.length === 0) {
      return showErrorAlert("Không tìm thấy bản ghi cần xóa");
    }

    if (user?.role === RoleEnum.ADMIN) {
      showConfirmAlert("Bạn có muốn xóa?. Bạn sẽ không thể hoàn tác.").then(
        (result) => {
          if (result.isConfirmed) {
            deleteMutation.mutate(selectedOrders.map((o) => o._id));
          }
        },
      );
    } else {
      // lọc ra những order có thể xoá
      const deletableOrders = selectedOrders.filter(
        (o) =>
          o.status !== StatusOrderEnum.INPROGRESS &&
          o.status !== StatusOrderEnum.COMPLETED,
      );

      if (deletableOrders.length === 0) {
        return showErrorAlert("Không có bản ghi nào hợp lệ để xoá");
      }

      // cảnh báo cho các bản ghi bị bỏ qua
      const skipped = selectedOrders.length - deletableOrders.length;

      let message = "";
      if (skipped > 0) {
        message = `${skipped} bản ghi đang thực hiện hoặc đã hoàn thành. `;
      }

      message += `Bạn có thể xóa ${deletableOrders.length} bản ghi. Bạn có muốn xóa?`;

      showConfirmAlert(message).then((result) => {
        if (result.isConfirmed) {
          deleteMutation.mutate(deletableOrders.map((o) => o._id));
        }
      });
    }
  };

  useEffect(() => {
    if (transfer && formRef.current) {
      setTimeout(() => {
        if (formRef.current) {
          formRef.current.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }, 500);
    }
  }, [transfer]);

  const orderColumns: GridColDef[] = [
    {
      headerName: "STT",
      field: "number",
      width: 50,
      align: "center",
      renderCell: (params: GridRenderCellParams) => {
        const sortedIds = params.api.getSortedRowIds();
        const index = sortedIds.indexOf(params.id);
        return index >= 0 ? index + 1 : "";
      },
      resizable: false,
      filterable: false,
    },
    {
      headerName: "Người nhận lệnh",
      field: "assignedTo",
      width: 150,
      renderCell: (params: any) => params.row.assignedTo?.fullName || "",
    },
    {
      headerName: "Số thẻ",
      field: "salaryCode",
      width: 70,
      align: "center",
      renderCell: (params: any) => params.row.assignedTo?.salaryCode || "",
    },
    {
      headerName: "Ngày làm việc",
      field: "workingDate",
      width: 100,
      align: "center",
      renderCell: (params: any) =>
        params.row.workingDate
          ? format(new Date(params.row.workingDate), "dd-MM-yyyy")
          : "",
      filterable: false,
    },
    {
      headerName: "Ca",
      field: "shift",
      width: 70,
      align: "center",
      renderCell: (params: any) => params.row.shift?.name || "",
    },
    {
      headerName: "Công việc",
      field: "job",
      width: 100,
      renderCell: (params: any) => params.row.job?.name || "",
    },
    {
      headerName: "Nội dung lệnh",
      field: "workContent",
      width: 100, // width khởi tạo, sẽ được update khi resize
      filterable: false,
    },
    {
      headerName: "Thiết bị",
      field: "device",
      width: 100,
      renderCell: (params: any) =>
        params.row.device?.map((dev: any) => dev.code).join(", "),
    },
    {
      headerName: "Thiết bị sửa chữa",
      field: "repairVehicles",
      width: 100,
      renderCell: (params: any) =>
        params.row.repairVehicles
          ?.map((dev: any) => dev.device?.code)
          .join(", "),
    },
    {
      headerName: "Máy xúc",
      field: "excavator",
      width: 100,
      renderCell: (params: any) =>
        params.row.excavator?.map((dev: any) => dev.device?.code).join(", "),
      filterable: false,
    },
    {
      headerName: "Vật liệu",
      field: "material",
      width: 100,
      renderCell: (params: any) =>
        params.row.material?.map((mat: any) => mat.name).join(", "),
    },
    {
      filterable: false,
      headerName: "Điểm đổ",
      field: "location",
      width: 100,
      renderCell: (params: any) =>
        params.row.location?.map((loc: any) => loc.name).join(", "),
    },
    {
      headerName: "Người ra lệnh",
      field: "createdBy",
      width: 150,
      renderCell: (params: any) => params.row.createdBy?.fullName || "",
    },
    {
      headerName: "Thời gian tạo lệnh",
      field: "createdAt",
      width: 150,
      align: "center",
      renderCell: (params: any) =>
        params.row.createdAt
          ? format(new Date(params.row.createdAt), "dd-MM-yyyy HH:mm")
          : "",
      filterable: false,
    },
    {
      headerName: "Bắt đầu",
      field: "startTime",
      width: 80,
      align: "center",
      renderCell: (params: any) =>
        params.row.startTime
          ? format(new Date(params.row.startTime), "HH:mm:ss")
          : "",
      filterable: false,
    },
    {
      headerName: "Kết thúc",
      field: "endTime",
      width: 80,
      align: "center",
      renderCell: (params: any) =>
        params.row.endTime
          ? format(new Date(params.row.endTime), "dd/MM/yyyy HH:mm:ss")
          : "",
      filterable: false,
    },
    {
      headerName: "Trạng thái lệnh",
      field: "status",
      width: 150,
      align: "center",
      filterable: false,
      renderCell: (params: any) => (
        <Chip
          sx={{ width: "120px" }}
          label={
            params.row.status === StatusOrderEnum.PENDING
              ? "Chưa nhận lệnh"
              : params.row.status === StatusOrderEnum.INPROGRESS
                ? "Đã nhận lệnh"
                : params.row.status === StatusOrderEnum.COMPLETED
                  ? "Đã hoàn thành"
                  : params.row.status === StatusOrderEnum.WARNING
                    ? "Lệnh bổ sung"
                    : "Đã hủy"
          }
          color={
            params.row.status === StatusOrderEnum.PENDING
              ? "default"
              : params.row.status === StatusOrderEnum.COMPLETED
                ? "error"
                : params.row.status === StatusOrderEnum.INPROGRESS
                  ? "success"
                  : params.row.status === StatusOrderEnum.WARNING
                    ? "warning"
                    : "secondary"
          }
        />
      ),
    },
    {
      filterable: false,
      headerName: "Tình trạng thiết bị",
      field: "deviceStatus",
      width: 100,
      align: "center",
      renderCell: (params: any) =>
        params.row.shiftReport?.vehicleSummaries
          .map((i: any) => (i.status === "good" ? "Tốt" : "Hỏng"))
          .join(", "),
    },
    {
      headerName: "Xem báo công",
      field: "view",
      width: 100,
      align: "center",
      filterable: false,
      renderCell: (params: any) => (
        <IconButton
          color="secondary"
          onClick={() => {
            setSelectedOrder(params.row);
            setShiftReport(true);
          }}
        >
          <Tooltip title="Báo công" placement="top">
            <Visibility />
          </Tooltip>
        </IconButton>
      ),
    },
    {
      headerName: "Sửa",
      field: "edit",
      width: 50,
      filterable: false,
      renderCell: (params: any) => (
        <IconButton
          color="primary"
          disabled={
            ![StatusOrderEnum.PENDING, StatusOrderEnum.WARNING].includes(
              params.row?.status,
            )
          }
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
          <Tooltip title="Sửa" placement="top">
            <EditIcon />
          </Tooltip>
        </IconButton>
      ),
    },
    {
      headerName: "Hủy",
      field: "cancel",
      width: 50,
      filterable: false,
      renderCell: (params: any) => (
        <IconButton
          disabled={
            ![StatusOrderEnum.PENDING, StatusOrderEnum.WARNING].includes(
              params.row.status,
            )
          }
          color="warning"
          onClick={() => handleCancel(params.row)}
        >
          <Tooltip title="Hủy" placement="top">
            <CancelOutlined />
          </Tooltip>
        </IconButton>
      ),
    },
    {
      headerName: "Chuyển ca",
      field: "transfer",
      width: 50,
      align: "center",
      filterable: false,
      renderCell: (params: any) => (
        <IconButton
          color="info"
          onClick={async () => {
            if (open) {
              const result = await showConfirmAlert(
                "Bạn đang cập nhật một mục. Nếu tiếp tục, dữ liệu hiện tại sẽ bị ghi đè. Bạn có chắc chắn muốn tiếp tục?",
              );
              if (result.isConfirmed) {
                setSelectedOrder(params.row);
                setOpen(false);
                setExpanded(true);
                setTransfer(true);
              }
            } else {
              setSelectedOrder(params.row);
              setOpen(false);
              setExpanded(true);
              setTransfer(true);
              setTimeout(() => {
                if (formRef.current) {
                  formRef.current.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }
              }, 500);
            }
          }}
        >
          <Tooltip title="Chuyển ca" placement="top">
            <SyncAlt />
          </Tooltip>
        </IconButton>
      ),
    },
  ];

  const filteredColumns = React.useMemo(
    () =>
      orderColumns.filter(
        (col: GridColDef) =>
          col.field && visibleColumns.includes(String(col.field)),
      ),
    [orderColumns, visibleColumns],
  );

  const [alert, setAlert] = useState<{
    open: boolean;
    message: string;
    severity?: AlertColor;
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  return (
    <Box>
      <AlertSnackbar alert={alert} setAlert={setAlert} />
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h3" color={"blue"}>
          Lệnh sản xuất
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
              flexWrap: "wrap", // Tự động xuống dòng khi không đủ không gian
              flexDirection: {
                xs: "column", // Màn hình nhỏ: các items xếp dọc
                md: "row", // Màn hình lớn: các items xếp ngang
              },
              // Thêm các thuộc tính căn chỉnh để bố cục đẹp hơn
              justifyContent: {
                xs: "flex-start", // Màn hình nhỏ: căn trái
                md: "space-between", // Màn hình lớn: giãn đều các items
              },
            }}
          >
            {/* Nhóm các nút lại với nhau */}
            <Box
              sx={{
                display: "flex",
                gap: 1, // Khoảng cách nhỏ hơn giữa các nút
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
              <Button
                variant="contained"
                startIcon={<InfoOutlined />}
                color="inherit"
                onClick={() => setHistory(true)}
              >
                Lịch sử
              </Button>
              <Button
                variant="contained"
                startIcon={<FileDownload />}
                color="success"
                onClick={() => {
                  if (selectedOrders.length > 0) {
                    reportExcel.mutate();
                  } else {
                    showErrorAlert("Vui lòng chọn bản ghi cần tải xuống");
                  }
                }}
              >
                Tải xuống
              </Button>
            </Box>

            {/* Nhóm các Autocomplete và DatePicker lại với nhau */}
            <Box
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
              <TextField
                fullWidth
                size="small"
                value={value}
                placeholder="Thẻ lương, công việc ..."
                onChange={(e) => setValue(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Search sx={{ fontSize: 24 }} />
                    </InputAdornment>
                  ),
                }}
              ></TextField>
              {user?.role === RoleEnum.ADMIN && (
                <Autocomplete
                  fullWidth
                  options={departments}
                  getOptionLabel={(option: any) => option.code || ""}
                  value={
                    departments.find((p: any) => p._id === department) || null
                  }
                  onChange={(event, newValue) => {
                    setDepartment(newValue?._id || "");
                  }}
                  PopperComponent={StyledPopper}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      fullWidth
                      size="small"
                      label="Đơn vị"
                    />
                  )}
                />
              )}
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="Từ ngày"
                  inputFormat="DD/MM/YYYY"
                  value={startTime ? dayjs(startTime) : null}
                  onChange={(value) => setStartTime(value)}
                  renderInput={(params) => (
                    <TextField {...params} fullWidth size="small" />
                  )}
                />
              </LocalizationProvider>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="Đến ngày"
                  inputFormat="DD/MM/YYYY"
                  value={endTime ? dayjs(endTime) : null}
                  onChange={(value) => setEndTime(value)}
                  renderInput={(params) => (
                    <TextField {...params} fullWidth size="small" />
                  )}
                />
              </LocalizationProvider>
            </Box>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {selectedOrder && open && (
            <OrderFormEdit
              initialValues={selectedOrder}
              onSubmit={handleSubmit}
              onCancel={handleClose}
            />
          )}
          {!selectedOrder && open && (
            <OrderFormAdd onSubmit={handleSubmit} onCancel={handleClose} />
          )}
          {selectedOrder && transfer && (
            <OrderFormTransfer
              initialValues={selectedOrder}
              onCancel={handleClose}
            />
          )}
        </AccordionDetails>
      </Accordion>
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
            primary={`Tất cả (${statusCounts.all})`}
            sx={{ color: "blue" }}
          />
        </Box>
        <Box display="flex" alignItems={"center"}>
          <Checkbox
            color="default"
            name="status"
            checked={status === StatusOrderEnum.PENDING}
            onChange={() => handleChange(StatusOrderEnum.PENDING)}
          />
          <ListItemText
            primary={`Chưa nhận lệnh (${statusCounts.pending})`}
            sx={{ color: "grey" }}
          />
        </Box>
        <Box display="flex" alignItems={"center"}>
          <Checkbox
            color="success"
            name="status"
            checked={status === StatusOrderEnum.INPROGRESS}
            onChange={() => handleChange(StatusOrderEnum.INPROGRESS)}
          />
          <ListItemText
            primary={`Đã nhận lệnh (${statusCounts.in_progress})`}
            sx={{ color: "green" }}
          />
        </Box>
        <Box display="flex" alignItems={"center"}>
          <Checkbox
            color="warning"
            name="status"
            checked={status === StatusOrderEnum.WARNING}
            onChange={() => handleChange(StatusOrderEnum.WARNING)}
          />
          <ListItemText
            primary={`Lỗi (${statusCounts.warning})`}
            sx={{ color: "orange" }}
          />
        </Box>
        <Box display="flex" alignItems={"center"}>
          <Checkbox
            color="error"
            name="status"
            checked={status === StatusOrderEnum.COMPLETED}
            onChange={() => handleChange(StatusOrderEnum.COMPLETED)}
          />
          <ListItemText
            primary={`Đã kết thúc (${statusCounts.completed})`}
            sx={{ color: "red" }}
          />
        </Box>
        <Box display="flex" alignItems={"center"}>
          <Checkbox
            color="secondary"
            name="status"
            checked={status === StatusOrderEnum.CANCEL}
            onChange={() => handleChange(StatusOrderEnum.CANCEL)}
          />
          <ListItemText
            primary={`Đã hủy (${statusCounts.cancel})`}
            sx={{ color: "purple" }}
          />
        </Box>
      </Box>
      <Box display="flex" justifyContent="space-between" sx={{ mb: 2, mt: 2 }}>
        <Box display="flex" alignItems="center">
          <Typography variant="h4">Bảng lệnh sản xuất</Typography>
          <IconButton
            onClick={async () => {
              try {
                await refetchOrder(); // đợi xong refetch
                setAlert({
                  open: true,
                  message: "Cập nhật thành công",
                  severity: "success",
                });
              } catch (e) {
                setAlert({
                  open: true,
                  message: "Cập nhật thất bại",
                  severity: "error",
                });
              }
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              <CircularProgress size={24} />
            ) : (
              <RotateLeft
                sx={{
                  transition: "transform 0.3s ease",
                  "&:hover": { transform: "rotate(-180deg)" }, // xoay khi hover
                  color: "primary.main",
                }}
              />
            )}
          </IconButton>
        </Box>
        <Box display="flex" gap={2}>
          <IconButton
            color="primary"
            onClick={() => setInfo(!info)}
            sx={{
              textTransform: "none",
              borderRadius: 2,
              py: 0.75,
              border: "1px solid",
            }}
          >
            {info ? <VisibilityOff /> : <Visibility />}
          </IconButton>
          {user?.role === RoleEnum.ADMIN && (
            <IconButton
              color="primary"
              onClick={async () => {
                if (selectedOrders.length === 0)
                  return showErrorAlert("Vui lòng chọn bản ghi");
                reportListorderExcel.mutate();
              }}
              sx={{
                textTransform: "none",
                borderRadius: 2,
                py: 0.75,
                border: "1px solid",
              }}
            >
              <CloudUpload />
            </IconButton>
          )}
          {user?.role === RoleEnum.ADMIN && (
            <IconButton
              color="primary"
              onClick={async () => reportTravelogExcel.mutate()}
              sx={{
                textTransform: "none",
                borderRadius: 2,
                py: 0.75,
                border: "1px solid",
              }}
            >
              <Route />
            </IconButton>
          )}
        </Box>
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
      {isDownloadLoading && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" align="center">
            Đang xử lý...
          </Typography>
          <LinearProgress variant="determinate" />
        </Box>
      )}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={info ? 8 : 12} maxHeight="60vh">
          <DataGrid
            // rowSelection={rowSelection}
            pageSizeOptions={[20, 50, 100]}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            paginationMode="server"
            columns={filteredColumns}
            rows={orders}
            rowCount={total}
            loading={isLoading}
            disableRowSelectionOnClick
            checkboxSelection
            getRowId={(row) => row._id}
            rowSelectionModel={selectedOrders.map((o) => o._id)}
            onRowSelectionModelChange={(newIds) => {
              const selected = orders.filter((row: any) =>
                newIds.includes(row._id),
              );
              setSelectedOrders(selected);
            }}
            onRowClick={(params) => setSelectedRow(params.row)}
            getRowClassName={(params) => {
              // Lấy dữ liệu hàng từ params.row
              const record = params.row;
              let base = "";

              switch (record.status) {
                case StatusOrderEnum.PENDING:
                  base = "row-pending";
                  break;
                case StatusOrderEnum.INPROGRESS:
                  base = "row-in-progress";
                  break;
                case StatusOrderEnum.COMPLETED:
                  base = "row-completed";
                  break;
                case StatusOrderEnum.WARNING:
                  base = "row-warning";
                  break;
                case StatusOrderEnum.CANCEL:
                  base = "row-cancel";
                  break;
              }

              // So sánh ID để xác định hàng được chọn
              return `${base} ${selectedRow?._id === record._id ? "row-selected" : ""}`;
            }}
            disableVirtualization={true}
            filterMode="server"
            initialState={{
              density: "compact",
            }}
            slots={{ toolbar: GridToolbar }}
            localeText={{
              toolbarColumns: "Cột",
              toolbarFilters: "Bộ lọc",
              toolbarDensity: "Mật độ",
              toolbarExport: "Xuất dữ liệu",
            }}
            slotProps={{
              filterPanel: {
                disableAddFilterButton: false,
              },
              toolbar: {
                csvOptions: { disableToolbarButton: true },
                printOptions: { disableToolbarButton: true },
              },
            }}
            onFilterModelChange={(model) => {
              const filters: Record<string, string> = {};
              model.items.forEach((item) => {
                if (item.value) {
                  filters[item.field] = item.value; // Bỏ qua operator
                }
              });
              setServerFilters(filters);
            }}
            sx={{
              // Áp dụng cho tiêu đề cột
              "& .MuiDataGrid-columnHeaderCheckbox, & .MuiDataGrid-cellCheckbox":
                {
                  position: "sticky",
                  left: 0,
                  zIndex: 11,
                  backgroundColor: "inherit !important",
                },
              '& .MuiDataGrid-columnHeader[data-field="number"]': {
                position: "sticky",
                left: 50,
                zIndex: 11,
                backgroundColor: "inherit !important",
              },
              '& .MuiDataGrid-cell[data-field="number"]': {
                position: "sticky",
                left: 50,
                zIndex: 10,
                backgroundColor: "inherit !important",
              },

              '& .MuiDataGrid-columnHeader[data-field="assignedTo"]': {
                position: "sticky",
                left: 100, // 👈 phải đúng bằng width cột number
                zIndex: 11,
                backgroundColor: "inherit !important",
                boxShadow: "2px 0 4px rgba(0,0,0,0.1)",
              },
              '& .MuiDataGrid-cell[data-field="assignedTo"]': {
                position: "sticky",
                left: 100,
                zIndex: 10,
                backgroundColor: "inherit !important",
                boxShadow: "2px 0 4px rgba(0,0,0,0.1)",
              },
              "& .MuiDataGrid-virtualScroller": {
                overflowX: "auto",
              },
            }}
          />
        </Grid>
        {info && (
          <Grid item xs={12} sm={4}>
            <Box
              sx={{
                position: "sticky",
                top: 0,
                maxHeight: "80vh",
                overflowY: "auto",
                border: "1px solid #ccc",
                borderRadius: 2,
                p: 1.5, // Giảm padding một chút để phù hợp với cột nhỏ hơn
                transition:
                  "width 0.3s ease-in-out, background-color 0.3s ease-in-out", // Thêm hiệu ứng chuyển đổi
              }}
            >
              <Box
                display="flex"
                justifyContent={info ? "space-between" : "center"}
                alignItems="flex-start"
                flexDirection={info ? "row" : "column"}
              >
                {info && (
                  <Typography variant="h6" sx={{ mb: 2, fontSize: "1.2rem" }}>
                    Thông tin lệnh sản xuất
                  </Typography>
                )}
              </Box>
              {info && selectedRow ? (
                <Box>
                  <Typography sx={{ display: "flex", gap: 3 }}>
                    <Typography>
                      <strong>Đơn vị: </strong>
                      {selectedRow.assignedTo?.department?.code}
                    </Typography>
                    <Typography>
                      <strong>Ngày: </strong>
                      {selectedRow.workingDate
                        ? format(
                            new Date(selectedRow.workingDate),
                            "dd-MM-yyyy",
                          )
                        : ""}
                    </Typography>
                    <Typography>
                      <strong>Ca: </strong> {selectedRow.shift?.name}
                    </Typography>
                  </Typography>
                  <Grid container spacing={2}>
                    {/* Người nhận lệnh */}
                    <Grid item xs={12} sm={4}>
                      <Typography fontWeight="bold">Người ra lệnh:</Typography>
                      <Typography>{selectedRow.createdBy?.fullName}</Typography>
                    </Grid>

                    {/* Thẻ lương */}
                    <Grid item xs={12} sm={4}>
                      <Typography fontWeight="bold">Số thẻ:</Typography>
                      <Typography>
                        {selectedRow.createdBy?.salaryCode}
                      </Typography>
                    </Grid>
                    {/* Chức vụ */}
                    <Grid item xs={12} sm={4}>
                      <Typography fontWeight="bold">Chức vụ:</Typography>
                      <Typography>
                        {selectedRow.createdBy?.position?.name}
                      </Typography>
                    </Grid>
                  </Grid>
                  <Grid container spacing={2}>
                    {/* Người nhận lệnh */}
                    <Grid item xs={12} sm={4}>
                      <Typography fontWeight="bold">
                        Người nhận lệnh:
                      </Typography>
                      <Typography>
                        {selectedRow.assignedTo?.fullName}
                      </Typography>
                    </Grid>

                    {/* Thẻ lương */}
                    <Grid item xs={12} sm={4}>
                      <Typography fontWeight="bold">Số thẻ:</Typography>
                      <Typography>
                        {selectedRow.assignedTo?.salaryCode}
                      </Typography>
                    </Grid>
                    {/* Chức vụ */}
                    <Grid item xs={12} sm={4}>
                      <Typography fontWeight="bold">Chức vụ:</Typography>
                      <Typography>
                        {selectedRow.assignedTo?.position?.name}
                      </Typography>
                    </Grid>
                  </Grid>
                  {[
                    JobTypeEnum.EXCAVATOR,
                    JobTypeEnum.DRILL,
                    JobTypeEnum.DOZER,
                    JobTypeEnum.VEHICLE,
                    JobTypeEnum.MAINTENANCE,
                  ].includes(selectedRow.job?.type) && (
                    <Grid container spacing={2}>
                      {/* Người nhận lệnh */}
                      <Grid item xs={12} sm={4}>
                        <Typography fontWeight="bold">
                          {selectedRow.job?.type === JobTypeEnum.VEHICLE
                            ? "Lái xe bổ túc"
                            : selectedRow.job?.type === JobTypeEnum.MAINTENANCE
                              ? "Phụ sửa chữa"
                              : "Phụ máy"}
                          :
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={8}>
                        {selectedRow.assistants.map((i: any) => (
                          <Typography>
                            {i?.fullName || ""} {i?.salaryCode || ""}
                          </Typography>
                        ))}
                      </Grid>
                    </Grid>
                  )}
                  <Typography>
                    <strong>Công việc:</strong> {selectedRow.job?.name}
                  </Typography>
                  {selectedRow.device?.length > 0 && (
                    <Typography>
                      <strong>Thiết bị vận hành:</strong>{" "}
                      {selectedRow.device
                        ?.map((dev: any) => dev.code)
                        .join(", ")}
                    </Typography>
                  )}
                  {selectedRow.repairDepartment && (
                    <Typography>
                      <strong>Đơn vị sửa chữa:</strong>{" "}
                      {selectedRow.repairDepartment?.code}
                    </Typography>
                  )}
                  {[JobTypeEnum.MAINTENANCE].includes(
                    selectedRow.job?.type,
                  ) && (
                    <Box>
                      <Typography>
                        <strong>Thiết bị sửa chữa:</strong>
                      </Typography>
                      {(selectedRow?.repairVehicles || []).map((v: any) => (
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={3}>
                            <Typography fontWeight="bold">
                              + {v?.device?.code}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={9}>
                            <Typography>{v?.note || ""}</Typography>
                          </Grid>
                        </Grid>
                      ))}
                    </Box>
                  )}
                  {selectedRow.assignedVehicles?.length > 0 && (
                    <Typography>
                      <strong>Thiết bị nhận tải:</strong>{" "}
                      {selectedRow.assignedVehicles
                        ?.map((dev: any) => dev?.code)
                        .join(", ")}
                    </Typography>
                  )}
                  {selectedRow.excavator?.length > 0 && (
                    <Typography>
                      <strong>Máy xúc:</strong>{" "}
                      {selectedRow.excavator
                        ?.map((dev: any) => dev.device?.code)
                        .join(", ")}
                    </Typography>
                  )}
                  {selectedRow.material?.length > 0 && (
                    <Typography>
                      <strong>Vật liệu:</strong>{" "}
                      {selectedRow.material
                        ?.map((dev: any) => dev.name)
                        .join(", ")}
                    </Typography>
                  )}
                  {selectedRow.location?.length > 0 && (
                    <Typography>
                      <strong>Điểm đổ:</strong>{" "}
                      {selectedRow.location
                        ?.map((dev: any) => dev.name)
                        .join(", ")}
                    </Typography>
                  )}
                  <Typography>
                    <strong>Nội dung lệnh:</strong> {selectedRow.workContent}
                  </Typography>
                  <Typography>
                    <strong>Trạng thái lệnh:</strong>{" "}
                    {selectedRow.status === StatusOrderEnum.PENDING
                      ? "Chưa nhận lệnh"
                      : selectedRow.status === StatusOrderEnum.INPROGRESS
                        ? "Đã nhận lệnh"
                        : selectedRow.status === StatusOrderEnum.COMPLETED
                          ? "Đã hoàn thành"
                          : selectedRow.status === StatusOrderEnum.WARNING
                            ? "Lỗi"
                            : "Đã hủy"}
                  </Typography>
                  <Typography>
                    <strong>Nội dung bàn giao ca:</strong> {selectedRow?.note}
                  </Typography>
                </Box>
              ) : null}
            </Box>
          </Grid>
        )}
      </Grid>
      <OrderHistories
        open={history}
        setOpen={setHistory}
        selectedOrders={selectedOrders}
        setSelectedOrders={setSelectedOrders}
      />
      <ShiftReport
        open={shiftReport}
        setOpen={setShiftReport}
        initialValues={selectedOrder}
      />
    </Box>
  );
};

export default Orders;
