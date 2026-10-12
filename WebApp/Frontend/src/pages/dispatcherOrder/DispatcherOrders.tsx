import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Button,
    ButtonBase,
    Checkbox,
    CircularProgress,
    Collapse,
    Divider,
    IconButton,
    InputAdornment,
    LinearProgress,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Paper,
    Select,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Autocomplete,
    Typography,
} from '@mui/material';
import { ThemeProvider, darken, lighten, useTheme } from '@mui/material/styles';
import { format } from 'date-fns';
import {
    Add as AddIcon,
    Edit as EditIcon,
    DeleteOutline as DeleteIcon,
    FileDownload,
    CancelOutlined,
    ExpandMore,
    CopyAll,
    Visibility,
    Search,
    History as HistoryIcon,
    Refresh,
    ViewColumn,
    MoreHoriz,
    RestartAlt,
    Close as CloseIcon,
    ChevronLeft,
    ChevronRight,
    UnfoldMore,
    UnfoldLess,
    ReceiptLong as ReceiptLongIcon,
} from '@mui/icons-material';
import { Order } from '../../types';
import OrderFormAdd from './DispatcherOrderFormAdd';
import OrderFormEdit from './DispatcherOrderFormEdit';
import DispatcherOrderFormTransfer from './DispatcherOrderFormTransfer';
import { Dayjs } from 'dayjs';
import { showConfirmAlert, showErrorAlert, showSuccessAlert } from '../../components/Alert';
import { StyledPopper } from '../../ui/poppers';
import UserService from '../../services/userService';
import DepartmentService from '../../services/departmentService';
import OrderService from '../../services/orderService';
import { StatusOrderEnum } from '../../enums';
import OrderHistories from '../../components/Modal/OrderHistories';
import { parseAxiosError } from '../../utils/handleApiError';
import { appFontTheme, uiSansTheme, UI_FONT } from '../../theme/uiTheme';
import { brandAccent } from '../../branding/BrandingProvider';
import SearchInput from '../../components/SearchInput';
import OrderDetailPanel from '../orders/OrderDetailPanel';
import DateRangeFilter from '../orders/DateRangeFilter';
import { ORDER_STATUS_META, StatusPill } from '../orders/orderStatus';

const LINE = '#e5e9f0';
const INK = '#0f172a';
const MUTED = '#64748b';

