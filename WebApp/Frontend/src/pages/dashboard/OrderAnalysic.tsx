import {
  Grid,
  Box,
  Paper,
  TableContainer,
  Table,
  TableRow,
  TableHead,
  TableCell,
  TableBody,
  TextField,
  Autocomplete,
  IconButton,
  CircularProgress,
  AlertColor,
} from "@mui/material";
import { useState } from "react";
import PieChartOrder from "../../components/PieChartOrder";
import { useQuery } from "@tanstack/react-query";
import { RotateLeft as RotateLeftIcon } from "@mui/icons-material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import dayjs, { Dayjs } from "dayjs";
import api from "../../config/api.config";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { useAtom } from "jotai";
import { userAtom } from "../../atoms/userAtoms";
import { AlertSnackbar } from "../../components/Alert";
import { RoleEnum, StatusOrderEnum } from "../../enums";
import FieldAutoCompleted from "../../components/field/FieldAutoCompleted";
import FieldDate from "../../components/field/FieldDate";

export default function OrderAnalysic({ departments }: { departments: any[] }) {
  const [user] = useAtom(userAtom);
  const [department, setDepartment] = useState("");
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));

  const orderStatus = [
    { key: StatusOrderEnum.PENDING, name: "Chưa nhận lệnh", color: "black" },
    { key: StatusOrderEnum.INPROGRESS, name: "Đã nhận lệnh", color: "green" },
    { key: StatusOrderEnum.WARNING, name: "Lỗi", color: "orange" },
    { key: StatusOrderEnum.COMPLETED, name: "Đã hoàn thành", color: "red" },
    { key: StatusOrderEnum.CANCEL, name: "Đã hủy", color: "purple" },
  ];

  const [alert, setAlert] = useState<{
    open: boolean;
    message: string;
    severity?: AlertColor;
  }>({
    open: false,
    message: "",
    severity: "success",
  });
  const {
    data: orderCount = {
      pending: { ca1: 0, ca2: 0, ca3: 0, day: 0, month: 0 },
      in_progress: { ca1: 0, ca2: 0, ca3: 0, day: 0, month: 0 },
      warning: { ca1: 0, ca2: 0, ca3: 0, day: 0, month: 0 },
      completed: { ca1: 0, ca2: 0, ca3: 0, day: 0, month: 0 },
      cancel: { ca1: 0, ca2: 0, ca3: 0, day: 0, month: 0 },
    },
    refetch: refetchOrderCount,
    isLoading: isLoadingOrderCount,
  } = useQuery({
    queryKey: ["orderCount", department, date],
    queryFn: () =>
      api
        .get("/orders/count_status", {
          params: {
            date: date ? date : "",
            department,
          },
        })
        .then((res) => res.data.data),
  });

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2 }}>
      <AlertSnackbar alert={alert} setAlert={setAlert} />
      <Grid container spacing={2}>
        <Grid item xs={12} lg={7}>
          <TableContainer sx={{ maxHeight: 300 }}>
            <Table
              stickyHeader
              sx={{
                "& td, & th": { border: "1px solid #e0e0e0", padding: "8px" },
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell
                    colSpan={7}
                    align="center"
                    sx={{
                      bgcolor: "#dcf1d8",
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
                      onClick={async () => {
                        try {
                          await refetchOrderCount(); // đợi xong refetch
                          setAlert({
                            open: true,
                            message: "Cập nhật thành công",
                            severity: "success",
                          });
                        } catch (e) {
                          setAlert({
                            open: true,
                            message: "Cập nhật thất bại",
                            severity: "error",
                          });
                        }
                      }}
                      disabled={isLoadingOrderCount}
                    >
                      {isLoadingOrderCount ? (
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
                    LỆNH SẢN XUẤT
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell
                    align="center"
                    sx={{ fontWeight: "bold", fontSize: 18, width: "24%" }}
                  >
                    Lệnh sản xuất
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{ fontWeight: "bold", fontSize: 18, width: "12%" }}
                  >
                    Ca 1
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{ fontWeight: "bold", fontSize: 18, width: "12%" }}
                  >
                    Ca 2
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{ fontWeight: "bold", fontSize: 18, width: "12%" }}
                  >
                    Ca 3
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{ fontWeight: "bold", fontSize: 18, width: "12%" }}
                  >
                    Ngày
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orderStatus.map((item, index) => (
                  <TableRow
                    key={item.key}
                    sx={{ "&:nth-of-type(odd)": { bgcolor: "#f9f9f9" } }}
                  >
                    <TableCell sx={{ color: item.color, fontWeight: "bold" }}>
                      {item.name}
                    </TableCell>
                    <TableCell align="center">
                      {orderCount[item.key]?.ca1 ?? 0}
                    </TableCell>
                    <TableCell align="center">
                      {orderCount[item.key]?.ca2 ?? 0}
                    </TableCell>
                    <TableCell align="center">
                      {orderCount[item.key]?.ca3 ?? 0}
                    </TableCell>
                    <TableCell align="center">
                      {orderCount[item.key]?.day ?? 0}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
        <Grid item xs={12} lg={5} sx={{ maxHeight: 300 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              mb: 2,
              p: 2,
            }}
          >
            <Box sx={{ display: "flex", gap: 2 }}>
              {user?.role === RoleEnum.ADMIN && (
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
          <PieChartOrder data={orderCount} />
        </Grid>
      </Grid>
    </Paper>
  );
}
