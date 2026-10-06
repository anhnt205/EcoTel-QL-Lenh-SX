import {
    Box,
    Paper,
    TableContainer,
    Table,
    TableRow,
    TableHead,
    TableCell,
    TableBody,
    TextField,
    Autocomplete,
    IconButton,
    CircularProgress,
    AlertColor,
    Typography,
} from '@mui/material';
import { useState } from 'react'
import PieChartOrder from '../../components/PieChartOrder'
import {  useQuery } from '@tanstack/react-query';
import {
    RotateLeft as RotateLeftIcon,
} from '@mui/icons-material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import dayjs, { Dayjs } from 'dayjs';
import api from '../../config/api.config';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { useAtom } from 'jotai';
import { userAtom } from '../../atoms/userAtoms';
import { AlertSnackbar } from '../../components/Alert';
import ExpandablePanel from '../../components/ExpandablePanel';
import { RoleEnum, StatusOrderEnum } from '../../enums';

export default function OrderAnalysic({ departments }: { departments: any[] }) {
    const [user] = useAtom(userAtom)
    const [department, setDepartment] = useState('');
    const [date, setDate] = useState<Dayjs | null>(dayjs());

    const orderStatus = [
        { key: StatusOrderEnum.PENDING, name: "Chưa nhận lệnh", color: 'black' },
        { key: StatusOrderEnum.INPROGRESS, name: "Đã nhận lệnh", color: 'green' },
        { key: StatusOrderEnum.WARNING, name: "Lỗi", color: 'orange' },
        { key: StatusOrderEnum.COMPLETED, name: "Đã hoàn thành", color: 'red' },
        { key: StatusOrderEnum.CANCEL, name: "Đã hủy", color: 'purple' },
    ];

    const [alert, setAlert] = useState<{ open: boolean; message: string; severity?: AlertColor }>({
        open: false,
        message: '',
        severity: 'success',
    });
    const { data: orderCount = {
        pending: { "ca1": 0, "ca2": 0, "ca3": 0, "day": 0, "month": 0 },
        in_progress: { "ca1": 0, "ca2": 0, "ca3": 0, "day": 0, "month": 0 },
        warning: { "ca1": 0, "ca2": 0, "ca3": 0, "day": 0, "month": 0 },
        completed: { "ca1": 0, "ca2": 0, "ca3": 0, "day": 0, "month": 0 },
        cancel: { "ca1": 0, "ca2": 0, "ca3": 0, "day": 0, "month": 0 }
    }, refetch: refetchOrderCount, isLoading: isLoadingOrderCount
    } = useQuery({
        queryKey: ['orderCount', department, date],
        queryFn: () => api.get('/orders/count_status', {
            params: {
                date: date ? date.toISOString() : '',
                department
            }
        }).then(res => res.data.data),
    });



    return (
        <ExpandablePanel>
        {({ expanded, expandButton }) => (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <AlertSnackbar alert={alert} setAlert={setAlert} />
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 1,
                    pl: 1.25,
                    pr: 5.5, // chừa chỗ cho nút mở rộng ở góc phải
                    py: 0.5,
                    bgcolor: '#dcf1d8',
                    borderBottom: '1px solid #e5e9f0',
                    position: 'sticky',
                    top: 0,
                    zIndex: 3,
                    flex: 'none',
                }}
            >
                <IconButton
                    size="small"
                    title="Cập nhật lệnh sản xuất"
                    onClick={async () => {
                        try {
                            await refetchOrderCount(); // đợi xong refetch
                            setAlert({ open: true, message: 'Cập nhật thành công', severity: 'success' });
                        } catch (e) {
                            setAlert({ open: true, message: 'Cập nhật thất bại', severity: 'error' });
                        }
                    }}
                    disabled={isLoadingOrderCount}
                >
                    {isLoadingOrderCount ? (
                        <CircularProgress size={20} />
                    ) : (
                        <RotateLeftIcon
                            sx={{
                                transition: "transform 0.3s ease",
                                "&:hover": { transform: "rotate(-180deg)" }, // xoay khi hover
                                color: "primary.main",
                            }}
                        />
                    )}
                </IconButton>
                <Typography sx={{ fontWeight: 800, fontSize: 14 }}>LỆNH SẢN XUẤT</Typography>
                <Box sx={{ flex: 1 }} />
                {user?.role === RoleEnum.ADMIN && <Autocomplete
                    size="small"
                    options={departments}
                    getOptionLabel={(option: any) =>
                        option.code || ''
                    }
                    value={departments.find((p: any) => p._id === department) || null}
                    onChange={(event, newValue) => {
                        setDepartment(newValue?._id || '');
                    }}
                    sx={{ width: 150, bgcolor: '#fff', borderRadius: 1 }}
                    renderInput={(params) => <TextField {...params} label="Đơn vị" />}
                />}
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                        inputFormat="DD/MM/YYYY"
                        label="Ngày"
                        value={date}
                        onChange={(newValue) => setDate(newValue)}
                        renderInput={(params) => <TextField {...params} size="small" sx={{ width: 150, bgcolor: '#fff', borderRadius: 1 }} />}
                    />
                </LocalizationProvider>
                {expandButton}
            </Box>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1.3fr) minmax(0, 1fr)' },
                    alignItems: 'center',
                    ...(expanded && { flex: 1, alignContent: 'center', p: 2, gap: 2 }),
                }}
            >
                <TableContainer>
                    <Table
                        size="small"
                        sx={{
                            '& td, & th': {
                                border: '1px solid #e8ecf1',
                                padding: expanded ? '10px 14px' : '3px 8px',
                                fontSize: expanded ? 16 : 13,
                            },
                        }}
                    >
                        <TableHead>
                            <TableRow>
                                <TableCell align="center" sx={{ fontWeight: 'bold', width: '28%' }}>Lệnh sản xuất</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Ca 1</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Ca 2</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Ca 3</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Ngày</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {orderStatus.map((item) => (
                                <TableRow key={item.key} sx={{ '&:nth-of-type(odd)': { bgcolor: '#f9f9f9' } }}>
                                    <TableCell sx={{ color: item.color, fontWeight: 'bold' }}>{item.name}</TableCell>
                                    <TableCell align="center">{orderCount[item.key]?.ca1 ?? 0}</TableCell>
                                    <TableCell align="center">{orderCount[item.key]?.ca2 ?? 0}</TableCell>
                                    <TableCell align="center">{orderCount[item.key]?.ca3 ?? 0}</TableCell>
                                    <TableCell align="center">{orderCount[item.key]?.day ?? 0}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                <PieChartOrder data={orderCount} scale={expanded ? 2.2 : 1} />
            </Box>
        </Paper>
        )}
        </ExpandablePanel>
    )
}
