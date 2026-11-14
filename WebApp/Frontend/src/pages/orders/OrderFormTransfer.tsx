import React, { useEffect, useRef, useState } from "react";
import { FieldArray, FormikProvider, useFormik } from "formik";
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Grid,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../config/api.config";
import {
  Order,
  Device,
  Job,
  Location,
  Material,
  SafetyMeasure,
  Shift,
} from "../../types";
import DatePicker from "../../components/design/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "../../components/design/AdapterDayjs";
import dayjs from "dayjs";
import "dayjs/locale/en-gb";
import utc from "dayjs/plugin/utc";
import {
  showConfirmAlert,
  showErrorAlert,
  showSuccessAlert,
} from "../../components/Alert";
import { DesktopTimePicker } from "@mui/x-date-pickers";
import { Add, ContentCopy, Delete } from "@mui/icons-material";
import { StyledPopper } from "../../ui/poppers";
import { editAndTransferOrderValidationSchema } from "../../utils/validation";
import { JobTypeEnum, StatusOrderEnum } from "../../enums/index";
import DepartmentService from "../../services/departmentService";
import { AutocompleteSelect } from "../../components/AutocompleteSelect";
dayjs.extend(utc);

interface OrderFormProps {
  initialValues: any;
  onCancel: () => void;
}

