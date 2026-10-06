import { useRef, useState } from "react";
import {
  Typography,
  TextField,
  Button,
  Box,
  Autocomplete,
  Chip,
  CircularProgress,
  GlobalStyles,
} from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { useMutation, useQuery } from "@tanstack/react-query";
import api from "../../config/api.config";
import { Department, Shift } from "../../types";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import VehicleShiftReport from "./VehicleShiftReport";
import CarReport from "./CarReport";
import ExcavatorTripReport from "./ExcavatorTripReport";
import CarTripReport from "./CarTripReport";
import WorkLogReport from "./WorkLogReport";
import mealRequestReport from "./MealRepuestReport";
import {
  Description,
  Download,
  Edit,
  Menu as MenuIcon,
  MenuOpen,
  Print,
  TableView,
} from "@mui/icons-material";
import { showErrorAlert, showSuccessAlert } from "../../components/Alert";
import { useAtom } from "jotai";
import { userAtom } from "../../atoms/userAtoms";
import ExcavatorReport from "./ExcavatorReport";
import DozerReport from "./DozerReport";
import DrillReport from "./DrillReport";
import { AcceptedProductEnum, ReportEnum, RoleEnum } from "../../enums";
import { parseAxiosError } from "../../utils/handleApiError";
import AttendanceReport from "./AttendanceReport";
import "dayjs/locale/vi";
import CarTripDateReport from "./CarTripDateReport";
import ExcavatorProductReport from "./ExcavatorProductReport";
import CarProductReport from "./CarProductReport";
import CarProductivityReport from "./CarProductivityReport";
import CarProductLandReport from "./CarProductLandReport";
import CarProductCoalReport from "./CarProductCoalReport";
import AssignmentManagerReport from "./AssignmentManagerReport";
import AssignmentToReport from "./AssignmentToReport";
import ProductionReport from "./ProductionReport";
import DailyOrderReport from "./DailyOrderReport";
import { Eye } from "lucide-react";
import appTheme from "../../theme";
import uiTheme from "../../theme/uiTheme";
import ReportListPanel from "./ReportListPanel";
import { REPORT_ORDER } from "./reportOrder";
import { downloadCsv, elementToCsv } from "../../utils/exportCsv";
import { printElement } from "../../utils/printElement";

const LINE = "#e5e9f0";

// Điều kiện hiển thị bộ lọc theo từng biểu mẫu — giữ nguyên như bản cũ.
const NO_RANGE_REPORTS = [
  ReportEnum.SHIFT_HANDOVER,
  ReportEnum.PRODUCTION_FUEL_MONITORING,
  ReportEnum.STAFF_SHIFT_HANDOVER,
  ReportEnum.DATE_TRIP_CAR,
  ReportEnum.TIMESHEET,
  ReportEnum.DAILY_PRODUCTION_CAR_REPORT,
  ReportEnum.DAILY_ORDER,
];
const DAY_REPORTS = [
  ReportEnum.PRODUCTION_FUEL_MONITORING,
  ReportEnum.STAFF_SHIFT_HANDOVER,
  ReportEnum.DATE_TRIP_CAR,
  ReportEnum.DAILY_PRODUCTION_CAR_REPORT,
  ReportEnum.DAILY_ORDER,
];
const NO_SHIFT_REPORTS = [
  ReportEnum.SHIFT_HANDOVER,
  ReportEnum.DAILY_PRODUCTION_EXCAVATOR_REPORT,
  ReportEnum.TIMESHEET,
  ReportEnum.DAILY_PRODUCTION_CAR_REPORT,
  ReportEnum.PRODUCTIVITY_CAR_REPORT,
  ReportEnum.PRODUCTION_LAND_CAR_REPORT,
  ReportEnum.PRODUCTION_COAL_CAR_REPORT,
];

const toolButtonSx = {
  fontSize: 13,
  fontWeight: 600,
  color: "#334155",
  borderColor: LINE,
  bgcolor: "#fff",
  px: 1.25,
  "&:hover": { borderColor: "#cbd5e1", bgcolor: "#f8fafc" },
} as const;

