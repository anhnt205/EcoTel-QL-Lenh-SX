import React, { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Button,
  ButtonBase,
  IconButton,
  Typography,
  TextField,
  MenuItem,
  Tooltip,
  Autocomplete,
  Menu,
  Switch,
  ListItemText,
  ListItemIcon,
  Divider,
  Collapse,
  Paper,
  Popover,
  Select,
  InputAdornment,
  CircularProgress,
  AlertColor,
  LinearProgress,
} from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { format } from "date-fns";
import {
  Add as AddIcon,
  Edit as EditIcon,
  DeleteOutline as DeleteIcon,
  Search,
  FileDownload,
  SyncAlt,
  Visibility,
  CancelOutlined,
  Refresh,
  History as HistoryIcon,
  CalendarMonth,
  ExpandMore,
  FilterAlt,
  RestartAlt,
  ViewColumn,
  ViewHeadline,
  MoreHoriz,
  Close as CloseIcon,
  ChevronLeft,
  ChevronRight,
  Check as CheckIcon,
  CloudUpload,
  ReceiptLong as ReceiptLongIcon,
} from "@mui/icons-material";
import { Order } from "../../types";
import OrderFormAdd from "./OrderFormAdd";
import OrderFormEdit from "./OrderFormEdit";
import OrderFormTransfer from "./OrderFormTransfer";
import dayjs, { Dayjs } from "dayjs";
import {
  AlertSnackbar,
  showConfirmAlert,
  showErrorAlert,
  showSuccessAlert,
} from "../../components/Alert";
import { useAtom } from "jotai";
import { userAtom } from "../../atoms/userAtoms";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { StyledPopper } from "../../ui/poppers";
import { RoleEnum, StatusOrderEnum } from "../../enums/index";
import OrderHistories from "../../components/Modal/OrderHistories";
import ShiftReport from "../../components/Modal/ShiftReport";
import DepartmentService from "../../services/departmentService";
import OrderService from "../../services/orderService";
import { parseAxiosError } from "../../utils/handleApiError";
import { Route } from "lucide-react";
import appTheme from "../../theme";
import { uiSansTheme, UI_FONT } from "../../theme/uiTheme";
import OrderDetailPanel from "./OrderDetailPanel";
import { ORDER_STATUS_META, StatusPill } from "./orderStatus";

const LINE = "#e5e9f0";
const INK = "#0f172a";
const MUTED = "#64748b";
const BLUE = "#1d6ff2";

