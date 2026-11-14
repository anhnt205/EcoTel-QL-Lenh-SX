import React from "react";
import { FieldArray, FormikProvider, useFormik } from "formik";
import { Autocomplete, Box, Button, Grid, TextField } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../config/api.config";
import { Order, Job } from "../../types";
import { LocalizationProvider } from "@mui/x-date-pickers";
import DatePicker from "../../components/design/DatePicker";
import { AdapterDayjs } from "../../components/design/AdapterDayjs";
import dayjs from "dayjs";
import {
  showConfirmAlert,
  showErrorAlert,
  showSuccessAlert,
} from "../../components/Alert";
import { useAtom } from "jotai";
import { userAtom } from "../../atoms/userAtoms";
import { StyledPopper } from "../../ui/poppers";
import { dispatcherOrderValidationSchema } from "../../utils/validation";
import { JobTypeEnum, StatusOrderEnum } from "../../enums";

interface OrderFormProps {
  initialValues: any[];
  onCancel: () => void;
}

const DispatcherOrderFormTransfer: React.FC<OrderFormProps> = ({
  initialValues,
  onCancel,
}) => {
  const [user] = useAtom(userAtom);
  const queryClient = useQueryClient();
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.get("/users?type=order").then((res) => res.data.data),
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
      // showSuccessAlert('Cập nhật lệnh sản xuất thành công');
      onCancel();
    },
    onError: (error: any) => {
      showErrorAlert(error.response.data.message || error.message || "Lỗi");
    },
  });

  const formik = useFormik({
    initialValues: {
      usersAndDepartments: (initialValues || []).map((item) => ({
        _id: item?._id,
        assignedTo: item?.assignedTo?._id,
        department: item?.assignedTo?.department?.code,
      })),
      workingDate: initialValues[0].workingDate
        ? dayjs(initialValues[0].workingDate).startOf("day").toDate()
        : "",
      workContent: initialValues[0].workContent || "",
      status: initialValues[0].status,
      risk: initialValues[0].risk,
    },
    enableReinitialize: true, // Để cập nhật lại giá trị khi initialValues thay đổi
    validationSchema: dispatcherOrderValidationSchema,
    onSubmit: async (values) => {
      const orders: Partial<Order>[] = values.usersAndDepartments.map(
        (item) => ({
          assignedTo: item.assignedTo,
          job: jobs.find((i: Job) => i.name === JobTypeEnum.DISPATCHER)?._id,
          workingDate: dayjs
            .utc(dayjs(values.workingDate).format("YYYY-MM-DD"))
            .toDate(),
          workContent: values.workContent,
          status: StatusOrderEnum.PENDING,
          risk: values.risk,
          temporaryError: "",
          batchId: `${dayjs(new Date()).format("YYYY-MM-DD HH:mm")}_${user?.fullName}`,
        }),
      );
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
        await Promise.all(orders.map((order) => createMutation.mutate(order)));
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
        <FieldArray name="usersAndDepartments">
          {({ push, remove }) => (
            <>
              {formik.values.usersAndDepartments.map((item, index) => (
                <Grid
                  container
                  spacing={2}
                  key={index}
                  alignItems="center"
                  sx={{ mb: 2, mt: 2 }}
                >
                  <Grid item xs={5}>
                    <Autocomplete
                      fullWidth
                      options={users}
                      getOptionLabel={(option: any) =>
                        `${option.fullName || ""} - ${option.salaryCode || ""}`
                      }
                      value={
                        users.find((p: any) => p._id === item.assignedTo) ||
                        null
                      }
                      onChange={(event, newValue) => {
                        formik.setFieldValue(
                          `usersAndDepartments[${index}].assignedTo`,
                          newValue?._id || "",
                        );
                        formik.setFieldValue(
                          `usersAndDepartments[${index}].department`,
                          newValue?.department?.code || "",
                        );
                      }}
                      PopperComponent={StyledPopper}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Thẻ lương"
                          error={Boolean(
                            typeof formik.errors.usersAndDepartments?.[
                              index
                            ] === "object" &&
                              (
                                formik.errors.usersAndDepartments?.[
                                  index
                                ] as any
                              )?.assignedTo,
                          )}
                          helperText={
                            typeof formik.errors.usersAndDepartments?.[
                              index
                            ] === "object"
                              ? (
                                  formik.errors.usersAndDepartments?.[
                                    index
                                  ] as any
                                )?.assignedTo
                              : ""
                          }
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={5}>
                    <TextField
                      fullWidth
                      label="Đơn vị"
                      value={item.department ?? ""}
                      disabled
                    />
                  </Grid>

                  {index > 0 && (
                    <Grid item xs={2}>
                      <Button color="error" onClick={() => remove(index)}>
                        Xóa
                      </Button>
                    </Grid>
                  )}
                </Grid>
              ))}
              <Button
                variant="outlined"
                sx={{ mb: 2 }}
                onClick={() => push({ assignedTo: "", department: "" })}
              >
                + Thêm
              </Button>
            </>
          )}
        </FieldArray>
        <Grid container spacing={2}>
          <Grid item xs={12}>
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
        </Grid>
        <Box
          sx={{ mt: 3, display: "flex", justifyContent: "flex-end", gap: 2 }}
        >
          <Button variant="outlined" onClick={onCancel}>
            Hủy
          </Button>
          <Button type="submit" variant="contained">
            Cập nhật
          </Button>
        </Box>
      </Box>
    </FormikProvider>
  );
};

export default DispatcherOrderFormTransfer;
