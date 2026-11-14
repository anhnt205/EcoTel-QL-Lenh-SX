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
import { LocalizationProvider } from "@mui/x-date-pickers";
import DateFilterField from "../../components/design/DateFilterField";
import { AdapterDayjs } from "../../components/design/AdapterDayjs";
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
  GridSortModel,
  useGridApiRef,
} from "@mui/x-data-grid";
import { StyledPopper } from "../../ui/poppers";
import DIcon from "../../components/design/DIcon";
import { ColumnToggleButton } from "../../components/design/tableLayout";
import "../../styles/catalog-design.css";
import { AUTOSIZE, LayoutToolbar } from "../../components/Table/CustomDataGrid";
import DataGridLayoutButton, { HEADER_HEIGHT, ROW_HEIGHT, type RowPreset } from "../../components/Table/DataGridLayoutButton";
import { JobTypeEnum, RoleEnum, StatusOrderEnum } from "../../enums/index";
import OrderHistories from "../../components/Modal/OrderHistories";
import ShiftReport from "../../components/Modal/ShiftReport";
import DepartmentService from "../../services/departmentService";
import OrderService from "../../services/orderService";
import { parseAxiosError } from "../../utils/handleApiError";
import { Download, FileSpreadsheet, Pencil, Plus, Route, Trash2 } from "lucide-react";
import SearchInput from "../../components/SearchInput";

/**
 * Bảng Lệnh sản xuất: mặc định 15 dòng/trang, khung bảng cao đúng 15 dòng (không cuộn). Chọn nhiều dòng hơn ở ô "Số dòng"
 * (chân trang) thì khung giữ nguyên chiều cao 15 dòng và CUỘN DỌC bên trong bảng.
 */
const ORDERS_PAGE_SIZE = 15;
const ORDERS_PAGE_SIZE_OPTIONS = [15, 20, 50, 100];
/** Phần ngoài các dòng dữ liệu: chân trang (52) + thanh cuộn ngang (~17) + viền (2). */
const GRID_CHROME = 52 + 17 + 2;

