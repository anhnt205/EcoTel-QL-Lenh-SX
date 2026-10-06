import {
  Typography,
  Box,
  Paper,
  TableContainer,
  Table,
  TableRow,
  TableHead,
  TableCell,
  TableBody,
  Popover,
  TextField,
  Autocomplete,
  IconButton,
  CircularProgress,
  AlertColor,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  RotateLeft as RotateLeftIcon,
  TableRows as TableRowsIcon,
  ViewModule as ViewModuleIcon,
} from "@mui/icons-material";
import api from "../../config/api.config";
import RealTimeClock from "../../components/RealTimeClock";
import { AlertSnackbar, showErrorAlert } from "../../components/Alert";
import BlinkButton from "../../components/BlinkButton";
import ExpandablePanel from "../../components/ExpandablePanel";
import Deviceprocess from "./DeviceProcess";
import { useAtom } from "jotai";
import { userAtom } from "../../atoms/userAtoms";
import { RoleEnum, StatusDeviceEnum } from "../../enums";

const filter = [
  "Thuê ngoài AB",
  "Thuê ngoài VN",
  "Thuê ngoài-QM",
  "ĐXVP",
  "QM",
  "TN An Bình",
  "TN Máy Việt Nam",
  "TN Quang Minh",
  "TN AB",
  "TN Máy Việt-Nam",
  "TN QM",
  "TN-Máy Việt Nam",
];

// Màu/nhãn trạng thái dùng chung cho thẻ, chú giải và ô từng xe.
const STATUS_META = [
  { key: StatusDeviceEnum.AVAILABLE, label: "Chờ điều động", color: "#2e7d32", bg: "#e8f5e9", bar: "#4CAF50" },
  { key: StatusDeviceEnum.IN_USE, label: "Đang hoạt động", color: "#d32f2f", bg: "#fdecea", bar: "#F44336" },
  { key: StatusDeviceEnum.MAINTENANCE, label: "SC; BD", color: "#c75b00", bg: "#fff4e5", bar: "#FF9800" },
  { key: StatusDeviceEnum.RETIRED, label: "Niêm cất", color: "#6b7280", bg: "#f1f3f5", bar: "#E0E0E0" },
];
const STATUS_RANK: Record<string, number> = {
  [StatusDeviceEnum.IN_USE]: 0,
  [StatusDeviceEnum.MAINTENANCE]: 1,
  [StatusDeviceEnum.AVAILABLE]: 2,
  [StatusDeviceEnum.RETIRED]: 3,
};
const LINE = "#e5e9f0";

const sumStatus = (group: any): Record<string, number> =>
  group.deviceTypes.reduce(
    (acc: Record<string, number>, deviceType: any) => {
      STATUS_META.forEach((s) => {
        acc[s.key] += deviceType.statusCounts?.[s.key] || 0;
      });
      return acc;
    },
    { available: 0, in_use: 0, maintenance: 0, retired: 0 },
  );

const ledColor = (t: Record<string, number>) =>
  t.maintenance > 0
    ? "orange"
    : t.in_use > 0
      ? "red"
      : t.available > 0
        ? "green"
        : "grey";

