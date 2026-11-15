import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, useMediaQuery } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import api from '../../config/api.config';
import uiTheme from '../../theme/uiTheme';
import OverviewGlobe from './OverviewGlobe';
import OverviewPanels, { PANEL_ROW_HEIGHT } from './OverviewPanels';
import { OverviewThemeProvider } from './overviewTheme';
import { DeviceTypeEnum } from '../../enums';

const MIN_PAGE_HEIGHT = 560;

const DashBoard: React.FC = () => {
    const { data: departments = [] } = useQuery({
        queryKey: ['departments'],
        queryFn: () => api.get('/departments').then(res => res.data.data),
    });

    const { data: userCount = 0 } = useQuery({
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

    const machineDevices = useMemo(
        () => filteredDevices.filter((d: any) => d.category?.group === DeviceTypeEnum.MACHINE),
        [filteredDevices]
    );
    const vehicleDevices = useMemo(
        () => filteredDevices.filter((d: any) => d.category?.group === DeviceTypeEnum.VEHICLE),
        [filteredDevices]
    );

    // Màn rộng: cả trang vừa khít khung nhìn (không cuộn) — chiều cao = phần còn lại dưới thanh tiêu đề.
    const fitPage = useMediaQuery('(min-width:1200px)');
    const rootRef = useRef<HTMLDivElement>(null);
    const [pageHeight, setPageHeight] = useState<number | undefined>(undefined);

    useLayoutEffect(() => {
        if (!fitPage) {
            setPageHeight(undefined);
            return;
        }
        const measure = () => {
            const el = rootRef.current;
            if (!el) return;
            const top = el.getBoundingClientRect().top + window.scrollY;
            // 4px = phần đệm còn lại của MainLayout sau khi trang bù lề âm.
            setPageHeight(Math.max(MIN_PAGE_HEIGHT, window.innerHeight - top - 4));
        };
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, [fitPage]);

    // Thanh tiêu đề (banner) có thể đổi chiều cao khi ảnh/phông tải xong → đo lại sau khi tải trang.
    useEffect(() => {
        if (!fitPage) return;
        const t = setTimeout(() => window.dispatchEvent(new Event('resize')), 600);
        return () => clearTimeout(t);
    }, [fitPage]);

    return (
        <ThemeProvider theme={uiTheme}>
            <OverviewThemeProvider>
                {({ p }) => (
                    /* Bù lại padding 24px của MainLayout để trang tận dụng được bề ngang/dọc */
                    <Box
                        ref={rootRef}
                        sx={{
                            bgcolor: p.pageBg,
                            transition: 'background-color .25s',
                            m: -2.5,
                            p: 1.25,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1,
                            boxSizing: 'border-box',
                            height: pageHeight,
                            overflow: pageHeight ? 'hidden' : 'visible',
                        }}
                    >
                        {/* Quả cầu 3D: thẻ đơn vị chạy quanh, sản lượng nổi ở giữa */}
                        <Box sx={{ flex: 1, minHeight: 0 }}>
                            <OverviewGlobe
                                machineCount={machineDevices.length}
                                vehicleCount={vehicleDevices.length}
                                departmentCount={departments.length}
                                userCount={userCount}
                            />
                        </Box>
                        {/* Hàng bảng bên dưới: bấm vào bảng để xem chi tiết */}
                        <Box sx={{ flex: 'none', minHeight: { lg: PANEL_ROW_HEIGHT } }}>
                            <OverviewPanels
                                departments={departments}
                                machineDevices={machineDevices}
                                vehicleDevices={vehicleDevices}
                                userCount={userCount}
                            />
                        </Box>
                    </Box>
                )}
            </OverviewThemeProvider>
        </ThemeProvider>
    );
};

export default DashBoard;
