// 👇 Bạn giữ nguyên các import (bỏ Drawer liên quan nếu không còn dùng)
import React from 'react';
import {
    Box,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import { TK_EMBED } from '../config/features';
import { sidebarWidth, useSidebarCollapsed } from './sidebarState';


interface MainLayoutProps {
    children?: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    // Màn rộng + nhúng Thống kê: thanh menu dọc (SideNav) đứng cố định bên trái => chừa lề trái cho nội dung.
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
    const collapsed = useSidebarCollapsed();
    const sideW = !isMobile && TK_EMBED ? sidebarWidth(collapsed) : 0;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column'}}>
            <Header />
            {/* Nội dung chính */}
            <Box sx={{ flex: 1, p: 3, ml: `${sideW}px`, transition: 'margin-left .2s ease', minWidth: 0 }}>
                {children || <Outlet />}
            </Box>
        </Box >
    );
};

export default MainLayout;