function Reports() {
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(null);
  const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(null);
  const [date, setDate] = useState<dayjs.Dayjs | null>(null);
  const [day, setDay] = useState<dayjs.Dayjs | null>(null);
  const [title, setTitle] = useState("");
  const [shift, setShift] = useState<Shift[]>([]);
  const [department, setDepartment] = useState<Department | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [maxTrip, setMaxTrip] = useState(1);
  const [materials, setMaterials] = useState<any[]>([]);
  const [preview, setPreview] = useState(false);
  const [user] = useAtom(userAtom);

  const { data: shifts = [] } = useQuery({
    queryKey: ["shifts"],
    queryFn: () => api.get("/shifts").then((res) => res.data.data),
  });
  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: () => api.get("/departments").then((res) => res.data.data),
  });
  const getSignatureAndS3Url = useMutation({
    mutationFn: async () => {
      // Bước 1: Lấy key chữ ký
      const userRes = await api.get("/auth/me");
      const signatureKey = userRes.data.data.user?.signature;

      if (!signatureKey) {
        // Nếu không có key, bạn có thể throw error hoặc return null
        throw new Error("Không tìm thấy key chữ kí.");
      }

      // Bước 2: Dùng key để lấy S3 URL
      const s3UrlRes = await api.get(`/uploads/get?key=${signatureKey}`);
      return s3UrlRes.data.data as string;
    },
    onSuccess: (s3Url) => {
      if (!s3Url) {
        showErrorAlert("Lỗi lấy URL chữ kí");
      } else {
        setSignatureUrl(s3Url);
      }
    },
    onError: (error: any) => {
      showErrorAlert(error.message || error.response?.data?.message || "Lỗi");
    },
  });
  const reportNames = [
    { name: ReportEnum.INACTIVE_VEHICLES },
    { name: ReportEnum.WORK_REPORT_SLIP },
    { name: ReportEnum.TIMESHEET },
    { name: ReportEnum.MEAL_REPORT_SLIP },
    { name: ReportEnum.SHIFT_HANDOVER },
    { name: ReportEnum.STAFF_SHIFT_HANDOVER },
    { name: ReportEnum.PRODUCTION_FUEL_MONITORING },
    { name: ReportEnum.SHIFT_SUMMARY_GRADER },
    { name: ReportEnum.SHIFT_SUMMARY_DRILL },
    { name: ReportEnum.SHIFT_SUMMARY_EXCAVATOR },
    { name: ReportEnum.SHIFT_SUMMARY_CAR },
    { name: ReportEnum.DATE_TRIP_CAR },
    { name: ReportEnum.EXCAVATOR_TRIP_LIST },
    { name: ReportEnum.DAILY_PRODUCTION_EXCAVATOR_REPORT },
    { name: ReportEnum.CAR_TRIP_LIST },
    { name: ReportEnum.DAILY_PRODUCTION_CAR_REPORT },
    { name: ReportEnum.PRODUCTIVITY_CAR_REPORT },
    { name: ReportEnum.PRODUCTION_LAND_CAR_REPORT },
    { name: ReportEnum.PRODUCTION_COAL_CAR_REPORT },
    { name: ReportEnum.DAILY_ORDER },
  ];
  const reportsMap: Record<
    ReportEnum,
    {
      viewUrl?: string;
      exportUrl: string;
      PreviewComponent: React.ComponentType<any>;
    }
  > = {
    [ReportEnum.INACTIVE_VEHICLES]: {
      viewUrl: "/exports/vehicleShiftReport/view",
      exportUrl: "/exports/vehicleShiftReport",
      PreviewComponent: VehicleShiftReport,
    },
    [ReportEnum.EXCAVATOR_TRIP_LIST]: {
      viewUrl: "/exports/excavatorTripReport/view",
      exportUrl: "/exports/excavatorTripReport",
      PreviewComponent: ExcavatorTripReport,
    },
    [ReportEnum.CAR_TRIP_LIST]: {
      viewUrl: "/exports/carTripReport/view",
      exportUrl: "/exports/carTripReport",
      PreviewComponent: CarTripReport,
    },
    [ReportEnum.WORK_REPORT_SLIP]: {
      viewUrl: "/exports/worklog/view",
      exportUrl: "/exports/worklog",
      PreviewComponent: WorkLogReport,
    },
    [ReportEnum.TIMESHEET]: {
      viewUrl: "/exports/attendance/view",
      exportUrl: "/exports/attendance",
      PreviewComponent: AttendanceReport,
    },
    [ReportEnum.MEAL_REPORT_SLIP]: {
      viewUrl: "/exports/meal_request/view",
      exportUrl: "/exports/meal_request",
      PreviewComponent: mealRequestReport,
    },
    [ReportEnum.SHIFT_HANDOVER]: {
      viewUrl: undefined,
      exportUrl: "/exports/assignmentTo",
      PreviewComponent: AssignmentToReport, // Giả sử dùng tạm component này
    },
    [ReportEnum.STAFF_SHIFT_HANDOVER]: {
      viewUrl: "/exports/assignmentManager/view",
      exportUrl: "/exports/assignmentManager",
      PreviewComponent: AssignmentManagerReport, // Giả sử dùng tạm component này
    },
    [ReportEnum.SHIFT_SUMMARY_GRADER]: {
      viewUrl: "/exports/dozerReport/view",
      exportUrl: "/exports/dozerReport",
      PreviewComponent: DozerReport,
    },
    [ReportEnum.SHIFT_SUMMARY_DRILL]: {
      viewUrl: "/exports/drillReport/view",
      exportUrl: "/exports/drillReport",
      PreviewComponent: DrillReport,
    },
    [ReportEnum.SHIFT_SUMMARY_CAR]: {
      viewUrl: "/exports/carReport/view",
      exportUrl: "/exports/carReport",
      PreviewComponent: CarReport,
    },
    [ReportEnum.SHIFT_SUMMARY_EXCAVATOR]: {
      viewUrl: "/exports/excavatorReport/view",
      exportUrl: "/exports/excavatorReport",
      PreviewComponent: ExcavatorReport,
    },
    [ReportEnum.DATE_TRIP_CAR]: {
      viewUrl: "/exports/carTripReportByDay/view",
      exportUrl: "/exports/carTripReportByDay",
      PreviewComponent: CarTripDateReport,
    },
    [ReportEnum.DAILY_PRODUCTION_EXCAVATOR_REPORT]: {
      viewUrl: "/exports/excavatorProductReport/view",
      exportUrl: "/exports/excavatorProductReport",
      PreviewComponent: ExcavatorProductReport,
    },
    [ReportEnum.DAILY_PRODUCTION_CAR_REPORT]: {
      viewUrl: "/exports/carProductReport/view",
      exportUrl: "/exports/carProductReport",
      PreviewComponent: CarProductReport,
    },
    [ReportEnum.PRODUCTIVITY_CAR_REPORT]: {
      viewUrl: "/exports/carProductivityReport/view",
      exportUrl: "/exports/carProductivityReport",
      PreviewComponent: CarProductivityReport,
    },
    [ReportEnum.PRODUCTION_LAND_CAR_REPORT]: {
      viewUrl: `/exports/carProductionLandCoalReport/view?type=${AcceptedProductEnum.LAND}`,
      exportUrl: `/exports/carProductionLandCoalReport?type=${AcceptedProductEnum.LAND}`,
      PreviewComponent: CarProductLandReport,
    },
    [ReportEnum.PRODUCTION_COAL_CAR_REPORT]: {
      viewUrl: `/exports/carProductionLandCoalReport/view?type=${AcceptedProductEnum.COAL}`,
      exportUrl: `/exports/carProductionLandCoalReport?type=${AcceptedProductEnum.COAL}`,
      PreviewComponent: CarProductCoalReport,
    },
    [ReportEnum.PRODUCTION_FUEL_MONITORING]: {
      viewUrl: `/exports/productReport/view`,
      exportUrl: `/exports/productReport`,
      PreviewComponent: ProductionReport,
    },
    [ReportEnum.DAILY_ORDER]: {
      viewUrl: `/exports/dailyOrderReport/view`,
      exportUrl: `/exports/dailyOrderReport`,
      PreviewComponent: DailyOrderReport,
    },
  };

  const config = title ? reportsMap[title as ReportEnum] : undefined;
  const PreviewComponent = config?.PreviewComponent;

  const reportView = useMutation({
    mutationFn: () => {
      if (!config) throw new Error("Chưa chọn loại báo cáo");
      if (
        (!startDate || !endDate) &&
        ![
          ReportEnum.SHIFT_HANDOVER,
          ReportEnum.PRODUCTION_FUEL_MONITORING,
          ReportEnum.STAFF_SHIFT_HANDOVER,
          ReportEnum.TIMESHEET,
          ReportEnum.DATE_TRIP_CAR,
          ReportEnum.DAILY_PRODUCTION_EXCAVATOR_REPORT,
          ReportEnum.DAILY_PRODUCTION_CAR_REPORT,
          ReportEnum.DAILY_ORDER,
        ].includes(title as ReportEnum)
      )
        throw new Error("Chọn thời gian bắt đầu và kết thúc");
      if (
        shift.length === 0 &&
        ![
          ReportEnum.SHIFT_HANDOVER,
          ReportEnum.TIMESHEET,
          ReportEnum.DAILY_PRODUCTION_EXCAVATOR_REPORT,
          ReportEnum.DATE_TRIP_CAR,
          ReportEnum.DAILY_PRODUCTION_EXCAVATOR_REPORT,
          ReportEnum.DAILY_PRODUCTION_CAR_REPORT,
          ReportEnum.PRODUCTIVITY_CAR_REPORT,
          ReportEnum.PRODUCTION_LAND_CAR_REPORT,
          ReportEnum.PRODUCTION_COAL_CAR_REPORT,
        ].includes(title as ReportEnum)
      )
        throw new Error("Chọn ca làm việc");
      if ([ReportEnum.TIMESHEET].includes(title as ReportEnum) && !date)
        throw new Error("Chọn tháng");
      if (
        [
          ReportEnum.DATE_TRIP_CAR,
          ReportEnum.DAILY_PRODUCTION_CAR_REPORT,
          ReportEnum.STAFF_SHIFT_HANDOVER,
          ReportEnum.PRODUCTION_FUEL_MONITORING,
          ReportEnum.DAILY_ORDER,
        ].includes(title as ReportEnum) &&
        !day
      )
        throw new Error("Chọn ngày");
      return api
        .post(config.viewUrl ?? "", {
          startDate: startDate?.format("YYYY-MM-DD") || "",
          endDate: endDate?.format("YYYY-MM-DD") || "",
          shift: shift.map((s) => s._id),
          title,
          signature: signatureUrl || null,
          department: department?._id || "",
          date: date ? date.format("MM/YYYY") : "",
          day: day?.format("YYYY-MM-DD") || "",
        })
        .then((res) => {
          setData(res.data.data);
          setMaxTrip(res.data.maxTrips);
          setMaterials(res.data.materials);
        });
    },
    onSuccess: () => {},
    onError: (error: any) => {
      showErrorAlert(error.response?.data?.message || error.message || "Lỗi");
    },
  });

  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const reportExcel = useMutation({
    mutationFn: () => {
      if (!config) throw new Error("Chưa chọn loại báo cáo");
      if (
        (!startDate || !endDate) &&
        ![
          ReportEnum.SHIFT_HANDOVER,
          ReportEnum.PRODUCTION_FUEL_MONITORING,
          ReportEnum.STAFF_SHIFT_HANDOVER,
          ReportEnum.TIMESHEET,
          ReportEnum.DATE_TRIP_CAR,
          ReportEnum.DAILY_PRODUCTION_EXCAVATOR_REPORT,
          ReportEnum.DAILY_PRODUCTION_CAR_REPORT,
          ReportEnum.DAILY_ORDER,
        ].includes(title as ReportEnum)
      )
        throw new Error("Chọn thời gian bắt đầu và kết thúc");
      if (
        shift.length === 0 &&
        ![
          ReportEnum.SHIFT_HANDOVER,
          ReportEnum.TIMESHEET,
          ReportEnum.DATE_TRIP_CAR,
          ReportEnum.DAILY_PRODUCTION_EXCAVATOR_REPORT,
          ReportEnum.DAILY_PRODUCTION_CAR_REPORT,
          ReportEnum.PRODUCTIVITY_CAR_REPORT,
          ReportEnum.PRODUCTION_LAND_CAR_REPORT,
          ReportEnum.PRODUCTION_COAL_CAR_REPORT,
          ReportEnum.DAILY_PRODUCTION_EXCAVATOR_REPORT,
        ].includes(title as ReportEnum)
      )
        throw new Error("Chọn ca làm việc");
      if ([ReportEnum.TIMESHEET].includes(title as ReportEnum) && !date)
        throw new Error("Chọn tháng");
      if (
        [
          ReportEnum.PRODUCTION_FUEL_MONITORING,
          ReportEnum.DATE_TRIP_CAR,
          ReportEnum.DAILY_PRODUCTION_CAR_REPORT,
          ReportEnum.STAFF_SHIFT_HANDOVER,
          ReportEnum.DAILY_ORDER,
        ].includes(title as ReportEnum) &&
        !day
      )
        throw new Error("Chọn ngày");
      return api
        .post(
          config.exportUrl,
          {
            startDate: startDate?.format("YYYY-MM-DD") || "",
            endDate: endDate?.format("YYYY-MM-DD") || "",
            shift,
            title,
            signature: signatureUrl || null,
            department,
            date: date ? date.format("MM/YYYY") : "",
            day: day?.format("YYYY-MM-DD") || "",
          },
          {
            responseType: "blob",
            onUploadProgress: (progressEvent) => {
              const percent = Math.round(
                (progressEvent.loaded * 100) / (progressEvent.total ?? 1),
              );
              setProgress(percent);
            },
          },
        )
        .then((res) => {
          const blob = new Blob([res.data], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          });

          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute("download", `*.xlsx`);

          document.body.appendChild(link);
          link.click();
          link.parentNode?.removeChild(link);
          window.URL.revokeObjectURL(url);
        });
    },
    onMutate: () => {
      setIsUploading(true);
      setProgress(0); // Reset tiến trình khi bắt đầu
    },
    onSuccess: () => {
      setIsUploading(false);
    },
    onError: async (error: any) => {
      setIsUploading(false);
      const message = await parseAxiosError(error);
      showErrorAlert(message);
    },
  });

  const isMultiple =
    title !== ReportEnum.STAFF_SHIFT_HANDOVER &&
    title !== ReportEnum.PRODUCTION_FUEL_MONITORING &&
    title !== ReportEnum.DAILY_ORDER;

  const [listOpen, setListOpen] = useState(true);
  const sheetRef = useRef<HTMLDivElement>(null);

  const showPreview = preview && !!PreviewComponent && reportView.isSuccess;
  const reportNo = title ? REPORT_ORDER.indexOf(title as ReportEnum) + 1 : 0;
  const listItems = REPORT_ORDER.map((name, index) => ({
    name,
    no: index + 1,
  }));

  const handleSelect = (name: string) => {
    setTitle(name);
    setPreview(false);
    setData([]);
    setMaterials([]);
  };

  const handleView = () => {
    if (!title) return showErrorAlert("Vui lòng chọn loại báo cáo");
    reportView.mutate();
    setPreview(true);
  };

  const handleExcel = () => {
    if (!title) {
      showErrorAlert("Vui lòng chọn loại báo cáo");
      return;
    }
    reportExcel.mutate();
  };

  const handlePrint = () => {
    if (sheetRef.current) printElement(sheetRef.current);
  };

  const handleCsv = () => {
    if (!sheetRef.current) return;
    const result = elementToCsv(sheetRef.current);
    if (!result.ok) {
      showErrorAlert(result.reason);
      return;
    }
    downloadCsv(
      `${title || "bao-cao"}-${dayjs().format("YYYYMMDD-HHmm")}.csv`,
      result.csv,
    );
  };

  const renderDate = (
    label: string,
    value: dayjs.Dayjs | null,
    onChange: (v: dayjs.Dayjs | null) => void,
    extra: Record<string, any> = {},
  ) => (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={extra.locale}>
      <DatePicker
        label={label}
        inputFormat={extra.inputFormat ?? "DD/MM/YYYY"}
        views={extra.views}
        openTo={extra.openTo}
        value={value ? dayjs(value) : null}
        onChange={onChange}
        renderInput={(params) => (
          <TextField {...params} size="small" sx={{ width: 168 }} />
        )}
      />
    </LocalizationProvider>
  );

  return (
    <ThemeProvider theme={uiTheme}>
      <GlobalStyles
        styles={{
          "@media print": {
            "[data-print-hide]": { display: "none !important" },
            body: { background: "#fff !important" },
          },
        }}
      />
      <Box sx={{ color: "#0f172a" }}>
        {/* Tiêu đề trang */}
        <Box sx={{ mb: 1.5 }}>
          <Typography sx={{ fontSize: 12, color: "#64748b" }}>
            Không gian làm việc / Trung tâm báo cáo
          </Typography>
          <Typography
            component="h1"
            sx={{
              fontSize: 28,
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: "-0.01em",
            }}
          >
            Trung tâm báo cáo
          </Typography>
          <Typography sx={{ fontSize: 13, color: "#64748b", mt: 0.25 }}>
            Chọn biểu mẫu bên trái, xem trước và xuất ngay tại vùng bên phải.
          </Typography>
        </Box>

        <Box
          sx={{
            display: "grid",
            gap: 1.5,
            alignItems: "start",
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              md: listOpen ? "300px minmax(0, 1fr)" : "minmax(0, 1fr)",
            },
          }}
        >
          {listOpen && (
            <ReportListPanel
              items={listItems}
              selected={title}
              onSelect={handleSelect}
              onHide={() => setListOpen(false)}
            />
          )}

          {/* Vùng bên phải: thanh công cụ + bộ lọc + bản xem trước */}
          <Box
            sx={{
              minWidth: 0,
              border: `1px solid ${LINE}`,
              borderRadius: 2,
              bgcolor: "#fff",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                flexWrap: "wrap",
                px: 1.5,
                py: 1,
                borderBottom: `1px solid ${LINE}`,
              }}
            >
              <Button
                size="small"
                variant="outlined"
                startIcon={listOpen ? <MenuOpen /> : <MenuIcon />}
                onClick={() => setListOpen((open) => !open)}
                sx={toolButtonSx}
              >
                Danh sách
              </Button>
              <Box sx={{ width: "1px", height: 20, bgcolor: LINE }} />
              <Typography noWrap sx={{ fontWeight: 700, fontSize: 14, minWidth: 0 }}>
                {title || "Chưa chọn báo cáo"}
              </Typography>
              {reportNo > 0 && (
                <Chip
                  size="small"
                  label={`Biểu ${reportNo}`}
                  sx={{ height: 20, fontSize: 11, fontWeight: 700, bgcolor: "brand.chipBg", color: "brand.chipText" }}
                />
              )}
              <Box sx={{ flex: 1 }} />
              <Button
                size="small"
                variant="outlined"
                startIcon={<Edit />}
                onClick={() => getSignatureAndS3Url.mutate()}
                sx={toolButtonSx}
              >
                {signatureUrl ? "Đã thêm chữ ký" : "Thêm chữ ký"}
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<TableView />}
                onClick={handleExcel}
                disabled={reportExcel.isPending}
                sx={toolButtonSx}
              >
                Excel
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Print />}
                onClick={handlePrint}
                disabled={!showPreview}
                sx={toolButtonSx}
              >
                In / PDF
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Download />}
                onClick={handleCsv}
                disabled={!showPreview}
                sx={toolButtonSx}
              >
                CSV
              </Button>
            </Box>

            {title && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 1.25,
                  px: 1.5,
                  py: 1.25,
                  bgcolor: "#f8fafc",
                  borderBottom: `1px solid ${LINE}`,
                }}
              >
                {/* Bộ chọn Đơn vị (chỉ Admin) */}
                {user?.role === RoleEnum.ADMIN && (
                  <Autocomplete
                    size="small"
                    options={departments}
                    getOptionLabel={(option) => option?.code || ""}
                    value={
                      departments.find((d: any) => d._id === department?._id) ??
                      null
                    }
                    onChange={(event, newValue) => setDepartment(newValue)}
                    sx={{ width: 190 }}
                    renderInput={(params) => (
                      <TextField {...params} label="Chọn đơn vị" />
                    )}
                  />
                )}

                {!NO_RANGE_REPORTS.includes(title as ReportEnum) && (
                  <>
                    {renderDate("Từ ngày", startDate, setStartDate)}
                    {renderDate("Đến ngày", endDate, setEndDate)}
                  </>
                )}
                {title === ReportEnum.TIMESHEET &&
                  renderDate("Chọn tháng", date, setDate, {
                    locale: "vi",
                    inputFormat: "MM/YYYY",
                    views: ["year", "month"],
                    openTo: "month",
                  })}
                {DAY_REPORTS.includes(title as ReportEnum) &&
                  renderDate("Chọn ngày", day, setDay, { locale: "vi" })}

                {!NO_SHIFT_REPORTS.includes(title as ReportEnum) && (
                  <Autocomplete
                    multiple={isMultiple}
                    filterSelectedOptions
                    size="small"
                    limitTags={2}
                    options={shifts}
                    getOptionLabel={(option: Shift) =>
                      `Ca ${option.name} (${option.startTime})`
                    }
                    value={
                      isMultiple
                        ? shifts.filter((s: Shift) => shift.includes(s))
                        : shift.length > 0
                          ? shift[0]
                          : null
                    }
                    onChange={(event, newValue) => {
                      const finalValue = Array.isArray(newValue)
                        ? newValue
                        : newValue
                          ? [newValue]
                          : [];

                      setShift(finalValue);
                    }}
                    sx={{ minWidth: 220, maxWidth: 380 }}
                    renderInput={(params) => <TextField {...params} label="Ca" />}
                  />
                )}

                <Button
                  variant="contained"
                  disableElevation
                  startIcon={
                    reportView.isPending ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <Eye size={16} />
                    )
                  }
                  onClick={handleView}
                  disabled={reportView.isPending}
                  sx={{
                    fontWeight: 700,
                    fontSize: 13,
                    px: 2,
                    bgcolor: "brand.solid",
                    color: "brand.onSolid",
                    "&:hover": { bgcolor: "brand.solidHover" },
                  }}
                >
                  {reportView.isPending ? "Đang tải..." : "Xem báo cáo"}
                </Button>
              </Box>
            )}

            {/* Khu vực xem trước: nền xám + "tờ giấy" trắng */}
            <Box sx={{ bgcolor: "#eef1f5", p: { xs: 1, md: 2 }, minHeight: 360 }}>
              {showPreview && PreviewComponent ? (
                <ThemeProvider theme={appTheme}>
                  <Box
                    id="report-print-area"
                    ref={sheetRef}
                    sx={{
                      bgcolor: "#fff",
                      borderRadius: 1,
                      boxShadow:
                        "0 1px 2px rgba(15,23,42,.08), 0 8px 24px rgba(15,23,42,.06)",
                      p: { xs: 1, md: 2.5 },
                      overflowX: "auto",
                      "& .MuiPaper-root": { boxShadow: "none" },
                    }}
                  >
                    <PreviewComponent
                      data={data}
                      signatureUrl={signatureUrl}
                      maxTrip={maxTrip}
                      materials={materials}
                      startDate={startDate}
                      endDate={endDate}
                      shifts={shift}
                      department={department}
                      date={date}
                      day={day}
                    />
                  </Box>
                </ThemeProvider>
              ) : reportView.isPending ? (
                <Box
                  sx={{
                    minHeight: 320,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1.5,
                    color: "#64748b",
                  }}
                >
                  <CircularProgress size={28} />
                  <Typography sx={{ fontSize: 13 }}>Đang tải dữ liệu báo cáo...</Typography>
                </Box>
              ) : (
                <Box
                  sx={{
                    minHeight: 320,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1,
                    color: "#94a3b8",
                    textAlign: "center",
                  }}
                >
                  <Description sx={{ fontSize: 44 }} />
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#475569" }}>
                    {title
                      ? "Thiết lập bộ lọc rồi bấm \"Xem báo cáo\""
                      : "Chọn một biểu mẫu từ danh sách"}
                  </Typography>
                  <Typography sx={{ fontSize: 12.5 }}>
                    {title
                      ? "Bản xem trước sẽ hiện ngay tại đây, sẵn sàng để in hoặc xuất file."
                      : "Bản xem trước và nút xuất file sẽ hiện ở vùng này."}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default Reports;
