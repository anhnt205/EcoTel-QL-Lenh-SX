import * as React from "react";
import { Paper, Box, Typography, RadioGroup, FormControlLabel, Radio, useMediaQuery, useTheme } from "@mui/material";
import {
    ResponsiveChartContainer,
    LinePlot,
    ChartsXAxis,
    ChartsYAxis,
    ChartsLegend,
    ChartsTooltip,
    AreaPlot,
} from "@mui/x-charts";


export default function ResponsiveLineChartProduction({ dataset, selectedName, selectedKey, height = 230 }: { dataset: any, selectedName: string, selectedKey: string, height?: number }) {
    const theme = useTheme();

    const isLargeScreen = useMediaQuery(theme.breakpoints.up('lg'));

    // 2. Kiểm tra màn hình nhỏ (< md, tức là < 900px)
    const isSmallToMediumScreen = useMediaQuery(theme.breakpoints.down('md'));
    let responsiveMarkerSize;

    if (isLargeScreen) {
        // >= lg (1200px): size 12
        responsiveMarkerSize = 14;
    } else if (isSmallToMediumScreen) {
        // < md (dưới 900px): size 12
        responsiveMarkerSize = 14;
    } else {
        // Trường hợp còn lại: md (900px) đến < lg (1200px): size 8
        responsiveMarkerSize = 8;
    }
    return (
        <Box sx={{ width: "100%", height: '100%', display: 'flex', alignItems: 'flex-start' }}>

            <ResponsiveChartContainer
                height={height}
                dataset={dataset}
                xAxis={[{
                    dataKey: "date", scaleType: "point",
                    tickLabelInterval: (value, index) => index % 3 === 0,
                }]}
                yAxis={[{ min: 0 }]}  // 👈 luôn bắt đầu từ 0
                series={[
                    { type: "line", dataKey: `${selectedKey}_cum`, label: `${selectedName} (lũy kế)`, area: true },
                    { type: "line", dataKey: selectedKey, label: `${selectedName} (ngày)`, area: true },
                ]}
                margin={{ top: 8, left: 50, right: 10, bottom: 70 }}
            >

                <AreaPlot // Sử dụng AreaPlot để tô màu vùng
                    series={[
                        {
                            dataKey: `${selectedKey}_cum`,
                            color: "rgba(196, 63, 63, 0.2)", // Làm mờ màu đỏ
                        },
                        {
                            dataKey: selectedKey,
                            color: "rgba(196, 63, 63, 0.2)", // Làm mờ màu xanh dương
                        },
                    ]}
                />
                <LinePlot />
                <ChartsXAxis />
                <ChartsYAxis />
                <ChartsTooltip />
                <ChartsLegend position={{ vertical: 'bottom', horizontal: 'middle' }}
                    slotProps={{
                        legend: {
                            labelStyle: {
                                fontSize: responsiveMarkerSize,
                                marginTop: 8
                            },
                            itemMarkHeight: responsiveMarkerSize,
                            itemMarkWidth: responsiveMarkerSize,
                        }
                    }} />
            </ResponsiveChartContainer>
        </Box >
    );
}
