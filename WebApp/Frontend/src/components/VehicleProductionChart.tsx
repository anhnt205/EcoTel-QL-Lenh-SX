import React, { useState } from "react";
import ReactECharts from "echarts-for-react";

// ECharts (modular + type an toàn)
import * as echarts from "echarts/core";
import { BarChart, type BarSeriesOption } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  type GridComponentOption,
  type TooltipComponentOption,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { Dialog, DialogContent, DialogTitle, Typography } from "@mui/material";
import { useAtom } from "jotai";
import { userAtom } from "../atoms/userAtoms";
import DeviceService from "../services/deviceService";
import { useQuery } from "@tanstack/react-query";

echarts.use([BarChart, GridComponent, TooltipComponent, CanvasRenderer]);

type ECOption = echarts.ComposeOption<
  BarSeriesOption | GridComponentOption | TooltipComponentOption
>;

type Row = { vehicle: string; actual: number; target: number };

const niceMax = (n: number) => {
  if (n <= 10) return 10;
  const p = Math.pow(10, Math.floor(Math.log10(n)));
  for (const k of [1, 2, 5, 10]) if (n <= k * p) return k * p;
  return 10 * p;
};

export default function VehicleBulletVariance({
  open,
  setOpen,
  department,
  data,
}: {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  department: any;
  data: any[];
}) {
  const [user] = useAtom(userAtom);

  const { data: allDevices = { data: [] } } = useQuery({
    queryKey: ["allDevices", department],
    queryFn: () => DeviceService.getDevices({ department }),
  });

  const mapDeviceData = (devices: any[]): Row[] => {
    // Nếu không có thiết bị, trả về mảng rỗng
    if (devices.length === 0) return [];

    // Tạo dữ liệu giả định cho biểu đồ
    return devices.map((device, index) => {
      // Định mức (Target): Ngẫu nhiên trong khoảng 100-800
      const target = 1000;
      // Sản lượng thực tế (Actual): Ngẫu nhiên gần target (± 20%)
      const actual =
        data.find((d: any) => device.code === d.code)?.totalProduction || 0;

      return {
        // Sử dụng tên thiết bị hoặc code thiết bị thực tế
        vehicle: device.code || `Thiết bị ${index + 1}`,
        actual: actual,
        target: target,
      };
    });
  };

  const chartData: Row[] = mapDeviceData(allDevices.data);

  const cats = chartData.map((d) => d.vehicle);
  const targets = chartData.map((d) => d.target);
  const actuals = chartData.map((d) => d.actual);

  const maxV = Math.max(...targets, ...actuals);
  const XMAX = niceMax(maxV);

  const fmt = (v: number) =>
    Number.isFinite(v) ? v.toLocaleString("vi-VN") : "";

  const option: ECOption = {
    grid: { left: 110, right: 200, top: 16, bottom: 16 },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      valueFormatter: (val) => `${fmt(Number(val))}`,
    },
    yAxis: {
      type: "category",
      inverse: true,
      data: cats,
      axisTick: { show: false },
      axisLine: { show: false },
    },
    xAxis: {
      type: "value",
      min: 0,
      max: XMAX,
      axisLabel: { show: false },
      splitLine: { show: true },
    },
    series: [
      // Nền Target (to hơn, màu xám)
      {
        name: "Định mức",
        type: "bar",
        data: targets,
        barWidth: 18,
        itemStyle: { color: "#e0e0e0" },
        emphasis: { disabled: true },
        // để Actual đè lên chính xác
        barGap: "-100%",
        z: 1,
        label: {
          show: false,
        },
      },
      // Actual (mảnh hơn, tô màu theo over/under), kèm nhãn ±Delta (±%)
      {
        name: "Thực tế",
        type: "bar",
        data: actuals,
        barWidth: 12,
        z: 2,
        itemStyle: {
          color: (p) =>
            actuals[p.dataIndex] >= targets[p.dataIndex]
              ? "#4caf50"
              : "#f44336",
        },
        label: {
          show: true,
          position: "right",
          distance: 6,
          rich: {
            pos: { color: "#2e7d32", fontWeight: 600 },
            neg: { color: "#c62828", fontWeight: 600 },
          },
          formatter: (p: any) => {
            const i = p.dataIndex;
            const act = chartData[i].actual,
              tar = chartData[i].target;
            const delta = act - tar;
            const pct = tar ? (delta / tar) * 100 : 0;
            const sign = delta > 0 ? "+" : delta < 0 ? "−" : "";
            const abs = Math.abs(delta);
            const text = `${act.toLocaleString("vi-VN")} | ${sign}${abs.toLocaleString("vi-VN")} (${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%)`;
            return delta >= 0 ? `{pos|${text}}` : `{neg|${text}}`;
          },
        },
      },
    ],
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography align="center">
          Thống kê sản lượng & định mức theo thiết bị
        </Typography>
      </DialogTitle>
      <DialogContent>
        <ReactECharts
          echarts={echarts}
          option={option}
          style={{ height: 52 * chartData.length + 40, width: "100%" }}
        />
      </DialogContent>
    </Dialog>
  );
}