// Ô 2 dòng: dòng trên đậm, dòng dưới nhỏ xám (đúng kiểu ảnh mẫu)
const TwoLine = ({ top, bottom, bold }: { top?: string; bottom?: string; bold?: boolean }) => (
    <Box sx={{ minWidth: 0, lineHeight: 1.3 }}>
        <Box title={top || ''} sx={{ fontSize: 13, fontWeight: bold ? 700 : 500, color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {top || '-'}
        </Box>
        <Box title={bottom || ''} sx={{ fontSize: 11.5, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {bottom || '-'}
        </Box>
    </Box>
);

const OneLine = ({ value, max }: { value?: string; max?: number }) => (
    <Box component='span' title={value || ''} sx={{ display: 'block', maxWidth: max, fontSize: 13, color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {value || '-'}
    </Box>
);

// Dãy số trang: 1 … 4 5 6 … 20
const pageItems = (current: number, count: number): (number | '…')[] => {
    if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
    const items: (number | '…')[] = [1];
    const start = Math.max(2, current - 1);
    const end = Math.min(count - 1, current + 1);
    if (start > 2) items.push('…');
    for (let i = start; i <= end; i++) items.push(i);
    if (end < count - 1) items.push('…');
    items.push(count);
    return items;
};

const NoOrders = () => (
    <Box sx={{ py: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, color: '#94a3b8' }}>
        <ReceiptLongIcon sx={{ fontSize: 40 }} />
        <Typography sx={{ fontSize: 14, fontWeight: 700, color: MUTED }}>Không có lệnh sản xuất nào</Typography>
        <Typography sx={{ fontSize: 12.5 }}>Thử đổi bộ lọc hoặc khoảng ngày, hoặc bấm "Tạo lệnh" để tạo lệnh mới</Typography>
    </Box>
);

const DispatcherOrders: React.FC = () => {
    // Màu chủ đạo lấy từ Hệ thống > Cấu hình giao diện; các sắc nhạt phải ĐẶC (không trong suốt) vì ô ghim cột đè lên nội dung cuộn
    const theme = useTheme();
    const BLUE = brandAccent(theme.palette.primary.main);
    const BLUE_DARK = darken(BLUE, 0.2);
    const tintLight = lighten(BLUE, 0.95);
    const tintMid = lighten(BLUE, 0.9);
    const tintStrong = lighten(BLUE, 0.82);
    const edge = lighten(BLUE, 0.6);
    const [open, setOpen] = useState(false);
    const [history, setHistory] = useState(false);
    const [transfer, setTransfer] = useState(false);
    const [employee, setEmployee] = useState("");
    const [startTime, setStartTime] = useState<Dayjs | null>(null);
    const [endTime, setEndTime] = useState<Dayjs | null>(null);
    const [department, setDepartment] = useState("");
    const [selectedOrder, setSelectedOrder] = useState<any[]>([]);
    const [selectedOrders, setSelectedOrders] = useState<any[]>([]);
    const [selectedRow, setSelectedRow] = useState<any | null>(null);
    const [info, setInfo] = useState(false);
    const formRef = useRef<HTMLDivElement>(null);

    const [status, setStatus] = useState('')
    const queryClient = useQueryClient();

    const [expanded, setExpanded] = useState(false);

    const handleSelected = (order: any) => {
        setSelectedOrders(prev =>
            prev.some(o => o._id === order._id)
                ? prev.filter(o => o._id !== order._id)
                : [...prev, order]
        );
    };

    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

    // Cột bật/tắt được từ nút "Cột" (ô chọn, STT và nút "⋯" luôn hiện). id PHẢI trùng với chỗ dùng bên dưới.
    const defaultColumns = [
        { id: 'assignedTo', label: 'Người nhận lệnh / Số thẻ' },
        { id: 'workingDate', label: 'Ngày làm việc' },
        { id: 'job', label: 'Công việc' },
        { id: 'content', label: 'Nội dung lệnh' },
        { id: 'createdBy', label: 'Người ra lệnh / Tạo lúc' },
        { id: 'startTime', label: 'Bắt đầu' },
        { id: 'endTime', label: 'Kết thúc' },
        { id: 'status', label: 'Trạng thái' },
    ]
    const [search, setSearch] = useState('');
    const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null);
    const [rowMenu, setRowMenu] = useState<{ anchor: HTMLElement; row: any } | null>(null);
    const [visibleColumns, setVisibleColumns] = useState<string[]>(defaultColumns.map(i => i.id))

    const handleToggleColumn = (id: string) => {
        setVisibleColumns(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
    }
    const handleChange = (value: string) => {
        setStatus(prev => (prev === value ? '' : value)); // bỏ chọn nếu click lại
    };

    const { data: departments = [] } = useQuery({
        queryKey: ['departments'],
        queryFn: DepartmentService.getAll,
    });
    const { data: users = [] } = useQuery({
        queryKey: ['users'],
        queryFn: UserService.getAll,
    });

    const { data: orders = [], isLoading, refetch: refetchOrders } = useQuery({
        queryKey: ['orders', employee, department, startTime, endTime],
        queryFn: () => OrderService.getAllDispatcher(
            {
                employee: employee,
                department: department,
                startTime: startTime ? startTime.toISOString() : '',
                endTime: endTime ? endTime.toISOString() : ''
            }
        ),

    });


    const [expandedBatches, setExpandedBatches] = useState<Record<string, boolean>>({});

    const handleToggleBatch = (batchId: string) => {
        setExpandedBatches(prev => ({
            ...prev,
            [batchId]: !prev[batchId]
        }));
    };

    const createMutation = useMutation({
        mutationFn: OrderService.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            showSuccessAlert('Thêm lệnh sản xuất thành công');
            handleClose();
        },
        onError: (error: any) => {
            showErrorAlert(error.response.data.message || error.message || 'Lỗi')
        }
    });

    const reportExcel = useMutation({
        mutationFn: () => OrderService.exportFile(selectedOrders),
        onSuccess: () => {
            setSelectedOrders([])
            showSuccessAlert('Xuất file thành công');
        },
        onError: async (error: any) => {
            const message = await parseAxiosError(error)
            showErrorAlert(message);
        }
    });

    const updateMutation = useMutation({
        mutationFn: OrderService.update,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            // showSuccessAlert('Cập nhật lệnh sản xuất thành công');
            handleClose();
        },
        onError: (error: any) => {
            showErrorAlert(error.response.data.message || error.message || 'Lỗi')
        }
    });
    const handleCancel = (orders: any[]) => {
        if (!orders || orders.length === 0) {
            return showErrorAlert("Không có lệnh nào được chọn");
        }

        // Tách lệnh có thể hủy và không thể hủy
        const nonCancelable = orders.filter(
            (o) => o.status === "in_progress" || o.status === "completed"
        );
        const cancelable = orders.filter(
            (o) => !["in_progress", "completed"].includes(o.status)
        );

        if (cancelable.length === 0) {
            return showErrorAlert(
                `${nonCancelable.length} lệnh đang thực hiện/hoàn thành, không có lệnh nào có thể hủy`
            );
        }

        let message = "";
        if (nonCancelable.length > 0) {
            message += `${nonCancelable.length} lệnh đang thực hiện hoặc đã hoàn thành, không thể hủy.\n`;
        }
        message += `Bạn có thể hủy ${cancelable.length} lệnh. Bạn có chắc chắn muốn tiếp tục?`;

        showConfirmAlert(message).then((result) => {
            if (result.isConfirmed) {
                // Nếu updateMutation đã hỗ trợ mảng thì gửi cancelable trực tiếp
                cancelable.forEach((o) => {
                    updateMutation.mutate({ _id: o._id, status: StatusOrderEnum.CANCEL });
                });
            }
        });
    };

    const deleteMutation = useMutation({
        mutationFn: OrderService.delete,
        onSuccess: (message) => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            setSelectedOrders([]);
            showSuccessAlert(message || 'Xóa thành công');
            handleClose()
        },
        onError: (error: any) => {
            showErrorAlert(error.response.data.message || error.message || 'Lỗi')
        }
    });

    const handleOpen = (orders: any[] = []) => {
        setSelectedOrder(orders);
        setTransfer(false)
        setExpanded(true)
        setOpen(true);
        setTimeout(() => {
            if (formRef.current) {
                formRef.current.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }, 500);
    };
    const handleCopy = (orders: any[] = []) => {
        setSelectedOrder(orders)
        setOpen(false)
        setExpanded(true)
        setTransfer(true)
        setTimeout(() => {
            if (formRef.current) {
                formRef.current.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }, 500);

    };

    const handleClose = () => {
        setOpen(false);
        setTransfer(false);
        setSelectedOrder([]);
        setExpanded(false)
    };

    const handleSubmit = (values: Partial<Order>) => {
        if (selectedOrder.length) {
            updateMutation.mutate(values);
        } else {
            createMutation.mutate(values);
        }
    };
    const handleDelete = () => {
        if (selectedOrders.length === 0) {
            return showErrorAlert('Không tìm thấy bản ghi cần xóa');
        }

        // lọc ra những order có thể xoá
        const deletableOrders = selectedOrders.filter(o =>
            o.status !== "in_progress" && o.status !== "completed"
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
                deleteMutation.mutate(deletableOrders.map(o => o._id));
            }
        });
    };

    useEffect(() => {
        if (transfer && formRef.current) {
            setTimeout(() => {
                if (formRef.current) {
                    formRef.current.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }, 500);
        }
    }, [transfer]);


    const [page, setPage] = React.useState(0);
    const [pageSize, setPageSize] = React.useState(10);

    const handleChangePage = (event: React.MouseEvent<HTMLButtonElement, MouseEvent> | null, page: number) => {
        setPage(page);
    };

    const groupOrdersByBatch = (orders: any[]) => {
        return orders.reduce((acc, order) => {
            const batchId = order.batchId || 'no-batch';
            if (!acc[batchId]) {
                acc[batchId] = [];
            }
            acc[batchId].push(order);
            return acc;
        }, {} as Record<string, any[]>);
    };
    // Tìm nhanh trên danh sách đã tải (người nhận, số thẻ, công việc, nội dung, mã lô)
    const keyword = search.trim().toLowerCase();
    const searchedOrders = React.useMemo(() => {
        if (!keyword) return orders;
        return orders.filter((o: any) =>
            [o.assignedTo?.fullName, o.assignedTo?.salaryCode, o.job?.name, o.workContent, o.batchId]
                .some(v => String(v ?? '').toLowerCase().includes(keyword))
        );
    }, [orders, keyword]);
    const filteredOrders = React.useMemo(() => {
        if (!status) return searchedOrders;
        return searchedOrders.filter((o: Order) => o.status === status);
    }, [searchedOrders, status]);
    const groupedOrders = React.useMemo(() => groupOrdersByBatch(filteredOrders), [filteredOrders]);


    // 3. Phân trang theo batch
    const pageData = (entries: [string, any[]][], page: number, pageSize: number) => {
        return entries.slice(page * pageSize, (page + 1) * pageSize);
    };

    const batchEntries = Object.entries(groupedOrders) as [string, any[]][];
    const paginatedBatches = pageData(batchEntries, page, pageSize);

    // 4. Tổng số nhóm
    const totalGroups = batchEntries.length;
    // Tổng số cột đang hiển thị: Select + STT + (các cột bạn bật) + cột "Sao chép"
    const colCount = 2 + visibleColumns.length + 1;

    // ---- Lớp trình bày: bộ lọc, phân trang theo lô, thanh công cụ (state/truy vấn/mutation gốc ở trên không đổi) ----
    const hasFilter = Boolean(search || employee || department || startTime || endTime || status);
    const clearFilters = () => {
        setSearch('');
        setEmployee('');
        setDepartment('');
        setStartTime(null);
        setEndTime(null);
        setStatus('');
        setPage(0);
    };
    const applyRange = (from: Dayjs | null, to: Dayjs | null) => {
        setStartTime(from);
        setEndTime(to);
        setPage(0);
    };

    const statusPills = [
        { key: '', label: 'Tất cả', color: BLUE, bg: tintMid, dot: BLUE, solid: BLUE },
        ...ORDER_STATUS_META,
    ].map(m => ({
        ...m,
        count: m.key ? searchedOrders.filter((o: Order) => o.status === m.key).length : searchedOrders.length,
    }));

    const selectedCount = selectedOrders.length;
    const allSelected = filteredOrders.length > 0 && filteredOrders.every((o: any) => selectedOrders.some(s => s._id === o._id));
    const pageCount = Math.max(1, Math.ceil(totalGroups / pageSize));
    const rangeFrom = totalGroups === 0 ? 0 : page * pageSize + 1;
    const rangeTo = Math.min(totalGroups, (page + 1) * pageSize);

    // Chỉ lệnh "Chưa nhận" hoặc "Lỗi" mới sửa/hủy được (quy tắc cũ giữ nguyên)
    const isEditable = (order: any) => [StatusOrderEnum.PENDING, StatusOrderEnum.WARNING].includes(order?.status);
    const startEdit = async (order: any) => {
        if (open) {
            const result = await showConfirmAlert('Bạn đang cập nhật một mục. Nếu tiếp tục chỉnh sửa, dữ liệu hiện tại sẽ bị ghi đè. Bạn có chắc chắn muốn tiếp tục?');
            if (result.isConfirmed) {
                handleOpen([order]);
            }
        } else {
            handleOpen([order]);
        }
    };
    const startCopy = async (order: any) => {
        if (open) {
            const result = await showConfirmAlert('Bạn đang cập nhật một mục. Nếu tiếp tục chỉnh sửa, dữ liệu hiện tại sẽ bị ghi đè. Bạn có chắc chắn muốn tiếp tục?');
            if (result.isConfirmed) {
                handleCopy([order]);
            }
        } else {
            handleCopy([order]);
        }
    };

    const panelTitle = selectedOrder.length > 0 && transfer
        ? 'Sao chép lệnh'
        : selectedOrder.length > 0 && open
            ? 'Sửa lệnh sản xuất'
            : 'Tạo lệnh sản xuất';

    const headerBtnSx = {
        height: 40, px: 1.75, textTransform: 'none', fontWeight: 600, fontSize: 14, borderRadius: '10px',
        color: INK, bgcolor: '#fff', borderColor: LINE, '&:hover': { bgcolor: '#f8fafc', borderColor: '#cbd5e1' },
    } as const;
    const toolBtnSx = {
        height: 36, px: 1.25, textTransform: 'none', fontWeight: 500, fontSize: 13, borderRadius: '8px',
        color: INK, bgcolor: '#fff', border: `1px solid ${LINE}`, '&:hover': { bgcolor: '#f8fafc', borderColor: '#cbd5e1' },
    } as const;
    const squareBtnSx = {
        width: 36, height: 36, borderRadius: '8px', border: `1px solid ${LINE}`, bgcolor: '#fff', color: INK,
        '&:hover': { bgcolor: '#f8fafc' },
    } as const;
    const inputSx = {
        '& .MuiOutlinedInput-root': { height: 40, bgcolor: '#fff', borderRadius: '8px', fontSize: 13.5 },
        '& fieldset': { borderColor: LINE },
    } as const;
    // Ô bảng: gọn, viền mảnh
    const cellSx = { py: 0.75, px: 1.5, borderBottom: '1px solid #eef1f5', fontSize: 13, color: INK, whiteSpace: 'nowrap' } as const;
    const headCellSx = { ...cellSx, py: 1, bgcolor: '#f8fafc', borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}`, fontWeight: 700, fontSize: 12.5 } as const;

    return (
        <ThemeProvider theme={uiSansTheme}>
            {/* Phủ kín nền, bù lại padding 24px của MainLayout; fontFamily để thẻ div con kế thừa phông không chân */}
            <Box sx={{ bgcolor: '#f7f8fa', m: -3, p: 3, minHeight: '100%', fontFamily: UI_FONT }}>
                {/* Tiêu đề trang + 3 nút hành động */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: 28, fontWeight: 800, lineHeight: 1.2, color: INK }}>Lệnh sản xuất</Typography>
                        <Typography sx={{ fontSize: 14, color: MUTED, mt: 0.25 }}>Quản lý và theo dõi lệnh điều phối thiết bị</Typography>
                    </Box>
                    <Box sx={{ flex: 1 }} />
                    <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap' }}>
                        <Button
                            variant='outlined'
                            startIcon={<HistoryIcon />}
                            onClick={() => {
                                if (selectedOrders.length === 0) {
                                    return showErrorAlert('Vui lòng chọn lệnh cần xem lịch sử');
                                }
                                setHistory(true);
                            }}
                            sx={headerBtnSx}
                        >
                            Lịch sử
                        </Button>
                        <Button
                            variant='outlined'
                            startIcon={reportExcel.isPending ? <CircularProgress size={16} /> : <FileDownload />}
                            disabled={reportExcel.isPending}
                            onClick={() => {
                                if (selectedOrders.length > 0) {
                                    reportExcel.mutate();
                                } else {
                                    showErrorAlert('Vui lòng chọn bản ghi cần tải xuống');
                                }
                            }}
                            sx={headerBtnSx}
                        >
                            Xuất Excel
                        </Button>
                        <Button
                            variant='contained'
                            startIcon={<AddIcon />}
                            onClick={() => handleOpen()}
                            sx={{ ...headerBtnSx, color: '#fff', bgcolor: BLUE, borderColor: BLUE, boxShadow: 'none', '&:hover': { bgcolor: BLUE_DARK, boxShadow: 'none' } }}
                        >
                            Tạo lệnh
                        </Button>
                    </Box>
                </Box>

                {/* Form tạo / sửa / sao chép: mở ngay dưới tiêu đề */}
                <Collapse in={expanded} ref={formRef}>
                    <Paper variant='outlined' sx={{ mb: 1.5, borderRadius: 3, borderColor: edge, overflow: 'hidden' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 0.75, bgcolor: tintMid, borderBottom: `1px solid ${edge}` }}>
                            <Typography sx={{ flex: 1, fontSize: 15, fontWeight: 800 }}>{panelTitle}</Typography>
                            <IconButton size='small' onClick={handleClose} title='Đóng' aria-label='Đóng form'>
                                <CloseIcon fontSize='small' />
                            </IconButton>
                        </Box>
                        {/* Các form giữ nguyên theme/phông gốc của ứng dụng */}
                        <ThemeProvider theme={appFontTheme}>
                            <Box sx={{ p: 2, fontFamily: '"Times New Roman", Times, serif' }}>
                                {selectedOrder.length > 0 && open && <OrderFormEdit
                                    initialValues={selectedOrder}
                                    onSubmit={handleSubmit}
                                    onCancel={handleClose}
                                />}
                                {selectedOrder.length === 0 && open && <OrderFormAdd
                                    onSubmit={handleSubmit}
                                    onCancel={handleClose}
                                />}
                                {selectedOrder.length > 0 && transfer && < DispatcherOrderFormTransfer
                                    initialValues={selectedOrder}
                                    onCancel={handleClose}
                                />}
                            </Box>
                        </ThemeProvider>
                    </Paper>
                </Collapse>

                {/* Thẻ bộ lọc: trạng thái + tìm kiếm + nhân viên + đơn vị + khoảng ngày */}
                <Paper variant='outlined' sx={{ borderRadius: 3, p: 1.5, mb: 1.5, bgcolor: '#fbfcfe', borderColor: LINE }}>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {statusPills.map(p => {
                            const active = status === p.key;
                            return (
                                <ButtonBase
                                    key={p.key || 'all'}
                                    aria-pressed={active}
                                    onClick={() => {
                                        handleChange(p.key);
                                        setPage(0);
                                    }}
                                    sx={{
                                        display: 'inline-flex', alignItems: 'center', gap: 1, pl: 1.5, pr: 0.75, height: 36, borderRadius: '10px',
                                        border: `1px solid ${active ? p.solid : LINE}`, bgcolor: active ? p.solid : '#fff', color: active ? '#fff' : INK,
                                        fontSize: 13.5, fontWeight: 600, transition: 'background-color .15s, border-color .15s',
                                        '&:hover': { bgcolor: active ? p.solid : '#f8fafc' },
                                    }}
                                >
                                    {p.key !== '' && (
                                        <Box component='span' sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: active ? '#fff' : p.dot }} />
                                    )}
                                    {p.label}
                                    <Box
                                        component='span'
                                        sx={{
                                            minWidth: 28, height: 22, px: 0.75, borderRadius: '11px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 12.5, fontWeight: 700, bgcolor: active ? 'rgba(255,255,255,.92)' : p.bg, color: active ? p.solid : p.color,
                                        }}
                                    >
                                        {p.count}
                                    </Box>
                                </ButtonBase>
                            );
                        })}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mt: 1.25 }}>
                        <SearchInput
                            size='small'
                            value={search}
                            placeholder='Tìm người nhận, số thẻ, công việc, mã lô...'
                            iconPosition='start'
                            onChange={(val) => {
                                setSearch(val);
                                setPage(0);
                            }}
                            sx={{ flex: '2 1 280px', minWidth: 230, ...inputSx }}
                        />
                        <Autocomplete
                            size='small'
                            options={users}
                            getOptionLabel={(option: any) => `${option?.fullName || ''}-${option?.salaryCode || ''}`}
                            value={users.find((p: any) => p._id === employee) || null}
                            onChange={(event, newValue) => {
                                setEmployee(newValue?._id || '');
                                setPage(0);
                            }}
                            PopperComponent={StyledPopper}
                            sx={{ flex: '1 1 200px', minWidth: 180, ...inputSx }}
                            renderInput={(params) => (
                                <TextField {...params} size='small' placeholder='Tất cả nhân viên' />
                            )}
                        />
                        <Autocomplete
                            size='small'
                            options={departments}
                            getOptionLabel={(option: any) => option.code || ''}
                            value={departments.find((p: any) => p._id === department) || null}
                            onChange={(event, newValue) => {
                                setDepartment(newValue?._id || '');
                                setPage(0);
                            }}
                            PopperComponent={StyledPopper}
                            sx={{ flex: '1 1 180px', minWidth: 160, ...inputSx }}
                            renderInput={(params) => (
                                <TextField {...params} size='small' placeholder='Tất cả đơn vị' />
                            )}
                        />
                        <DateRangeFilter startTime={startTime} endTime={endTime} onChange={applyRange} />
                        <Tooltip title='Đặt lại bộ lọc' placement='top'>
                            <span>
                                <IconButton onClick={clearFilters} disabled={!hasFilter} aria-label='Đặt lại bộ lọc' sx={{ ...squareBtnSx, width: 40, height: 40 }}>
                                    <RestartAlt />
                                </IconButton>
                            </span>
                        </Tooltip>
                    </Box>
                </Paper>

                {/* Bảng theo lô + chi tiết lệnh */}
                <Box
                    sx={{
                        display: 'grid', gap: 1.5, alignItems: 'start',
                        gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: info ? 'minmax(0, 1fr) 380px' : 'minmax(0, 1fr)' },
                    }}
                >
                    <Paper variant='outlined' sx={{ borderRadius: 3, overflow: 'hidden', borderColor: LINE }}>
                        {/* Đầu thẻ: tên + số lệnh/lô + công cụ bảng */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', px: 2, py: 1.25 }}>
                            <Typography sx={{ fontSize: 16, fontWeight: 800, color: INK }}>Danh sách lệnh</Typography>
                            <Box component='span' sx={{ px: 1.25, height: 24, borderRadius: '12px', bgcolor: '#eef1f6', color: MUTED, fontSize: 12.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>
                                {filteredOrders.length} lệnh · {totalGroups} lô
                            </Box>
                            <Box sx={{ flex: 1 }} />
                            <Tooltip title='Tải lại danh sách' placement='top'>
                                <span>
                                    <IconButton aria-label='Tải lại danh sách' sx={squareBtnSx} onClick={() => refetchOrders()} disabled={isLoading}>
                                        {isLoading ? <CircularProgress size={18} /> : <Refresh fontSize='small' />}
                                    </IconButton>
                                </span>
                            </Tooltip>
                            <Button onClick={(e) => setAnchorEl(e.currentTarget)} startIcon={<ViewColumn fontSize='small' />} endIcon={<ExpandMore fontSize='small' />} sx={toolBtnSx}>
                                Cột
                            </Button>
                            <IconButton aria-label='Thêm tuỳ chọn' sx={squareBtnSx} onClick={(e) => setMoreAnchor(e.currentTarget)}>
                                <MoreHoriz fontSize='small' />
                            </IconButton>
                        </Box>
                        {isLoading && <LinearProgress />}

                        <TableContainer sx={{ maxHeight: 'max(520px, 62vh)' }}>
                            <Table stickyHeader aria-label='Danh sách lệnh theo lô'>
                                <TableHead>
                                    <TableRow>
                                        <TableCell align='center' sx={{ ...headCellSx, position: 'sticky', left: 0, zIndex: 4, width: 50, minWidth: 50, px: 0.5 }}>
                                            <Checkbox
                                                size='small'
                                                color='primary'
                                                checked={allSelected}
                                                indeterminate={selectedOrders.length > 0 && !allSelected}
                                                onChange={() => {
                                                    if (allSelected) {
                                                        setSelectedOrders([]);
                                                    } else {
                                                        setSelectedOrders(filteredOrders);
                                                    }
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell align='center' sx={{ ...headCellSx, position: 'sticky', left: 50, zIndex: 4, width: 56, minWidth: 56, px: 0.5 }}>STT</TableCell>
                                        {visibleColumns.includes('assignedTo') && (
                                            <TableCell sx={{ ...headCellSx, position: 'sticky', left: 106, zIndex: 4, minWidth: 190, boxShadow: '2px 0 4px rgba(0,0,0,0.08)' }}>
                                                <Box sx={{ lineHeight: 1.25 }}>
                                                    <Box sx={{ fontSize: 12.5, fontWeight: 700 }}>Người nhận lệnh</Box>
                                                    <Box sx={{ fontSize: 11, fontWeight: 500, color: MUTED }}>Số thẻ</Box>
                                                </Box>
                                            </TableCell>
                                        )}
                                        {visibleColumns.includes('workingDate') && <TableCell sx={headCellSx}>Ngày làm việc</TableCell>}
                                        {visibleColumns.includes('job') && <TableCell sx={headCellSx}>Công việc</TableCell>}
                                        {visibleColumns.includes('content') && <TableCell sx={headCellSx}>Nội dung lệnh</TableCell>}
                                        {visibleColumns.includes('createdBy') && (
                                            <TableCell sx={headCellSx}>
                                                <Box sx={{ lineHeight: 1.25 }}>
                                                    <Box sx={{ fontSize: 12.5, fontWeight: 700 }}>Người ra lệnh</Box>
                                                    <Box sx={{ fontSize: 11, fontWeight: 500, color: MUTED }}>Tạo lúc</Box>
                                                </Box>
                                            </TableCell>
                                        )}
                                        {visibleColumns.includes('startTime') && <TableCell sx={headCellSx}>Bắt đầu</TableCell>}
                                        {visibleColumns.includes('endTime') && <TableCell sx={headCellSx}>Kết thúc</TableCell>}
                                        {visibleColumns.includes('status') && <TableCell sx={headCellSx}>Trạng thái</TableCell>}
                                        <TableCell align='center' sx={{ ...headCellSx, position: 'sticky', right: 0, zIndex: 4, width: 56, minWidth: 56, px: 0.5, boxShadow: '-2px 0 4px rgba(0,0,0,0.08)' }}>
                                            <MoreHoriz sx={{ color: MUTED, verticalAlign: 'middle' }} />
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {!isLoading && paginatedBatches.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={colCount} sx={{ border: 0 }}>
                                                <NoOrders />
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {paginatedBatches.map(([batchId, list]) => {
                                        const batchExpanded = expandedBatches[batchId] ?? false;
                                        const batchOrders = list as any[];
                                        const batchAllSelected = batchOrders.length > 0 && batchOrders.every(o => selectedOrders.some(s => s._id === o._id));
                                        const batchSomeSelected = batchOrders.some(o => selectedOrders.some(s => s._id === o._id)) && !batchAllSelected;
                                        return (
                                            <React.Fragment key={batchId}>
                                                {/* HÀNG TIÊU ĐỀ LÔ */}
                                                <TableRow sx={{ bgcolor: tintLight }}>
                                                    <TableCell colSpan={colCount} sx={{ ...cellSx, py: 0.5, position: 'sticky', left: 0, bgcolor: tintLight }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                                            <Checkbox
                                                                size='small'
                                                                color='primary'
                                                                checked={batchAllSelected}
                                                                indeterminate={batchSomeSelected}
                                                                onChange={() => {
                                                                    if (batchAllSelected) {
                                                                        // bỏ chọn hết trong lô
                                                                        setSelectedOrders(prev => prev.filter(s => !batchOrders.some(o => o._id === s._id)));
                                                                    } else {
                                                                        // chọn toàn bộ trong lô (gộp thêm các lệnh của lô)
                                                                        setSelectedOrders(prev => [...prev, ...batchOrders.filter(o => !prev.some(s => s._id === o._id))]);
                                                                    }
                                                                }}
                                                            />
                                                            <ButtonBase
                                                                onClick={() => handleToggleBatch(batchId)}
                                                                aria-expanded={batchExpanded}
                                                                sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, borderRadius: '8px', pr: 1 }}
                                                            >
                                                                <ExpandMore sx={{ transform: batchExpanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: '0.2s', color: MUTED }} />
                                                                <Typography sx={{ fontWeight: 800, fontSize: 14, color: INK }}>
                                                                    Lô: {batchId === 'no-batch' ? 'Không có lô' : batchId}
                                                                </Typography>
                                                            </ButtonBase>
                                                            <Box component='span' sx={{ px: 1, height: 22, borderRadius: '11px', bgcolor: tintStrong, color: BLUE_DARK, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center' }}>
                                                                {batchOrders.length} lệnh
                                                            </Box>
                                                            {/* Nút đứng ngay cạnh tên lô (không đẩy sang mép phải bảng rộng, tránh phải cuộn ngang) */}
                                                            <Button size='small' variant='outlined' startIcon={<EditIcon />} onClick={() => handleOpen(batchOrders)} sx={{ ...toolBtnSx, height: 30, color: BLUE_DARK }}>
                                                                Sửa lô
                                                            </Button>
                                                            <Button size='small' variant='outlined' startIcon={<CopyAll />} onClick={() => handleCopy(batchOrders)} sx={{ ...toolBtnSx, height: 30, color: '#15803d' }}>
                                                                Sao chép lô
                                                            </Button>
                                                            <Button size='small' variant='outlined' startIcon={<CancelOutlined />} onClick={() => handleCancel(batchOrders)} sx={{ ...toolBtnSx, height: 30, color: '#c2410c' }}>
                                                                Hủy lô
                                                            </Button>
                                                        </Box>
                                                    </TableCell>
                                                </TableRow>

                                                {/* CÁC DÒNG TRONG LÔ */}
                                                {batchExpanded && batchOrders.map((order: any, index: number) => {
                                                    const checked = selectedOrders.some(o => o._id === order._id);
                                                    const active = info && selectedRow?._id === order._id;
                                                    const rowBg = active ? tintStrong : checked ? tintMid : '#fff';
                                                    return (
                                                        <TableRow
                                                            key={order._id}
                                                            hover
                                                            sx={{ cursor: 'pointer', bgcolor: rowBg, '&:hover': { bgcolor: active ? tintStrong : checked ? tintMid : '#f8fafc' } }}
                                                            onClick={() => setSelectedRow(order)}
                                                        >
                                                            <TableCell align='center' sx={{ ...cellSx, position: 'sticky', left: 0, zIndex: 1, width: 50, minWidth: 50, px: 0.5, bgcolor: 'inherit' }}>
                                                                <Checkbox size='small' onChange={() => handleSelected(order)} checked={checked} />
                                                            </TableCell>
                                                            <TableCell align='center' sx={{ ...cellSx, position: 'sticky', left: 50, zIndex: 1, width: 56, minWidth: 56, px: 0.5, bgcolor: 'inherit', color: MUTED }}>
                                                                {index + 1}
                                                            </TableCell>
                                                            {visibleColumns.includes('assignedTo') && (
                                                                <TableCell sx={{ ...cellSx, position: 'sticky', left: 106, zIndex: 1, minWidth: 190, maxWidth: 220, bgcolor: 'inherit', boxShadow: '2px 0 4px rgba(0,0,0,0.08)' }}>
                                                                    <TwoLine bold top={order.assignedTo?.fullName} bottom={order.assignedTo?.salaryCode} />
                                                                </TableCell>
                                                            )}
                                                            {visibleColumns.includes('workingDate') && (
                                                                <TableCell sx={cellSx}>
                                                                    <OneLine value={order.workingDate ? format(new Date(order.workingDate), 'dd/MM/yyyy') : undefined} />
                                                                </TableCell>
                                                            )}
                                                            {visibleColumns.includes('job') && (
                                                                <TableCell sx={cellSx}>
                                                                    <OneLine value={order.job?.name} max={180} />
                                                                </TableCell>
                                                            )}
                                                            {visibleColumns.includes('content') && (
                                                                <TableCell sx={cellSx}>
                                                                    <OneLine value={order.workContent} max={260} />
                                                                </TableCell>
                                                            )}
                                                            {visibleColumns.includes('createdBy') && (
                                                                <TableCell sx={cellSx}>
                                                                    <TwoLine
                                                                        bold
                                                                        top={order.createdBy?.fullName}
                                                                        bottom={order.createdAt ? format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm') : undefined}
                                                                    />
                                                                </TableCell>
                                                            )}
                                                            {visibleColumns.includes('startTime') && (
                                                                <TableCell sx={cellSx}>
                                                                    <OneLine value={order.startTime ? format(new Date(order.startTime), 'dd/MM/yyyy HH:mm') : undefined} />
                                                                </TableCell>
                                                            )}
                                                            {visibleColumns.includes('endTime') && (
                                                                <TableCell sx={cellSx}>
                                                                    <OneLine value={order.endTime ? format(new Date(order.endTime), 'dd/MM/yyyy HH:mm') : undefined} />
                                                                </TableCell>
                                                            )}
                                                            {visibleColumns.includes('status') && (
                                                                <TableCell sx={cellSx}>
                                                                    <StatusPill status={order.status} />
                                                                </TableCell>
                                                            )}
                                                            <TableCell align='center' sx={{ ...cellSx, position: 'sticky', right: 0, zIndex: 1, width: 56, minWidth: 56, px: 0.5, bgcolor: 'inherit', boxShadow: '-2px 0 4px rgba(0,0,0,0.08)' }}>
                                                                <IconButton
                                                                    size='small'
                                                                    aria-label='Thao tác'
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setRowMenu({ anchor: e.currentTarget, row: order });
                                                                    }}
                                                                >
                                                                    <MoreHoriz fontSize='small' />
                                                                </IconButton>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </React.Fragment>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        {/* Chân bảng: thao tác theo lựa chọn (trái) + phân trang theo lô (phải) */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', px: 2, py: 1, minHeight: 56, borderTop: `1px solid ${LINE}` }}>
                            {selectedCount > 0 ? (
                                <>
                                    <Typography sx={{ fontSize: 13.5, color: INK }}>Đã chọn <b>{selectedCount}</b> lệnh</Typography>
                                    <Button size='small' onClick={() => setSelectedOrders([])} sx={{ textTransform: 'none', fontWeight: 600, color: BLUE }}>
                                        Bỏ chọn
                                    </Button>
                                    <Button size='small' variant='outlined' color='error' startIcon={<DeleteIcon />} onClick={handleDelete} sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px', bgcolor: '#fff' }}>
                                        Xóa
                                    </Button>
                                </>
                            ) : (
                                <Typography sx={{ fontSize: 12.5, color: '#94a3b8' }}>Tích chọn lệnh trong bảng để xóa, xuất Excel hoặc xem lịch sử</Typography>
                            )}
                            <Box sx={{ flex: 1 }} />
                            <Typography sx={{ fontSize: 13, color: MUTED }}>Số lô/trang</Typography>
                            <Select
                                size='small'
                                value={pageSize}
                                onChange={(e) => {
                                    setPageSize(Number(e.target.value));
                                    setPage(0);
                                }}
                                sx={{ height: 34, fontSize: 13, borderRadius: '8px', bgcolor: '#fff', '& fieldset': { borderColor: LINE } }}
                            >
                                {[5, 10, 25].map(n => (
                                    <MenuItem key={n} value={n} sx={{ fontSize: 13 }}>{n}</MenuItem>
                                ))}
                            </Select>
                            <Typography sx={{ fontSize: 13, color: INK, mx: 0.5 }}>{rangeFrom} – {rangeTo} / {totalGroups} lô</Typography>
                            <IconButton size='small' aria-label='Trang trước' disabled={page <= 0} onClick={() => handleChangePage(null, page - 1)} sx={{ ...squareBtnSx, width: 34, height: 34 }}>
                                <ChevronLeft fontSize='small' />
                            </IconButton>
                            {pageItems(page + 1, pageCount).map((it, i) =>
                                it === '…' ? (
                                    <Box key={`gap-${i}`} component='span' sx={{ color: MUTED }}>…</Box>
                                ) : (
                                    <ButtonBase
                                        key={it}
                                        aria-label={`Trang ${it}`}
                                        aria-current={it === page + 1 ? 'page' : undefined}
                                        onClick={() => handleChangePage(null, it - 1)}
                                        sx={{
                                            minWidth: 34, height: 34, px: 0.5, borderRadius: '8px', fontSize: 13, fontWeight: 700,
                                            border: `1px solid ${it === page + 1 ? BLUE : LINE}`, bgcolor: it === page + 1 ? BLUE : '#fff', color: it === page + 1 ? '#fff' : INK,
                                        }}
                                    >
                                        {it}
                                    </ButtonBase>
                                )
                            )}
                            <IconButton size='small' aria-label='Trang sau' disabled={page + 1 >= pageCount} onClick={() => handleChangePage(null, page + 1)} sx={{ ...squareBtnSx, width: 34, height: 34 }}>
                                <ChevronRight fontSize='small' />
                            </IconButton>
                        </Box>
                    </Paper>
                    {info && <OrderDetailPanel order={selectedRow} onClose={() => setInfo(false)} />}
                </Box>

                {/* Menu: chọn cột hiển thị */}
                <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)} sx={{ maxHeight: 460 }}>
                    {defaultColumns.map((col) => (
                        <MenuItem key={col.id} onClick={() => handleToggleColumn(col.id)}>
                            <Switch size='small' checked={visibleColumns.includes(col.id)} />
                            <ListItemText primary={col.label} primaryTypographyProps={{ fontSize: 13.5 }} />
                        </MenuItem>
                    ))}
                </Menu>

                {/* Menu: thêm tuỳ chọn của bảng */}
                <Menu anchorEl={moreAnchor} open={Boolean(moreAnchor)} onClose={() => setMoreAnchor(null)}>
                    <MenuItem onClick={() => { setInfo(!info); setMoreAnchor(null); }} sx={{ fontSize: 13.5 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}><Visibility fontSize='small' /></ListItemIcon>
                        {info ? 'Ẩn chi tiết lệnh' : 'Hiện chi tiết lệnh'}
                    </MenuItem>
                    <MenuItem
                        onClick={() => {
                            setExpandedBatches(Object.fromEntries(batchEntries.map(([id]) => [id, true])));
                            setMoreAnchor(null);
                        }}
                        sx={{ fontSize: 13.5 }}
                    >
                        <ListItemIcon sx={{ minWidth: 32 }}><UnfoldMore fontSize='small' /></ListItemIcon>
                        Mở tất cả lô
                    </MenuItem>
                    <MenuItem onClick={() => { setExpandedBatches({}); setMoreAnchor(null); }} sx={{ fontSize: 13.5 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}><UnfoldLess fontSize='small' /></ListItemIcon>
                        Thu gọn tất cả lô
                    </MenuItem>
                </Menu>

                {/* Menu thao tác của từng dòng */}
                <Menu anchorEl={rowMenu?.anchor} open={Boolean(rowMenu)} onClose={() => setRowMenu(null)}>
                    {rowMenu && (
                        <MenuItem onClick={() => { setSelectedRow(rowMenu.row); setInfo(true); setRowMenu(null); }} sx={{ fontSize: 13.5 }}>
                            <ListItemIcon sx={{ minWidth: 32 }}><Visibility fontSize='small' /></ListItemIcon>
                            Xem chi tiết
                        </MenuItem>
                    )}
                    {rowMenu && (
                        <MenuItem disabled={!isEditable(rowMenu.row)} onClick={() => { const row = rowMenu.row; setRowMenu(null); startEdit(row); }} sx={{ fontSize: 13.5 }}>
                            <ListItemIcon sx={{ minWidth: 32 }}><EditIcon fontSize='small' /></ListItemIcon>
                            Sửa
                        </MenuItem>
                    )}
                    {rowMenu && (
                        <MenuItem onClick={() => { const row = rowMenu.row; setRowMenu(null); startCopy(row); }} sx={{ fontSize: 13.5 }}>
                            <ListItemIcon sx={{ minWidth: 32 }}><CopyAll fontSize='small' /></ListItemIcon>
                            Sao chép
                        </MenuItem>
                    )}
                    {rowMenu && <Divider />}
                    {rowMenu && (
                        <MenuItem disabled={!isEditable(rowMenu.row)} onClick={() => { const row = rowMenu.row; setRowMenu(null); handleCancel([row]); }} sx={{ fontSize: 13.5, color: '#c2410c' }}>
                            <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}><CancelOutlined fontSize='small' /></ListItemIcon>
                            Hủy lệnh
                        </MenuItem>
                    )}
                </Menu>

                {/* Hộp thoại lịch sử giữ nguyên theme/phông gốc */}
                <ThemeProvider theme={appFontTheme}>
                    <OrderHistories open={history} setOpen={setHistory} selectedOrders={selectedOrders} setSelectedOrders={setSelectedOrders} />
                </ThemeProvider>
            </Box>
        </ThemeProvider>
    );
};

export default DispatcherOrders; 