const Orders: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState(false);
  const [shiftReport, setShiftReport] = useState(false);
  const [transfer, setTransfer] = useState(false);
  const [status, setStatus] = useState("");
  // Mặc định = tháng hiện tại (ngày 1 → ngày cuối tháng), giống màn Nhập liệu khai thác.
  const [startTime, setStartTime] = useState<Dayjs | null>(() => dayjs().startOf("month"));
  const [endTime, setEndTime] = useState<Dayjs | null>(() => dayjs().endOf("month"));
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
    pageSize: ORDERS_PAGE_SIZE,
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

  // Lọc theo cột kiểu Excel: mỗi cột giữ danh sách giá trị đã tick (null = không lọc)
  const [serverFilters, setServerFilters] = useState<
    Record<string, string[] | null>
  >({});

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: () => DepartmentService.getAll(),
  });

  // Bộ lọc hiện hành (ngày, đơn vị, trạng thái, tìm kiếm, các cột đã tick) — dùng cho cả danh sách lệnh lẫn danh sách giá trị của hộp lọc cột
  const baseParams: Record<string, any> = {
    department: department,
    status: status || undefined,
    startTime: startTime ? startTime.toISOString() : "",
    endTime: endTime ? endTime.toISOString() : "",
    q: value,
  };
  Object.entries(serverFilters).forEach(([f, arr]) => {
    if (arr && arr.length) baseParams[`${f}__in`] = JSON.stringify(arr);
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
        ...baseParams,
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

  // "Chỉnh sửa" ở đầu trang: sửa lệnh đang được tích chọn (đúng 1 lệnh), giống Nhập liệu Khai thác.
  const handleEditSelected = () => {
    if (selectedOrders.length === 0) return showErrorAlert("Vui lòng chọn lệnh cần chỉnh sửa");
    if (selectedOrders.length > 1) return showErrorAlert("Chỉ chỉnh sửa được một lệnh mỗi lần");
    handleOpen(selectedOrders[0]);
  };

  // Phím tắt F3 = Thêm mới (như Nhập liệu Khai thác)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F3") {
        e.preventDefault();
        handleOpen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

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

  // Hiển thị bảng theo thiết kế: lúc đầu "vừa nội dung" (hiện đủ ký tự), nút Vừa nội dung / Chia đều, Mật độ = chiều cao hàng.
  // Cột dính trái (STT, Người nhận lệnh) giữ bề rộng cố định vì vị trí dính tính theo bề rộng đó.
  const gridApiRef = useGridApiRef();
  const [dlAnchor, setDlAnchor] = useState<HTMLElement | null>(null);
  // Chiều cao hàng DỮ LIỆU (Gọn 30 / Vừa 39 / Rộng 56); hàng tiêu đề luôn 43px — đúng như bảng danh mục
  const [rowPreset, setRowPreset] = useState<RowPreset>("standard");
  // chiều cao khung bảng = tiêu đề + đúng 15 dòng (theo độ cao hàng đang chọn) + chân trang; trên 15 dòng/trang thì cuộn dọc trong khung
  const ordersGridHeight = HEADER_HEIGHT + ORDERS_PAGE_SIZE * ROW_HEIGHT[rowPreset] + GRID_CHROME;
  const gridUserSized = useRef(false);
  const gridAutosize = () => {
    const api = gridApiRef.current;
    if (!api?.autosizeColumns) return Promise.resolve();
    const fields = api.getVisibleColumns().map((c) => c.field).filter((f) => !["__check__", "number", "assignedTo"].includes(f));
    return api.autosizeColumns({ ...AUTOSIZE, columns: fields }).then(() => {
      const m: Record<string, number> = {};
      fields.forEach((f) => (m[f] = Math.round(api.getColumn(f)?.computedWidth ?? 0)));
      setColWidths((prev) => ({ ...prev, ...m }));
    });
  };
  useEffect(() => {
    if (isLoading || orders.length === 0 || gridUserSized.current) return;
    const t = window.setTimeout(() => void gridAutosize(), 80);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, isLoading]);

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

  // ── Bề rộng cột + lọc theo cột (nút ba chấm ở tiêu đề) ──
  // Bề rộng giữ trong state vì `orderColumns` được dựng lại mỗi lần render (nếu không, mọi chỉnh sửa bề rộng bị đặt lại).
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  // Các cột máy chủ hỗ trợ lọc (xem tham số của truy vấn danh sách lệnh)
  const FILTER_FIELDS = [
    "assignedTo",
    "salaryCode",
    "workingDate",
    "shift",
    "job",
    "workContent",
    "device",
    "repairVehicles",
    "excavator",
    "material",
    "location",
    "createdBy",
  ];
  const [filterPop, setFilterPop] = useState<{ field: string; label: string; top: number; left: number } | null>(null);
  // ── Sắp xếp theo cột (nút ⇅ ở tiêu đề, giống màn Chủng loại hàng): sắp xếp các dòng của trang đang xem ──
  const [sortModel, setSortModel] = useState<GridSortModel>([]);
  const NO_TOOLS = ["number", "view", "edit", "cancel", "transfer"]; // cột STT / thao tác: không sắp xếp, không lọc
  const viCollator = React.useMemo(() => new Intl.Collator("vi", { numeric: true, sensitivity: "base" }), []);
  /** Chữ dùng để sắp xếp của từng cột (các cột chứa object lồng nhau nên không thể so sánh trực tiếp giá trị gốc). */
  const sortText = (field: string, row: any): string => {
    const codes = (arr: any[] | undefined, pick: (x: any) => any) => (arr ?? []).map((x) => String(pick(x) ?? "")).join(", ");
    switch (field) {
      case "assignedTo":
        return row.assignedTo?.fullName ?? "";
      case "salaryCode":
        return row.assignedTo?.salaryCode ?? "";
      case "shift":
        return row.shift?.name ?? "";
      case "job":
        return row.job?.name ?? "";
      case "device":
        return codes(row.device, (d) => d.code);
      case "repairVehicles":
        return codes(row.repairVehicles, (d) => d.device?.code);
      case "excavator":
        return codes(row.excavator, (d) => d.device?.code);
      case "material":
        return codes(row.material, (m) => m.name);
      case "location":
        return codes(row.location, (l) => l.name);
      case "createdBy":
        return row.createdBy?.fullName ?? "";
      case "deviceStatus":
        return codes(row.shiftReport?.vehicleSummaries, (i) => (i.status === "good" ? "Tốt" : "Hỏng"));
      default:
        return String(row[field] ?? ""); // chữ / ngày dạng ISO (so sánh chuỗi đúng thứ tự thời gian)
    }
  };
  const cycleSort = (field: string) => {
    setSortModel((m) => {
      const cur = m.find((s) => s.field === field)?.sort;
      return cur === "asc" ? [{ field, sort: "desc" }] : cur === "desc" ? [] : [{ field, sort: "asc" }];
    });
  };
  const gridColumns = filteredColumns.map((col: GridColDef) => {
    const field = String(col.field);
    const next: GridColDef = { ...col, width: colWidths[field] ?? col.width };
    if (NO_TOOLS.includes(field)) return { ...next, sortable: false };
    next.sortComparator = (_a, _b, p1, p2) => viCollator.compare(sortText(field, p1.api.getRow(p1.id) ?? {}), sortText(field, p2.api.getRow(p2.id) ?? {}));
    const dir = sortModel.find((s) => s.field === field)?.sort;
    const filterable = FILTER_FIELDS.includes(field);
    const selCount = serverFilters[field]?.length ?? 0;
    const active = filterable && selCount > 0;
    next.renderHeader = () => (
      <span className="orders-th">
        <span className="orders-th-label">{col.headerName}</span>
        <span className="th-tools">
          <button
            type="button"
            className={`col-sort-btn ${dir ? "active" : ""}`}
            title={dir === "asc" ? "Đang sắp xếp tăng dần — bấm để giảm dần" : dir === "desc" ? "Đang sắp xếp giảm dần — bấm để bỏ sắp xếp" : `Sắp xếp theo ${col.headerName}`}
            aria-label={`Sắp xếp theo ${col.headerName}`}
            onClick={(e) => {
              e.stopPropagation();
              cycleSort(field);
            }}
          >
            <DIcon name="sort" />
          </button>
          {filterable && (
            <button
              type="button"
              className={`col-filter-btn ${active ? "active" : ""}`}
              title={active ? `Đang lọc ${selCount} giá trị — bấm để sửa` : `Lọc theo ${col.headerName}`}
              aria-label={`Lọc theo ${col.headerName}`}
              onClick={(e) => {
                e.stopPropagation();
                const r = e.currentTarget.getBoundingClientRect();
                setFilterPop((p) =>
                  p?.field === field
                    ? null
                    : { field, label: String(col.headerName ?? field), top: r.bottom + 6, left: Math.max(8, Math.min(r.right - 280, window.innerWidth - 288)) },
                );
              }}
            >
              <DIcon name="more-vertical" />
            </button>
          )}
        </span>
      </span>
    );
    return next;
  });
  const setColumnFilter = (field: string, v: string[] | null) => {
    setServerFilters((prev) => ({ ...prev, [field]: v && v.length ? v : null }));
    setPaginationModel((m) => ({ ...m, page: 0 }));
  };
  // ── Hộp lọc kiểu Excel: liệt kê các giá trị của cột để tick chọn, có ô tìm kiếm ──
  const serverFiltersRef = useRef(serverFilters);
  serverFiltersRef.current = serverFilters;
  const filterField = filterPop?.field ?? null;
  const [filterSearch, setFilterSearch] = useState("");
  /** Các giá trị đang tick; null = tất cả (không lọc) */
  const [filterSel, setFilterSel] = useState<Set<string> | null>(null);
  const filterInitialRef = useRef<Set<string> | null>(null);
  // bỏ dấu + không phân biệt hoa thường để tìm "nguyen" ra "Nguyễn"
  const normText = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase();
  // danh sách giá trị của cột đang mở: áp mọi bộ lọc hiện hành trừ chính cột này (máy chủ lo phần đó)
  const { data: colValuesData, isFetching: colValuesLoading } = useQuery({
    queryKey: ["orders-col-values", filterField, baseParams],
    queryFn: () => OrderService.getColumnValues({ field: filterField, ...baseParams }),
    enabled: Boolean(filterField),
    staleTime: 0,
  });
  const colValues = colValuesData?.values ?? [];
  const searchNorm = normText(filterSearch.trim());
  const filterItems = searchNorm ? colValues.filter((v) => normText(v).includes(searchNorm)) : colValues;
  const isChecked = (v: string) => filterSel === null || filterSel.has(v);
  const allShownChecked = filterItems.length > 0 && filterItems.every(isChecked);
  const checkedCount = filterSel === null ? colValues.length : colValues.filter((v) => filterSel.has(v)).length;
  // mở hộp lọc ở cột nào thì nạp các giá trị đang tick của cột đó
  useEffect(() => {
    setFilterSearch("");
    const cur = filterField ? serverFiltersRef.current[filterField] : null;
    const init = cur && cur.length ? new Set(cur) : null;
    filterInitialRef.current = init;
    setFilterSel(init);
  }, [filterField]);
  const toggleFilterValue = (v: string) => {
    const next = new Set(filterSel ?? colValues);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    setFilterSel(next);
  };
  const toggleAllShown = () => {
    if (!searchNorm) {
      setFilterSel(allShownChecked ? new Set() : null);
      return;
    }
    const next = new Set(filterSel ?? colValues);
    filterItems.forEach((v) => (allShownChecked ? next.delete(v) : next.add(v)));
    setFilterSel(next);
  };
  // gõ tìm kiếm: như Excel, chỉ các kết quả khớp được tick; xoá ô tìm kiếm thì trở lại lựa chọn ban đầu
  const onFilterSearchChange = (s: string) => {
    setFilterSearch(s);
    const n = normText(s.trim());
    setFilterSel(n ? new Set(colValues.filter((v) => normText(v).includes(n))) : filterInitialRef.current);
  };
  const applyColumnFilter = () => {
    if (!filterField) return;
    const picked = filterSel === null ? null : colValues.filter((v) => filterSel.has(v));
    // tick đủ tất cả = không lọc
    setColumnFilter(filterField, picked === null || picked.length === colValues.length ? null : picked);
    setFilterPop(null);
  };
  // bấm ra ngoài / Esc: đóng, không áp dụng (như Excel)
  useEffect(() => {
    if (!filterField) return;
    const close = (e: Event) => {
      if ((e.target as HTMLElement | null)?.closest?.(".col-filter-pop, .col-filter-btn")) return;
      setFilterPop(null);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setFilterPop(null);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [filterField]);

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
    <div className="tkc">
      <AlertSnackbar alert={alert} setAlert={setAlert} />

      {/* Đầu trang: cùng thiết kế với màn Nhập liệu Khai thác (Thống kê) — tiêu đề + mô tả bên trái, nút chức năng bên phải */}
      <div className="page-head">
        <div className="heading">
          <span className="heading-icon">
            <FileSpreadsheet />
          </span>
          <div>
            <h1>DANH SÁCH LỆNH SẢN XUẤT</h1>
            <p>Giao, theo dõi và bàn giao lệnh sản xuất theo ca</p>
          </div>
        </div>
        <div className="head-actions">
          <button className="hb hb-primary" onClick={() => handleOpen()}>
            <Plus className="ic-lg" />
            Thêm mới (F3)
          </button>
          <button className="hb" onClick={handleEditSelected}>
            <Pencil />
            Chỉnh sửa
          </button>
          <button className="hb hb-danger" onClick={handleDelete}>
            <Trash2 />
            Xóa {selectedOrders.length > 0 ? `(${selectedOrders.length})` : ""}
          </button>
          <span className="head-sep" aria-hidden />
          <button
            className="hb"
            title={
              user?.role === RoleEnum.ADMIN
                ? "Tải file Excel các lệnh đã chọn (phiếu lệnh hoặc danh sách)"
                : "Tải file Excel của các lệnh đã chọn"
            }
            onClick={(e) => {
              if (selectedOrders.length === 0) return showErrorAlert("Vui lòng chọn bản ghi cần tải xuống");
              // admin: chọn kiểu file; vai trò khác: tải phiếu lệnh như trước
              if (user?.role === RoleEnum.ADMIN) setDlAnchor(e.currentTarget);
              else reportExcel.mutate();
            }}
          >
            <Download />
            Tải xuống (Excel)
          </button>
          <Menu anchorEl={dlAnchor} open={Boolean(dlAnchor)} onClose={() => setDlAnchor(null)}>
            <MenuItem
              onClick={() => {
                setDlAnchor(null);
                reportExcel.mutate();
              }}
            >
              Phiếu lệnh đã chọn
            </MenuItem>
            <MenuItem
              onClick={() => {
                setDlAnchor(null);
                reportListorderExcel.mutate();
              }}
            >
              Danh sách lệnh đã chọn
            </MenuItem>
          </Menu>
        </div>
      </div>

      {/* Biểu mẫu Thêm / Sửa / Chuyển lệnh: chỉ hiện khi đang thao tác */}
      {expanded && (
        <Accordion expanded ref={formRef} sx={{ mb: 2 }}>
          <AccordionSummary sx={{ display: "none" }} />
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
      )}

      {/* Thẻ lọc riêng (như Nhập liệu Khai thác): Thời gian bắt đầu - kết thúc → Đơn vị → ô tìm kiếm (giãn hết chỗ còn lại) → Làm mới */}
      <section className="filter-card orders-filters">
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DateFilterField label="Thời gian bắt đầu" value={startTime} onChange={setStartTime} />
          <span className="date-dash">-</span>
          <DateFilterField label="Thời gian kết thúc" value={endTime} onChange={setEndTime} />
        </LocalizationProvider>
        {user?.role === RoleEnum.ADMIN && (
          <div className="date-field">
            <span className="date-field-label">Đơn vị</span>
            <Autocomplete
              sx={{ width: 200 }}
              options={departments}
              getOptionLabel={(option: any) => option.code || ""}
              value={departments.find((p: any) => p._id === department) || null}
              onChange={(event, newValue) => {
                setDepartment(newValue?._id || "");
              }}
              PopperComponent={StyledPopper}
              renderInput={(params) => <TextField {...params} size="small" placeholder="Chọn đơn vị..." />}
            />
          </div>
        )}
        <Box sx={{ flex: "1 1 280px", minWidth: 240 }}>
          <SearchInput
            placeholder="Tìm theo thẻ lương, công việc ..."
            value={value}
            onChange={setValue}
          />
        </Box>
        <button
          className="hb hb-icon"
          title="Làm mới danh sách"
          aria-label="Làm mới"
          disabled={isLoading}
          onClick={async () => {
            try {
              await refetchOrder();
              setAlert({ open: true, message: "Cập nhật thành công", severity: "success" });
            } catch (e) {
              setAlert({ open: true, message: "Cập nhật thất bại", severity: "error" });
            }
          }}
        >
          <DIcon name="refresh" />
        </button>
      </section>

      <section className="panel">
        {/* Một hàng duy nhất: trạng thái lệnh (trái) · Lịch sử / Thông tin lệnh / Cột / Hiển thị bảng (phải) */}
        <div className="panel-bar">
        {/* Lọc theo trạng thái lệnh (mỗi trạng thái một màu, khớp màu dòng trong bảng) */}
        <div className="status-chips">
          {(
            [
              ["", `Tất cả (${statusCounts.all})`, "all"],
              [StatusOrderEnum.PENDING, `Chưa nhận lệnh (${statusCounts.pending})`, "pending"],
              [StatusOrderEnum.INPROGRESS, `Đã nhận lệnh (${statusCounts.in_progress})`, "in-progress"],
              [StatusOrderEnum.WARNING, `Lỗi (${statusCounts.warning})`, "warning"],
              [StatusOrderEnum.COMPLETED, `Đã kết thúc (${statusCounts.completed})`, "completed"],
              [StatusOrderEnum.CANCEL, `Đã hủy (${statusCounts.cancel})`, "cancel"],
            ] as [string, string, string][]
          ).map(([val, label, tone]) => (
            <button
              key={tone}
              type="button"
              className={`status-chip tone-${tone} ${status === val ? "on" : ""}`}
              onClick={() => handleChange(val)}
            >
              <span className="dot" />
              {label}
            </button>
          ))}
        </div>

        {/* Lịch sử · Thông tin lệnh · Hiển thị cột/bảng — cùng hàng với trạng thái, căn phải */}
          <div className="toolbar-right">
            <button className="btn" onClick={() => setHistory(true)}>
              <DIcon name="eye" />
              Lịch sử
            </button>
            <button
              className="btn"
              title={info ? "Ẩn khung thông tin lệnh" : "Hiện khung thông tin lệnh"}
              onClick={() => setInfo(!info)}
            >
              <DIcon name={info ? "minimize" : "maximize"} />
              Thông tin lệnh
            </button>
            <ColumnToggleButton
              layout={{
                hidden: new Set(defaultColumns.filter((c) => !visibleColumns.includes(c.id)).map((c) => c.id)),
                toggleHidden: handleToggleColumn,
                showAll: () => setVisibleColumns(defaultColumns.map((c) => c.id)),
              }}
              columns={defaultColumns.filter((c) => c.id !== "number").map((c) => ({ key: c.id, label: c.label }))}
            />
            <DataGridLayoutButton
              iconOnly
              look="design"
              apiRef={gridApiRef}
              rowPreset={rowPreset}
              onRowPreset={setRowPreset}
              lockedFields={["number", "assignedTo"]}
              setWidths={(patch) => setColWidths((prev) => ({ ...prev, ...patch }))}
              onUserSized={(v) => {
                gridUserSized.current = v;
              }}
            />
          </div>
        </div>

        {isDownloadLoading && (
          <Box sx={{ mb: 1.5 }}>
            <Typography variant="body2" align="center">
              Đang xử lý...
            </Typography>
            <LinearProgress />
          </Box>
        )}

      <Grid container spacing={2} sx={{ mb: 0 }}>
        <Grid item xs={12} sm={info ? 8 : 12} sx={{ height: ordersGridHeight }}>
          <DataGrid
            className="orders-grid"
            sortModel={sortModel}
            onSortModelChange={setSortModel}
            disableColumnMenu
            // rowSelection={rowSelection}
            pageSizeOptions={ORDERS_PAGE_SIZE_OPTIONS}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            paginationMode="server"
            columns={gridColumns}
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
            density="standard"
            rowHeight={ROW_HEIGHT[rowPreset]}
            columnHeaderHeight={HEADER_HEIGHT}
            apiRef={gridApiRef}
            autosizeOptions={AUTOSIZE}
            onColumnWidthChange={(p) => {
              // giữ bề rộng cột trong state (cột dựng lại mỗi lần render nên nếu không giữ sẽ bị đặt lại)
              setColWidths((prev) => (prev[p.colDef.field] === p.width ? prev : { ...prev, [p.colDef.field]: p.width }));
            }}
            onColumnResize={() => {
              gridUserSized.current = true;
            }}
            localeText={{
              toolbarColumns: "Cột",
              toolbarFilters: "Bộ lọc",
              toolbarDensity: "Mật độ",
              toolbarExport: "Xuất dữ liệu",
              noRowsLabel: "Không có dữ liệu",
              footerRowSelected: (count) => `Đã chọn ${count} dòng`,
              MuiTablePagination: {
                labelRowsPerPage: "Số dòng:",
                labelDisplayedRows: ({ from, to, count }) =>
                  `Hiển thị ${from}–${to} trong tổng ${count === -1 ? `hơn ${to}` : count} bản ghi`,
              },
            }}
            slotProps={{
                pagination: { showFirstButton: true, showLastButton: true } as any,
              filterPanel: {
                disableAddFilterButton: false,
              },
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
              height: "100%",
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
                maxHeight: ordersGridHeight,
                overflowY: "auto",
                border: "1px solid #d6e3f3",
                borderRadius: "10px",
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
      </section>
      {filterPop && (
        <div className="col-filter-pop xl" style={{ top: filterPop.top, left: filterPop.left }} role="dialog" aria-label={`Lọc ${filterPop.label}`}>
          <div className="xl-title">Lọc: {filterPop.label}</div>
          <input
            autoFocus
            className="xl-search"
            placeholder="Tìm kiếm…"
            value={filterSearch}
            onChange={(e) => onFilterSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyColumnFilter();
            }}
          />
          <div className="xl-list">
            <label className="xl-item xl-all">
              <input type="checkbox" checked={allShownChecked} onChange={toggleAllShown} disabled={!filterItems.length} />
              <span>{searchNorm ? "(Chọn tất cả kết quả tìm kiếm)" : "(Chọn tất cả)"}</span>
            </label>
            {colValuesLoading && !colValues.length && <div className="xl-empty">Đang tải…</div>}
            {!colValuesLoading && !filterItems.length && <div className="xl-empty">Không có giá trị nào</div>}
            {filterItems.map((v) => (
              <label key={v} className="xl-item" title={v}>
                <input type="checkbox" checked={isChecked(v)} onChange={() => toggleFilterValue(v)} />
                <span>{v}</span>
              </label>
            ))}
          </div>
          {colValuesData?.truncated && <div className="xl-note">Chỉ hiện {colValues.length} giá trị đầu — gõ tìm kiếm để thu hẹp.</div>}
          <div className="xl-count">{checkedCount}/{colValues.length} giá trị được chọn</div>
          <div className="pop-actions">
            <button
              type="button"
              onClick={() => {
                setColumnFilter(filterPop.field, null);
                setFilterPop(null);
              }}
            >
              Xóa lọc
            </button>
            <button type="button" onClick={() => setFilterPop(null)}>
              Hủy
            </button>
            <button type="button" className="primary" onClick={applyColumnFilter} disabled={colValues.length > 0 && checkedCount === 0}>
              Áp dụng
            </button>
          </div>
        </div>
      )}
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
    </div>
  );
};

export default Orders;
