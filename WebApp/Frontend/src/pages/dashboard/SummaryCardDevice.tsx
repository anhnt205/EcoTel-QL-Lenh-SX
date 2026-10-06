import { Box, Card, Popover, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import React, { useState } from 'react'
import { Device } from '../../types';
import { useQuery } from '@tanstack/react-query';
import api from '../../config/api.config';
import { useNavigate } from 'react-router-dom';
import { DeviceTypeEnum, StatusDeviceEnum } from '../../enums';

const STATUS_ROWS = [
    { status: StatusDeviceEnum.AVAILABLE, label: 'Chờ điều động', color: '#2e7d32' },
    { status: StatusDeviceEnum.IN_USE, label: 'Đang hoạt động', color: '#d32f2f' },
    { status: StatusDeviceEnum.MAINTENANCE, label: 'SC; BD', color: '#ed6c02' },
    { status: StatusDeviceEnum.RETIRED, label: 'Niêm cất', color: '#9e9e9e' },
];

export default function SummaryCardDevice(
    {
        title,
        value,
        icon,
        color,
        data = [],
        type
    }: {
        title: string;
        value: number;
        icon: React.ReactNode;
        color: string;
        data: Device[],
        type: string
    }
) {
    const navigate = useNavigate();
    const [anchorElSummary, setAnchorElSummary] = useState<HTMLElement | null>(null);
    const [selectedSummaryDevices, setSelectedSummaryDevices] = useState<any[]>([]);

    const { data: deviceCount = [] } = useQuery({
        queryKey: ['deviceCount', type],
        queryFn: () => api.get(`/devices/count/status?group=${type}`).then(res => res.data.data),
    });
    const getDevicesByStatusGrouped = (status: string) => {
        const map = new Map<string, number>();

        deviceCount.forEach((group: any) => {
            group.deviceTypes.forEach((device: any) => {
                const current = map.get(device.typeName) || 0;
                map.set(device.typeName, current + (device.statusCounts?.[status] ?? 0));
            });
        });

        return Array.from(map, ([typeName, total]) => ({ typeName, total }));
    };

    const handleSummaryClick = (event: React.MouseEvent<HTMLElement>, status: string) => {
        setAnchorElSummary(event.currentTarget);
        const grouped = getDevicesByStatusGrouped(status);
        setSelectedSummaryDevices(grouped);
    };
    const handleSummaryClose = () => {
        setAnchorElSummary(null);
        setSelectedSummaryDevices([]);
    };
    return (
        <Card
            sx={{
                height: '100%',
                px: 1.5,
                py: 1,
                borderRadius: 2,
                border: '1px solid #e5e9f0',
                boxShadow: 'none',
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 0.75 }}>
                <Box
                    sx={{
                        width: 34,
                        height: 34,
                        flexShrink: 0,
                        bgcolor: color,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                    }}
                >
                    {React.cloneElement(icon as React.ReactElement, { sx: { fontSize: 20 } })}
                </Box>
                <Typography
                    sx={{ flexGrow: 1, fontSize: 13, fontWeight: 700, color: '#334155', cursor: 'pointer', '&:hover': { color: 'brand.strong' } }}
                    onClick={() => { navigate(`${type === DeviceTypeEnum.MACHINE ? '/machines' : '/vehicles'}`) }}>
                    {title}
                </Typography>
                <Typography sx={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>
                    {value}
                </Typography>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', columnGap: 1.5, rowGap: '3px' }}>
                {STATUS_ROWS.map((row) => (
                    <Box key={row.status} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: row.color, flexShrink: 0 }} />
                        <Typography
                            noWrap
                            onClick={(e) => handleSummaryClick(e, row.status)}
                            sx={{ flexGrow: 1, fontSize: 12, color: '#475569', cursor: 'pointer', '&:hover': { color: row.color } }}
                        >
                            {row.label}
                        </Typography>
                        <Typography sx={{ fontSize: 13, fontWeight: 800, color: row.color }}>
                            {data.filter((o: Device) => o.status === row.status).length}
                        </Typography>
                    </Box>
                ))}
            </Box>
            <Popover
                open={Boolean(anchorElSummary)}
                anchorEl={anchorElSummary}
                onClose={handleSummaryClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            >
                <Box sx={{ p: 1.5, maxHeight: 300, overflowY: 'auto' }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.5 }}>Danh sách thiết bị</Typography>

                    {selectedSummaryDevices.length > 0 ? (
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold', }}>Loại xe</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', }}>Số lượng</TableCell>

                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {selectedSummaryDevices.map((d) => (
                                    <TableRow key={d.typeName}>
                                        <TableCell>{d.typeName}</TableCell>
                                        <TableCell>{d.total}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <Typography>Không có thiết bị nào</Typography>
                    )}
                </Box>
            </Popover>
        </Card>
    )
}
