import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Grid,
    Box,
} from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import {
    Construction,
    Business as DepartmentIcon,
    DirectionsCar,
    Person2 as PersonIcon,
} from '@mui/icons-material';
import api from '../../config/api.config';
import uiTheme from '../../theme/uiTheme';
import GoogleMap from './GoogleMap';
import OrderAnalysic from './OrderAnalysic';
import DeviceAnalysic from './DeviceAnalysis';
import ProductionAnalysic from './ProductionAnalysic';
import SummaryCard from './SummaryCard';
import SummaryCardDevice from './SummaryCardDevice';
import { DeviceTypeEnum } from '../../enums';

const DashBoard: React.FC = () => {
    const [tabIndex, setTabIndex] = useState(0);

    const { data: departments = [], isLoading: isLoadingDepartments } = useQuery({
        queryKey: ['departments'],
        queryFn: () => api.get('/departments').then(res => res.data.data),
    });

    const { data: userCount = 0, isLoading: isLoadingUsers } = useQuery({
        queryKey: ['userCount'],
        queryFn: () => api.get('/users/count').then(res => res.data.data),
    });

    const { data: devices = [] } = useQuery({
        queryKey: ['devices'],
        queryFn: () => api.get('/devices').then(res => res.data.data),
    });

    const oldestDepartments = useMemo(() => {
        const map = new Map<string, any>();

        devices.forEach((d: any) => {
            if (d.department?._id && !map.has(d.department?._id)) {
                map.set(d.department?._id, d?.department);
            }
        });

        return Array.from(map.values())
            .sort(
                (a: any, b: any) =>
                    new Date(a?.createdAt).getTime() - new Date(b?.createdAt).getTime()
            )
            .slice(0, 15);
    }, [devices]);

    const oldestDepartmentIds = useMemo(
        () => new Set(oldestDepartments.map((d: any) => d._id)),
        [oldestDepartments]
    );

    const filteredDevices = useMemo(
        () => devices.filter((d: any) => oldestDepartmentIds.has(d.department?._id)),
        [devices, oldestDepartmentIds]
    );

    return (
        <ThemeProvider theme={uiTheme}>
            {/* Bù lại padding 24px của MainLayout để trang tận dụng được bề ngang/dọc */}
            <Box sx={{ bgcolor: '#f3f5f9', m: -2.5, p: 1.25 }}>
                <Grid container spacing={1}>
                    <Grid item xs={12} sm={6} lg={4}>
                        <SummaryCardDevice
                            title="Thông tin máy"
                            value={filteredDevices.filter((d: any) => d.category?.group === DeviceTypeEnum.MACHINE).length}
                            icon={<Construction />}
                            color="#e4d52cff"
                            data={filteredDevices.filter((d: any) => d.category?.group === DeviceTypeEnum.MACHINE)}
                            type={DeviceTypeEnum.MACHINE}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} lg={4}>
                        <SummaryCardDevice
                            title="Thông tin xe"
                            value={filteredDevices.filter((d: any) => d.category?.group === DeviceTypeEnum.VEHICLE).length}
                            icon={<DirectionsCar />}
                            color="#f34f21ff"
                            data={filteredDevices.filter((d: any) => d.category?.group === DeviceTypeEnum.VEHICLE)}
                            type={DeviceTypeEnum.VEHICLE}
                        />
                    </Grid>
                    <Grid item xs={6} lg={2}>
                        <SummaryCard
                            title="Đơn vị"
                            value={departments.length}
                            icon={<DepartmentIcon />}
                            color="#4caf50"
                            type="department"
                        />
                    </Grid>
                    <Grid item xs={6} lg={2}>
                        <SummaryCard
                            title="Nhân viên"
                            value={userCount}
                            icon={<PersonIcon />}
                            color="#2196f3"
                            type="user"
                        />
                    </Grid>
                </Grid>
                <Box sx={{ mt: 1 }}>
                    {tabIndex === 0 && (
                        // Màn rộng: thiết bị theo đơn vị bên trái, lệnh sản xuất + sản lượng bên phải
                        <Box
                            sx={{
                                display: 'grid',
                                gap: 1,
                                alignItems: 'start',
                                gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1.25fr) minmax(0, 1fr)' },
                            }}
                        >
                            <DeviceAnalysic departments={departments} />
                            <Box sx={{ display: 'grid', gap: 1, minWidth: 0 }}>
                                <OrderAnalysic departments={departments} />
                                <ProductionAnalysic departments={departments} />
                            </Box>
                        </Box>
                    )}
                    {tabIndex === 1 && <GoogleMap />}
                </Box>
            </Box>
        </ThemeProvider>
    );
};

export default DashBoard;