// Ô 2 dòng: dòng trên đậm, dòng dưới nhỏ xám (đúng kiểu ảnh mẫu).
const TwoLine = ({
  top,
  bottom,
  bold,
}: {
  top?: string;
  bottom?: string;
  bold?: boolean;
}) => (
  <Box sx={{ minWidth: 0, lineHeight: 1.3 }}>
    <Box
      title={top || ""}
      sx={{
        fontSize: 13,
        fontWeight: bold ? 700 : 500,
        color: INK,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {top || "-"}
    </Box>
    <Box
      title={bottom || ""}
      sx={{
        fontSize: 11.5,
        color: MUTED,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {bottom || "-"}
    </Box>
  </Box>
);

// Ô 1 dòng
const OneLine = ({ value }: { value?: string }) => (
  <Box
    component="span"
    title={value || ""}
    sx={{
      fontSize: 13,
      color: INK,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    }}
  >
    {value || "-"}
  </Box>
);

// Tiêu đề cột 2 dòng: tên cột + phụ đề (vd "Người nhận lệnh" / "Số thẻ")
const Hdr = ({ title, sub }: { title: string; sub?: string }) => (
  <Box sx={{ lineHeight: 1.25, minWidth: 0 }}>
    <Box sx={{ fontSize: 12.5, fontWeight: 700, color: INK }}>{title}</Box>
    {sub && (
      <Box sx={{ fontSize: 11, fontWeight: 500, color: MUTED }}>{sub}</Box>
    )}
  </Box>
);

const NoOrders = () => (
  <Box
    sx={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 0.5,
      color: "#94a3b8",
    }}
  >
    <ReceiptLongIcon sx={{ fontSize: 40 }} />
    <Typography sx={{ fontSize: 14, fontWeight: 700, color: MUTED }}>
      Không có lệnh sản xuất nào
    </Typography>
    <Typography sx={{ fontSize: 12.5 }}>
      Thử đổi bộ lọc hoặc khoảng ngày, hoặc bấm "Tạo lệnh" để tạo lệnh mới
    </Typography>
  </Box>
);

// Dãy số trang: 1 … 4 5 6 … 20
const pageItems = (current: number, count: number): (number | "…")[] => {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const items: (number | "…")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(count - 1, current + 1);
  if (start > 2) items.push("…");
  for (let i = start; i <= end; i++) items.push(i);
  if (end < count - 1) items.push("…");
  items.push(count);
  return items;
};

// Các ô lọc nâng cao -> tham số máy chủ đã có sẵn (xem order.routes.js)
const ADVANCED_FIELDS: { key: string; label: string; hint: string }[] = [
  { key: "assignedTo", label: "Người nhận lệnh", hint: "Tên (gõ một phần)" },
  { key: "salaryCode", label: "Số thẻ lương", hint: "Chính xác" },
  { key: "createdBy", label: "Người ra lệnh", hint: "Tên (gõ một phần)" },
  { key: "shift", label: "Ca", hint: "Chính xác, vd 1, 2, 3" },
  { key: "job", label: "Công việc", hint: "Tên (gõ một phần)" },
  { key: "device", label: "Thiết bị", hint: "Mã (gõ một phần)" },
  { key: "material", label: "Vật liệu", hint: "Tên (gõ một phần)" },
];

// Ô chọn nhanh trên thanh công cụ (ô nhập nhìn như nút chọn)
const fieldButtonSx = {
  height: 40,
  px: 1.5,
  gap: 1,
  justifyContent: "flex-start",
  textTransform: "none",
  fontWeight: 500,
  fontSize: 13.5,
  color: INK,
  bgcolor: "#fff",
  border: `1px solid ${LINE}`,
  borderRadius: "8px",
  "&:hover": { bgcolor: "#f8fafc", borderColor: "#cbd5e1" },
} as const;

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

  // Cột bật/tắt được từ nút "Cột" (STT và Thao tác luôn hiện). id PHẢI trùng field của cột.
  const defaultColumns = [
    { id: "assignedTo", label: "Người nhận lệnh / Số thẻ" },
    { id: "workingDate", label: "Ngày / Ca" },
    { id: "job", label: "Công việc" },
    { id: "device", label: "Thiết bị / Thiết bị sửa" },
    { id: "excavator", label: "Máy xúc" },
    { id: "material", label: "Vật liệu / Điểm đổ" },
    { id: "status", label: "Trạng thái" },
    { id: "createdBy", label: "Người ra lệnh / Tạo lúc" },
    { id: "startTime", label: "Bắt đầu" },
    { id: "endTime", label: "Kết thúc" },
    { id: "workContent", label: "Nội dung lệnh" },
    { id: "deviceStatus", label: "Tình trạng thiết bị" },
  ];

  // Trạng thái giao diện (menu, hộp lọc, mật độ bảng)
  const [density, setDensity] = useState<"compact" | "standard" | "comfortable">(
    "standard",
  );
  const [densityAnchor, setDensityAnchor] = useState<HTMLElement | null>(null);
  const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null);
  const [dateAnchor, setDateAnchor] = useState<HTMLElement | null>(null);
  const [advAnchor, setAdvAnchor] = useState<HTMLElement | null>(null);
  const [advDraft, setAdvDraft] = useState<Record<string, string>>({});
  const [rowMenu, setRowMenu] = useState<{
    anchor: HTMLElement;
    row: any;
  } | null>(null);

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

  // Chỉ lệnh "Chưa nhận" hoặc "Lỗi" mới sửa/hủy được (quy tắc cũ giữ nguyên)
  const isEditable = (order: any) =>
    [StatusOrderEnum.PENDING, StatusOrderEnum.WARNING].includes(order?.status);

  const startEdit = async (order: any) => {
    if (open) {
      const result = await showConfirmAlert(
        "Bạn đang cập nhật một mục. Nếu tiếp tục chỉnh sửa, dữ liệu hiện tại sẽ bị ghi đè. Bạn có chắc chắn muốn tiếp tục?",
      );
      if (result.isConfirmed) {
        handleOpen(order);
      }
    } else {
      handleOpen(order);
    }
  };

  const startTransfer = async (order: any) => {
    if (open) {
      const result = await showConfirmAlert(
        "Bạn đang cập nhật một mục. Nếu tiếp tục, dữ liệu hiện tại sẽ bị ghi đè. Bạn có chắc chắn muốn tiếp tục?",
      );
      if (result.isConfirmed) {
        setSelectedOrder(order);
        setOpen(false);
        setExpanded(true);
        setTransfer(true);
      }
    } else {
      setSelectedOrder(order);
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
  };

  const codes = (list?: any[], pick: (i: any) => string = (i) => i?.code) =>
    (list || []).map(pick).filter(Boolean).join(", ");

  const orderColumns: GridColDef[] = [
    {
      headerName: "STT",
      field: "number",
      width: 56,
      align: "center",
      headerAlign: "center",
      renderCell: (params: GridRenderCellParams) => {
        const sortedIds = params.api.getSortedRowIds();
        const index = sortedIds.indexOf(params.id);
        return index >= 0 ? index + 1 : "";
      },
      resizable: false,
      sortable: false,
    },
    {
      headerName: "Người nhận lệnh",
      field: "assignedTo",
      width: 190,
      valueGetter: (_v: any, row: any) => row.assignedTo?.fullName || "",
      renderHeader: () => <Hdr title="Người nhận lệnh" sub="Số thẻ" />,
      renderCell: (params: any) => (
        <TwoLine
          bold
          top={params.row.assignedTo?.fullName}
          bottom={params.row.assignedTo?.salaryCode}
        />
      ),
    },
    {
      headerName: "Ngày / Ca",
      field: "workingDate",
      width: 120,
      renderHeader: () => <Hdr title="Ngày" sub="Ca" />,
      renderCell: (params: any) => (
        <TwoLine
          top={
            params.row.workingDate
              ? format(new Date(params.row.workingDate), "dd/MM/yyyy")
              : ""
          }
          bottom={
            params.row.shift?.name ? `Ca ${params.row.shift.name}` : undefined
          }
        />
      ),
    },
    {
      headerName: "Công việc",
      field: "job",
      width: 170,
      valueGetter: (_v: any, row: any) => row.job?.name || "",
      renderHeader: () => <Hdr title="Công việc" />,
      renderCell: (params: any) => <OneLine value={params.row.job?.name} />,
    },
    {
      headerName: "Thiết bị",
      field: "device",
      width: 150,
      sortable: false,
      renderHeader: () => <Hdr title="Thiết bị" sub="Thiết bị sửa" />,
      renderCell: (params: any) => (
        <TwoLine
          top={codes(params.row.device)}
          bottom={codes(params.row.repairVehicles, (i) => i?.device?.code)}
        />
      ),
    },
    {
      headerName: "Máy xúc",
      field: "excavator",
      width: 110,
      sortable: false,
      renderHeader: () => <Hdr title="Máy xúc" />,
      renderCell: (params: any) => (
        <OneLine value={codes(params.row.excavator, (i) => i?.device?.code)} />
      ),
    },
    {
      headerName: "Vật liệu / Điểm đổ",
      field: "material",
      width: 190,
      sortable: false,
      renderHeader: () => <Hdr title="Vật liệu" sub="Điểm đổ" />,
      renderCell: (params: any) => (
        <TwoLine
          bold
          top={codes(params.row.material, (i) => i?.name)}
          bottom={codes(params.row.location, (i) => i?.name)}
        />
      ),
    },
    {
      headerName: "Trạng thái",
      field: "status",
      width: 140,
      renderHeader: () => <Hdr title="Trạng thái" />,
      renderCell: (params: any) => <StatusPill status={params.row.status} />,
    },
    {
      headerName: "Người ra lệnh",
      field: "createdBy",
      width: 175,
      valueGetter: (_v: any, row: any) => row.createdBy?.fullName || "",
      renderHeader: () => <Hdr title="Người ra lệnh" sub="Tạo lúc" />,
      renderCell: (params: any) => (
        <TwoLine
          bold
          top={params.row.createdBy?.fullName}
          bottom={
            params.row.createdAt
              ? format(new Date(params.row.createdAt), "dd/MM/yyyy HH:mm")
              : undefined
          }
        />
      ),
    },
    {
      headerName: "Bắt đầu",
      field: "startTime",
      width: 150,
      renderHeader: () => <Hdr title="Bắt đầu" />,
      renderCell: (params: any) => (
        <OneLine
          value={
            params.row.startTime
              ? format(new Date(params.row.startTime), "dd/MM/yyyy HH:mm")
              : undefined
          }
        />
      ),
    },
    {
      headerName: "Kết thúc",
      field: "endTime",
      width: 150,
      renderHeader: () => <Hdr title="Kết thúc" />,
      renderCell: (params: any) => (
        <OneLine
          value={
            params.row.endTime
              ? format(new Date(params.row.endTime), "dd/MM/yyyy HH:mm")
              : undefined
          }
        />
      ),
    },
    {
      headerName: "Nội dung lệnh",
      field: "workContent",
      width: 260,
      renderHeader: () => <Hdr title="Nội dung lệnh" />,
      renderCell: (params: any) => <OneLine value={params.row.workContent} />,
    },
    {
      headerName: "Tình trạng thiết bị",
      field: "deviceStatus",
      width: 140,
      sortable: false,
      renderHeader: () => <Hdr title="Tình trạng thiết bị" />,
      renderCell: (params: any) => {
        const list = params.row.shiftReport?.vehicleSummaries;
        if (!list?.length) return <OneLine />;
        return (
          <Box sx={{ display: "flex", gap: "3px" }}>
            {list.map((i: any, idx: number) => (
              <Box
                key={idx}
                component="span"
                sx={{
                  px: 0.75,
                  borderRadius: "4px",
                  fontSize: 11.5,
                  fontWeight: 700,
                  lineHeight: "20px",
                  color: i.status === "good" ? "#15803d" : "#c2410c",
                  bgcolor: i.status === "good" ? "#e3f6e8" : "#fff1e0",
                }}
              >
                {i.status === "good" ? "Tốt" : "Hỏng"}
              </Box>
            ))}
          </Box>
        );
      },
    },
    {
      // Nút "⋯" mở menu thao tác của dòng (Xem chi tiết / báo công / Sửa / Chuyển ca / Hủy)
      headerName: "Thao tác",
      field: "actions",
      width: 56,
      align: "center",
      headerAlign: "center",
      sortable: false,
      resizable: false,
      disableColumnMenu: true,
      renderHeader: () => <MoreHoriz sx={{ color: MUTED }} />,
      renderCell: (params: any) => (
        <IconButton
          size="small"
          aria-label="Thao tác"
          onClick={(e) => {
            e.stopPropagation();
            setRowMenu({ anchor: e.currentTarget, row: params.row });
          }}
        >
          <MoreHoriz fontSize="small" />
        </IconButton>
      ),
    },
  ];

  const filteredColumns = React.useMemo(
    () =>
      orderColumns.filter(
        (col: GridColDef) =>
          col.field === "number" ||
          col.field === "actions" ||
          (col.field && visibleColumns.includes(String(col.field))),
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

  // ---- Lớp trình bày: bộ lọc, phân trang, thanh công cụ (state/truy vấn gốc ở trên không đổi) ----
  // Đổi bộ lọc thì về trang đầu, tránh đứng ở trang 3 của kết quả cũ rồi thấy bảng trống.
  const resetPage = () =>
    setPaginationModel((p) => (p.page === 0 ? p : { ...p, page: 0 }));

  const advancedCount = Object.values(serverFilters).filter(Boolean).length;
  const hasFilter = Boolean(
    value || department || startTime || endTime || status || advancedCount,
  );
  const clearFilters = () => {
    setValue("");
    setDepartment("");
    setStartTime(null);
    setEndTime(null);
    setStatus("");
    setServerFilters({});
    setAdvDraft({});
    resetPage();
  };

  const applyRange = (from: Dayjs | null, to: Dayjs | null) => {
    setStartTime(from);
    setEndTime(to);
    resetPage();
  };
  // Máy chủ đặt endTime về 23:59:59 của ngày được gửi lên nên đầu/cuối ngày đều an toàn.
  const today = dayjs();
  const presets = [
    { label: "Hôm nay", from: today.startOf("day"), to: today.endOf("day") },
    {
      label: "Hôm qua",
      from: today.subtract(1, "day").startOf("day"),
      to: today.subtract(1, "day").endOf("day"),
    },
    {
      label: "7 ngày qua",
      from: today.subtract(6, "day").startOf("day"),
      to: today.endOf("day"),
    },
    { label: "Tháng này", from: today.startOf("month"), to: today.endOf("day") },
  ];
  const isPresetActive = (p: { from: Dayjs; to: Dayjs }) =>
    !!startTime &&
    !!endTime &&
    dayjs(startTime).isSame(p.from, "day") &&
    dayjs(endTime).isSame(p.to, "day");
  const rangeLabel =
    startTime || endTime
      ? `${startTime ? dayjs(startTime).format("DD/MM/YYYY") : "…"} – ${
          endTime ? dayjs(endTime).format("DD/MM/YYYY") : "…"
        }`
      : "Tất cả thời gian";

  const openAdvanced = (e: React.MouseEvent<HTMLElement>) => {
    setAdvDraft(
      Object.fromEntries(
        Object.entries(serverFilters).map(([k, v]) => [k, v ?? ""]),
      ),
    );
    setAdvAnchor(e.currentTarget);
  };
  const applyAdvanced = () => {
    const cleaned: Record<string, string> = {};
    Object.entries(advDraft).forEach(([k, v]) => {
      if (v.trim()) cleaned[k] = v.trim();
    });
    setServerFilters(cleaned);
    resetPage();
    setAdvAnchor(null);
  };

  const statusPills = [
    {
      key: "",
      label: "Tất cả",
      color: BLUE,
      bg: "#e8f0fe",
      dot: BLUE,
      solid: BLUE,
    },
    ...ORDER_STATUS_META,
  ].map((m) => ({
    ...m,
    count: m.key ? statusCounts[m.key] : statusCounts.all,
  }));

  const selectedCount = selectedOrders.length;
  const pageCount = Math.max(1, Math.ceil(total / paginationModel.pageSize));
  const currentPage = paginationModel.page + 1;
  const rangeFrom =
    total === 0 ? 0 : paginationModel.page * paginationModel.pageSize + 1;
  const rangeTo = Math.min(
    total,
    (paginationModel.page + 1) * paginationModel.pageSize,
  );
  const goPage = (p: number) => setPaginationModel((m) => ({ ...m, page: p - 1 }));

  const panelTitle =
    transfer && selectedOrder
      ? "Chuyển ca"
      : selectedOrder && open
        ? "Sửa lệnh sản xuất"
        : "Tạo lệnh sản xuất";

  const headerBtnSx = {
    height: 40,
    px: 1.75,
    textTransform: "none",
    fontWeight: 600,
    fontSize: 14,
    borderRadius: "10px",
    color: INK,
    bgcolor: "#fff",
    borderColor: LINE,
    "&:hover": { bgcolor: "#f8fafc", borderColor: "#cbd5e1" },
  } as const;
  const toolBtnSx = {
    height: 36,
    px: 1.25,
    textTransform: "none",
    fontWeight: 500,
    fontSize: 13,
    borderRadius: "8px",
    color: INK,
    bgcolor: "#fff",
    border: `1px solid ${LINE}`,
    "&:hover": { bgcolor: "#f8fafc", borderColor: "#cbd5e1" },
  } as const;
  const squareBtnSx = {
    width: 36,
    height: 36,
    borderRadius: "8px",
    border: `1px solid ${LINE}`,
    bgcolor: "#fff",
    color: INK,
    "&:hover": { bgcolor: "#f8fafc" },
  } as const;

  const exportSelected = () => {
    if (selectedOrders.length > 0) {
      reportExcel.mutate();
    } else {
      showErrorAlert("Vui lòng chọn bản ghi cần tải xuống");
    }
  };

  return (
    <ThemeProvider theme={uiSansTheme}>
      {/* Phủ kín nền, bù lại padding 24px của MainLayout; fontFamily để mọi thẻ div con kế thừa phông không chân */}
      <Box
        sx={{
          bgcolor: "#f7f8fa",
          m: -3,
          p: 3,
          minHeight: "100%",
          fontFamily: UI_FONT,
        }}
      >
        <AlertSnackbar alert={alert} setAlert={setAlert} />

        {/* Tiêu đề trang + 3 nút hành động */}
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            gap: 2,
            flexWrap: "wrap",
            mb: 2,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: 28,
                fontWeight: 800,
                lineHeight: 1.2,
                color: INK,
              }}
            >
              Lệnh sản xuất
            </Typography>
            <Typography sx={{ fontSize: 14, color: MUTED, mt: 0.25 }}>
              Quản lý và theo dõi lệnh điều phối thiết bị
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }} />
          <Box sx={{ display: "flex", gap: 1.25, flexWrap: "wrap" }}>
            <Button
              variant="outlined"
              startIcon={<HistoryIcon />}
              onClick={() => {
                if (selectedOrders.length === 0) {
                  return showErrorAlert("Vui lòng chọn lệnh cần xem lịch sử");
                }
                setHistory(true);
              }}
              sx={headerBtnSx}
            >
              Lịch sử
            </Button>
            <Button
              variant="outlined"
              startIcon={
                isDownloadLoading ? (
                  <CircularProgress size={16} />
                ) : (
                  <FileDownload />
                )
              }
              disabled={isDownloadLoading}
              onClick={exportSelected}
              sx={headerBtnSx}
            >
              Xuất Excel
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpen()}
              sx={{
                ...headerBtnSx,
                color: "#fff",
                bgcolor: BLUE,
                borderColor: BLUE,
                boxShadow: "none",
                "&:hover": { bgcolor: "#1259cf", boxShadow: "none" },
              }}
            >
              Tạo lệnh
            </Button>
          </Box>
        </Box>

        {/* Form tạo / sửa / chuyển ca: mở ngay dưới tiêu đề */}
        <Collapse in={expanded} ref={formRef}>
          <Paper
            variant="outlined"
            sx={{
              mb: 1.5,
              borderRadius: 3,
              borderColor: "#bfd7f5",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 2,
                py: 0.75,
                bgcolor: "#eaf3fd",
                borderBottom: "1px solid #bfd7f5",
              }}
            >
              <Typography sx={{ flex: 1, fontSize: 15, fontWeight: 800 }}>
                {panelTitle}
              </Typography>
              <IconButton
                size="small"
                onClick={handleClose}
                title="Đóng"
                aria-label="Đóng form"
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
            {/* Các form giữ nguyên theme/phông gốc của ứng dụng */}
            <ThemeProvider theme={appTheme}>
              <Box sx={{ p: 2, fontFamily: appTheme.typography.fontFamily }}>
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
              </Box>
            </ThemeProvider>
          </Paper>
        </Collapse>

        {/* Thẻ bộ lọc: trạng thái + tìm kiếm + đơn vị + khoảng ngày + lọc nâng cao */}
        <Paper
          variant="outlined"
          sx={{
            borderRadius: 3,
            p: 1.5,
            mb: 1.5,
            bgcolor: "#fbfcfe",
            borderColor: LINE,
          }}
        >
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {statusPills.map((p) => {
              const active = status === p.key;
              return (
                <ButtonBase
                  key={p.key || "all"}
                  aria-pressed={active}
                  onClick={() => {
                    handleChange(p.key);
                    resetPage();
                  }}
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 1,
                    pl: 1.5,
                    pr: 0.75,
                    height: 36,
                    borderRadius: "10px",
                    border: `1px solid ${active ? p.solid : LINE}`,
                    bgcolor: active ? p.solid : "#fff",
                    color: active ? "#fff" : INK,
                    fontSize: 13.5,
                    fontWeight: 600,
                    transition: "background-color .15s, border-color .15s",
                    "&:hover": { bgcolor: active ? p.solid : "#f8fafc" },
                  }}
                >
                  {p.key !== "" && (
                    <Box
                      component="span"
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: active ? "#fff" : p.dot,
                      }}
                    />
                  )}
                  {p.label}
                  <Box
                    component="span"
                    sx={{
                      minWidth: 28,
                      height: 22,
                      px: 0.75,
                      borderRadius: "11px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12.5,
                      fontWeight: 700,
                      bgcolor: active ? "rgba(255,255,255,.92)" : p.bg,
                      color: active ? p.solid : p.color,
                    }}
                  >
                    {p.count ?? 0}
                  </Box>
                </ButtonBase>
              );
            })}
          </Box>

          <Box
            sx={{
              display: "flex",
              gap: 1,
              flexWrap: "wrap",
              alignItems: "center",
              mt: 1.25,
            }}
          >
            <TextField
              size="small"
              value={value}
              placeholder="Tìm người nhận, số thẻ, công việc..."
              onChange={(e) => {
                setValue(e.target.value);
                resetPage();
              }}
              sx={{
                flex: "2 1 300px",
                minWidth: 240,
                "& .MuiOutlinedInput-root": {
                  height: 40,
                  bgcolor: "#fff",
                  borderRadius: "8px",
                  fontSize: 13.5,
                },
                "& fieldset": { borderColor: LINE },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ fontSize: 20, color: "#94a3b8" }} />
                  </InputAdornment>
                ),
              }}
            />
            {user?.role === RoleEnum.ADMIN && (
              <Autocomplete
                size="small"
                options={departments}
                getOptionLabel={(option: any) => option.code || ""}
                value={
                  departments.find((p: any) => p._id === department) || null
                }
                onChange={(event, newValue) => {
                  setDepartment(newValue?._id || "");
                  resetPage();
                }}
                PopperComponent={StyledPopper}
                sx={{
                  flex: "1 1 200px",
                  minWidth: 180,
                  "& .MuiOutlinedInput-root": {
                    height: 40,
                    bgcolor: "#fff",
                    borderRadius: "8px",
                    fontSize: 13.5,
                  },
                  "& fieldset": { borderColor: LINE },
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    placeholder="Tất cả đơn vị"
                  />
                )}
              />
            )}
            <Button
              onClick={(e) => setDateAnchor(e.currentTarget)}
              startIcon={<CalendarMonth sx={{ color: MUTED }} />}
              endIcon={<ExpandMore sx={{ color: MUTED }} />}
              sx={{
                ...fieldButtonSx,
                flex: "1 1 230px",
                minWidth: 210,
                justifyContent: "space-between",
                "& .MuiButton-startIcon": { mr: 0 },
              }}
            >
              <Box component="span" sx={{ flex: 1, textAlign: "left", ml: 1 }}>
                {rangeLabel}
              </Box>
            </Button>
            <Button
              onClick={openAdvanced}
              startIcon={<FilterAlt sx={{ color: MUTED }} />}
              endIcon={<ExpandMore sx={{ color: MUTED }} />}
              sx={{
                ...fieldButtonSx,
                flex: "1 1 170px",
                minWidth: 160,
                justifyContent: "space-between",
                ...(advancedCount > 0 && {
                  borderColor: BLUE,
                  color: BLUE,
                  bgcolor: "#f3f8ff",
                }),
              }}
            >
              <Box component="span" sx={{ flex: 1, textAlign: "left", ml: 1 }}>
                Lọc nâng cao{advancedCount > 0 ? ` (${advancedCount})` : ""}
              </Box>
            </Button>
            <Tooltip title="Đặt lại bộ lọc" placement="top">
              <span>
                <IconButton
                  onClick={clearFilters}
                  disabled={!hasFilter}
                  aria-label="Đặt lại bộ lọc"
                  sx={{ ...squareBtnSx, width: 40, height: 40 }}
                >
                  <RestartAlt />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Paper>

        {/* Bảng + chi tiết lệnh */}
        <Box
          sx={{
            display: "grid",
            gap: 1.5,
            alignItems: "start",
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              md: info ? "minmax(0, 1fr) 380px" : "minmax(0, 1fr)",
            },
          }}
        >
          <Paper
            variant="outlined"
            sx={{ borderRadius: 3, overflow: "hidden", borderColor: LINE }}
          >
            {/* Đầu thẻ: tên + số lệnh + công cụ bảng */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                flexWrap: "wrap",
                px: 2,
                py: 1.25,
              }}
            >
              <Typography sx={{ fontSize: 16, fontWeight: 800, color: INK }}>
                Danh sách lệnh
              </Typography>
              <Box
                component="span"
                sx={{
                  px: 1.25,
                  height: 24,
                  borderRadius: "12px",
                  bgcolor: "#eef1f6",
                  color: MUTED,
                  fontSize: 12.5,
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                {total} lệnh
              </Box>
              <Box sx={{ flex: 1 }} />
              <Tooltip title="Tải lại danh sách" placement="top">
                <span>
                  <IconButton
                    aria-label="Tải lại danh sách"
                    sx={squareBtnSx}
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
                      <CircularProgress size={18} />
                    ) : (
                      <Refresh fontSize="small" />
                    )}
                  </IconButton>
                </span>
              </Tooltip>
              <Button
                onClick={(e) => setAnchorEl(e.currentTarget)}
                startIcon={<ViewColumn fontSize="small" />}
                endIcon={<ExpandMore fontSize="small" />}
                sx={toolBtnSx}
              >
                Cột
              </Button>
              <Button
                onClick={(e) => setDensityAnchor(e.currentTarget)}
                startIcon={<ViewHeadline fontSize="small" />}
                endIcon={<ExpandMore fontSize="small" />}
                sx={toolBtnSx}
              >
                Mật độ
              </Button>
              <IconButton
                aria-label="Thêm tuỳ chọn"
                sx={squareBtnSx}
                onClick={(e) => setMoreAnchor(e.currentTarget)}
              >
                <MoreHoriz fontSize="small" />
              </IconButton>
            </Box>
            {isDownloadLoading && <LinearProgress />}

            <Box sx={{ height: { xs: 520, md: "max(520px, 62vh)" } }}>
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
                getRowClassName={(params) =>
                  info && selectedRow?._id === params.row._id
                    ? "order-active"
                    : ""
                }
                disableVirtualization={true}
                filterMode="server"
                hideFooter
                disableColumnMenu
                disableColumnFilter
                columnHeaderHeight={52}
                rowHeight={54}
                density={density}
                slots={{ noRowsOverlay: NoOrders }}
                sx={{
                  border: 0,
                  height: "100%",
                  fontSize: 13,
                  "& .MuiDataGrid-columnHeaders": {
                    bgcolor: "#f8fafc",
                    borderTop: `1px solid ${LINE}`,
                    borderBottom: `1px solid ${LINE}`,
                  },
                  "& .MuiDataGrid-columnSeparator": { display: "none" },
                  "& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within, & .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within":
                    { outline: "none" },
                  "& .MuiDataGrid-cell": { borderColor: "#eef1f5" },
                  "& .MuiDataGrid-row": { bgcolor: "#fff" },
                  "& .MuiDataGrid-row:hover": { bgcolor: "#f8fafc" },
                  "& .MuiDataGrid-row.Mui-selected, & .MuiDataGrid-row.Mui-selected:hover":
                    { bgcolor: "#eaf3ff" },
                  "& .MuiDataGrid-row.order-active, & .MuiDataGrid-row.order-active:hover":
                    { bgcolor: "#e0efff" },
                  // Ghim cột chọn / STT / người nhận lệnh bên trái, cột thao tác bên phải
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
                    left: 106, // = 50 (ô chọn) + 56 (cột STT)
                    zIndex: 11,
                    backgroundColor: "inherit !important",
                    boxShadow: "2px 0 4px rgba(0,0,0,0.08)",
                  },
                  '& .MuiDataGrid-cell[data-field="assignedTo"]': {
                    position: "sticky",
                    left: 106,
                    zIndex: 10,
                    backgroundColor: "inherit !important",
                    boxShadow: "2px 0 4px rgba(0,0,0,0.08)",
                  },
                  '& .MuiDataGrid-columnHeader[data-field="actions"]': {
                    position: "sticky",
                    right: 0,
                    zIndex: 11,
                    backgroundColor: "inherit !important",
                    boxShadow: "-2px 0 4px rgba(0,0,0,0.08)",
                  },
                  '& .MuiDataGrid-cell[data-field="actions"]': {
                    position: "sticky",
                    right: 0,
                    zIndex: 10,
                    backgroundColor: "inherit !important",
                    boxShadow: "-2px 0 4px rgba(0,0,0,0.08)",
                  },
                  "& .MuiDataGrid-virtualScroller": {
                    overflowX: "auto",
                  },
                }}
              />
            </Box>

            {/* Chân bảng: thao tác theo lựa chọn (trái) + phân trang (phải) */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                flexWrap: "wrap",
                px: 2,
                py: 1,
                minHeight: 56,
                borderTop: `1px solid ${LINE}`,
              }}
            >
              {selectedCount > 0 ? (
                <>
                  <Typography sx={{ fontSize: 13.5, color: INK }}>
                    Đã chọn <b>{selectedCount}</b> lệnh
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => setSelectedOrders([])}
                    sx={{ textTransform: "none", fontWeight: 600, color: BLUE }}
                  >
                    Bỏ chọn
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={handleDelete}
                    sx={{
                      textTransform: "none",
                      fontWeight: 600,
                      borderRadius: "8px",
                      bgcolor: "#fff",
                    }}
                  >
                    Xóa
                  </Button>
                </>
              ) : (
                <Typography sx={{ fontSize: 12.5, color: "#94a3b8" }}>
                  Tích chọn lệnh trong bảng để xóa, xuất Excel hoặc xem lịch sử
                </Typography>
              )}
              <Box sx={{ flex: 1 }} />
              <Typography sx={{ fontSize: 13, color: MUTED }}>
                Số dòng/trang
              </Typography>
              <Select
                size="small"
                value={paginationModel.pageSize}
                onChange={(e) =>
                  setPaginationModel({
                    page: 0,
                    pageSize: Number(e.target.value),
                  })
                }
                sx={{
                  height: 34,
                  fontSize: 13,
                  borderRadius: "8px",
                  bgcolor: "#fff",
                  "& fieldset": { borderColor: LINE },
                }}
              >
                {[20, 50, 100].map((n) => (
                  <MenuItem key={n} value={n} sx={{ fontSize: 13 }}>
                    {n}
                  </MenuItem>
                ))}
              </Select>
              <Typography sx={{ fontSize: 13, color: INK, mx: 0.5 }}>
                {rangeFrom} – {rangeTo} / {total} lệnh
              </Typography>
              <IconButton
                size="small"
                aria-label="Trang trước"
                disabled={currentPage <= 1}
                onClick={() => goPage(currentPage - 1)}
                sx={{ ...squareBtnSx, width: 34, height: 34 }}
              >
                <ChevronLeft fontSize="small" />
              </IconButton>
              {pageItems(currentPage, pageCount).map((it, i) =>
                it === "…" ? (
                  <Box key={`gap-${i}`} component="span" sx={{ color: MUTED }}>
                    …
                  </Box>
                ) : (
                  <ButtonBase
                    key={it}
                    aria-label={`Trang ${it}`}
                    aria-current={it === currentPage ? "page" : undefined}
                    onClick={() => goPage(it)}
                    sx={{
                      minWidth: 34,
                      height: 34,
                      px: 0.5,
                      borderRadius: "8px",
                      fontSize: 13,
                      fontWeight: 700,
                      border: `1px solid ${it === currentPage ? BLUE : LINE}`,
                      bgcolor: it === currentPage ? BLUE : "#fff",
                      color: it === currentPage ? "#fff" : INK,
                    }}
                  >
                    {it}
                  </ButtonBase>
                ),
              )}
              <IconButton
                size="small"
                aria-label="Trang sau"
                disabled={currentPage >= pageCount}
                onClick={() => goPage(currentPage + 1)}
                sx={{ ...squareBtnSx, width: 34, height: 34 }}
              >
                <ChevronRight fontSize="small" />
              </IconButton>
            </Box>
          </Paper>
          {info && (
            <OrderDetailPanel order={selectedRow} onClose={() => setInfo(false)} />
          )}
        </Box>

        {/* Menu: chọn cột hiển thị */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          sx={{ maxHeight: 460 }}
        >
          {defaultColumns.map((col) => (
            <MenuItem key={col.id} onClick={() => handleToggleColumn(col.id)}>
              <Switch size="small" checked={visibleColumns.includes(col.id)} />
              <ListItemText
                primary={col.label}
                primaryTypographyProps={{ fontSize: 13.5 }}
              />
            </MenuItem>
          ))}
        </Menu>

        {/* Menu: mật độ bảng */}
        <Menu
          anchorEl={densityAnchor}
          open={Boolean(densityAnchor)}
          onClose={() => setDensityAnchor(null)}
        >
          {(
            [
              ["compact", "Gọn"],
              ["standard", "Chuẩn"],
              ["comfortable", "Thoáng"],
            ] as const
          ).map(([key, label]) => (
            <MenuItem
              key={key}
              onClick={() => {
                setDensity(key);
                setDensityAnchor(null);
              }}
              sx={{ minWidth: 140, fontSize: 13.5 }}
            >
              <ListItemIcon sx={{ minWidth: 28 }}>
                {density === key && <CheckIcon fontSize="small" />}
              </ListItemIcon>
              {label}
            </MenuItem>
          ))}
        </Menu>

        {/* Menu: thêm tuỳ chọn của bảng */}
        <Menu
          anchorEl={moreAnchor}
          open={Boolean(moreAnchor)}
          onClose={() => setMoreAnchor(null)}
        >
          <MenuItem
            onClick={() => {
              setInfo(!info);
              setMoreAnchor(null);
            }}
            sx={{ fontSize: 13.5 }}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>
              <Visibility fontSize="small" />
            </ListItemIcon>
            {info ? "Ẩn chi tiết lệnh" : "Hiện chi tiết lệnh"}
          </MenuItem>
          {user?.role === RoleEnum.ADMIN && (
            <MenuItem
              onClick={() => {
                setMoreAnchor(null);
                if (selectedOrders.length === 0) {
                  return showErrorAlert("Vui lòng chọn bản ghi");
                }
                reportListorderExcel.mutate();
              }}
              sx={{ fontSize: 13.5 }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                <CloudUpload fontSize="small" />
              </ListItemIcon>
              Xuất danh sách lệnh đã chọn
            </MenuItem>
          )}
          {user?.role === RoleEnum.ADMIN && (
            <MenuItem
              onClick={() => {
                setMoreAnchor(null);
                reportTravelogExcel.mutate();
              }}
              sx={{ fontSize: 13.5 }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                <Route size={18} />
              </ListItemIcon>
              Xuất cung độ
            </MenuItem>
          )}
        </Menu>

        {/* Menu thao tác của từng dòng */}
        <Menu
          anchorEl={rowMenu?.anchor}
          open={Boolean(rowMenu)}
          onClose={() => setRowMenu(null)}
        >
          {rowMenu && (
            <MenuItem
              onClick={() => {
                setSelectedRow(rowMenu.row);
                setInfo(true);
                setRowMenu(null);
              }}
              sx={{ fontSize: 13.5 }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                <Visibility fontSize="small" />
              </ListItemIcon>
              Xem chi tiết
            </MenuItem>
          )}
          {rowMenu && (
            <MenuItem
              onClick={() => {
                setSelectedOrder(rowMenu.row);
                setShiftReport(true);
                setRowMenu(null);
              }}
              sx={{ fontSize: 13.5 }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                <ReceiptLongIcon fontSize="small" />
              </ListItemIcon>
              Xem báo công
            </MenuItem>
          )}
          {rowMenu && (
            <MenuItem
              disabled={!isEditable(rowMenu.row)}
              onClick={() => {
                const row = rowMenu.row;
                setRowMenu(null);
                startEdit(row);
              }}
              sx={{ fontSize: 13.5 }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                <EditIcon fontSize="small" />
              </ListItemIcon>
              Sửa
            </MenuItem>
          )}
          {rowMenu && (
            <MenuItem
              onClick={() => {
                const row = rowMenu.row;
                setRowMenu(null);
                startTransfer(row);
              }}
              sx={{ fontSize: 13.5 }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                <SyncAlt fontSize="small" />
              </ListItemIcon>
              Chuyển ca
            </MenuItem>
          )}
          {rowMenu && <Divider />}
          {rowMenu && (
            <MenuItem
              disabled={!isEditable(rowMenu.row)}
              onClick={() => {
                const row = rowMenu.row;
                setRowMenu(null);
                handleCancel(row);
              }}
              sx={{ fontSize: 13.5, color: "#c2410c" }}
            >
              <ListItemIcon sx={{ minWidth: 32, color: "inherit" }}>
                <CancelOutlined fontSize="small" />
              </ListItemIcon>
              Hủy lệnh
            </MenuItem>
          )}
        </Menu>

        {/* Chọn khoảng ngày */}
        <Popover
          open={Boolean(dateAnchor)}
          anchorEl={dateAnchor}
          onClose={() => setDateAnchor(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          PaperProps={{ sx: { p: 2, width: 340, borderRadius: 2 } }}
        >
          <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mb: 1.5 }}>
            {presets.map((p) => (
              <Button
                key={p.label}
                size="small"
                variant={isPresetActive(p) ? "contained" : "outlined"}
                onClick={() => applyRange(p.from, p.to)}
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                {p.label}
              </Button>
            ))}
          </Box>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 1.25,
            }}
          >
            <TextField
              size="small"
              type="date"
              label="Từ ngày"
              InputLabelProps={{ shrink: true }}
              value={startTime ? dayjs(startTime).format("YYYY-MM-DD") : ""}
              onChange={(e) =>
                applyRange(
                  e.target.value ? dayjs(e.target.value).startOf("day") : null,
                  endTime,
                )
              }
            />
            <TextField
              size="small"
              type="date"
              label="Đến ngày"
              InputLabelProps={{ shrink: true }}
              value={endTime ? dayjs(endTime).format("YYYY-MM-DD") : ""}
              onChange={(e) =>
                applyRange(
                  startTime,
                  e.target.value ? dayjs(e.target.value).endOf("day") : null,
                )
              }
            />
          </Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              mt: 1.5,
            }}
          >
            <Button
              size="small"
              onClick={() => applyRange(null, null)}
              sx={{ textTransform: "none" }}
            >
              Tất cả thời gian
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={() => setDateAnchor(null)}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              Xong
            </Button>
          </Box>
        </Popover>

        {/* Lọc nâng cao: đổ vào các tham số lọc máy chủ có sẵn */}
        <Popover
          open={Boolean(advAnchor)}
          anchorEl={advAnchor}
          onClose={() => setAdvAnchor(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          PaperProps={{ sx: { p: 2, width: 380, borderRadius: 2 } }}
        >
          <Typography sx={{ fontSize: 14, fontWeight: 800, mb: 1.25 }}>
            Lọc nâng cao
          </Typography>
          <Box sx={{ display: "grid", gap: 1.25 }}>
            {ADVANCED_FIELDS.map((f) => (
              <TextField
                key={f.key}
                size="small"
                label={f.label}
                helperText={f.hint}
                value={advDraft[f.key] ?? ""}
                onChange={(e) =>
                  setAdvDraft((d) => ({ ...d, [f.key]: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyAdvanced();
                }}
              />
            ))}
          </Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              mt: 1.5,
            }}
          >
            <Button
              size="small"
              onClick={() => {
                setAdvDraft({});
                setServerFilters({});
                resetPage();
                setAdvAnchor(null);
              }}
              sx={{ textTransform: "none" }}
            >
              Xóa lọc nâng cao
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={applyAdvanced}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              Áp dụng
            </Button>
          </Box>
        </Popover>

        {/* Hộp thoại cũ giữ nguyên theme/phông gốc */}
        <ThemeProvider theme={appTheme}>
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
        </ThemeProvider>
      </Box>
    </ThemeProvider>
  );
};

export default Orders;
