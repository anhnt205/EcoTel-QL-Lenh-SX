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
import { TravelLog } from "../../../types";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
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
import ImportErrorDialog from "../../../components/Modal/ImportErrorDialog";
import ExportTravelLogDialog from "../components/ExportTravelLogDialog";
import FieldDate from "../../../components/field/FieldDate";
import FieldAutoCompleted from "../../../components/field/FieldAutoCompleted";
import FieldInput from "../../../components/field/FieldInput";
import { Table, TableColumnsType } from "antd";

interface props {
  type: AcceptedProductEnum;
}

const TravelLogTab: React.FC<props> = ({ type }) => {
  const [open, setOpen] = useState(false);
  const [startTime, setStartTime] = useState<Dayjs | null>(null);
  const [endTime, setEndTime] = useState<Dayjs | null>(null);
  const [selectedTravelLog, setSelectedTravelLog] = useState<any | null>(null);
  const [selectedTravelLogs, setSelectedTravelLogs] = useState<any[]>([]);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [user] = useAtom(userAtom);
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [travelLogs, setTravelLogs] = useState<any[]>([]);

  const columns: TableColumnsType<any> = [
    {
      title: "STT",
      dataIndex: "number",
      key: "number",
      align: "center",
      width: 50,
      render: (_: any, __: any, index: number) => page * pageSize + index + 1,
    },
    {
      title: "Máy xúc",
      dataIndex: "excavator",
      key: "excavator",
      render: (_: any, record: any) => record.excavator?.code,
    },
    {
      title: "Khu vực",
      dataIndex: "area",
      key: "area",
    },
    {
      title: "Tầng xúc",
      dataIndex: "excavationLevel",
      key: "excavationLevel",
    },
    {
      title: "Độ cao thực tế nơi đổ",
      dataIndex: "dumpHeightActual",
      key: "dumpHeightActual",
    },
    {
      title: "Toàn tuyến",
      children: [
        {
          title: "C.độ (km)",
          dataIndex: "fullDistanceKm",
          key: "fullDistanceKm",
          align: "center",
          width: 80,
        },
        {
          title: "Chiều cao N.tải(m)",
          dataIndex: "fullLiftHeightM",
          key: "fullLiftHeightM",
          align: "center",
          width: 80,
        },
      ],
    },
    {
      title: "Trong đó cục bộ",
      children: [
        {
          title: "H min",
          dataIndex: "localMinHeightM",
          key: "localMinHeightM",
          align: "center",
          width: 70,
        },
        {
          title: "H max",
          dataIndex: "localMaxHeightM",
          key: "localMaxHeightM",
          align: "center",
          width: 70,
        },
        {
          title: "C. độ (km)",
          dataIndex: "localDistanceKm",
          key: "localDistanceKm",
          align: "center",
          width: 80,
        },
        {
          title: "Chiều cao N.tải (m)",
          dataIndex: "localLiftHeightM",
          key: "localLiftHeightM",
          align: "center",
          width: 80,
        },
      ],
    },
    {
      title: "Điểm đổ tải",
      dataIndex: "location",
      key: "location",
      render: (_: any, record: any) => record.location?.name,
    },
    {
      title: "Ca",
      dataIndex: "shift",
      key: "shift",
      width: 50,
      align: "center",
      render: (_: any, record: any) => record.shift?.name,
    },
    {
      title: "Ngày",
      dataIndex: "workingDate",
      key: "workingDate",
      render: (_: any, record: any) =>
        record.workingDate
          ? dayjs(record.workingDate).format("DD-MM-YYYY")
          : "",
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

  const { data: excavators = [] } = useQuery({
    queryKey: ["excavators"],
    queryFn: () =>
      api.get("/devices/excavators/all").then((res) => res.data.data),
  });
  const { data: shifts = [] } = useQuery({
    queryKey: ["shifts"],
    queryFn: () => api.get("/shifts").then((res) => res.data.data),
  });
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
      setTravelLogs(data.items);
      setTotal(data.totalDocs);
    }
  }, [data]);

  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [importReport, setImportReport] = useState<{
    open: boolean;
    summary: any;
    invalidRows: any[];
  }>({
    open: false,
    summary: null,
    invalidRows: [],
  });

  const importFile = useMutation({
    mutationFn: (formData: FormData) =>
      TravelLogService.importFile(
        formData,
        setProgress,
        type,
      ),
    onMutate: () => {
      setIsUploading(true);
      setProgress(0);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["travellogs"] });
      setIsUploading(false);

      if (data.invalidRows && data.invalidRows.length > 0) {
        setImportReport({
          open: true,
          summary: data.summary,
          invalidRows: data.invalidRows,
        });
      } else {
        showSuccessAlert(
          `Import hoàn tất: Đã thêm ${data.summary.insertedCount}, cập nhật ${data.summary.updatedCount}`,
        );
        handleClose();
      }
    },
    onError: (error: any) => {
      setIsUploading(false);
      showErrorAlert(
        error.response?.data?.message || "Lỗi nghiêm trọng khi import",
      );
    },
  });

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
      acceptedProduct: type,
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
    <>
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
                    Thêm
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
                      Tải lên excel
                    </Button>
                  </label>
                  <Button
                    component="span"
                    variant="contained"
                    startIcon={<Download />}
                    onClick={() => setExportDialogOpen(true)}
                  >
                    Tải xuống
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
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                  >
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <FieldDate name="workingDate" title="Ngày làm việc" />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FieldAutoCompleted
                          title="Ca làm việc"
                          name="shift"
                          data={shifts}
                          labelkey="name"
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <FieldAutoCompleted
                          title="Máy xúc"
                          name="excavator"
                          data={excavators}
                          labelkey="code"
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <FieldInput name="area" title="Khu vực" />
                      </Grid>
                    </Grid>
                    <Grid container spacing={2}>
                      {/* --- Nhóm 1: Chọn địa điểm & vật liệu --- */}
                      <Grid item xs={12} sm={6} md={4}>
                        <FieldAutoCompleted
                          title="Điểm đổ"
                          name="location"
                          data={locations}
                          labelkey="name"
                        />
                      </Grid>

                      <Grid item xs={12} sm={6} md={4}>
                        <FieldInput name="excavationLevel" title="Tâng xúc" />
                      </Grid>

                      <Grid item xs={12} sm={6} md={4}>
                        <FieldInput
                          name="dumpHeightActual"
                          title="Độ cao thực tế điểm đổ"
                        />
                      </Grid>

                      {/* --- Nhóm 2: Thông số toàn tuyến --- */}
                      <Grid item xs={12}>
                        <Typography
                          variant="subtitle2"
                          sx={{ mt: 1, fontWeight: 600 }}
                        >
                          Thông số toàn tuyến
                        </Typography>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <FieldInput
                          type="number"
                          name="fullDistanceKm"
                          title="Cung độ (km)"
                        />
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <FieldInput
                          type="number"
                          name="fullLiftHeightM"
                          title="Chiều cao nâng tải (m)"
                        />
                      </Grid>

                      {/* --- Nhóm 3: Thông số cục bộ --- */}
                      <Grid item xs={12}>
                        <Typography
                          variant="subtitle2"
                          sx={{ mt: 1, fontWeight: 600 }}
                        >
                          Thông số cục bộ
                        </Typography>
                      </Grid>

                      <Grid item xs={12} sm={6} md={3}>
                        <FieldInput
                          type="number"
                          name="localMinHeightM"
                          title="Chiều cao tối thiểu (m)"
                        />
                      </Grid>

                      <Grid item xs={12} sm={6} md={3}>
                        <FieldInput
                          type="number"
                          name="localMaxHeightM"
                          title="Chiều cao tối đa (m)"
                        />
                      </Grid>

                      <Grid item xs={12} sm={6} md={3}>
                        <FieldInput
                          type="number"
                          name="localDistanceKm"
                          title="Cung độ (km)"
                        />
                      </Grid>

                      <Grid item xs={12} sm={6} md={3}>
                        <FieldInput
                          type="number"
                          name="localLiftHeightM"
                          title="Chiều cao nâng tải (m)"
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
              pageSizeOptions: [10, 20, 50, 100],
              onChange: (newPage, newPageSize) => {
                setPage(newPage - 1);
                setPageSize(newPageSize);
              },
              showTotal: (total) => `Tổng ${total} bản ghi`,
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
      <ImportErrorDialog
        open={importReport.open}
        onClose={() => {
          setImportReport((prev) => ({ ...prev, open: false }));
          handleClose();
        }}
        summary={importReport.summary}
        errors={importReport.invalidRows}
      />
      <ExportTravelLogDialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        type={type}
        shifts={shifts}
      />
    </>
  );
};

export default TravelLogTab;
