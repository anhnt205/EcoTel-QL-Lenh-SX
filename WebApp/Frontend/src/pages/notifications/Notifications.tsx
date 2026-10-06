import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Button,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    Chip,
    Badge,
    TablePagination,
} from '@mui/material';
import {
    Delete as DeleteIcon,
    Check,
    Close,
} from '@mui/icons-material';
import api from '../../config/api.config';
import { showConfirmAlert, showErrorAlert } from '../../components/Alert';


const Notifications: React.FC = () => {
    const [type, setType] = useState<string | boolean>('')
    const [newNotification, setNewNotification] = useState(null)
    const queryClient = useQueryClient();

    const { data: notifications = [], isLoading } = useQuery({
        queryKey: ['notifications', type],
        queryFn: () => api.get(`/notifications?read=${type}`).then(res => res.data.data),
    });

    const { data: notificationUnreadCount = 0 } = useQuery({
        queryKey: ['notificationUnreadCount'],
        queryFn: () => api.get('/notifications/unread/count').then(res => res.data.data),
    });
    const { data: notificationReadCount = 0 } = useQuery({
        queryKey: ['notificationReadCount'],
        queryFn: () => api.get('/notifications/read/count').then(res => res.data.data),
    });
    useEffect(() => {
        if (newNotification) {
            queryClient.setQueryData(['notifications'], (old: any[] = []) => [
                newNotification,
                ...old,
            ]);
        }
    }, [newNotification, queryClient]);

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/notifications/${id}`).then(res => res.data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    const updateMutation = useMutation({
        mutationFn: (id: string) => api.patch(`/notifications/${id}/read`).then(res => res.data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    const handleDelete = (id: string) => {
        if (!id) {
            showErrorAlert('Không tìm thấy bản ghi');
            return;
        }
        showConfirmAlert('Bạn có muốn xóa bản ghi này?').then((result) => {
            if (result.isConfirmed) {
                deleteMutation.mutate(id);
            }
        });
    };

    const [page, setPage] = React.useState(0);
    const [pageSize, setPageSize] = React.useState(10);

    const handleChangePage = (event: React.MouseEvent<HTMLButtonElement, MouseEvent> | null, page: number) => {
        setPage(page);
    };

    const pageData = (notifications: any[], page: number, pageSize: number) => {
        let data;
        if (!page && !pageSize) {
            data = notifications
        } else {
            data = notifications.slice(page * pageSize, (page + 1) * pageSize)
        }
        return data
    }
    const paginatedData = pageData(notifications, page, pageSize);

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h4">Quản lý thông báo</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
                <Badge badgeContent={notificationReadCount} color='error' showZero>
                    <Button variant='contained' onClick={() => setType(true)}>Đã đọc</Button>
                </Badge>
                <Badge badgeContent={notificationUnreadCount} color='error' showZero>
                    <Button variant='contained' onClick={() => setType(false)}>Chưa đọc</Button>
                </Badge>
            </Box>
            <Typography variant="h4">Bảng thông báo</Typography>
            <TableContainer component={Paper} sx={{ boxShadow: 4 }}>
                <Table sx={{
                    "& td, & th": { padding: "4px 8px" },
                }}>
                    <TableHead sx={{ backgroundColor: '#f5f5f5', }}>
                        <TableRow>
                            <TableCell align='center' sx={{ fontWeight: 'bold', fontSize: 18 }}>Tiêu đề</TableCell>
                            <TableCell align='center' sx={{ fontWeight: 'bold', fontSize: 18 }}>Nội dung</TableCell>
                            <TableCell align='center' sx={{ fontWeight: 'bold', fontSize: 18 }}>Người gửi</TableCell>
                            <TableCell align='center' sx={{ fontWeight: 'bold', fontSize: 18 }}>Trạng thái</TableCell>
                            <TableCell align='center' sx={{ fontWeight: 'bold', fontSize: 18 }}>Ngày tạo</TableCell>
                            <TableCell align='center' sx={{ fontWeight: 'bold', fontSize: 18, width: 100 }}>Đánh dấu</TableCell>
                            <TableCell align='center' sx={{ fontWeight: 'bold', fontSize: 18, width: 50 }}>Xóa</TableCell>
                        </TableRow>
                    </TableHead>
                    {!isLoading ? <TableBody>
                        {paginatedData.map((notification: any, index: number) => (
                            <TableRow key={notification._id} sx={{
                                // Dùng chỉ mục index để tạo màu xen kẽ
                                backgroundColor: index % 2 === 0 ? 'white' : 'brand.zebra',
                            }}>
                                <TableCell sx={{}}>{notification.title}</TableCell>
                                <TableCell sx={{}}>
                                    {notification.message}
                                </TableCell>
                                <TableCell sx={{}}>{notification.recipient?.fullName}</TableCell>
                                <TableCell align='center' sx={{}}>
                                    <Chip
                                        label={notification.read ? 'Đã đọc' : 'Chưa đọc'}
                                        color={notification.read ? 'success' : 'default'}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell sx={{}}>{new Date(notification.createdAt).toLocaleString('vi-VN')}</TableCell>
                                <TableCell sx={{}}>
                                    <IconButton
                                        color="primary"
                                        onClick={() => updateMutation.mutate(notification._id)}
                                    >
                                        {notification.read ? <Check /> : <Close />}
                                    </IconButton>
                                </TableCell>
                                <TableCell sx={{}}>
                                    <IconButton
                                        color="error"
                                        onClick={() => handleDelete(notification._id)}
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody> : <Typography>Loading...</Typography>}
                </Table>
                <TablePagination
                    component="div"
                    count={notifications.length}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={pageSize}
                    onRowsPerPageChange={(event) => {
                        setPageSize(parseInt(event.target.value, 10));
                        setPage(0);
                    }}
                />
            </TableContainer>
        </Box>
    );
};

export default Notifications; 