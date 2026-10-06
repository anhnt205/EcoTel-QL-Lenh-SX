import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  useTheme,
  alpha,
  Chip,
  Tabs,
  Tab,
} from "@mui/material";
import MemoryIcon from "@mui/icons-material/Memory";
import StorageIcon from "@mui/icons-material/Storage";
import SpeedIcon from "@mui/icons-material/Speed";
import PaletteIcon from "@mui/icons-material/Palette";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import SystemService from "../../services/SystemService";
import BrandingSettings from "./BrandingSettings";

type CpuPoint = {
  time: string;
  value: number;
};

const toGB = (bytes: number) => (bytes / 1024 / 1024 / 1024).toFixed(2);
const percentUsed = (total: number, free: number) =>
  Math.round(((total - free) / total) * 100);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <Box
        sx={{
          bgcolor: "rgba(255, 255, 255, 0.95)",
          p: 1.5,
          border: "1px solid #eee",
          borderRadius: 2,
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
        }}
      >
        <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
          {label}
        </Typography>
        <Typography variant="body1" fontWeight="bold" color="primary">
          CPU: {payload[0].value}%
        </Typography>
      </Box>
    );
  }
  return null;
};

// Tab "Giám sát hệ thống": CPU / RAM / ổ cứng theo thời gian thực (nội dung cũ của trang này)
function SystemMonitor() {
  const theme = useTheme();
  const [cpuHistory, setCpuHistory] = useState<CpuPoint[]>([]);

  const { data } = useQuery({
    queryKey: ["systemInfo"],
    queryFn: async () => {
      const data = await SystemService.getAll();
      return data;
    },
    refetchInterval: 5000,
    refetchOnWindowFocus: false,
  });
  useEffect(() => {
    if (!data?.cpu) return;

    const avgCpu = data.cpu.reduce((a, b) => a + b, 0) / data.cpu.length;

    setCpuHistory((prev) => {
      const newData = [
        ...prev,
        {
          time: new Date().toLocaleTimeString("vi-VN", { hour12: false }),
          value: Math.round(avgCpu),
        },
      ];

      // giữ 30 điểm realtime
      return newData.slice(-30);
    });
  }, [data]);

  if (!data)
    return (
      <Box
        p={3}
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="50vh"
      >
        <LinearProgress sx={{ width: "50%" }} />
      </Box>
    );

  const ramUsed = percentUsed(data?.ram?.total, data?.ram?.free);
  const diskUsed = percentUsed(data?.disk?.total, data?.disk?.free);

  const getStatusColor = (percent: number) => {
    if (percent < 60) return theme.palette.success.main;
    if (percent < 85) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  return (
    <Box p={3} sx={{ bgcolor: "#f4f6f8", minHeight: "100vh" }}>
      <Typography
        variant="h4"
        fontWeight="bold"
        gutterBottom
        sx={{ mb: 4, color: "#1a2027" }}
      >
        Giám sát hệ thống
      </Typography>

      <Grid container spacing={3}>
        {/* CPU */}
        <Grid item xs={12}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 4,
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              overflow: "visible",
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" mb={3}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: "50%",
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main,
                    mr: 2,
                  }}
                >
                  <SpeedIcon fontSize="large" />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    Hiệu năng CPU
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Theo dõi tải CPU theo thời gian thực
                  </Typography>
                </Box>
                <Box flexGrow={1} />
                <Chip
                  label={`${cpuHistory[cpuHistory.length - 1]?.value || 0}%`}
                  color="primary"
                  sx={{ fontWeight: "bold", fontSize: 16 }}
                />
              </Box>

              <Box height={350} width="100%">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cpuHistory}>
                    <defs>
                      <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor={theme.palette.primary.main}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor={theme.palette.primary.main}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e0e0e0"
                    />
                    <XAxis
                      dataKey="time"
                      tick={{ fontSize: 12, fill: "#666" }}
                      interval="preserveStartEnd"
                      minTickGap={30}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 12, fill: "#666" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={theme.palette.primary.main}
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorCpu)"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* RAM */}
        <Grid item xs={12} md={6}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 4,
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              height: "100%",
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" mb={3}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: "50%",
                    bgcolor: alpha(theme.palette.secondary.main, 0.1),
                    color: theme.palette.secondary.main,
                    mr: 2,
                  }}
                >
                  <MemoryIcon fontSize="large" />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    Bộ nhớ RAM
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {toGB(data.ram.total - data.ram.free)} GB /{" "}
                    {toGB(data.ram.total)} GB
                  </Typography>
                </Box>
              </Box>

              <Box width="100%" py={2}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography
                    variant="body2"
                    fontWeight="bold"
                    color="textSecondary"
                  >
                    Đã dùng
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight="bold"
                    sx={{ color: getStatusColor(ramUsed) }}
                  >
                    {ramUsed}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={ramUsed}
                  sx={{
                    height: 12,
                    borderRadius: 6,
                    bgcolor: alpha(getStatusColor(ramUsed), 0.2),
                    "& .MuiLinearProgress-bar": {
                      bgcolor: getStatusColor(ramUsed),
                      borderRadius: 6,
                    },
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* DISK */}
        <Grid item xs={12} md={6}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 4,
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              height: "100%",
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" mb={3}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: "50%",
                    bgcolor: alpha(theme.palette.info.main, 0.1),
                    color: theme.palette.info.main,
                    mr: 2,
                  }}
                >
                  <StorageIcon fontSize="large" />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    Ổ cứng (Disk)
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {toGB(data.disk.total - data.disk.free)} GB /{" "}
                    {toGB(data.disk.total)} GB
                  </Typography>
                </Box>
              </Box>

              <Box width="100%" py={2}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography
                    variant="body2"
                    fontWeight="bold"
                    color="textSecondary"
                  >
                    Đã dùng
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight="bold"
                    sx={{ color: getStatusColor(diskUsed) }}
                  >
                    {diskUsed}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={diskUsed}
                  sx={{
                    height: 12,
                    borderRadius: 6,
                    bgcolor: alpha(getStatusColor(diskUsed), 0.2),
                    "& .MuiLinearProgress-bar": {
                      bgcolor: getStatusColor(diskUsed),
                      borderRadius: 6,
                    },
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

// Trang Hệ thống (chỉ admin): các tab Giám sát hệ thống / Cấu hình giao diện.
// Tab không được chọn không được dựng nên chỉ tab giám sát mới tải số liệu CPU mỗi 5 giây.
export default function SystemDashboard() {
  const [tab, setTab] = useState(0);
  return (
    <Box sx={{ bgcolor: "#f4f6f8", minHeight: "100vh" }}>
      <Box sx={{ bgcolor: "#fff", borderBottom: "1px solid #e5e9f0", px: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, value: number) => setTab(value)}
          aria-label="Các tab của trang Hệ thống"
        >
          <Tab
            icon={<SpeedIcon fontSize="small" />}
            iconPosition="start"
            label="Giám sát hệ thống"
            sx={{ textTransform: "none", fontWeight: 600, minHeight: 48 }}
          />
          <Tab
            icon={<PaletteIcon fontSize="small" />}
            iconPosition="start"
            label="Cấu hình giao diện"
            sx={{ textTransform: "none", fontWeight: 600, minHeight: 48 }}
          />
        </Tabs>
      </Box>
      {tab === 0 && <SystemMonitor />}
      {tab === 1 && <BrandingSettings />}
    </Box>
  );
}
