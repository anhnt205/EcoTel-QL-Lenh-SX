import React, { useRef, useState } from "react";
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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../config/api.config";
import {
  Order,
  Device,
  Job,
  Location,
  Material,
  SafetyMeasure,
  Shift,
  Department,
} from "../../types";
import {
  DatePicker,
  DesktopTimePicker,
  LocalizationProvider,
} from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { showConfirmAlert, showSuccessAlert } from "../../components/Alert";
import { Add, ContentCopy, Delete } from "@mui/icons-material";
import { StyledPopper } from "../../ui/poppers";
import { addOrderValidationSchema } from "../../utils/validation";
import { JobTypeEnum } from "../../enums/index";
import { MultiSelectField } from "../../components/MultiSelectField";
import DepartmentService from "../../services/departmentService";
import { useOrderFormData } from "./hooks/useOrderFormData";
import FieldAutoCompleted from "../../components/field/FieldAutoCompleted";
import FieldInput from "../../components/field/FieldInput";
import FieldDate from "../../components/field/FieldDate";
import FieldTime from "../../components/field/FieldTime";
dayjs.extend(utc);

interface OrderFormProps {
  onSubmit: (values: Partial<Order>) => void;
  onCancel: () => void;
}

const OrderFormAdd: React.FC<OrderFormProps> = ({ onSubmit, onCancel }) => {
  const queryClient = useQueryClient();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobSafetyText, setJobSafetyText] = useState("");

  const safetyTextFieldRef = useRef<HTMLInputElement>(null);

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };
  const handleSelectSample = (content: string) => {
    const currentValue = formik.values.safetyMeasure || "";

    const newValue = currentValue ? `${currentValue}\n${content}` : content;

    formik.setFieldValue("safetyMeasure", newValue);
    setAnchorEl(null);
  };

  const {
    locations,
    users,
    shifts,
    devices,
    allDevices,
    excavators,
    departments,
    cars,
    materials,
    safetyMeasures,
    jobs,
  } = useOrderFormData();

  const updateSafetyMeasure = (jobText: string, userText: string) => {
    // Tách các biện pháp an toàn từ job và user thành mảng
    const jobMeasures = jobText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const userMeasures = userText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    // Gộp hai mảng và tạo một Set để có các giá trị duy nhất
    const allMeasures = new Set([...jobMeasures, ...userMeasures]);

    // Chuyển Set trở lại thành mảng và nối chuỗi
    const combinedText = Array.from(allMeasures).join("\n");

    formik.setFieldValue("safetyMeasure", combinedText);
  };

  const formik = useFormik({
    initialValues: {
      usersAndDevices: [
        {
          assignedTo: "",
          device: [],
          repairDepartment: undefined,
          repairVehicles: [
            {
              device: undefined,
              note: "",
            },
          ],
        },
      ],
      assignedVehicles: [],
      job: "",
      workingDate: new Date(),
      shift: "",
      shiftHour: "",
      excavator: [],
      location: undefined,
      material: undefined,
      workContent: "",
      note: "",
      safetyMeasure: "",
      safetyMeasureSpecific: "",
      risk: "",
    },
    validationSchema: addOrderValidationSchema,
    onSubmit: async (values) => {
      const orders: Partial<Order>[] = values.usersAndDevices.map((item) => ({
        assignedTo: item.assignedTo,
        device: item.device,
        repairDepartment: item.repairDepartment || undefined,
        assignedVehicles: values.assignedVehicles,
        repairVehicles: item.repairVehicles.filter(
          (i) => i.device && i.device != null && i.device !== "",
        ),
        job: values.job,
        workingDate: dayjs
          .utc(dayjs(values.workingDate).format("YYYY-MM-DD"))
          .toDate(),
        excavator: values.excavator,
        shift: values.shift,
        shiftHour: values.shiftHour,
        location: values.location,
        material: values.material,
        workContent: values.workContent,
        safetyMeasure: values.safetyMeasure,
        safetyMeasureSpecific: values.safetyMeasureSpecific,
        note: values.note,
        risk: values.risk,
      }));
      const duplicates = await Promise.all(
        orders.map((order) =>
          api
            .post(`/orders/checkExist`, {
              workingDate: order.workingDate,
              shift: order.shift,
              assignedTo: order.assignedTo,
            })
            .then((res) => res.data.data),
        ),
      );
      const existingOrders = duplicates.filter((order) => order !== null);
      if (existingOrders.length > 0) {
        const names = existingOrders
          .map((o) => {
            return o.assignedTo?.fullName || "Không rõ";
          })
          .join(", ");

        const result = await showConfirmAlert(
          `${names} đã có lệnh sản xuất trong ca này. Bạn có muốn tiếp tục?`,
        );
        if (!result.isConfirmed) return;
      }
      try {
        await Promise.all(orders.map((order) => onSubmit(order)));
        queryClient.invalidateQueries({ queryKey: ["orders"] });
        showSuccessAlert("Thêm lệnh sản xuất thành công");
      } catch (error) {
        console.error("Error submitting orders:", error);
      }
    },
  });

  return (
    <FormikProvider value={formik}>
      <Box component="form" onSubmit={formik.handleSubmit} sx={{ mt: 2 }}>
        <FieldAutoCompleted
          title="Công việc"
          name="job"
          data={jobs}
          labelkey="name"
          onChange={(newValue) => {
            // Tìm tất cả safetyMeasures liên quan đến job này
            const matchedMeasures = safetyMeasures.filter((sm: SafetyMeasure) =>
              (sm.job || []).some(
                (jobItem: any) => jobItem._id === newValue?._id,
              ),
            );
            const jobSafetyTexts = matchedMeasures
              .map((m: SafetyMeasure) => m.content)
              .join("\n");
            setJobSafetyText(jobSafetyTexts); // Lưu nội dung vào state riêng
            formik.setFieldValue("job", newValue?._id || "");
            setSelectedJob(newValue);

            // Reset fields when job changes
            formik.setFieldValue("excavator", []);
            formik.setFieldValue("assignedVehicles", []);
            formik.setFieldValue("location", undefined);
            formik.setFieldValue("material", undefined);
            const resetUsersAndDevices = formik.values.usersAndDevices.map(
              (item) => ({
                ...item,
                device: [],
                repairDepartment: undefined,
                repairVehicles: [{ device: undefined, note: "" }],
              }),
            );
            formik.setFieldValue("usersAndDevices", resetUsersAndDevices);

            updateSafetyMeasure(
              jobSafetyTexts,
              formik.values.usersAndDevices[0].assignedTo,
            );
          }}
        />
        {selectedJob && (
          <Box mt={2}>
            {selectedJob?.type === JobTypeEnum.VEHICLE && (
              <Box>
                <FieldAutoCompleted
                  title="Máy xúc"
                  data={excavators}
                  labelkey="code"
                  multiple
                  value={formik.values.excavator.map((e: any) => e.device)}
                  setValue={(deviceIds: string[]) => {
                    const mapped = deviceIds.map((id: string) => {
                      const old = formik.values.excavator.find(
                        (e: any) => e.device === id,
                      );
                      return {
                        device: id,
                        status: true,
                      };
                    });
                    formik.setFieldValue("excavator", mapped);
                  }}
                />
                <FieldArray name="excavator">
                  {({ remove, replace }) => (
                    <>
                      {formik.values.excavator.map(
                        (item: any, index: number) => (
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
                                excavators.find(
                                  (ex: any) => ex._id === item.device,
                                )?.code
                              }
                            </span>
                          </Box>
                        ),
                      )}
                    </>
                  )}
                </FieldArray>
              </Box>
            )}
            {selectedJob?.type === JobTypeEnum.EXCAVATOR && (
              <FieldAutoCompleted
                title="Thiết bị nhận tải"
                name="assignedVehicles"
                data={cars}
                labelkey="code"
                multiple
              />
            )}

            <FieldArray name="usersAndDevices">
              {({ push, remove }) => (
                <Stack spacing={2} sx={{ mt: 2, mb: 2 }}>
                  {formik.values.usersAndDevices.map((item, index) => {
                    const path = `usersAndDevices.${index}`;
                    const isMaintenance =
                      selectedJob?.type === JobTypeEnum.MAINTENANCE;

                    return (
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
                              Xóa thẻ lương
                            </Typography>
                          </IconButton>
                        )}
                        <Grid container spacing={2} alignItems="center">
                          {/* Thẻ lương */}
                          <Grid item xs={12} md={6}>
                            <FieldAutoCompleted
                              title="Thẻ lương"
                              data={users}
                              labelkey="fullName"
                              labelOption="salaryCode"
                              value={item.assignedTo}
                              setValue={(userId: string) => {
                                formik.setFieldValue(
                                  `${path}.assignedTo`,
                                  userId || "",
                                );

                                if (index === 0) {
                                  const newValue = users.find(
                                    (u: any) => u._id === userId,
                                  );
                                  if (newValue?.position) {
                                    const userPositionId =
                                      typeof newValue.position === "object"
                                        ? newValue.position._id
                                        : newValue.position;

                                    const matchedMeasures =
                                      safetyMeasures.filter(
                                        (sm: SafetyMeasure) => {
                                          const posIds = (
                                            sm.position || []
                                          ).map((p: any) =>
                                            typeof p === "string" ? p : p._id,
                                          );
                                          return posIds.includes(
                                            userPositionId,
                                          );
                                        },
                                      );

                                    const userSafetyTexts = matchedMeasures
                                      .map((m: SafetyMeasure) => m.content)
                                      .join("\n");

                                    updateSafetyMeasure(
                                      jobSafetyText,
                                      userSafetyTexts,
                                    );
                                  }
                                }
                              }}
                            />
                          </Grid>

                          {/* Thiết bị (cho các job có thiết bị chính) */}
                          {[
                            JobTypeEnum.DOZER,
                            JobTypeEnum.DRILL,
                            JobTypeEnum.EXCAVATOR,
                            JobTypeEnum.PUMP,
                            JobTypeEnum.SERVICE_VEHICLE,
                            JobTypeEnum.SIEVE,
                            JobTypeEnum.VEHICLE,
                          ].includes(selectedJob?.type ?? "") && (
                            <Grid item xs={12} md={6}>
                              <FieldAutoCompleted
                                title="Thiết bị vận hành"
                                data={devices}
                                labelkey="code"
                                value={item.device?.[0]}
                                setValue={(deviceId: string) => {
                                  formik.setFieldValue(
                                    `${path}.device`,
                                    deviceId ? [deviceId] : [],
                                  );
                                }}
                              />
                            </Grid>
                          )}
                          {isMaintenance && (
                            <Grid item xs={12} md={6}>
                              <FieldAutoCompleted
                                title="Đơn vị sửa chữa"
                                data={departments.data}
                                labelkey="code"
                                name={`${path}.repairDepartment`}
                              />
                            </Grid>
                          )}
                        </Grid>

                        {/* BỌC NHỎ: repairVehicles */}
                        {isMaintenance && (
                          <Box sx={{ mt: 2 }}>
                            <FieldArray name={`${path}.repairVehicles`}>
                              {({ push: pushRepair, remove: removeRepair }) => (
                                <Stack spacing={1.5}>
                                  {(item.repairVehicles ?? []).map(
                                    (rv: any, rvIndex: number) => {
                                      const rvPath = `${path}.repairVehicles.${rvIndex}`;

                                      return (
                                        <Box
                                          sx={{
                                            position: "relative",
                                            border: 1,
                                            borderColor: "divider",
                                            borderRadius: 2,
                                            p: 2,
                                          }}
                                        >
                                          {rvIndex > 0 && (
                                            <IconButton
                                              onClick={() =>
                                                removeRepair(rvIndex)
                                              }
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
                                            spacing={1.5}
                                            alignItems="center"
                                          >
                                            <Grid item xs={12} md={6}>
                                              <FieldAutoCompleted
                                                title="Thiết bị sửa chữa"
                                                data={allDevices}
                                                labelkey="code"
                                                name={`${rvPath}.device`}
                                              />
                                            </Grid>

                                            <Grid item xs={12} md={6}>
                                              <FieldInput
                                                title="Tình trạng hư hỏng"
                                                multiline
                                                name={`${rvPath}.note`}
                                              />
                                            </Grid>
                                          </Grid>
                                        </Box>
                                      );
                                    },
                                  )}

                                  {/* Nút thêm bọc nhỏ */}
                                  <Box>
                                    <Button
                                      variant="outlined"
                                      startIcon={<Add />}
                                      onClick={() =>
                                        pushRepair({
                                          device: undefined,
                                          note: "",
                                        })
                                      }
                                    >
                                      Thêm thiết bị sửa chữa
                                    </Button>
                                  </Box>
                                </Stack>
                              )}
                            </FieldArray>
                          </Box>
                        )}
                      </Box>
                    );
                  })}

                  {/* Nút thêm bọc to */}
                  <Box>
                    <Button
                      variant="outlined"
                      startIcon={<Add />}
                      onClick={() =>
                        push({
                          assignedTo: "",
                          device: [],
                          repairVehicles: [{ device: undefined, note: "" }],
                        })
                      }
                    >
                      Thêm thẻ lương
                    </Button>
                  </Box>
                </Stack>
              )}
            </FieldArray>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FieldDate title="Ngày làm việc" name="workingDate" />
              </Grid>
              <Grid item xs={6} sm={3}>
                <FieldAutoCompleted
                  title="Ca làm việc"
                  data={shifts}
                  labelkey="name"
                  name="shift"
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
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <FieldTime title="Giờ ca" name="shiftHour" />
              </Grid>
              {[JobTypeEnum.SIEVE, JobTypeEnum.VEHICLE].includes(
                selectedJob?.type ?? "",
              ) && (
                <Grid item xs={12} sm={6}>
                  <FieldAutoCompleted
                    title="Điểm đổ"
                    name="location"
                    data={locations}
                    labelkey="name"
                  />
                </Grid>
              )}

              {[JobTypeEnum.VEHICLE].includes(selectedJob?.type) && (
                <Grid item xs={12} sm={6}>
                  <FieldAutoCompleted
                    title="Vật liệu"
                    name="material"
                    data={materials}
                    labelkey="name"
                  />
                </Grid>
              )}
              <Grid item xs={12}>
                <FieldInput
                  name="workContent"
                  title="Nội dung công việc"
                  multiline
                  rows={5}
                />
              </Grid>
              <Grid item xs={12}>
                <FieldInput
                  name="note"
                  title="Nội dung bàn giao của ca trước"
                  multiline
                  rows={5}
                />
              </Grid>
              <Grid item xs={12}>
                <FieldInput
                  name="risk"
                  title="Dự báo nguy cơ"
                  multiline
                  rows={5}
                />
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <FieldInput
                    name="safetyMeasure"
                    title="Biện pháp an toàn chung"
                    multiline
                    rows={5}
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
                <FieldInput
                  name="safetyMeasureSpecific"
                  title="Biện pháp an toàn cụ thể"
                  multiline
                  rows={5}
                />
              </Grid>
            </Grid>
          </Box>
        )}

        <Box
          sx={{ mt: 3, display: "flex", justifyContent: "flex-end", gap: 2 }}
        >
          <Button variant="outlined" onClick={onCancel}>
            Hủy
          </Button>
          <Button type="submit" variant="contained">
            Thêm mới
          </Button>
        </Box>
      </Box>
    </FormikProvider>
  );
};

export default OrderFormAdd;
