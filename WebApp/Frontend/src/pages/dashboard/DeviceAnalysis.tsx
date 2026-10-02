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
} from "@mui/material";
import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateLeft as RotateLeftIcon } from "@mui/icons-material";
import api from "../../config/api.config";
import RealTimeClock from "../../components/RealTimeClock";
import { AlertSnackbar, showErrorAlert } from "../../components/Alert";
import BlinkButton from "../../components/BlinkButton";
import Deviceprocess from "./DeviceProcess";
import { useAtom } from "jotai";
import { userAtom } from "../../atoms/userAtoms";
import { RoleEnum, StatusDeviceEnum } from "../../enums";
import FieldAutoCompleted from "../../components/field/FieldAutoCompleted";

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

export default function DeviceAnalysic({
  departments,
}: {
  departments: any[];
}) {
  const [user] = useAtom(userAtom);
  const [department, setDepartment] = useState("");
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

  // Popover chi tiết (bảng dưới)
  const [anchorElDetail, setAnchorElDetail] = useState<HTMLElement | null>(
    null,
  );
  const [selectedDetailDevices, setSelectedDetailDevices] = useState<any[]>([]);

  // Mở/đóng popover chi tiết
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

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2 }}>
      <AlertSnackbar alert={alert} setAlert={setAlert} />
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          p: 2,
        }}
      >
        <IconButton
          onClick={() => handleUpdateDevices.mutate()}
          disabled={handleUpdateDevices.isPending}
        >
          {handleUpdateDevices.isPending ? (
            <CircularProgress size={24} />
          ) : (
            <RotateLeftIcon
              sx={{
                transition: "transform 0.3s ease",
                "&:hover": { transform: "rotate(-180deg)" }, // xoay khi hover
                color: "primary.main",
              }}
            />
          )}
        </IconButton>
        <Box display="flex" alignItems="center" gap={2}>
          {[RoleEnum.ADMIN, RoleEnum.DISPATCHER].includes(user?.role) && (
            <FieldAutoCompleted
              title="Đơn vị"
              data={departments}
              labelkey="code"
              value={department}
              setValue={setDepartment}
              size="small"
              autocompleteSx={{ width: "200px" }}
            />
          )}
          <RealTimeClock />
        </Box>
      </Box>
      <TableContainer sx={{ maxHeight: 600, overflowY: "scroll" }}>
        <Table
          stickyHeader
          sx={{
            "& td, & th": { border: "1px solid #e0e0e0", padding: "0 4px" },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell
                colSpan={8}
                align="center"
                sx={{
                  bgcolor: "#d6e9f9",
                  fontWeight: "bold",
                  fontSize: 18,
                  // === THÊM THUỘC TÍNH DÍNH VÀ TOP: 0 ===
                  position: "sticky",
                  top: 0,
                  zIndex: 11, // Đảm bảo nó nằm trên các nội dung khác
                }}
              >
                THIẾT BỊ
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell
                align="center"
                sx={{
                  fontWeight: "bold",
                  width: "2%",
                  top: "26px",
                  zIndex: 10,
                  position: "sticky",
                }}
              >
                STT
              </TableCell>
              <TableCell
                align="center"
                sx={{
                  fontWeight: "bold",
                  width: "2%",
                  top: "26px",
                  zIndex: 10,
                  position: "sticky",
                }}
              >
                {" "}
              </TableCell>
              <TableCell
                align="center"
                sx={{
                  fontWeight: "bold",
                  width: "13%",
                  top: "26px",
                  zIndex: 10,
                  position: "sticky",
                }}
              >
                Đơn vị
              </TableCell>
              <TableCell
                align="center"
                sx={{
                  fontWeight: "bold",
                  width: "13%",
                  top: "26px",
                  zIndex: 10,
                  position: "sticky",
                }}
              >
                Thiết bị
              </TableCell>
              <TableCell
                align="center"
                sx={{
                  fontWeight: "bold",
                  width: "10%",
                  color: "green",
                  top: "26px",
                  zIndex: 10,
                  position: "sticky",
                }}
              >
                Chờ điều động
              </TableCell>
              <TableCell
                align="center"
                sx={{
                  fontWeight: "bold",
                  width: "10%",
                  color: "red",
                  top: "26px",
                  zIndex: 10,
                  position: "sticky",
                }}
              >
                Đang hoạt động
              </TableCell>
              <TableCell
                align="center"
                sx={{
                  fontWeight: "bold",
                  width: "10%",
                  color: "orange",
                  top: "26px",
                  zIndex: 10,
                  position: "sticky",
                }}
              >
                SC; BD
              </TableCell>
              <TableCell
                align="center"
                sx={{
                  fontWeight: "bold",
                  width: "10%",
                  top: "26px",
                  zIndex: 10,
                  position: "sticky",
                }}
              >
                Niêm cất
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoadingDeviceCount ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : (
              deviceCount
                .filter((i: any) => !filter.includes(i?.departmentName))
                .map((group: any, groupIndex: number) => {
                  const totalStatus = group.deviceTypes.reduce(
                    (acc: any, deviceType: any) => {
                      acc.maintenance +=
                        deviceType.statusCounts.maintenance || 0;
                      acc.in_use += deviceType.statusCounts.in_use || 0;
                      acc.available += deviceType.statusCounts.available || 0;
                      acc.retired += deviceType.statusCounts.retired || 0;
                      return acc;
                    },
                    { maintenance: 0, in_use: 0, available: 0, retired: 0 },
                  );
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
                          <TableCell
                            rowSpan={span}
                            align="center"
                            sx={{ border: "1px solid #e0e0e0" }}
                          >
                            {groupIndex + 1}
                          </TableCell>
                        )}
                        {index === 0 && (
                          <TableCell
                            rowSpan={span}
                            align="center"
                            sx={{ border: "1px solid #e0e0e0" }}
                          >
                            <BlinkButton
                              color={
                                totalStatus.maintenance > 0
                                  ? "orange"
                                  : totalStatus.in_use > 0
                                    ? "red"
                                    : totalStatus.available > 0
                                      ? "green"
                                      : "grey"
                              }
                            />
                          </TableCell>
                        )}
                        {index === 0 && (
                          <TableCell
                            rowSpan={span}
                            align="center"
                            sx={{ border: "1px solid #e0e0e0" }}
                          >
                            {group.departmentName}
                          </TableCell>
                        )}
                        <TableCell
                          align="center"
                          sx={{ border: "1px solid #e0e0e0" }}
                        >
                          {item.typeName}
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{
                            border: "1px solid #e0e0e0",
                            cursor: "pointer",
                          }}
                          onClick={(e) =>
                            handleDetailClick(
                              e,
                              StatusDeviceEnum.AVAILABLE,
                              group.departmentName,
                              item.typeName,
                            )
                          }
                        >
                          {item.statusCounts?.available > 0 ? (
                            <Deviceprocess
                              value={item.statusCounts?.available || 0}
                              total={total}
                              color="#4CAF50"
                            />
                          ) : (
                            item.statusCounts?.available
                          )}
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{
                            border: "1px solid #e0e0e0",
                            cursor: "pointer",
                          }}
                          onClick={(e) =>
                            handleDetailClick(
                              e,
                              StatusDeviceEnum.IN_USE,
                              group.departmentName,
                              item.typeName,
                            )
                          }
                        >
                          {item.statusCounts?.in_use > 0 ? (
                            <Deviceprocess
                              value={item.statusCounts?.in_use || 0}
                              total={total}
                              color="#F44336"
                            />
                          ) : (
                            item.statusCounts?.in_use
                          )}
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{
                            border: "1px solid #e0e0e0",
                            cursor: "pointer",
                          }}
                          onClick={(e) =>
                            handleDetailClick(
                              e,
                              StatusDeviceEnum.MAINTENANCE,
                              group.departmentName,
                              item.typeName,
                            )
                          }
                        >
                          {item.statusCounts?.maintenance > 0 ? (
                            <Deviceprocess
                              value={item.statusCounts?.maintenance || 0}
                              total={total}
                              color="#FF9800"
                            />
                          ) : (
                            item.statusCounts?.maintenance
                          )}
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{
                            border: "1px solid #e0e0e0",
                            cursor: "pointer",
                          }}
                          onClick={(e) =>
                            handleDetailClick(
                              e,
                              StatusDeviceEnum.RETIRED,
                              group.departmentName,
                              item.typeName,
                            )
                          }
                        >
                          {item.statusCounts?.retired > 0 ? (
                            <Deviceprocess
                              value={item.statusCounts?.retired || 0}
                              total={total}
                              color="#E0E0E0"
                            />
                          ) : (
                            item.statusCounts?.retired
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  });
                })
            )}
          </TableBody>
        </Table>
      </TableContainer>
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
            minWidth: 400,
            maxHeight: 400,
          },
        }}
      >
        <Box sx={{ p: 3 }}>
          <Box display={"flex"} gap={3}>
            <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>
              Danh sách thiết bị
            </Typography>
            <Typography>
              <strong>Đơn vị:</strong>
              {departmentPopup}
            </Typography>
            <Typography>
              <strong>Số lượng:</strong>
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
                  <TableCell colSpan={3} align="center">
                    Không có thiết bị nào
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      </Popover>
    </Paper>
  );
}
