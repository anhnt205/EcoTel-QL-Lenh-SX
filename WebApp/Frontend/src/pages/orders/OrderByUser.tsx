import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
    Switch,
    Menu,
    ListItemText,
    AlertColor,
    CircularProgress,
} from '@mui/material';
import { format } from 'date-fns';
import {
    Visibility,
    VisibilityOff,
    RotateLeft,
} from '@mui/icons-material';
import dayjs, { Dayjs } from 'dayjs';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DataGrid, GridColDef, GridRenderCellParams, GridToolbar } from '@mui/x-data-grid';
import OrderService from '../../services/orderService';
import { AlertSnackbar } from '../../components/Alert';
import { StatusOrderEnum } from '../../enums';

const OrderByUsers: React.FC = () => {

    const [startTime, setStartTime] = useState<Dayjs | null>(null);
    const [endTime, setEndTime] = useState<Dayjs | null>(null);
    const [status, setStatus] = useState('')
    const [selectedRow, setSelectedRow] = useState<any | null>(null);
    const [info, setInfo] = useState(false);

    const [paginationModel, setPaginationModel] = useState({
        pageSize: 50,
        page: 0,
    });
    const [total, setTotal] = useState(0);
    const [orderByUser, setOrderByUser] = useState<any[]>([]);


    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

    const defaultColumns = [
        { id: 'number', label: 'Số thứ tự' },
        { id: 'assignedTo', label: 'Người nhận lệnh' },
        { id: 'salaryCode', label: 'Số thẻ' },
        { id: 'workingDate', label: 'Ngày làm việc' },
        { id: 'job', label: 'Công việc' },
        { id: 'workContent', label: 'Nội dung lệnh' },
        { id: 'createdBy', label: 'Người ra lệnh' },
        { id: 'createdAt', label: 'Thời gian tạo lệnh' },
        { id: 'startTime', label: 'Bắt đầu' },
        { id: 'endTime', label: 'Kết thúc' },
        { id: 'status', label: 'Trạng thái lệnh' },
    ]
    const [visibleColumns, setVisibleColumns] = useState<string[]>(defaultColumns.map(i => i.id))

    const handleToggleColumn = (id: string) => {
        setVisibleColumns(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
    }

    const handleChange = (value: string) => {
        setStatus(prev => (prev === value ? '' : value)); // bỏ chọn nếu click lại
    };
    const [statusCounts, setStatusCounts] = useState<any>({
        all: 0,
        pending: 0,
        in_progress: 0,
        warning: 0,
        completed: 0,
        cancel: 0,
    });
    const { data, isLoading, refetch: refetchOrder } = useQuery({
        queryKey: ['orderByUser', paginationModel, status, startTime, endTime],
        queryFn: () => OrderService.getByUser(
            {
                page: paginationModel.page + 1,
                limit: paginationModel.pageSize,
                status: status || undefined,
                startTime: startTime ? startTime.toISOString() : '',
                endTime: endTime ? endTime.toISOString() : '',
            }
        )
    })
    useEffect(() => {
        if (data) {
            setOrderByUser(data.data);     // mảng order
            setTotal(data.totalDocs);   // tổng số bản ghi từ API
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

    const orderColumns: GridColDef[] = [
        {
            headerName: 'STT', field: 'number', width: 50, headerAlign: 'center', align: 'center',
            renderCell: (params: GridRenderCellParams) => {
                const sortedIds = params.api.getSortedRowIds();
                const index = sortedIds.indexOf(params.id);
                return index >= 0 ? index + 1 : '';
            },
        },
        {
            headerName: 'Người nhận lệnh', field: 'assignedTo', width: 100, minWidth: 50, headerAlign: 'center',
            renderCell: (params: any) => params?.row?.assignedTo?.fullName || '',
        },
        {
            headerName: 'Số thẻ', field: 'salaryCode', width: 50, minWidth: 50, align: 'center', headerAlign: 'center',
            renderCell: (params: any) => params?.row?.assignedTo?.salaryCode || '',
        },
        {
            headerName: 'Ngày làm việc', field: 'workingDate', width: 100, minWidth: 50, align: 'center', headerAlign: 'center',
            renderCell: (params: any) => params?.row?.workingDate ? format(new Date(params?.row?.workingDate), 'dd-MM-yyyy') : ''
        },
        {
            headerName: 'Công việc',
            field: 'job',
            width: 100, minWidth: 50,
            headerAlign: 'center',
            renderCell: (params: any) => params?.row?.job?.name || '',
        },
        {
            headerName: 'Nội dung lệnh',
            field: 'workContent',
            headerAlign: 'center',
            width: 100, minWidth: 50,
        },
        {
            headerName: 'Người ra lệnh', field: 'createdBy', width: 100, minWidth: 50, headerAlign: 'center',
            renderCell: (params: any) => params?.row?.createdBy?.fullName || '',
        },
        {
            headerName: 'Thời gian tạo lệnh', field: 'createdAt', width: 100, minWidth: 50, align: 'center', headerAlign: 'center',
            renderCell: (params: any) => params?.row?.createdAt ? format(new Date(params?.row?.createdAt), 'dd-MM-yyyy HH:mm') : ''
        },
        {
            headerName: 'Bắt đầu', field: 'startTime', width: 100, minWidth: 50, align: 'center', headerAlign: 'center',
            renderCell: (params: any) => params?.row?.startTime ? format(new Date(params?.row?.startTime), 'HH:mm:ss') : ''
        },
        {
            headerName: 'Kết thúc', field: 'endTime', width: 100, minWidth: 50, align: 'center', headerAlign: 'center',
            renderCell: (params: any) => params?.row?.endTime ? format(new Date(params?.row?.endTime), 'HH:mm:ss') : ''
        },
        {
            headerName: 'Trạng thái lệnh', field: 'status', width: 150, minWidth: 50, align: 'center', headerAlign: 'center',
            renderCell: (params: any) => (
                <Chip
                    sx={{ width: '120px' }}
                    label={params.row.status === StatusOrderEnum.PENDING ? 'Chưa nhận lệnh' :
                        params.row.status === StatusOrderEnum.INPROGRESS ? 'Đã nhận lệnh' :
                            params.row.status === StatusOrderEnum.COMPLETED ? 'Đã hoàn thành' :
                                params.row.status === StatusOrderEnum.WARNING ? 'Lệnh bổ sung' : "Đã hủy"
                    }
                    color={
                        params.row.status === StatusOrderEnum.PENDING ? 'default' :
                            params.row.status === StatusOrderEnum.COMPLETED ? 'error' :
                                params.row.status === StatusOrderEnum.INPROGRESS ? 'success' :
                                    params.row.status === StatusOrderEnum.WARNING ? 'warning' : 'secondary'}
                />
            ),
        },
    ];

    const [alert, setAlert] = useState<{ open: boolean; message: string; severity?: AlertColor }>({
        open: false,
        message: '',
        severity: 'success',
    });

    return (
        <Box>
            <AlertSnackbar alert={alert} setAlert={setAlert} />
            <Typography variant="h3" color="brand.title">Công việc của tôi</Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 3, mb: 3, border: '1px solid white', p: 1, boxShadow: 2 }}>
                <Box display={'flex'} gap={2} flex={1}>
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
            <Box display="flex" gap={2} alignItems={'center'} justifyContent='flex-end'>
                <Box display="flex" alignItems={'center'}>
                    <Checkbox color='info' name="status" checked={status === ''}
                        onChange={() => handleChange('')} />
                    <ListItemText primary={`Tất cả (${statusCounts.all})`} sx={{ color: "brand.title" }} />
                </Box>
                <Box display="flex" alignItems={'center'}>
                    <Checkbox color='default' name="status" checked={status === StatusOrderEnum.PENDING}
                        onChange={() => handleChange(StatusOrderEnum.PENDING)} />
                    <ListItemText primary={`Chưa nhận lệnh (${statusCounts.pending})`} sx={{ color: 'grey' }} />
                </Box>
                <Box display="flex" alignItems={'center'}>
                    <Checkbox color='success' name="status" checked={status === StatusOrderEnum.INPROGRESS}
                        onChange={() => handleChange(StatusOrderEnum.INPROGRESS)} />
                    <ListItemText primary={`Đã nhận lệnh (${statusCounts.in_progress})`} sx={{ color: 'green' }} />
                </Box>
                <Box display="flex" alignItems={'center'}>
                    <Checkbox color="warning" name="status" checked={status === StatusOrderEnum.WARNING}
                        onChange={() => handleChange(StatusOrderEnum.WARNING)} />
                    <ListItemText primary={`Lỗi (${statusCounts.warning})`} sx={{ color: 'orange' }} />
                </Box>
                <Box display="flex" alignItems={'center'}>
                    <Checkbox color='error' name="status" checked={status === StatusOrderEnum.COMPLETED}
                        onChange={() => handleChange(StatusOrderEnum.COMPLETED)} />
                    <ListItemText primary={`Đã kết thúc (${statusCounts.completed})`} sx={{ color: 'red' }} />
                </Box>
            </Box>
            <Box display="flex" justifyContent="space-between" sx={{ mb: 2, mt: 2 }}>
                <Box display="flex" alignItems='center'>
                    <Typography variant="h4">Bảng lệnh sản xuất</Typography>
                    <IconButton onClick={async () => {
                        try {
                            await refetchOrder(); // đợi xong refetch
                            setAlert({ open: true, message: 'Cập nhật thành công', severity: 'success' });
                        } catch (e) {
                            setAlert({ open: true, message: 'Cập nhật thất bại', severity: 'error' });
                        }
                    }} disabled={isLoading}>
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
                <Grid item xs={12} sm={info ? 8 : 12} maxHeight='60vh'>
                    <DataGrid
                        columns={orderColumns.filter((col: GridColDef) => col.field && visibleColumns.includes(col.field.toString()))}
                        rows={orderByUser}
                        pageSizeOptions={[20, 50, 100]}
                        paginationModel={paginationModel}
                        onPaginationModelChange={setPaginationModel}
                        paginationMode="server"
                        rowCount={total}
                        loading={isLoading}
                        onRowClick={(params) => setSelectedRow(params.row)}
                        getRowClassName={(params) => {
                            // Lấy dữ liệu hàng từ params.row
                            const record = params.row;
                            let base = '';

                            switch (record.status) {
                                case StatusOrderEnum.PENDING:
                                    base = 'row-pending';
                                    break;
                                case StatusOrderEnum.INPROGRESS:
                                    base = 'row-in-progress';
                                    break;
                                case StatusOrderEnum.COMPLETED:
                                    base = 'row-completed';
                                    break;
                                case StatusOrderEnum.WARNING:
                                    base = 'row-warning';
                                    break;
                                case StatusOrderEnum.CANCEL:
                                    base = 'row-cancel';
                                    break;
                            }

                            // So sánh ID để xác định hàng được chọn
                            return `${base} ${selectedRow?._id === record._id ? 'row-selected' : ''}`;
                        }}
                        slots={{ toolbar: GridToolbar }}
                        initialState={{
                            density: "compact"
                        }}
                        localeText={{
                            toolbarColumns: 'Cột',
                            toolbarFilters: 'Bộ lọc',
                            toolbarDensity: 'Mật độ',
                            toolbarExport: 'Xuất dữ liệu',
                        }}
                        disableColumnFilter
                        slotProps={{
                            filterPanel: {
                                disableAddFilterButton: false,
                            },
                            toolbar: {
                                csvOptions: { disableToolbarButton: true },
                                printOptions: { disableToolbarButton: true },

                            }
                        }}
                        disableVirtualization={true}
                        sx={{
                            '& .MuiDataGrid-columnHeader[data-field="number"]': {
                                position: 'sticky',
                                left: 0,
                                zIndex: 11,
                                backgroundColor: 'inherit !important',
                            },
                            '& .MuiDataGrid-cell[data-field="number"]': {
                                position: 'sticky',
                                left: 0,
                                zIndex: 10,
                                backgroundColor: 'inherit !important',
                            },

                            '& .MuiDataGrid-columnHeader[data-field="assignedTo"]': {
                                position: 'sticky',
                                left: 50, // 👈 phải đúng bằng width cột number
                                zIndex: 11,
                                backgroundColor: 'inherit !important',
                                boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
                            },
                            '& .MuiDataGrid-cell[data-field="assignedTo"]': {
                                position: 'sticky',
                                left: 50,
                                zIndex: 10,
                                backgroundColor: 'inherit !important',
                                boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
                            },
                            '& .MuiDataGrid-virtualScroller': {
                                overflowX: 'auto',
                            },
                        }} />
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
                                                selectedRow.status === StatusOrderEnum.WARNING ? 'Lỗi' : "Đã hủy"
                                }</Typography>
                            </Box>
                        ) : null}
                    </Box>
                </Grid>}
            </Grid >
        </Box >
    );
};

export default OrderByUsers; 