import React, { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Typography,
  TextField,
  Autocomplete,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download,
  UploadFile,
} from "@mui/icons-material";
import { FormikProvider, useFormik } from "formik";
import api from "../../../config/api.config";
import { Device, Location, Material, Shift, TravelLog } from "../../../types";
import { LocalizationProvider } from "@mui/x-date-pickers";
import DatePicker from "../../../components/design/DatePicker";
import { AdapterDayjs } from "../../../components/design/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import {
  showConfirmAlert,
  showErrorAlert,
  showSuccessAlert,
} from "../../../components/Alert";
import { useAtom } from "jotai";
import { userAtom } from "../../../atoms/userAtoms";
import { trvelLogValidationSchema } from "../../../utils/validation";
import TravelLogService from "../../../services/travelLogService";
import { AcceptedProductEnum, RoleEnum } from "../../../enums";
import { getFormikFieldProps } from "../../../utils/helper";
import { StyledPopper } from "../../../ui/poppers";
import { parseAxiosError } from "../../../utils/handleApiError";
import CustomDataGrid from "../../../components/Table/CustomDataGrid";
import { Table, TableColumnsType, TableColumnType } from "antd";
import "dayjs/locale/vi";

interface props {
  type: string;
}

const Internals: React.FC<props> = ({ type }) => {
  const [open, setOpen] = useState(false);
  const [startTime, setStartTime] = useState<Dayjs | null>(null);
  const [endTime, setEndTime] = useState<Dayjs | null>(null);
  const [selectedTravelLog, setSelectedTravelLog] = useState<any | null>(null);
  const [selectedTravelLogs, setSelectedTravelLogs] = useState<any[]>([]);
  const [user] = useAtom(userAtom);
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(15);
  const [total, setTotal] = useState(0);
  const [travelLogs, setTravelLogs] = useState<any[]>([]);

  const columns: TableColumnsType<any> = [
    {
      title: "STT",
      dataIndex: "number",
      key: "number",
      align: "center",
      width: 50,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: "Khu vực",
      dataIndex: "excavator",
      key: "excavator",
      render: (_: any, record: any) => record.excavator?.code,
    },
    {
      title: "Từ mức",
      dataIndex: "workingDate",
      key: "workingDate",
      render: (_: any, record: any) =>
        record.workingDate
          ? dayjs(record.workingDate).format("DD-MM-YYYY")
          : "",
    },
    {
      title: "Đến mức",
      dataIndex: "area",
      key: "area",
    },
    {
      title: "Cung độ (km)",
      dataIndex: "excavationLevel",
      key: "excavationLevel",
    },
    {
      title: "Chiều cao nâng tải (m)",
      align: "center",
      dataIndex: "dumpHeightActual",
      key: "dumpHeightActual",
    },
    {
      title: "Tuyến đường",
      dataIndex: "location",
      key: "location",
      render: (_: any, record: any) => record.location?.name,
    },
    {
      title: "Ghi chú",
      dataIndex: "note",
      key: "note",
    },
    {
      title: "TG bổ sung",
      dataIndex: "additionalTime",
      key: "additionalTime",
      align: "center",
      render: (_: any, record: any) => record.shift?.name,
    },
    {
      title: "Sửa",
      dataIndex: "edit",
      key: "edit",
      align: "center",
      width: 50,
      render: (_: any, record: any) => (
        <IconButton
          color="primary"
          // disabled={user?.role !== RoleEnum.ADMIN}
          onClick={async () => {
            // if (user?.role !== RoleEnum.ADMIN) return;

            if (open) {
              const result = await showConfirmAlert(
                "Bạn đang cập nhật một mục. Nếu tiếp tục chỉnh sửa, dữ liệu hiện tại sẽ bị ghi đè. Bạn có chắc chắn muốn tiếp tục?",
              );
              if (result.isConfirmed) {
                handleOpen(record);
              }
            } else {
              handleOpen(record);
            }
          }}
        >
          <EditIcon />
        </IconButton>
      ),
    },
  ];

  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: () => api.get("/locations").then((res) => res.data.data),
  });
  const { data, isLoading } = useQuery({
    queryKey: ["travellogs", page, pageSize, startTime, endTime, type],
    queryFn: () =>
      TravelLogService.getAll({
        page: page + 1,
        limit: pageSize,
        startTime: startTime ? startTime.toISOString() : "",
        endTime: endTime ? endTime.toISOString() : "",
        type: type,
      }),
  });
  useEffect(() => {
    if (data) {
      setTravelLogs(data.data);
      setTotal(data.totalDocs);
    }
  }, [data]);

  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const importFile = useMutation({
    mutationFn: (formData: FormData) =>
      TravelLogService.importFile(formData, setProgress),
    onMutate: () => {
      setIsUploading(true);
      setProgress(0); // Reset tiến trình khi bắt đầu
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["travellogs"] });
      setIsUploading(false);
      console.log(data);
      let combinedMessage = `Import dữ liệu hoàn tất. Đã xử lý ${data.summary.totalProcessed} bản ghi.`;
      combinedMessage += `\nĐã thêm mới: ${data.summary.insertedCount}`;
      combinedMessage += `\nĐã cập nhật: ${data.summary.updatedCount}`;

      // Thêm chi tiết lỗi nếu có
      if (data.invalidRows && data.invalidRows.length > 0) {
        combinedMessage += `\n\n--- CÓ LỖI XẢY RA TRONG QUÁ TRÌNH IMPORT ---`;
        combinedMessage += `\n${data.invalidRows.length} bản ghi không hợp lệ:`;

        // Liệt kê chi tiết một vài lỗi đầu tiên
        data.invalidRows.slice(0, 5).forEach((item: any, index: number) => {
          combinedMessage += `\n- Dòng ${index + 1}: Lỗi "${item.error}"`;
        });

        // Thông báo nếu còn nhiều lỗi hơn
        if (data.invalidRows.length > 5) {
          combinedMessage += `\n... và ${data.invalidRows.length - 5} lỗi khác.`;
        }
      }

      showSuccessAlert(combinedMessage);
      handleClose();
    },
    onError: (error: any) => {
      setIsUploading(false);
      showErrorAlert(error.response?.data?.message || "Lỗi khi import");
    },
  });
  // const exportExcel = useMutation({
  //     mutationFn: () => TravelLogService.exportFile(type),
  //     onSuccess: () => { },
  //     onError: async (error: any) => {
  //         const message = await parseAxiosError(error)
  //         showErrorAlert(message);
  //     }
  // });

  const createMutation = useMutation({
    mutationFn: TravelLogService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travellogs"] });
      showSuccessAlert("Thêm cung độ thành công");
      handleClose();
    },
    onError: (error: any) => {
      showErrorAlert(error.response.data.message || error.message || "Lỗi");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (updatedTravelLog: Partial<TravelLog>) =>
      api
        .put(`/travellogs/${updatedTravelLog._id}`, updatedTravelLog)
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travellogs"] });
      showSuccessAlert("Cập nhật cung độ thành công");
      handleClose();
    },
    onError: (error: any) => {
      showErrorAlert(error.response.data.message || error.message || "Lỗi");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) =>
      api
        .delete(`/travellogs`, { data: { ids } })
        .then((res) => res.data.message),
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: ["travellogs"] });
      setSelectedTravelLogs([]);
      showSuccessAlert(message || "Xóa thành công");
      handleClose();
    },
    onError: (error: any) => {
      showErrorAlert(error.response.data.message || error.message || "Lỗi");
    },
  });

  const formik = useFormik({
    initialValues: {
      excavator: undefined,
      workingDate: new Date(),
      shift: undefined,
      area: "",
      location: undefined,
      acceptedProduct: AcceptedProductEnum.LAND,
      excavationLevel: "",
      dumpHeightActual: "",
      fullDistanceKm: undefined as number | undefined,
      fullLiftHeightM: undefined as number | undefined,
      localMinHeightM: undefined as number | undefined,
      localMaxHeightM: undefined as number | undefined,
      localDistanceKm: undefined as number | undefined,
      localLiftHeightM: undefined as number | undefined,
    },
    // enableReinitialize: true,
    validationSchema: trvelLogValidationSchema,
    onSubmit: (values) => {
      const travellog: Partial<TravelLog> = {
        excavator: values.excavator,
        workingDate: dayjs
          .utc(dayjs(values.workingDate).format("YYYY-MM-DD"))
          .toDate(),
        shift: values.shift,
        area: values.area,
        location: values.location,
        acceptedProduct: values.acceptedProduct,
        excavationLevel: values.excavationLevel,
        dumpHeightActual: values.dumpHeightActual,
        fullDistanceKm: values.fullDistanceKm,
        fullLiftHeightM: values.fullLiftHeightM,
        localMinHeightM: values.localMinHeightM,
        localMaxHeightM: values.localMaxHeightM,
        localDistanceKm: values.localDistanceKm,
        localLiftHeightM: values.localLiftHeightM,
      };
      if (selectedTravelLog) {
        updateMutation.mutate({
          ...travellog,
          _id: selectedTravelLog._id,
        });
      } else {
        createMutation.mutate(travellog);
      }
    },
  });

  const handleOpen = (travellog?: any) => {
    if (travellog) {
      const value = {
        _id: travellog?._id,
        excavator:
          travellog.excavator !== null &&
          typeof travellog.excavator === "object"
            ? travellog.excavator._id
            : travellog.excavator || undefined,
        workingDate: travellog.workingDate
          ? dayjs(travellog.workingDate).startOf("day").toDate()
          : new Date(),
        shift:
          travellog.shift !== null && typeof travellog.shift === "object"
            ? travellog.shift._id
            : travellog.shift || undefined,
        area: travellog.area,
        location:
          travellog.location !== null && typeof travellog.location === "object"
            ? travellog.location._id
            : travellog.location || undefined,
        acceptedProduct: travellog.acceptedProduct,
        excavationLevel: travellog.excavationLevel,
        dumpHeightActual: travellog.dumpHeightActual,
        fullDistanceKm: travellog.fullDistanceKm,
        fullLiftHeightM: travellog.fullLiftHeightM,
        localMinHeightM: travellog.localMinHeightM,
        localMaxHeightM: travellog.localMaxHeightM,
        localDistanceKm: travellog.localDistanceKm,
        localLiftHeightM: travellog.localLiftHeightM,
      };
      setSelectedTravelLog(value);
      formik.setValues(value);
    } else {
      setSelectedTravelLog(null);
    }
    setExpanded(true);
    setOpen(true);
    setTimeout(() => {
      if (formRef.current) {
        formRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 500);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedTravelLog(null);
    setExpanded(false);
    formik.resetForm();
  };

  const handleDelete = () => {
    if (selectedTravelLogs.length === 0) {
      return showErrorAlert("Không tìm thấy bản ghi cần xóa");
    }
    showConfirmAlert("Bạn có muốn xóa?. Bạn sẽ không thể hoàn tác.").then(
      (result) => {
        if (result.isConfirmed) {
          deleteMutation.mutate(selectedTravelLogs.map((o) => o));
        }
      },
    );
  };

  return (
    <FormikProvider value={formik}>
      <Accordion expanded={expanded} ref={formRef}>
        <AccordionSummary
          expandIcon={<></>}
          aria-controls="panel1-content"
          id="panel1-header"
          sx={{
            backgroundColor: "white",
            "&.Mui-focusVisible": {
              backgroundColor: "white",
            },
          }}
        >
          <Box
            sx={{
              display: "flex",
              gap: 2,
              alignItems: "center",
              width: "100%",
              flexWrap: "wrap", // Tự động xuống dòng khi không đủ không gian
              flexDirection: {
                xs: "column", // Màn hình nhỏ: các items xếp dọc
                md: "row", // Màn hình lớn: các items xếp ngang
              },
              // Thêm các thuộc tính căn chỉnh để bố cục đẹp hơn
              justifyContent: {
                xs: "flex-start", // Màn hình nhỏ: căn trái
                md: "space-between", // Màn hình lớn: giãn đều các items
              },
            }}
          >
            {/* Nhóm các nút lại với nhau */}
            {user?.role === RoleEnum.ADMIN && (
              <Box
                sx={{
                  display: "flex",
                  gap: 1, // Khoảng cách nhỏ hơn giữa các nút
                  flexDirection: {
                    xs: "column",
                    md: "row",
                  },
                  width: {
                    xs: "100%", // Group này chiếm 100% khi xếp dọc
                    md: "auto",
                  },
                }}
              >
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpen()}
                >
                  Thêm mới
                </Button>
                <Button
                  variant="contained"
                  startIcon={<DeleteIcon />}
                  color="error"
                  onClick={handleDelete}
                >
                  Xóa
                </Button>
              </Box>
            )}

            {/* Nhóm các Autocomplete và DatePicker lại với nhau */}
            <Box
              sx={{
                display: "flex",
                flexGrow: 1, // Chiếm hết phần còn lại của không gian
                gap: 2,
                alignItems: "center",
                flexDirection: {
                  xs: "column",
                  md: "row",
                },
                width: {
                  xs: "100%", // Group này chiếm 100% khi xếp dọc
                  md: "auto",
                },
              }}
            >
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="Từ ngày"
                  inputFormat="DD/MM/YYYY"
                  value={startTime ? dayjs(startTime) : null}
                  onChange={(value) => setStartTime(value)}
                  renderInput={(params) => (
                    <TextField {...params} fullWidth size="small" />
                  )}
                />
              </LocalizationProvider>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="Đến ngày"
                  inputFormat="DD/MM/YYYY"
                  value={endTime ? dayjs(endTime) : null}
                  onChange={(value) => setEndTime(value)}
                  renderInput={(params) => (
                    <TextField {...params} fullWidth size="small" />
                  )}
                />
              </LocalizationProvider>
            </Box>
            {user?.role === RoleEnum.ADMIN && (
              <Box
                display="flex"
                gap={2}
                sx={{
                  display: "flex",
                  gap: 1, // Khoảng cách nhỏ hơn giữa các nút
                  flexDirection: {
                    xs: "column",
                    md: "row",
                  },
                  width: {
                    xs: "100%", // Group này chiếm 100% khi xếp dọc
                    md: "auto",
                  },
                }}
              >
                <input
                  id="upload-excel"
                  type="file"
                  accept=".xlsx, .xls"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const formData = new FormData();
                      formData.append("file", file);
                      importFile.mutate(formData);
                    }
                    e.target.value = "";
                  }}
                />

                <label htmlFor="upload-excel">
                  <Button
                    fullWidth
                    component="span"
                    variant="contained"
                    startIcon={<UploadFile />}
                  >
                    Tải lên (Excel)
                  </Button>
                </label>
                <Button
                  component="span"
                  variant="contained"
                  startIcon={<Download />}
                  // onClick={() => exportExcel.mutate()}
                >
                  Tải xuống (Excel)
                </Button>
              </Box>
            )}
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <AccordionDetails>
            <DialogTitle>
              {selectedTravelLog ? "Sửa cung độ" : "Thêm cung độ"}
            </DialogTitle>
            <DialogContent>
              <Box
                component="form"
                onSubmit={formik.handleSubmit}
                sx={{ mt: 2 }}
              >
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <LocalizationProvider
                        dateAdapter={AdapterDayjs}
                        adapterLocale="vi"
                      >
                        <DatePicker
                          label="Tháng"
                          inputFormat="MM/YYYY" // v5 vẫn hỗ trợ
                          views={["month", "year"]}
                          value={
                            formik.values.workingDate
                              ? dayjs(formik.values.workingDate)
                              : null
                          }
                          onChange={(value) => {
                            formik.setFieldValue(
                              "workingDate",
                              value ? value : "",
                            );
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              fullWidth
                              {...getFormikFieldProps(formik, "workingDate")}
                            />
                          )}
                        />
                      </LocalizationProvider>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Autocomplete
                        fullWidth
                        options={locations}
                        getOptionLabel={(option: Location) => option.name || ""}
                        value={
                          locations.find(
                            (p: any) => p._id === formik.values.location,
                          ) || null
                        }
                        onChange={(e, newValue) =>
                          formik.setFieldValue(`location`, newValue?._id || "")
                        }
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Khu vực"
                            {...getFormikFieldProps(formik, `location`)}
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        id="area"
                        name="area"
                        label="Từ mức"
                        value={formik.values.area ?? ""}
                        onChange={formik.handleChange}
                        {...getFormikFieldProps(formik, "area")}
                      />
                    </Grid>

                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        id="area"
                        name="area"
                        label="Đến mức"
                        value={formik.values.area ?? ""}
                        onChange={formik.handleChange}
                        {...getFormikFieldProps(formik, "area")}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Cung độ (km)"
                        name={`fullDistanceKm`}
                        value={formik.values.fullDistanceKm ?? ""}
                        onChange={formik.handleChange}
                        InputLabelProps={{ shrink: true }}
                        {...getFormikFieldProps(formik, `fullDistanceKm`)}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Chiều cao nâng tải (m)"
                        name={`fullLiftHeightM`}
                        value={formik.values.fullLiftHeightM?.toString() ?? ""}
                        onChange={formik.handleChange}
                        InputLabelProps={{ shrink: true }}
                        {...getFormikFieldProps(formik, `fullLiftHeightM`)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Autocomplete
                        fullWidth
                        options={locations}
                        getOptionLabel={(option: Location) => option.name || ""}
                        value={
                          locations.find(
                            (p: any) => p._id === formik.values.location,
                          ) || null
                        }
                        onChange={(e, newValue) =>
                          formik.setFieldValue(`location`, newValue?._id || "")
                        }
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Tuyến đường"
                            {...getFormikFieldProps(formik, `location`)}
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DatePicker
                          label="Thời gian bổ sung"
                          inputFormat="DD/MM/YYYY" // v5 vẫn hỗ trợ
                          value={
                            formik.values.workingDate
                              ? dayjs(formik.values.workingDate)
                              : null
                          }
                          onChange={(value) => {
                            formik.setFieldValue(
                              "workingDate",
                              value ? value : "",
                            );
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              fullWidth
                              {...getFormikFieldProps(formik, "workingDate")}
                            />
                          )}
                        />
                      </LocalizationProvider>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Ghi chú"
                        name={`localMaxHeightM`}
                        value={formik.values.localMaxHeightM ?? ""}
                        onChange={formik.handleChange}
                        InputLabelProps={{ shrink: true }}
                        {...getFormikFieldProps(formik, `localMaxHeightM`)}
                      />
                    </Grid>
                  </Grid>
                </Box>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose}>Hủy</Button>
              <Button onClick={() => formik.submitForm()} variant="contained">
                {selectedTravelLog ? "Sửa" : "Thêm mới"}
              </Button>
            </DialogActions>
          </AccordionDetails>
        </AccordionDetails>
      </Accordion>
      <Box display="flex" alignItems="center" sx={{ mb: 2, mt: 2 }}>
        <Typography variant="h4">Bảng cung độ</Typography>
        {/* <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
                        <Settings sx={{ fontSize: 30 }} />
                    </IconButton> */}
        {/* <Menu
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl)}
                        onClose={() => setAnchorEl(null)}
                        sx={{ maxHeight: 400 }}
                    >
                        {defaultColumns.map((col) => (
                            <MenuItem key={col.id} onClick={() => handleToggleColumn(col.id)}>
                                <Switch checked={visibleColumns.includes(col.id)} />
                                <ListItemText primary={col.label} />
                            </MenuItem>
                        ))}
                    </Menu> */}
      </Box>
      <Paper>
        <Table
          rowKey="_id"
          columns={columns}
          dataSource={travelLogs}
          scroll={{ y: "60vh" }}
          pagination={{
            current: page + 1, // vì backend bắt đầu từ 1
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            pageSizeOptions: [15, 20, 50, 100],
            onChange: (newPage, newPageSize) => {
              setPage(newPage - 1);
              setPageSize(newPageSize);
            },
            showTotal: (total, range) => `Hiển thị ${range[0]}–${range[1]} trong tổng ${total} bản ghi`,
              locale: { items_per_page: "dòng/trang" },
          }}
          rowClassName={(_, index) =>
            index % 2 === 0 ? "row-even" : "row-odd"
          }
          size="small"
          rowSelection={{
            type: "checkbox",
            selectedRowKeys: selectedTravelLogs,
            onChange: (keys) => setSelectedTravelLogs(keys),
          }}
          loading={isLoading}
        />
      </Paper>
    </FormikProvider>
  );
};

export default Internals;
