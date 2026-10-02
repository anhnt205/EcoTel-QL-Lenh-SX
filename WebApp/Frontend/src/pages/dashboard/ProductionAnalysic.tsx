import {
  Paper,
  TableContainer,
  Table,
  TableRow,
  TableHead,
  TableCell,
  TableBody,
  Grid,
  Box,
  Autocomplete,
  TextField,
  IconButton,
  Radio,
  CircularProgress,
  AlertColor,
} from "@mui/material";
import LineChartProduction from "../../components/LineChartProduction";
import { useState, useMemo, useEffect } from "react";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import { useAtom } from "jotai";
import { userAtom } from "../../atoms/userAtoms";
import { BarChart, RotateLeft } from "@mui/icons-material";
import VehicleProductionChart from "../../components/VehicleProductionChart";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../config/api.config";
import { Typography } from "antd";
import { AlertSnackbar } from "../../components/Alert";
import localforage from "localforage";
import { RoleEnum } from "../../enums";
import FieldAutoCompleted from "../../components/field/FieldAutoCompleted";
import FieldDate from "../../components/field/FieldDate";

// Danh sách loại sản lượng
const productions = [
  { key: "KLD", name: "Khối lượng đất thực hiện (m³)" },
  { key: "TLT", name: "Trọng lượng than thực hiện (tấn)" },
  { key: "MKS", name: "Mét khoan sâu (mks)" },
  { key: "SLD", name: "Sản lượng vận chuyển than, đất (Tkm)" },
  // { key: 'SLT', name: 'Sản lượng vận chuyển than (tấn)' },
  { key: "TTK", name: "Thể tích khối thực hiện" },
  { key: "CD", name: "Cung độ thực hiện" },
];
const DRILLING_STORAGE_KEY = "drillingData";
const EXCAVATOR_STORAGE_KEY = "excavatorData";
const VEHICLE_STORAGE_KEY = "vehicleData";