const OrderFormTransfer: React.FC<OrderFormProps> = ({
  initialValues,
  onCancel,
}) => {
  const queryClient = useQueryClient();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  useEffect(() => {
    setSelectedJob(initialValues?.job || null);
  }, [initialValues]);
  const safetyTextFieldRef = useRef<HTMLInputElement>(null);

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };
  const handleSelectSample = (content: string) => {
    const currentValue = formik.values.safetyMeasure || "";

    // Nếu có sẵn nội dung thì thêm xuống dòng, còn nếu trống thì chỉ gán content
    const newValue = currentValue ? `${currentValue}\n${content}` : content;

    formik.setFieldValue("safetyMeasure", newValue);
    setAnchorEl(null);
  };
  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: () => api.get("/locations").then((res) => res.data.data),
  });
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.get("/users").then((res) => res.data.data),
  });
  const { data: shifts = [] } = useQuery({
    queryKey: ["shifts"],
    queryFn: () => api.get("/shifts").then((res) => res.data.data),
  });
  const { data: devices = [] } = useQuery({
    queryKey: ["devices"],
    queryFn: () => api.get("/devices").then((res) => res.data.data),
  });
  const { data: allDevices = [] } = useQuery({
    queryKey: ["allDevices"],
    queryFn: () => api.get("/devices/all").then((res) => res.data.data),
  });
  const { data: excavators = [] } = useQuery({
    queryKey: ["excavators"],
    queryFn: () =>
      api.get("/devices/excavators/all").then((res) => res.data.data),
  });
  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: DepartmentService.getAll,
  });
  const { data: cars = [] } = useQuery({
    queryKey: ["cars"],
    queryFn: () => api.get("/devices/car/all").then((res) => res.data.data),
  });
  const { data: materials = [] } = useQuery({
    queryKey: ["materials"],
    queryFn: () => api.get("/materials").then((res) => res.data.data),
  });

  const { data: safetyMeasures = [] } = useQuery({
    queryKey: ["safetyMeasures"],
    queryFn: () => api.get("/safetyMeasures").then((res) => res.data.data),
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => api.get("/jobs").then((res) => res.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (newOrder: Partial<Order>) =>
      api.post("/orders", newOrder).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      showSuccessAlert("Cập nhật lệnh sản xuất thành công");
      onCancel();
    },
    onError: (error: any) => {
      showErrorAlert(error.response.data.message || error.message || "Lỗi");
    },
  });

  const formik = useFormik({
    initialValues: {
      assignedTo:
        typeof initialValues?.assignedTo === "object"
          ? initialValues?.assignedTo?._id
          : initialValues?.assignedTo || "",
      device:
        Array.isArray(initialValues?.device) && initialValues.device.length > 0
          ? [
              typeof initialValues.device.at(-1) === "object"
                ? initialValues.device.at(-1)?._id
                : initialValues.device.at(-1),
            ]
          : [],
      repairDepartment:
        typeof initialValues?.repairDepartment === "object"
          ? initialValues?.repairDepartment?._id
          : initialValues?.repairDepartment || undefined,
      assignedVehicles: Array.isArray(initialValues.assignedVehicles)
        ? initialValues.assignedVehicles.map((d: any) =>
            typeof d === "object" ? d._id : d,
          )
        : initialValues.assignedVehicles
          ? [
              typeof initialValues.assignedVehicles === "object"
                ? initialValues.assignedVehicles._id
                : initialValues.assignedVehicles,
            ]
          : [],
      repairVehicles: (
        initialValues.repairVehicles || [{ device: undefined, note: "" }]
      ).map((d: any) => ({
        device:
          d.device !== null && typeof d.device === "object"
            ? d.device?._id
            : d._id,
        note: d.note || "",
      })),
      job:
        initialValues?.job !== null && typeof initialValues?.job === "object"
          ? initialValues?.job._id
          : initialValues?.job || "",
      workingDate: initialValues.workingDate
        ? dayjs(initialValues.workingDate).startOf("day").toDate()
        : "",
      shift:
        initialValues.shift !== null && typeof initialValues.shift === "object"
          ? initialValues.shift._id
          : initialValues.shift || "",
      shiftHour: initialValues.shiftHour || "",
      safetyMeasure: initialValues.safetyMeasure || "",
      safetyMeasureSpecific: initialValues.safetyMeasureSpecific || "",
      excavator: (initialValues.excavator || []).map((d: any) => ({
        device:
          d.device !== null && typeof d.device === "object"
            ? d.device?._id
            : d._id,
        status: d.status,
      })),
      location:
        Array.isArray(initialValues?.location) &&
        initialValues.location.length > 0
          ? [
              typeof initialValues.location.at(-1) === "object"
                ? initialValues.location.at(-1)?._id
                : initialValues.location.at(-1),
            ]
          : [],
      material:
        Array.isArray(initialValues?.material) &&
        initialValues.material.length > 0
          ? [
              typeof initialValues.material.at(-1) === "object"
                ? initialValues.material.at(-1)?._id
                : initialValues.material.at(-1),
            ]
          : [],
      workContent: initialValues?.workContent || "",
      status: initialValues?.status,
      note: initialValues?.shiftReport?.handoverNotes || "",
      previous_order_id: initialValues?._id,
      risk: initialValues?.risk,
    },
    enableReinitialize: true, // Để cập nhật lại giá trị khi initialValues thay đổi
    validationSchema: editAndTransferOrderValidationSchema,
    onSubmit: async (values) => {
      const order: Partial<Order> = {
        assignedTo: values.assignedTo,
        device: values.device,
        assignedVehicles: values.assignedVehicles,
        repairDepartment: values.repairDepartment || undefined,
        repairVehicles: values.repairVehicles.filter(
          (i: any) => i.device && i.device != null && i.device !== "",
        ),
        job: values.job,
        workingDate: dayjs
          .utc(dayjs(values.workingDate).format("YYYY-MM-DD"))
          .toDate(),
        shift: values.shift,
        shiftHour: values.shiftHour,
        excavator: values.excavator,
        location: values.location,
        material: values.material,
        workContent: values.workContent,
        safetyMeasure: values.safetyMeasure,
        safetyMeasureSpecific: values.safetyMeasureSpecific,
        status: StatusOrderEnum.PENDING,
        note: values.note,
        previous_order_id: values.previous_order_id,
        risk: values.risk,
      };
      const duplicates = await api
        .post(`/orders/checkExist`, {
          workingDate: order.workingDate,
          shift: order.shift,
          assignedTo: order.assignedTo,
        })
        .then((res) => res.data.data);

      if (duplicates) {
        const name = duplicates.assignedTo?.fullName;

        const result = await showConfirmAlert(
          `${name} đã có lệnh sản xuất trong ca này. Bạn có muốn tiếp tục?`,
        );
        if (!result.isConfirmed) return;
      }

      createMutation.mutate(order);
    },
  });

  return (
    <FormikProvider value={formik}>
      <Box component="form" onSubmit={formik.handleSubmit} sx={{ mt: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Autocomplete
              fullWidth
              options={jobs}
              readOnly
              getOptionLabel={(option: Job) => option.name || ""}
              value={jobs.find((p: any) => p._id === formik.values.job) || null}
              onChange={(event, newValue) => {
                formik.setFieldValue("job", newValue?._id || "");
              }}
              PopperComponent={StyledPopper}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Công việc"
                  error={formik.touched.job && Boolean(formik.errors.job)}
                  helperText={
                    formik.touched.job && typeof formik.errors.job === "string"
                      ? formik.errors.job
                      : ""
                  }
                />
              )}
            />
          </Grid>
          {selectedJob?.type === JobTypeEnum.VEHICLE && (
            <Grid item xs={12}>
              <Autocomplete
                fullWidth
                multiple
                options={excavators}
                getOptionLabel={(option: Device) => option.code || ""}
                // Lấy value: lọc ra các object excavator hiện có
                value={excavators.filter((ex: any) =>
                  formik.values.excavator.some((e: any) => e.device === ex._id),
                )}
                onChange={(event, newValue) => {
                  const mapped = newValue.map((ex: any) => {
                    const old = formik.values.excavator.find(
                      (e: any) => e.device === ex._id,
                    );
                    return {
                      device: ex._id,
                      status: old.status || true,
                    };
                  });
                  formik.setFieldValue("excavator", mapped);
                }}
                PopperComponent={StyledPopper}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Máy xúc"
                    error={
                      formik.touched.excavator &&
                      Boolean(formik.errors.excavator)
                    }
                    helperText={
                      formik.touched.excavator &&
                      typeof formik.errors.excavator === "string"
                        ? formik.errors.excavator
                        : ""
                    }
                  />
                )}
              />
              <FieldArray name="excavator">
                {({ remove, replace }) => (
                  <>
                    {formik.values.excavator.map((item: any, index: number) => (
                      <Box
                        key={index}
                        display="flex"
                        alignItems="center"
                        gap={1}
                      >
                        <Checkbox
                          checked={item.status}
                          onChange={(e) =>
                            replace(index, {
                              ...item,
                              status: e.target.checked,
                            })
                          }
                        />
                        <span>
                          {
                            excavators.find((ex: any) => ex._id === item.device)
                              ?.code
                          }
                        </span>
                      </Box>
                    ))}
                  </>
                )}
              </FieldArray>
            </Grid>
          )}
          {selectedJob?.type === JobTypeEnum.EXCAVATOR && (
            <Grid item xs={12}>
              <Autocomplete
                fullWidth
                multiple
                options={cars}
                getOptionLabel={(option: Device) => option.code || ""}
                value={cars.filter((d: Device) =>
                  formik.values.assignedVehicles.includes(d._id),
                )}
                onChange={(event, newValue) => {
                  const selectedIds = newValue.map((item: any) => item._id);

                  formik.setFieldValue("assignedVehicles", selectedIds);
                }}
                PopperComponent={StyledPopper}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Thiết bị nhận tải"
                    error={
                      formik.touched.assignedVehicles &&
                      Boolean(formik.errors.assignedVehicles)
                    }
                    helperText={
                      formik.touched.assignedVehicles &&
                      typeof formik.errors.assignedVehicles === "string"
                        ? formik.errors.assignedVehicles
                        : ""
                    }
                  />
                )}
              />
            </Grid>
          )}
          <Grid item xs={6}>
            <Autocomplete
              fullWidth
              options={users}
              getOptionLabel={(option: any) =>
                `${option.salaryCode} - ${option.fullName || ""}`
              }
              value={
                users.find((p: any) => p._id === formik.values.assignedTo) ||
                null
              }
              onChange={(event, newValue) => {
                formik.setFieldValue(`assignedTo`, newValue?._id || "");
              }}
              PopperComponent={StyledPopper}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Thẻ lương"
                  error={
                    formik.touched.assignedTo &&
                    Boolean(formik.errors.assignedTo)
                  }
                  helperText={
                    formik.touched.assignedTo &&
                    typeof formik.errors.assignedTo === "string"
                      ? formik.errors.assignedTo
                      : ""
                  }
                />
              )}
            />
          </Grid>

          {selectedJob?.type &&
            [
              JobTypeEnum.DOZER,
              JobTypeEnum.DRILL,
              JobTypeEnum.EXCAVATOR,
              JobTypeEnum.PUMP,
              JobTypeEnum.SERVICE_VEHICLE,
              JobTypeEnum.SIEVE,
              JobTypeEnum.VEHICLE,
            ].includes(selectedJob?.type ?? "") && (
              <Grid item xs={6}>
                <Autocomplete
                  fullWidth
                  options={devices}
                  getOptionLabel={(option: any) => option?.code || ""}
                  value={
                    devices.find(
                      (d: any) => d._id === formik.values.device[0],
                    ) || null
                  }
                  onChange={(event, newValue) => {
                    formik.setFieldValue(
                      "device",
                      newValue ? [newValue._id] : [],
                    );
                  }}
                  PopperComponent={StyledPopper}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Thiết bị"
                      error={
                        formik.touched.device && Boolean(formik.errors.device)
                      }
                      helperText={
                        formik.touched.device &&
                        typeof formik.errors.device === "string"
                          ? formik.errors.device
                          : ""
                      }
                    />
                  )}
                />
              </Grid>
            )}

          {selectedJob?.type === JobTypeEnum.MAINTENANCE && (
            <Grid item xs={6}>
              <AutocompleteSelect
                title="Đơn vị sửa chữa"
                fieldName="repairDepartment"
                options={departments}
                formik={formik}
                initData={initialValues}
                labelKey="code"
              />
            </Grid>
          )}

          {selectedJob?.type === JobTypeEnum.MAINTENANCE && (
            <Grid item xs={12}>
              <FieldArray name="repairVehicles">
                {({ push, remove }) => (
                  <Stack spacing={2}>
                    {formik.values.repairVehicles.map(
                      (item: any, index: number) => (
                        <Box
                          sx={{
                            position: "relative",
                            border: 1,
                            borderColor: "divider",
                            borderRadius: 2,
                            p: 2,
                          }}
                        >
                          {index > 0 && (
                            <IconButton
                              onClick={() => remove(index)}
                              color="error"
                              sx={{
                                position: "absolute",
                                top: -16, // nổi lên trên viền 1 chút
                                left: 12,
                                bgcolor: "background.paper",
                              }}
                            >
                              <Delete fontSize="small" />
                              <Typography
                                variant="caption"
                                sx={{ userSelect: "none" }}
                              >
                                Xóa thiết bị sửa chữa
                              </Typography>
                            </IconButton>
                          )}
                          <Grid
                            container
                            spacing={2}
                            key={index}
                            alignItems="center"
                            sx={{ mb: 2 }}
                          >
                            {/* Cột 1: Autocomplete */}
                            <Grid item xs={5}>
                              <Autocomplete
                                fullWidth
                                options={allDevices}
                                getOptionLabel={(option: any) =>
                                  option.code || ""
                                }
                                value={
                                  allDevices.find(
                                    (p: any) => p._id === item.device,
                                  ) || null
                                }
                                onChange={(event, newValue) => {
                                  formik.setFieldValue(
                                    `repairVehicles[${index}].device`,
                                    newValue?._id || "",
                                  );
                                }}
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    label="Thiết bị sửa chữa"
                                  />
                                )}
                              />
                            </Grid>

                            {/* Cột 2: Note */}
                            <Grid item xs={7}>
                              <TextField
                                fullWidth
                                label="Tình trạng hư hỏng"
                                multiline
                                rows={2}
                                value={item.note ?? ""}
                                onChange={(e) =>
                                  formik.setFieldValue(
                                    `repairVehicles[${index}].note`,
                                    e.target.value,
                                  )
                                }
                              />
                            </Grid>
                          </Grid>
                        </Box>
                      ),
                    )}

                    <Box>
                      <Button
                        variant="outlined"
                        startIcon={<Add />}
                        onClick={() => push({ device: undefined, note: "" })}
                      >
                        Thêm thiết bị sửa chữa
                      </Button>
                    </Box>
                  </Stack>
                )}
              </FieldArray>
            </Grid>
          )}

          <Grid item xs={12} sm={6}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Ngày làm việc"
                inputFormat="DD/MM/YYYY" // v5 vẫn hỗ trợ
                value={
                  formik.values.workingDate
                    ? dayjs(formik.values.workingDate)
                    : null
                }
                onChange={(value) => {
                  formik.setFieldValue("workingDate", value ? value : "");
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    error={
                      formik.touched.workingDate &&
                      Boolean(formik.errors.workingDate)
                    }
                    helperText={
                      formik.touched.workingDate &&
                      typeof formik.errors.workingDate === "string"
                        ? formik.errors.workingDate
                        : ""
                    }
                  />
                )}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={6} sm={3}>
            <TextField
              fullWidth
              select
              id="shift"
              name="shift"
              label="Ca làm việc"
              value={formik.values.shift}
              onChange={(e) => {
                formik.handleChange(e);
                // Tìm ca vừa chọn
                const selectedShift = shifts.find(
                  (shift: Shift) => shift._id === e.target.value,
                );
                // Nếu có ca, set giờ ca theo startTime
                if (selectedShift && selectedShift.startTime) {
                  // startTime có thể là chuỗi "HH:mm"
                  formik.setFieldValue(
                    "shiftHour",
                    dayjs(selectedShift.startTime, "HH:mm").format("HH:mm"),
                  );
                } else {
                  formik.setFieldValue("shiftHour", "");
                }
              }}
              error={formik.touched.shift && Boolean(formik.errors.shift)}
              helperText={
                formik.touched.shift && typeof formik.errors.shift === "string"
                  ? formik.errors.shift
                  : ""
              }
            >
              {shifts.map((shift: Shift) => (
                <MenuItem key={shift._id} value={shift._id}>
                  Ca {shift.name} ({shift.startTime})
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={6} sm={3}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DesktopTimePicker
                label="Giờ ca"
                ampm={false}
                inputFormat="HH:mm" // v5 vẫn hỗ trợ
                value={
                  formik.values.shiftHour
                    ? dayjs(formik.values.shiftHour, "HH:mm")
                    : null
                }
                onChange={(value) => {
                  formik.setFieldValue(
                    "shiftHour",
                    value ? value?.format("HH:mm") : "",
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    error={
                      formik.touched.shiftHour &&
                      Boolean(formik.errors.shiftHour)
                    }
                    helperText={
                      formik.touched.shiftHour &&
                      typeof formik.errors.shiftHour === "string"
                        ? formik.errors.shiftHour
                        : ""
                    }
                  />
                )}
              />
            </LocalizationProvider>
          </Grid>
          {selectedJob?.type &&
            [JobTypeEnum.SIEVE, JobTypeEnum.VEHICLE].includes(
              selectedJob?.type ?? "",
            ) && (
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  fullWidth
                  options={locations}
                  getOptionLabel={(option: Location) => option.name || ""}
                  value={
                    locations.find(
                      (p: any) => p._id === formik.values.location[0],
                    ) || null
                  }
                  onChange={(event, newValue) => {
                    formik.setFieldValue(
                      "location",
                      newValue ? [newValue._id] : [],
                    );
                  }}
                  PopperComponent={StyledPopper}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Điểm đổ"
                      error={
                        formik.touched.location &&
                        Boolean(formik.errors.location)
                      }
                      helperText={
                        formik.touched.location &&
                        typeof formik.errors.location === "string"
                          ? formik.errors.location
                          : ""
                      }
                    />
                  )}
                />
              </Grid>
            )}

          {selectedJob?.type === JobTypeEnum.VEHICLE && (
            <Grid item xs={12} sm={6}>
              <Autocomplete
                fullWidth
                options={materials}
                getOptionLabel={(option: Material) => option.name || ""}
                value={
                  materials.find(
                    (p: any) => p._id === formik.values.material[0],
                  ) || null
                }
                onChange={(event, newValue) => {
                  formik.setFieldValue(
                    "material",
                    newValue ? [newValue._id] : [],
                  );
                }}
                PopperComponent={StyledPopper}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Vật liệu"
                    error={
                      formik.touched.material && Boolean(formik.errors.material)
                    }
                    helperText={
                      formik.touched.material &&
                      typeof formik.errors.material === "string"
                        ? formik.errors.material
                        : ""
                    }
                  />
                )}
              />
            </Grid>
          )}
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={5}
              id="workContent"
              name="workContent"
              label="Nội dung công việc"
              value={formik.values.workContent}
              onChange={formik.handleChange}
              error={
                formik.touched.workContent && Boolean(formik.errors.workContent)
              }
              helperText={
                formik.touched.workContent &&
                typeof formik.errors.workContent === "string"
                  ? formik.errors.workContent
                  : ""
              }
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={5}
              id="note"
              name="note"
              label="Nội dung bàn giao của ca trước"
              value={formik.values.note}
              onChange={formik.handleChange}
              error={formik.touched.note && Boolean(formik.errors.note)}
              helperText={
                formik.touched.note && typeof formik.errors.note === "string"
                  ? formik.errors.note
                  : ""
              }
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={5}
              id="risk"
              name="risk"
              label="Dự báo nguy cơ"
              value={formik.values.risk}
              onChange={formik.handleChange}
              error={formik.touched.risk && Boolean(formik.errors.risk)}
              helperText={
                formik.touched.risk && typeof formik.errors.risk === "string"
                  ? formik.errors.risk
                  : ""
              }
            />
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <TextField
                fullWidth
                multiline
                rows={5}
                id="safetyMeasure"
                name="safetyMeasure"
                label="Biện pháp an toàn chung"
                value={formik.values.safetyMeasure}
                onChange={formik.handleChange}
                error={
                  formik.touched.safetyMeasure &&
                  Boolean(formik.errors.safetyMeasure)
                }
                helperText={
                  formik.touched.safetyMeasure &&
                  typeof formik.errors.safetyMeasure === "string"
                    ? formik.errors.safetyMeasure
                    : ""
                }
                inputRef={safetyTextFieldRef}
                InputProps={{
                  endAdornment: (
                    <IconButton
                      onClick={(e) => {
                        setAnchorEl(safetyTextFieldRef.current);
                      }}
                      title="Chọn mẫu"
                    >
                      <ContentCopy />
                    </IconButton>
                  ),
                }}
              />
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleCloseMenu}
                PaperProps={{
                  sx: {
                    width: safetyTextFieldRef.current
                      ? safetyTextFieldRef.current.offsetWidth
                      : 400,
                    maxWidth: "100%",
                    maxHeight: 300,
                  },
                }}
              >
                {safetyMeasures.map((item: SafetyMeasure) => (
                  <MenuItem
                    key={item._id}
                    onClick={() => handleSelectSample(item.content)}
                    sx={{
                      whiteSpace: "pre-line",
                      minHeight: 48,
                    }}
                  >
                    {item.name}
                  </MenuItem>
                ))}
              </Menu>
            </Box>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={5}
              id="safetyMeasureSpecific"
              name="safetyMeasureSpecific"
              label="Biện pháp an toàn cụ thể"
              value={formik.values.safetyMeasureSpecific}
              onChange={formik.handleChange}
              error={
                formik.touched.safetyMeasureSpecific &&
                Boolean(formik.errors.safetyMeasureSpecific)
              }
              helperText={
                formik.touched.safetyMeasureSpecific &&
                typeof formik.errors.safetyMeasureSpecific === "string"
                  ? formik.errors.safetyMeasureSpecific
                  : ""
              }
            />
          </Grid>
        </Grid>

        <Box
          sx={{ mt: 3, display: "flex", justifyContent: "flex-end", gap: 2 }}
        >
          <Button variant="outlined" onClick={onCancel}>
            Hủy
          </Button>
          <Button type="submit" variant="contained">
            Chuyển ca
          </Button>
        </Box>
      </Box>
    </FormikProvider>
  );
};

export default OrderFormTransfer;
