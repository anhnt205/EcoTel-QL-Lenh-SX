import { Typography, useMediaQuery, useTheme } from '@mui/material';
import { ChartsLegend, ChartsTooltip, PiePlot, ResponsiveChartContainer } from '@mui/x-charts'
import React from 'react'
import { StatusOrderEnum } from '../enums';

// scale > 1 phóng biểu đồ to lên (dùng khi thẻ mở rộng toàn màn hình)
export default function PieChartOrder({ data, scale = 1 }: { data: any, scale?: number }) {

    const theme = useTheme();

    const isLargeScreen = useMediaQuery(theme.breakpoints.up('lg'));

    // 2. Kiểm tra màn hình nhỏ (< md, tức là < 900px)
    const isSmallToMediumScreen = useMediaQuery(theme.breakpoints.down('md'));

    let responsiveMarkerSize;

    if (isLargeScreen) {
        // >= lg (1200px): size 12
        responsiveMarkerSize = 12;
    } else if (isSmallToMediumScreen) {
        // < md (dưới 900px): size 12
        responsiveMarkerSize = 12;
    } else {
        // Trường hợp còn lại: md (900px) đến < lg (1200px): size 8
        responsiveMarkerSize = 8;
    }

    const chartData = [
        { label: 'Chưa nhận lệnh', value: data[StatusOrderEnum.PENDING]?.day || 0, color: 'grey' },
        { label: 'Đã nhận lệnh', value: data[StatusOrderEnum.INPROGRESS]?.day || 0, color: 'green' },
        { label: 'Đã hoàn thành', value: data[StatusOrderEnum.COMPLETED]?.day || 0, color: 'red' },
        { label: 'Lỗi', value: data[StatusOrderEnum.WARNING]?.day || 0, color: 'orange' },
        { label: 'Đã hủy', value: data[StatusOrderEnum.CANCEL]?.day || 0, color: 'purple' },
    ];

    const markerSize = Math.round(responsiveMarkerSize * Math.min(scale, 1.5));

    // Tính tổng giá trị của tất cả các mục dữ liệu
    const totalValue = chartData.reduce((sum, item) => sum + item.value, 0);

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', }}>
            {totalValue === 0 && <Typography variant="h6" style={{
                position: 'absolute',
                zIndex: 10,
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
            }}>Không có dữ liệu</Typography>}
            <ResponsiveChartContainer
                height={Math.round(165 * scale)}
                series={[{
                    type: 'pie',
                    innerRadius: Math.round(26 * scale),
                    outerRadius: Math.round(54 * scale),
                    data: chartData
                }]}
                margin={{ top: Math.round(-28 * scale), left: 0, right: 0, bottom: 0 }}
            >
                <PiePlot />
                <ChartsTooltip trigger="item" />
                <ChartsLegend position={{ vertical: 'bottom', horizontal: 'middle' }}
                    slotProps={{
                        legend: {
                            labelStyle: {
                                fontSize: markerSize,
                            },
                            itemMarkHeight: markerSize,
                            itemMarkWidth: markerSize,
                        }
                    }} />
            </ResponsiveChartContainer>
        </div>
    )
}