export default function ProductionAnalysic({
  departments,
}: {
  departments: any[];
}) {
  const [user] = useAtom(userAtom);
  const [department, setDepartment] = useState("");
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [open, setOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState("MKS");
  const [drillingCache, setDrillingCache] = useState<any[] | null>(null);
  const [excavatorCache, setExcavatorCache] = useState<any[] | null>(null);
  const [vehicleCache, setVehicleCache] = useState<any[] | null>(null);

  // Load dữ liệu localforage trước khi query
  useEffect(() => {
    (async () => {
      const d = await localforage.getItem(DRILLING_STORAGE_KEY);
      const e = await localforage.getItem(EXCAVATOR_STORAGE_KEY);
      const v = await localforage.getItem(VEHICLE_STORAGE_KEY);
      setDrillingCache(Array.isArray(d) ? d : []);
      setExcavatorCache(Array.isArray(e) ? e : []);
      setVehicleCache(Array.isArray(v) ? v : []);
    })();
  }, [department, date]);

  const selectedName =
    productions.find((p) => p.key === selectedKey)?.name || selectedKey;
  // 🔹 Lấy dữ liệu API
  const {
    data: drillingData = [], // Đổi tên thành drillingData
    refetch: refetchDrilling,
    isLoading: isLoadingDrilling,
  } = useQuery({
    queryKey: ["analysicsVHK", department, date],
    queryFn: async () => {
      const res = await api.get(
        `/analysics/vhk?date=${date}&department=${department}`,
      );
      const newData = res.data.data || [];
      await localforage.setItem(DRILLING_STORAGE_KEY, newData); // ✅ Lưu vào localforage
      return newData;
    },
    refetchInterval: 2 * 60 * 1000, // ✅ Tự động gọi lại API mỗi 2 phút
    placeholderData: drillingCache || undefined,
  });

  // ✅ Khai báo dữ liệu Vận hành Xúc (VHX)
  const {
    data: vehicleData = [],
    refetch: refetchVehicle,
    isLoading: isLoadingVehicle,
  } = useQuery({
    queryKey: ["analysicsVHXE", department, date],
    queryFn: async () => {
      const res = await api.get(
        `/analysics/tkm?date=${date}&department=${department}`,
      );
      const newData = res.data.data || [];
      await localforage.setItem(VEHICLE_STORAGE_KEY, newData); // ✅ Lưu vào localforage
      return newData;
    },
    refetchInterval: 2 * 60 * 1000, // ✅ Tự động gọi lại API mỗi 2 phút
    placeholderData: vehicleCache || undefined,
  });

  const {
    data: excavatorData = [], // Đổi tên thành excavatorData
    refetch: refetchExcavator,
    isLoading: isLoadingExcavator,
  } = useQuery({
    queryKey: ["analysicsVHX", department, date],
    queryFn: async () => {
      const res = await api.get(
        `/analysics/vhx?date=${date}&department=${department}`,
      );
      const newData = res.data.data || [];
      await localforage.setItem(EXCAVATOR_STORAGE_KEY, newData); // ✅ Lưu vào localforage
      return newData;
    },
    refetchInterval: 2 * 60 * 1000, // ✅ Tự động gọi lại API mỗi 2 phút
    placeholderData: excavatorCache || undefined,
  });
  const queryClient = useQueryClient();
  const caculate = useMutation({
    mutationFn: () => api.get(`/analysics/caculate?date=${date}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analysicsVHX"] });
      queryClient.invalidateQueries({ queryKey: ["analysicsVHXE"] });
      queryClient.invalidateQueries({ queryKey: ["analysicsVHK"] });
      setAlert({
        open: true,
        message: "Cập nhật sản lượng thành công",
        severity: "success",
      });
    },
    onError: () => {
      setAlert({
        open: true,
        message: "Cập nhật sản lượng thất bại",
        severity: "error",
      });
    },
  });

  // ✅ Tổng hợp dữ liệu và trạng thái loading
  const analysicsData = useMemo(() => {
    // Đảm bảo cả hai biến đều là mảng trước khi dùng spread operator
    const safeDrillingData = Array.isArray(drillingData) ? drillingData : [];
    const safeExcavatorData = Array.isArray(excavatorData) ? excavatorData : [];
    const safeVehicleData = Array.isArray(vehicleData) ? vehicleData : [];

    return [...safeDrillingData, ...safeExcavatorData, ...safeVehicleData];
  }, [drillingData, excavatorData, vehicleData]);
  const isLoading = isLoadingDrilling || isLoadingExcavator || isLoadingVehicle;

  const deviceProduction = useMemo(() => {
    return (
      analysicsData.find((i: any) => i.jobType === selectedKey)
        ?.deviceProductions || []
    );
  }, [analysicsData, selectedKey]);

  // 🔹 Chuẩn hóa dữ liệu cho bảng và biểu đồ
  // 🔹 Chuẩn hóa dữ liệu cho bảng và biểu đồ (đảm bảo đủ loại)
  const dataset = useMemo(() => {
    const merged: Record<string, any> = {};

    analysicsData.forEach((item: any) => {
      item.productionByDay.forEach((day: any) => {
        const date = dayjs(day.date).format("DD/MM");
        if (!merged[date]) merged[date] = { date };

        // Cập nhật giá trị cho loại có dữ liệu
        merged[date][item.jobType] = day.dayTotal || 0;
        merged[date][`${item.jobType}_cum`] = item.cumulativeTotal || 0;
      });
    });

    // 🔹 Bổ sung các loại còn thiếu, gán 0
    const allDates = Object.keys(merged);
    allDates.forEach((date) => {
      productions.forEach((prod) => {
        if (merged[date][prod.key] === undefined) merged[date][prod.key] = 0;
        if (merged[date][`${prod.key}_cum`] === undefined)
          merged[date][`${prod.key}_cum`] = 0;
      });
    });

    return Object.values(merged).sort((a: any, b: any) => {
      const da = dayjs(a.date, "DD/MM");
      const db = dayjs(b.date, "DD/MM");
      return da.diff(db);
    });
  }, [analysicsData]);

  const [alert, setAlert] = useState<{
    open: boolean;
    message: string;
    severity?: AlertColor;
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2 }}>
      <AlertSnackbar alert={alert} setAlert={setAlert} />
      {/* Bảng và Biểu đồ */}
      <Grid container spacing={2}>
        <Grid item xs={12} lg={7}>
          <TableContainer sx={{ maxHeight: 600 }}>
            <Table
              stickyHeader
              sx={{
                "& td, & th": { border: "1px solid #e0e0e0", padding: "4px" },
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell
                    colSpan={7}
                    align="center"
                    sx={{
                      bgcolor: "#ffe8d6",
                      fontWeight: "bold",
                      fontSize: 18,
                      position: "relative",
                    }}
                  >
                    <IconButton
                      sx={{
                        position: "absolute",
                        left: 8,
                        top: "50%",
                        transform: "translateY(-50%)",
                      }}
                      onClick={() => caculate.mutate()}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <CircularProgress size={24} />
                      ) : (
                        <RotateLeft
                          sx={{
                            transition: "transform 0.3s ease",
                            "&:hover": { transform: "rotate(-180deg)" }, // xoay khi hover
                            color: "primary.main",
                          }}
                        />
                      )}
                    </IconButton>
                    SẢN LƯỢNG
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell
                    align="center"
                    colSpan={2}
                    sx={{ fontWeight: "bold", fontSize: 16 }}
                  >
                    Sản lượng
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{ fontWeight: "bold", fontSize: 16 }}
                  >
                    Ca 1
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{ fontWeight: "bold", fontSize: 16 }}
                  >
                    Ca 2
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{ fontWeight: "bold", fontSize: 16 }}
                  >
                    Ca 3
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{ fontWeight: "bold", fontSize: 16 }}
                  >
                    Ngày
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{ fontWeight: "bold", fontSize: 16 }}
                  >
                    Lũy kế
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {productions.map((item) => {
                  const typeData = analysicsData.find(
                    (r: any) => r.jobType === item.key,
                  );

                  const ca1 =
                    typeData?.selectedDay?.shifts?.find(
                      (s: any) => s.shift === 1,
                    )?.production || 0;
                  const ca2 =
                    typeData?.selectedDay?.shifts?.find(
                      (s: any) => s.shift === 2,
                    )?.production || 0;
                  const ca3 =
                    typeData?.selectedDay?.shifts?.find(
                      (s: any) => s.shift === 3,
                    )?.production || 0;
                  const dayTotal = typeData?.selectedDay?.dayTotal || 0;
                  const cumulativeTotal = typeData?.cumulativeTotal || 0;

                  return (
                    <TableRow
                      key={item.key}
                      sx={{ "&:nth-of-type(odd)": { bgcolor: "#fafafa" } }}
                    >
                      <TableCell align="center" sx={{ width: "2%" }}>
                        <Radio
                          onChange={() => setSelectedKey(item.key)}
                          checked={selectedKey === item.key}
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ width: "20%" }}>{item.name}</TableCell>
                      <TableCell align="center" sx={{ width: "10%" }}>
                        {Number(Number(ca1).toFixed(1)).toLocaleString()}
                      </TableCell>
                      <TableCell align="center" sx={{ width: "10%" }}>
                        {Number(Number(ca2).toFixed(1)).toLocaleString()}
                      </TableCell>
                      <TableCell align="center" sx={{ width: "10%" }}>
                        {Number(Number(ca3).toFixed(1)).toLocaleString()}
                      </TableCell>
                      <TableCell align="center" sx={{ width: "10%" }}>
                        {Number(Number(dayTotal).toFixed(1)).toLocaleString()}
                      </TableCell>
                      <TableCell align="center" sx={{ width: "10%" }}>
                        {Number(
                          Number(cumulativeTotal).toFixed(1),
                        ).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              p: 2,
            }}
          >
            <Box sx={{ display: "flex", gap: 2 }}>
              <IconButton onClick={() => setOpen(true)}>
                <BarChart color="primary" sx={{ fontSize: 30 }} />
              </IconButton>
              {(user?.role === RoleEnum.ADMIN ||
                user?.role === RoleEnum.DISPATCHER) && (
                <FieldAutoCompleted
                  title="Đơn vị"
                  data={departments}
                  labelkey="code"
                  value={department}
                  setValue={setDepartment}
                  size="small"
                />
              )}
              <FieldDate
                selectedDate={date}
                setSelectedDate={setDate}
                title="Ngày"
                size="small"
              />
            </Box>
          </Box>
          {isLoading ? (
            <Box
              display="flex"
              flexDirection={"column"}
              minHeight={300}
              alignItems={"center"}
              justifyContent={"center"}
            >
              <CircularProgress />
              <Typography>Đang tải dữ liệu ...</Typography>
            </Box>
          ) : (
            <LineChartProduction
              dataset={dataset}
              selectedName={selectedName}
              selectedKey={selectedKey}
            />
          )}
        </Grid>
      </Grid>

      <VehicleProductionChart
        open={open}
        setOpen={setOpen}
        department={department}
        data={deviceProduction}
      />
    </Paper>
  );
}