export default function DeviceAnalysic({
  departments,
}: {
  departments: any[];
}) {
  const [user] = useAtom(userAtom);
  const [department, setDepartment] = useState("");
  const [view, setView] = useState<"card" | "table">("card");
  const queryClient = useQueryClient();
  const { data: deviceCount = [], isLoading: isLoadingDeviceCount } = useQuery({
    queryKey: ["deviceCount", department],
    queryFn: () =>
      api
        .get(`/devices/count/status?department=${department}`)
        .then((res) => res.data.data),
  });
  const { data: devices = [] } = useQuery({
    queryKey: ["devices"],
    queryFn: () => api.get("/devices").then((res) => res.data.data),
  });

  const [alert, setAlert] = useState<{
    open: boolean;
    message: string;
    severity?: AlertColor;
  }>({
    open: false,
    message: "",
    severity: "success",
  });
  const handleUpdateDevices = useMutation({
    mutationFn: () =>
      api.post("/devices/update_status").then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      queryClient.invalidateQueries({ queryKey: ["deviceCount"] });
      setAlert({
        open: true,
        message: "Cập nhật thành công",
        severity: "success",
      });
    },
    onError: (error: any) => {
      showErrorAlert(error.response.data.message || error.message || "Lỗi");
      setAlert({ open: true, message: "Cập nhật thất bại", severity: "error" });
    },
  });

  // Popover chi tiết (danh sách thiết bị theo đơn vị + loại + trạng thái)
  const [anchorElDetail, setAnchorElDetail] = useState<HTMLElement | null>(
    null,
  );
  const [selectedDetailDevices, setSelectedDetailDevices] = useState<any[]>([]);

  const [departmentPopup, setDepartmentPopup] = useState("");
  const handleDetailClick = (
    event: React.MouseEvent<HTMLElement>,
    status: string,
    departmentCode: string,
    typeName: string,
  ) => {
    setAnchorElDetail(event.currentTarget);
    setDepartmentPopup(departmentCode);
    setSelectedDetailDevices(
      devices.filter(
        (d: any) =>
          d.status === status &&
          d.department?.code === departmentCode &&
          d.category?.name === typeName,
      ),
    );
  };
  const handleDetailClose = () => {
    setAnchorElDetail(null);
    setSelectedDetailDevices([]);
  };

  const groups = useMemo(
    () => deviceCount.filter((i: any) => !filter.includes(i?.departmentName)),
    [deviceCount],
  );

  // Tổng toàn bộ các đơn vị đang hiển thị (chú giải ở thanh tiêu đề).
  const grand = useMemo(() => {
    const acc: Record<string, number> = {
      available: 0,
      in_use: 0,
      maintenance: 0,
      retired: 0,
    };
    groups.forEach((g: any) => {
      const t = sumStatus(g);
      STATUS_META.forEach((s) => (acc[s.key] += t[s.key]));
    });
    return acc;
  }, [groups]);

  // Từng xe/máy của mỗi đơn vị, xếp theo trạng thái rồi theo mã.
  const devicesByDept = useMemo(() => {
    const map = new Map<string, any[]>();
    devices.forEach((d: any) => {
      const code = d.department?.code;
      if (!code) return;
      const list = map.get(code) ?? [];
      list.push(d);
      map.set(code, list);
    });
    map.forEach((list) =>
      list.sort(
        (a, b) =>
          (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9) ||
          String(a.code).localeCompare(String(b.code), undefined, {
            numeric: true,
          }),
      ),
    );
    return map;
  }, [devices]);

  const metaOf = (status: string) =>
    STATUS_META.find((s) => s.key === status) ?? STATUS_META[3];

  const renderCard = (group: any, groupIndex: number, expanded: boolean) => {
    const totals = sumStatus(group);
    const total = STATUS_META.reduce((sum, s) => sum + totals[s.key], 0);
    const members = devicesByDept.get(group.departmentName) ?? [];

    return (
      <Box
        key={`${group.departmentName}-${groupIndex}`}
        sx={{
          border: `1px solid ${LINE}`,
          borderRadius: 1.5,
          p: 1,
          bgcolor: "#fff",
          minWidth: 0,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <BlinkButton color={ledColor(totals)} />
          <Typography
            noWrap
            title={group.departmentName}
            sx={{ flex: 1, fontSize: 13, fontWeight: 800 }}
          >
            {group.departmentName}
          </Typography>
          <Typography sx={{ fontSize: 11.5, color: "#64748b" }}>
            Tổng{" "}
            <b style={{ fontSize: 14, color: "#0f172a" }}>{total}</b>
          </Typography>
        </Box>

        {/* Thanh tỉ lệ trạng thái */}
        <Box
          sx={{
            display: "flex",
            height: 6,
            borderRadius: 3,
            overflow: "hidden",
            bgcolor: "#eef1f5",
            mt: 0.5,
          }}
        >
          {total > 0 &&
            STATUS_META.map((s) =>
              totals[s.key] > 0 ? (
                <Box
                  key={s.key}
                  sx={{
                    width: `${(totals[s.key] / total) * 100}%`,
                    bgcolor: s.bar,
                  }}
                />
              ) : null,
            )}
        </Box>

        {/* Số lượng theo trạng thái của cả đơn vị */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: "4px",
            mt: 0.75,
          }}
        >
          {STATUS_META.map((s) => (
            <Box
              key={s.key}
              title={s.label}
              sx={{
                textAlign: "center",
                borderRadius: 1,
                bgcolor: totals[s.key] > 0 ? s.bg : "#f8fafc",
                color: totals[s.key] > 0 ? s.color : "#c3cad4",
                py: "1px",
              }}
            >
              <Box sx={{ fontSize: 14, fontWeight: 800, lineHeight: 1.2 }}>
                {totals[s.key]}
              </Box>
              <Box sx={{ fontSize: 9.5, fontWeight: 600, lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {s.label}
              </Box>
            </Box>
          ))}
        </Box>

        {/* Theo loại thiết bị (bấm số để xem danh sách) */}
        {group.deviceTypes.length > 0 && (
          <Box
            sx={{
              mt: 0.75,
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) repeat(4, 30px)",
              alignItems: "center",
              rowGap: "1px",
            }}
          >
            {group.deviceTypes.map((item: any, index: number) => (
              <React.Fragment key={`${item.typeName}-${index}`}>
                <Typography
                  noWrap
                  title={item.typeName}
                  sx={{ fontSize: 12, color: "#334155", pr: 0.5 }}
                >
                  {item.typeName}
                </Typography>
                {STATUS_META.map((s) => {
                  const n = item.statusCounts?.[s.key] ?? 0;
                  return (
                    <Box
                      key={s.key}
                      onClick={
                        n > 0
                          ? (e: React.MouseEvent<HTMLElement>) =>
                              handleDetailClick(
                                e,
                                s.key,
                                group.departmentName,
                                item.typeName,
                              )
                          : undefined
                      }
                      sx={{
                        textAlign: "center",
                        fontSize: 12,
                        fontWeight: n > 0 ? 800 : 400,
                        color: n > 0 ? s.color : "#c3cad4",
                        cursor: n > 0 ? "pointer" : "default",
                        borderRadius: 0.75,
                        "&:hover": n > 0 ? { bgcolor: s.bg } : undefined,
                      }}
                    >
                      {n}
                    </Box>
                  );
                })}
              </React.Fragment>
            ))}
          </Box>
        )}

        {/* Trạng thái từng xe/máy: mỗi ô là 1 thiết bị, màu theo trạng thái */}
        {members.length > 0 && (
          <Box
            sx={{
              mt: 0.75,
              pt: 0.75,
              borderTop: `1px dashed ${LINE}`,
              display: "flex",
              flexWrap: "wrap",
              gap: "3px",
              // Mở rộng toàn màn hình: hiện đủ mọi xe/máy, không cuộn riêng từng đơn vị
              maxHeight: expanded ? "none" : 92,
              overflowY: expanded ? "visible" : "auto",
            }}
          >
            {members.map((d: any) => {
              const m = metaOf(d.status);
              return (
                <Box
                  key={d._id}
                  component="span"
                  title={[
                    d.code,
                    d.category?.name,
                    m.label,
                    d.assignedTo && `Vận hành: ${d.assignedTo}`,
                    d.note && `Ghi chú: ${d.note}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  sx={{
                    fontSize: expanded ? 12 : 10.5,
                    fontWeight: 700,
                    lineHeight: expanded ? "20px" : "16px",
                    px: 0.6,
                    borderRadius: "4px",
                    border: `1px solid ${m.bar}`,
                    bgcolor: m.bg,
                    color: m.color,
                    whiteSpace: "nowrap",
                  }}
                >
                  {d.code}
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    );
  };

  const headerCell = {
    fontWeight: "bold",
    fontSize: 12.5,
    top: 0,
    zIndex: 10,
    position: "sticky",
  } as const;

  return (
    <ExpandablePanel>
    {({ expanded, expandButton }) => (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
      <AlertSnackbar alert={alert} setAlert={setAlert} />

      {/* Thanh tiêu đề + chú giải + bộ lọc: gọn trong 1 hàng */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1,
          pl: 1.25,
          pr: 5.5, // chừa chỗ cho nút mở rộng ở góc phải
          py: 0.5,
          bgcolor: "#d6e9f9",
          borderBottom: `1px solid ${LINE}`,
          position: "sticky",
          top: 0,
          zIndex: 3,
          flex: "none",
        }}
      >
        <IconButton
          size="small"
          onClick={() => handleUpdateDevices.mutate()}
          disabled={handleUpdateDevices.isPending}
          title="Cập nhật trạng thái thiết bị"
        >
          {handleUpdateDevices.isPending ? (
            <CircularProgress size={20} />
          ) : (
            <RotateLeftIcon
              sx={{
                transition: "transform 0.3s ease",
                "&:hover": { transform: "rotate(-180deg)" },
                color: "primary.main",
              }}
            />
          )}
        </IconButton>
        <Typography sx={{ fontWeight: 800, fontSize: 14 }}>
          THIẾT BỊ THEO ĐƠN VỊ
        </Typography>
        <Box sx={{ display: "flex", gap: 1.25, flexWrap: "wrap", ml: 0.5 }}>
          {STATUS_META.map((s) => (
            <Box
              key={s.key}
              sx={{ display: "flex", alignItems: "center", gap: 0.5, fontSize: 12 }}
            >
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: s.bar }} />
              <span style={{ color: "#475569" }}>{s.label}</span>
              <b style={{ color: s.color }}>{grand[s.key]}</b>
            </Box>
          ))}
        </Box>
        <Box sx={{ flex: 1 }} />
        <ToggleButtonGroup
          size="small"
          exclusive
          value={view}
          onChange={(_, next) => next && setView(next)}
          sx={{
            bgcolor: "#fff",
            "& .MuiToggleButton-root": { py: 0.25, px: 1, fontSize: 12, gap: 0.5, textTransform: "none" },
          }}
        >
          <ToggleButton value="card">
            <ViewModuleIcon sx={{ fontSize: 16 }} />
            Thẻ
          </ToggleButton>
          <ToggleButton value="table">
            <TableRowsIcon sx={{ fontSize: 16 }} />
            Bảng
          </ToggleButton>
        </ToggleButtonGroup>
        {[RoleEnum.ADMIN, RoleEnum.DISPATCHER].includes(user?.role) && (
          <Autocomplete
            size="small"
            options={departments}
            getOptionLabel={(option: any) => option.code || ""}
            value={departments.find((p: any) => p._id === department) || null}
            onChange={(event, newValue) => {
              setDepartment(newValue?._id || "");
            }}
            sx={{ width: 160, bgcolor: "#fff", borderRadius: 1 }}
            renderInput={(params) => <TextField {...params} label="Đơn vị" />}
          />
        )}
        <RealTimeClock compact />
        {expandButton}
      </Box>

      {isLoadingDeviceCount ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      ) : groups.length === 0 ? (
        <Typography sx={{ p: 3, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
          Chưa có thiết bị nào
        </Typography>
      ) : view === "card" ? (
        <Box
          sx={{
            p: 1,
            display: "grid",
            gap: 1,
            gridTemplateColumns: `repeat(auto-fill, minmax(${expanded ? 300 : 270}px, 1fr))`,
            // Mở rộng: cả thẻ cuộn (tiêu đề dính trên), không giới hạn theo chiều cao màn hình
            maxHeight: expanded ? "none" : "calc(100vh - 230px)",
            minHeight: 240,
            overflowY: expanded ? "visible" : "auto",
            flex: expanded ? "1 0 auto" : undefined,
            alignContent: "start",
            bgcolor: "#f8fafc",
          }}
        >
          {groups.map((group: any, groupIndex: number) =>
            renderCard(group, groupIndex, expanded),
          )}
        </Box>
      ) : (
        <TableContainer
          sx={{
            maxHeight: expanded ? "calc(100vh - 100px)" : "calc(100vh - 230px)",
            minHeight: 240,
          }}
        >
          <Table
            stickyHeader
            size="small"
            sx={{
              "& td, & th": { border: "1px solid #e0e0e0", padding: "2px 6px", fontSize: 13 },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell align="center" sx={{ ...headerCell, width: "3%" }}>STT</TableCell>
                <TableCell align="center" sx={{ ...headerCell, width: "3%" }}>{" "}</TableCell>
                <TableCell align="center" sx={{ ...headerCell, width: "16%" }}>Đơn vị</TableCell>
                <TableCell align="center" sx={{ ...headerCell, width: "16%" }}>Thiết bị</TableCell>
                {STATUS_META.map((s) => (
                  <TableCell
                    key={s.key}
                    align="center"
                    sx={{ ...headerCell, width: "12%", color: s.color }}
                  >
                    {s.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {groups.map((group: any, groupIndex: number) => {
                const totalStatus = sumStatus(group);
                const reps =
                  group.deviceTypes.length > 0
                    ? group.deviceTypes
                    : [
                        {
                          typeName: "",
                          statusCounts: {
                            available: 0,
                            in_use: 0,
                            maintenance: 0,
                            retired: 0,
                          },
                        },
                      ];
                const span = reps.length;
                return reps.map((item: any, index: number) => {
                  const total = Object.values(item.statusCounts)
                    .map((v) => Number(v) || 0)
                    .reduce((sum, v) => sum + v, 0);

                  return (
                    <TableRow
                      key={`${groupIndex}-${index}`}
                      sx={{ "&:nth-of-type(odd)": { bgcolor: "#f9f9f9" } }}
                    >
                      {index === 0 && (
                        <TableCell rowSpan={span} align="center">
                          {groupIndex + 1}
                        </TableCell>
                      )}
                      {index === 0 && (
                        <TableCell rowSpan={span} align="center">
                          <BlinkButton color={ledColor(totalStatus)} />
                        </TableCell>
                      )}
                      {index === 0 && (
                        <TableCell rowSpan={span} align="center">
                          {group.departmentName}
                        </TableCell>
                      )}
                      <TableCell align="center">{item.typeName}</TableCell>
                      {STATUS_META.map((s) => (
                        <TableCell
                          key={s.key}
                          align="center"
                          sx={{ cursor: "pointer" }}
                          onClick={(e) =>
                            handleDetailClick(
                              e,
                              s.key,
                              group.departmentName,
                              item.typeName,
                            )
                          }
                        >
                          {item.statusCounts?.[s.key] > 0 ? (
                            <Deviceprocess
                              value={item.statusCounts?.[s.key] || 0}
                              total={total}
                              color={s.bar}
                            />
                          ) : (
                            item.statusCounts?.[s.key]
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                });
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Popover
        open={Boolean(anchorElDetail)}
        anchorEl={anchorElDetail}
        onClose={handleDetailClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            maxWidth: 600,
            minWidth: 360,
            maxHeight: 400,
          },
        }}
      >
        <Box sx={{ p: 1.5 }}>
          <Box display={"flex"} gap={2} alignItems="baseline" mb={0.5}>
            <Typography sx={{ fontWeight: "bold", fontSize: 14 }}>
              Danh sách thiết bị
            </Typography>
            <Typography sx={{ fontSize: 13 }}>
              <strong>Đơn vị: </strong>
              {departmentPopup}
            </Typography>
            <Typography sx={{ fontSize: 13 }}>
              <strong>Số lượng: </strong>
              {selectedDetailDevices.length || 0}
            </Typography>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: "bold" }}>Thiết bị</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Sản lượng</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>
                  Người vận hành
                </TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Ghi chú</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {selectedDetailDevices.length > 0 ? (
                selectedDetailDevices.map((d) => (
                  <TableRow key={d._id}>
                    <TableCell>{d.code}</TableCell>
                    <TableCell>0</TableCell>
                    <TableCell>{d.assignedTo || ""}</TableCell>
                    <TableCell>{d.note || ""}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    Không có thiết bị nào
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      </Popover>
    </Paper>
    )}
    </ExpandablePanel>
  );
}
