import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Button,
    Grid,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Checkbox,
    TextField,
    MenuItem,
    Tooltip,
    Autocomplete,
    Typography,
    Menu,
    Switch,
    ListItemText,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    TablePagination,
} from '@mui/material';
import { format } from 'date-fns';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    FileDownload,
    InfoOutlined,
    CancelOutlined,
    Settings,
    ExpandMore,
    CopyAll,
    Visibility,
    VisibilityOff,
} from '@mui/icons-material';
import { Order } from '../../types';
import OrderFormAdd from './DispatcherOrderFormAdd';
import OrderFormEdit from './DispatcherOrderFormEdit';
import DispatcherOrderFormTransfer from './DispatcherOrderFormTransfer';
import dayjs, { Dayjs } from 'dayjs';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { showConfirmAlert, showErrorAlert, showSuccessAlert } from '../../components/Alert';
import { StyledPopper } from '../../ui/poppers';
import UserService from '../../services/userService';
import DepartmentService from '../../services/departmentService';
import OrderService from '../../services/orderService';
import { StatusOrderEnum } from '../../enums';
import OrderHistories from '../../components/Modal/OrderHistories';
import { parseAxiosError } from '../../utils/handleApiError';


const DispatcherOrders: React.FC = () => {
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

    const defaultColumns = [
        { id: 'assignedTo', label: 'Người nhận lệnh' },
        { id: 'salaryCode', label: 'Số thẻ' },
        { id: 'workingDate', label: 'Ngày làm việc' },
        { id: 'job', label: 'Công việc' },
        { id: 'content', label: 'Nội dung lệnh' },
        { id: 'createdBy', label: 'Người ra lệnh' },
        { id: 'createdAt', label: 'Thời gian tạo lệnh' },
        { id: 'startTime', label: 'Bắt đầu' },
        { id: 'endTime', label: 'Kết thúc' },
        { id: 'status', label: 'Trạng thái lệnh' },
        { id: 'view', label: 'Xem' },
        { id: 'edit', label: 'Sửa' },
        { id: 'cancel', label: 'Hủy' },
        { id: 'transfer', label: 'Chuyển ca' },
    ]
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

    const { data: orders = [], isLoading } = useQuery({
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
    const filteredOrders = React.useMemo(() => {
        if (!status) return orders;
        return orders.filter((o: Order) => o.status === status);
    }, [orders, status]);
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

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h4" color={'blue'}>Lệnh sản xuất</Typography>
            </Box>
            <Accordion expanded={expanded} ref={formRef}>
                <AccordionSummary
                    expandIcon={
                        <></>}
                    aria-controls="panel1-content"
                    id="panel1-header"
                    sx={{
                        backgroundColor: 'white', '&.Mui-focusVisible': {
                            backgroundColor: 'white',
                        },
                    }}
                >
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', width: "100%" }}>
                        <Box display={'flex'} gap={2}>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => handleOpen()}
                            >
                                Thêm
                            </Button>
                            <Button variant="contained" startIcon={<DeleteIcon />} color='error' onClick={handleDelete}>
                                Xóa
                            </Button>
                            <Button variant="contained" startIcon={<InfoOutlined />} color='inherit' onClick={() => setHistory(true)}>
                                Lịch sử
                            </Button>
                            <Button variant="contained" startIcon={<FileDownload />} color='success' onClick={() => {
                                if (selectedOrders.length > 0) {
                                    reportExcel.mutate();
                                } else {
                                    showErrorAlert('Vui lòng chọn bản ghi cần tải xuống');
                                }
                            }}>
                                Tải xuống
                            </Button>
                        </Box>
                        <Box sx={{ display: 'flex', flex: 1, gap: 2, alignItems: 'center' }}>
                            <Autocomplete
                                fullWidth
                                options={users}
                                getOptionLabel={(option: any) =>
                                    `${option?.fullName || ""}-${option?.salaryCode || ''}`
                                }
                                value={users.find((p: any) => p._id === employee) || null}
                                onChange={(event, newValue) => {
                                    setEmployee(newValue?._id || '');
                                }}
                                PopperComponent={StyledPopper}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        size='small'
                                        label="Nhân viên"
                                    />
                                )}
                            />
                            <Autocomplete
                                fullWidth
                                options={departments}
                                getOptionLabel={(option: any) =>
                                    option.code || ''
                                }
                                value={departments.find((p: any) => p._id === department) || null}
                                onChange={(event, newValue) => {
                                    setDepartment(newValue?._id || '');
                                }}
                                PopperComponent={StyledPopper}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        fullWidth
                                        size='small'
                                        label="Đơn vị"
                                    />
                                )}
                            />
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <DatePicker
                                    label="Từ ngày"
                                    inputFormat="DD/MM/YYYY" // v5 vẫn hỗ trợ
                                    value={startTime ? dayjs(startTime) : null}
                                    onChange={(value) => setStartTime(value)}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            fullWidth
                                            size="small"
                                        />
                                    )}
                                />
                            </LocalizationProvider>

                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <DatePicker
                                    label="Đến ngày"
                                    inputFormat="DD/MM/YYYY" // v5 vẫn hỗ trợ
                                    value={endTime ? dayjs(endTime) : null}
                                    onChange={(value) => setEndTime(value)}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            fullWidth
                                            size="small"
                                        />
                                    )}
                                />
                            </LocalizationProvider>
                        </Box>

                    </Box>
                </AccordionSummary>
                <AccordionDetails>
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
                </AccordionDetails>
            </Accordion>
            <Box display="flex" gap={2} alignItems={'center'} justifyContent='flex-end'>
                <Box display="flex" alignItems={'center'}>
                    <Checkbox color='info' name="status" checked={status === ''}
                        onChange={() => handleChange('')} />
                    <ListItemText primary={`Tất cả (${orders.length})`} sx={{ color: 'blue' }} />
                </Box>
                <Box display="flex" alignItems={'center'}>
                    <Checkbox color='default' name="status" checked={status === StatusOrderEnum.PENDING}
                        onChange={() => handleChange(StatusOrderEnum.PENDING)} />
                    <ListItemText primary={`Chưa nhận lệnh (${orders.filter((o: Order) => o.status === StatusOrderEnum.PENDING).length})`} sx={{ color: 'grey' }} />
                </Box>
                <Box display="flex" alignItems={'center'}>
                    <Checkbox color='success' name="status" checked={status === StatusOrderEnum.INPROGRESS}
                        onChange={() => handleChange(StatusOrderEnum.INPROGRESS)} />
                    <ListItemText primary={`Đã nhận lệnh (${orders.filter((o: Order) => o.status === StatusOrderEnum.INPROGRESS).length})`} sx={{ color: 'green' }} />
                </Box>
                <Box display="flex" alignItems={'center'}>
                    <Checkbox color='warning' name="status" checked={status === StatusOrderEnum.WARNING}
                        onChange={() => handleChange(StatusOrderEnum.WARNING)} />
                    <ListItemText primary={`Lỗi (${orders.filter((o: Order) => o.status === StatusOrderEnum.WARNING).length})`} sx={{ color: 'orange' }} />
                </Box>
                <Box display="flex" alignItems={'center'}>
                    <Checkbox color='error' name="status" checked={status === StatusOrderEnum.COMPLETED}
                        onChange={() => handleChange(StatusOrderEnum.COMPLETED)} />
                    <ListItemText primary={`Đã kết thúc (${orders.filter((o: Order) => o.status === StatusOrderEnum.COMPLETED).length})`} sx={{ color: 'red' }} />
                </Box>
                <Box display="flex" alignItems={'center'}>
                    <Checkbox color='secondary' name="status" checked={status === StatusOrderEnum.CANCEL}
                        onChange={() => handleChange(StatusOrderEnum.CANCEL)} />
                    <ListItemText primary={`Đã hủy (${orders.filter((o: Order) => o.status === StatusOrderEnum.CANCEL).length})`} sx={{ color: 'purple' }} />
                </Box>
            </Box>
            <Box display="flex" justifyContent="space-between" sx={{ mb: 2, mt: 2 }}>
                <Box display="flex" alignItems='center'>
                    <Typography variant="h4">Bảng lệnh sản xuất</Typography>
                    <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
                        <Settings sx={{ fontSize: 30 }} />
                    </IconButton>
                </Box>
                <Button
                    variant="outlined"
                    color="info"
                    startIcon={info ? <VisibilityOff /> : <Visibility />}
                    onClick={() => setInfo(!info)}
                    sx={{
                        textTransform: 'none',
                        borderRadius: 2,
                        px: 1.5,
                        py: 0.75,
                    }}
                >
                    {info ? 'Mở rộng' : 'Thu gọn'}
                </Button>
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
            <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={info ? 8 : 12}>
                    <Paper sx={{ width: '100%', overflowX: "initial" }}>
                        <TableContainer sx={{ maxHeight: '80vh' }}>
                            <Table stickyHeader aria-label="sticky table" sx={{
                                "& td, & th": { padding: "4px 8px" },
                            }}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell align='center' sx={{
                                            position: 'sticky',
                                            left: 0,
                                            top: 0,
                                            zIndex: 3,
                                            width: 50,
                                            fontWeight: 'bold', fontSize: 18,
                                        }}><Checkbox
                                                color="primary"
                                                checked={orders.length > 0 && selectedOrders.length === orders.length}
                                                indeterminate={selectedOrders.length > 0 && selectedOrders.length < orders.length}
                                                onChange={() => {
                                                    if (selectedOrders.length === orders.length) {
                                                        setSelectedOrders([]);
                                                    } else {
                                                        setSelectedOrders(orders);
                                                    }
                                                }}
                                            /></TableCell>
                                        <TableCell align='center' sx={{
                                            position: 'sticky',
                                            left: 50,
                                            top: 0,
                                            zIndex: 3,
                                            width: 50,

                                            fontWeight: 'bold', fontSize: 18
                                        }}>STT</TableCell>
                                        {visibleColumns.includes('assignedTo') && <TableCell align='center' sx={{
                                            position: 'sticky',
                                            left: 100,
                                            top: 0,
                                            zIndex: 3,
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            maxWidth: 150,
                                            fontWeight: 'bold', fontSize: 18
                                        }}>Người nhận lệnh</TableCell>}
                                        {visibleColumns.includes('salaryCode') && <TableCell align='center' sx={{
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            maxWidth: 70, fontWeight: 'bold', fontSize: 18
                                        }}>Số thẻ</TableCell>}
                                        {visibleColumns.includes('workingDate') && <TableCell align='center' sx={{
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            maxWidth: 100, fontWeight: 'bold', fontSize: 18
                                        }}>Ngày làm việc</TableCell>}
                                        {visibleColumns.includes('job') && <TableCell align='center' sx={{
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            maxWidth: 100, fontWeight: 'bold', fontSize: 18
                                        }}>Công việc</TableCell>}
                                        {visibleColumns.includes('content') && <TableCell align='center' sx={{
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            maxWidth: 100, fontWeight: 'bold', fontSize: 18
                                        }}>Nội dung lệnh</TableCell>}
                                        {visibleColumns.includes('createdBy') && <TableCell align='center' sx={{
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            maxWidth: 150, fontWeight: 'bold', fontSize: 18
                                        }}>Người ra lệnh</TableCell>}
                                        {visibleColumns.includes('createdAt') && <TableCell align='center' sx={{
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            maxWidth: 150, fontWeight: 'bold', fontSize: 18
                                        }}>Thời gian tạo lệnh</TableCell>}
                                        {visibleColumns.includes('startTime') && <TableCell align='center' sx={{
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            maxWidth: 80, fontWeight: 'bold', fontSize: 18
                                        }}>Bắt đầu</TableCell>}
                                        {visibleColumns.includes('endTime') && <TableCell align='center' sx={{
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            maxWidth: 80, fontWeight: 'bold', fontSize: 18
                                        }}>Kết thúc</TableCell>}
                                        {visibleColumns.includes('status') && <TableCell align='center' sx={{
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            maxWidth: 150, fontWeight: 'bold', fontSize: 18
                                        }}>Trạng thái lệnh</TableCell>}
                                        {visibleColumns.includes('edit') && <TableCell align='center' sx={{
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            maxWidth: 50, fontWeight: 'bold', fontSize: 18
                                        }}>Sửa</TableCell>}
                                        {visibleColumns.includes('cancel') && <TableCell align='center' sx={{
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            maxWidth: 50, fontWeight: 'bold', fontSize: 18
                                        }}>Hủy</TableCell>}
                                        <TableCell align='center' sx={{
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            maxWidth: 50, fontWeight: 'bold', fontSize: 18
                                        }}>Sao chép</TableCell>
                                    </TableRow>
                                </TableHead>
                                {!isLoading ? (
                                    <TableBody>
                                        {paginatedBatches.map(([batchId, list]) => {
                                            const expanded = expandedBatches[batchId] ?? false;
                                            return (
                                                <React.Fragment key={batchId}>
                                                    {/* HÀNG TIÊU ĐỀ NHÓM */}
                                                    <TableRow >
                                                        <TableCell colSpan={colCount} align="center" sx={{
                                                            position: 'sticky',
                                                            top: 0,
                                                            left: 0,               // dính trên đầu khi scroll dọc
                                                            zIndex: 2,             // cao hơn các cell khác
                                                            fontWeight: 'bold',
                                                        }}>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                <Checkbox
                                                                    color="primary"
                                                                    checked={
                                                                        (list as any[]).length > 0 &&
                                                                        (list as any[]).every(o => selectedOrders.some(s => s._id === o._id))
                                                                    }
                                                                    indeterminate={
                                                                        (list as any[]).some(o => selectedOrders.some(s => s._id === o._id)) &&
                                                                        !(list as any[]).every(o => selectedOrders.some(s => s._id === o._id))
                                                                    }
                                                                    onChange={() => {
                                                                        const allSelected = (list as any[]).every(o =>
                                                                            selectedOrders.some(s => s._id === o._id)
                                                                        );
                                                                        if (allSelected) {
                                                                            // bỏ chọn hết trong group
                                                                            setSelectedOrders(prev =>
                                                                                prev.filter(s => !(list as any[]).some(o => o._id === s._id))
                                                                            );
                                                                        } else {
                                                                            // chọn toàn bộ trong group (gộp thêm các order của nhóm)
                                                                            setSelectedOrders(prev => [
                                                                                ...prev,
                                                                                ...(list as any[]).filter(
                                                                                    o => !prev.some(s => s._id === o._id)
                                                                                ),
                                                                            ]);
                                                                        }
                                                                    }}
                                                                />
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => handleToggleBatch(batchId)}
                                                                    sx={{ transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: '0.2s' }}
                                                                >
                                                                    <ExpandMore />
                                                                </IconButton>
                                                                <Typography fontWeight={700}>
                                                                    Lệnh sản xuất: {batchId === 'no-batch' ? 'Không có lô' : batchId} • {(list as any[]).length} lệnh
                                                                </Typography>
                                                                <IconButton
                                                                    color="primary"
                                                                    sx={{ display: 'flex', alignItems: 'center' }}
                                                                    onClick={() => handleOpen(list as any[])}
                                                                >
                                                                    <EditIcon />
                                                                    <Typography>(Sửa)</Typography>
                                                                </IconButton>
                                                                <IconButton
                                                                    color="warning"
                                                                    sx={{ display: 'flex', alignItems: 'center' }}
                                                                    onClick={() => handleCancel(list as any[])}
                                                                >
                                                                    <CancelOutlined />
                                                                    <Typography>(Hủy)</Typography>
                                                                </IconButton>
                                                                <IconButton
                                                                    color="success"
                                                                    sx={{ display: 'flex', alignItems: 'center' }}
                                                                    onClick={() => handleCopy(list as any[])}
                                                                >
                                                                    <CopyAll />
                                                                    <Typography>(Sao chép)</Typography>
                                                                </IconButton>
                                                            </Box>
                                                        </TableCell>
                                                    </TableRow>

                                                    {/* CÁC DÒNG TRONG NHÓM (giữ nguyên code cũ) */}
                                                    {expanded && (list as any[]).map((order: any, index: number) => (
                                                        <TableRow key={order._id} sx={{
                                                            cursor: 'pointer', backgroundColor: order.status === StatusOrderEnum.PENDING
                                                                ? 'white'
                                                                : order.status === StatusOrderEnum.COMPLETED
                                                                    ? '#ffe5e5'
                                                                    : order.status === StatusOrderEnum.INPROGRESS
                                                                        ? '#e5f7e5'
                                                                        : order.status === StatusOrderEnum.WARNING
                                                                            ? '#fff8e1'
                                                                            : '#ede7f6',
                                                        }} onClick={() => setSelectedRow(order)}>
                                                            <TableCell align='center' sx={{
                                                                position: 'sticky',
                                                                left: 0,
                                                                zIndex: 1,
                                                                width: 50,
                                                                backgroundColor: order.status === StatusOrderEnum.PENDING
                                                                    ? 'white'
                                                                    : order.status === StatusOrderEnum.COMPLETED
                                                                        ? '#ffe5e5'
                                                                        : order.status === StatusOrderEnum.INPROGRESS
                                                                            ? '#e5f7e5'
                                                                            : order.status === StatusOrderEnum.WARNING
                                                                                ? '#fff8e1'
                                                                                : '#ede7f6',

                                                            }}>
                                                                <Checkbox onChange={() => handleSelected(order)} checked={selectedOrders.some(o => o._id === order._id)} />
                                                            </TableCell>

                                                            <TableCell align='center' sx={{
                                                                position: 'sticky',
                                                                left: 50,
                                                                zIndex: 1,
                                                                width: 50,
                                                                backgroundColor: order.status === StatusOrderEnum.PENDING
                                                                    ? 'white'
                                                                    : order.status === StatusOrderEnum.COMPLETED
                                                                        ? '#ffe5e5'
                                                                        : order.status === StatusOrderEnum.INPROGRESS
                                                                            ? '#e5f7e5'
                                                                            : order.status === StatusOrderEnum.WARNING
                                                                                ? '#fff8e1'
                                                                                : '#ede7f6',

                                                            }}>
                                                                {index + 1}
                                                            </TableCell>

                                                            {visibleColumns.includes('assignedTo') && <TableCell sx={{
                                                                position: 'sticky',
                                                                left: 100,
                                                                zIndex: 1,
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                maxWidth: 150,
                                                                backgroundColor: order.status === StatusOrderEnum.PENDING
                                                                    ? 'white'
                                                                    : order.status === StatusOrderEnum.COMPLETED
                                                                        ? '#ffe5e5'
                                                                        : order.status === StatusOrderEnum.INPROGRESS
                                                                            ? '#e5f7e5'
                                                                            : order.status === StatusOrderEnum.WARNING
                                                                                ? '#fff8e1'
                                                                                : '#ede7f6',

                                                            }}>{order.assignedTo?.fullName}</TableCell>}

                                                            {visibleColumns.includes('salaryCode') && <TableCell align='center' sx={{ width: 70, }}>
                                                                {order.assignedTo?.salaryCode}
                                                            </TableCell>}

                                                            {visibleColumns.includes('workingDate') && <TableCell align='center' className='ellipsisCell' sx={{
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                maxWidth: 100,
                                                            }}>
                                                                {order.workingDate ? format(new Date(order.workingDate), 'dd-MM-yyyy') : ''}
                                                            </TableCell>}
                                                            {visibleColumns.includes('job') && <TableCell sx={{
                                                                maxWidth: 100,
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                            }}>
                                                                {order.job?.name || ''}
                                                            </TableCell>}

                                                            {visibleColumns.includes('content') && <TableCell sx={{
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                maxWidth: 100,

                                                            }}>
                                                                {order.workContent || ''}
                                                            </TableCell>}
                                                            {visibleColumns.includes('createdBy') && <TableCell sx={{
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                maxWidth: 150,
                                                            }}>
                                                                {order.createdBy?.fullName || ''}
                                                            </TableCell>}

                                                            {visibleColumns.includes('createdAt') && <TableCell align='center' sx={{
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                maxWidth: 150,
                                                            }}>
                                                                {order.createdAt ? format(new Date(order.createdAt), 'dd-MM-yyyy HH:mm') : ''}
                                                            </TableCell>}

                                                            {visibleColumns.includes('startTime') && <TableCell align='center' sx={{
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                maxWidth: 80,
                                                            }}>
                                                                {order.startTime ? format(new Date(order.startTime), 'HH:mm:ss') : ''}
                                                            </TableCell>}

                                                            {visibleColumns.includes('endTime') && <TableCell align='center' sx={{
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                maxWidth: 80,
                                                            }}>
                                                                {order.endTime ? format(new Date(order.endTime), 'dd/MM/yyyy HH:mm:ss') : ''}
                                                            </TableCell>}

                                                            {visibleColumns.includes('status') && <TableCell align='center' sx={{
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                maxWidth: 150,
                                                            }}>
                                                                <Chip
                                                                    sx={{ width: '120px' }}
                                                                    label={order.status === StatusOrderEnum.PENDING ? 'Chưa nhận lệnh' :
                                                                        order.status === StatusOrderEnum.INPROGRESS ? 'Đã nhận lệnh' :
                                                                            order.status === StatusOrderEnum.COMPLETED ? 'Đã hoàn thành' :
                                                                                order.status === StatusOrderEnum.WARNING ? 'Lệnh bổ sung' : "Đã hủy"
                                                                    }
                                                                    color={
                                                                        order.status === StatusOrderEnum.PENDING ? 'default' :
                                                                            order.status === StatusOrderEnum.COMPLETED ? 'error' :
                                                                                order.status === StatusOrderEnum.INPROGRESS ? 'success' :
                                                                                    order.status === StatusOrderEnum.WARNING ? 'warning' : 'secondary'}
                                                                />
                                                            </TableCell>}

                                                            {visibleColumns.includes('edit') && <TableCell align='center' sx={{ width: 50, }}>
                                                                <IconButton
                                                                    color="primary"
                                                                    disabled={![StatusOrderEnum.PENDING, StatusOrderEnum.WARNING].includes(order.status)}
                                                                    onClick={async () => {
                                                                        if (open) {
                                                                            const result = await showConfirmAlert('Bạn đang cập nhật một mục. Nếu tiếp tục chỉnh sửa, dữ liệu hiện tại sẽ bị ghi đè. Bạn có chắc chắn muốn tiếp tục?');
                                                                            if (result.isConfirmed) {
                                                                                handleOpen([order]);
                                                                            }
                                                                        } else {
                                                                            handleOpen([order]);
                                                                        }
                                                                    }}
                                                                >
                                                                    <Tooltip title="Sửa" placement='top'>
                                                                        <EditIcon />
                                                                    </Tooltip>
                                                                </IconButton>
                                                            </TableCell>}

                                                            {visibleColumns.includes(StatusOrderEnum.CANCEL) && <TableCell align='center' sx={{ width: 50, }}>
                                                                <IconButton
                                                                    color="warning"
                                                                    disabled={![StatusOrderEnum.PENDING, StatusOrderEnum.WARNING].includes(order.status)}
                                                                    onClick={() => handleCancel([order])}
                                                                >
                                                                    <Tooltip title="Hủy" placement='top'>
                                                                        <CancelOutlined />
                                                                    </Tooltip>
                                                                </IconButton>
                                                            </TableCell>}

                                                            <TableCell align='center' sx={{ width: 50, }}>
                                                                <IconButton
                                                                    color="success"
                                                                    onClick={async () => {
                                                                        if (open) {
                                                                            const result = await showConfirmAlert('Bạn đang cập nhật một mục. Nếu tiếp tục chỉnh sửa, dữ liệu hiện tại sẽ bị ghi đè. Bạn có chắc chắn muốn tiếp tục?');
                                                                            if (result.isConfirmed) {
                                                                                handleCopy([order]);
                                                                            }
                                                                        } else {
                                                                            handleCopy([order]);
                                                                        }
                                                                    }}
                                                                >
                                                                    <Tooltip title="Copy" placement='top'>
                                                                        <CopyAll />
                                                                    </Tooltip>
                                                                </IconButton>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </React.Fragment>
                                            )
                                        })}
                                    </TableBody>
                                ) : (
                                    <Typography>Loading...</Typography>
                                )}

                            </Table>
                        </TableContainer>
                        <TablePagination
                            component="div"
                            count={totalGroups}
                            page={page}
                            onPageChange={handleChangePage}
                            rowsPerPage={pageSize}
                            onRowsPerPageChange={(event) => {
                                setPageSize(parseInt(event.target.value, 10));
                                setPage(0);
                            }}
                        />
                    </Paper>
                </Grid>
                {info && <Grid item xs={12} sm={4}>
                    <Box
                        sx={{
                            position: 'sticky',
                            top: 0,
                            maxHeight: '80vh',
                            overflowY: 'auto',
                            border: '1px solid #ccc',
                            borderRadius: 2,
                            p: 1.5, // Giảm padding một chút để phù hợp với cột nhỏ hơn
                            transition: 'width 0.3s ease-in-out, background-color 0.3s ease-in-out', // Thêm hiệu ứng chuyển đổi
                        }}
                    >
                        <Box display="flex" justifyContent={info ? 'space-between' : 'center'} alignItems="flex-start" flexDirection={info ? 'row' : 'column'}>
                            {info && <Typography variant="h6" sx={{ mb: 2, fontSize: '1.2rem' }}>Thông tin lệnh sản xuất</Typography>}
                        </Box>
                        {info && selectedRow ? (
                            <Box>
                                <Typography sx={{ display: 'flex', gap: 3 }}>
                                    <Typography><strong>Đơn vị: </strong>{selectedRow.assignedTo?.department?.code}</Typography>
                                    <Typography><strong>Ngày: </strong>{selectedRow.workingDate ? format(new Date(selectedRow.workingDate), 'dd-MM-yyyy') : ''}</Typography>
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
                                        <Typography>{selectedRow.createdBy?.salaryCode}</Typography>
                                    </Grid>
                                    {/* Chức vụ */}
                                    <Grid item xs={12} sm={4}>
                                        <Typography fontWeight="bold">Chức vụ:</Typography>
                                        <Typography>{selectedRow.createdBy?.position?.name}</Typography>
                                    </Grid>
                                </Grid>
                                <Grid container spacing={2}>
                                    {/* Người nhận lệnh */}
                                    <Grid item xs={12} sm={4}>
                                        <Typography fontWeight="bold">Người nhận lệnh:</Typography>
                                        <Typography>{selectedRow.assignedTo?.fullName}</Typography>
                                    </Grid>

                                    {/* Thẻ lương */}
                                    <Grid item xs={12} sm={4}>
                                        <Typography fontWeight="bold">Số thẻ:</Typography>
                                        <Typography>{selectedRow.assignedTo?.salaryCode}</Typography>
                                    </Grid>
                                    {/* Chức vụ */}
                                    <Grid item xs={12} sm={4}>
                                        <Typography fontWeight="bold">Chức vụ:</Typography>
                                        <Typography>{selectedRow.assignedTo?.position?.name}</Typography>
                                    </Grid>
                                </Grid>
                                <Typography><strong>Công việc:</strong> {selectedRow.job?.name}</Typography>
                                <Typography><strong>Nội dung lệnh:</strong> {selectedRow.workContent}</Typography>
                                <Typography><strong>Trạng thái lệnh:</strong> {
                                    selectedRow.status === StatusOrderEnum.PENDING ? 'Chưa nhận lệnh' :
                                        selectedRow.status === StatusOrderEnum.INPROGRESS ? 'Đã nhận lệnh' :
                                            selectedRow.status === StatusOrderEnum.COMPLETED ? 'Đã hoàn thành' :
                                                selectedRow.status === StatusOrderEnum.WARNING ? 'Lỗi' : "Đã hủy"}</Typography>
                            </Box>
                        ) : null}
                    </Box>
                </Grid>}
            </Grid >
            <OrderHistories open={history} setOpen={setHistory} selectedOrders={selectedOrders} setSelectedOrders={setSelectedOrders} />
        </Box >
    );
};

export default DispatcherOrders; 