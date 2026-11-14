import React, { useEffect, useState } from 'react';
import { FieldArray, FormikProvider, useFormik } from 'formik';
import {
    Autocomplete,
    Box,
    Button,
    Grid,
    TextField,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../config/api.config';
import { Order, Job} from '../../types';
import { LocalizationProvider } from "@mui/x-date-pickers";
import DatePicker from "../../components/design/DatePicker";
import { AdapterDayjs } from "../../components/design/AdapterDayjs";
import dayjs from 'dayjs';
import { showErrorAlert, showSuccessAlert } from '../../components/Alert';
import { StyledPopper } from '../../ui/poppers';
import { dispatcherOrderValidationSchema } from '../../utils/validation';
import { JobTypeEnum, StatusOrderEnum } from '../../enums';


interface OrderFormProps {
    initialValues: any[];
    onSubmit: (values: Partial<Order>) => void;
    onCancel: () => void;
}

const DispatcherOrderFormEdit: React.FC<OrderFormProps> = ({
    initialValues,
    onSubmit,
    onCancel,
}) => {
    const queryClient = useQueryClient();
    const { data: users = [] } = useQuery({
        queryKey: ['users'],
        queryFn: () => api.get('/users?type=order').then(res => res.data.data),
    });
    const { data: jobs = [] } = useQuery({
        queryKey: ['jobs'],
        queryFn: () => api.get('/jobs').then(res => res.data.data),
    });
    const [initialOrderIds, setInitialOrderIds] = useState<string[]>([]);
    useEffect(() => {
        setInitialOrderIds(initialValues.map(item => item._id).filter(Boolean));
    }, [initialValues]);

    const createMutation = useMutation({
        mutationFn: (newOrder: Partial<Order>) =>
            api.post('/orders', newOrder).then(res => res.data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            // showSuccessAlert('Cập nhật lệnh sản xuất thành công');
            onCancel();
        },
        onError: (error: any) => {
            showErrorAlert(error.response.data.message || error.message || 'Lỗi')
        }
    });
    const updateMutation = useMutation({
        mutationFn: (updatedOrder: Partial<Order>) =>
            api.put(`/orders/${updatedOrder._id}`, updatedOrder).then(res => res.data),
    });
    const deleteMutation = useMutation({
        mutationFn: (ids: string[]) => api.delete(`/orders`, { data: { ids } }).then(res => res.data.message),
        onSuccess: (message) => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
        },
        onError: (error: any) => {
            showErrorAlert(error.response.data.message || error.message || 'Lỗi')
        }
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
        risk: initialValues[0].risk
      },
      validationSchema: dispatcherOrderValidationSchema,
      enableReinitialize: true, // Để cập nhật lại giá trị khi initialValues thay đổi
      onSubmit: async (values) => {
        const currentIds = values.usersAndDepartments
          .map((item) => item._id)
          .filter(Boolean);
        const idsToDelete = initialOrderIds.filter(
          (id) => !currentIds.includes(id),
        );

        const promises: Promise<any>[] = [];

        // 1. Logic tạo mới và cập nhật
        values.usersAndDepartments.forEach((item) => {
          const orderData: Partial<Order> = {
            assignedTo: item.assignedTo,
            job: jobs.find((i: Job) => i.name === JobTypeEnum.DISPATCHER)?._id,
            workingDate: dayjs
              .utc(dayjs(values.workingDate).format("YYYY-MM-DD"))
              .toDate(),
            workContent: values.workContent,
            status: StatusOrderEnum.PENDING,
            risk: values.risk
          };

          if (item._id) {
            promises.push(
              updateMutation.mutateAsync({ ...orderData, _id: item._id }),
            );
          } else {
            promises.push(
              createMutation.mutateAsync({
                ...orderData,
                batchId: initialValues[0]?.batchId,
              }),
            );
          }
        });

        // 2. Logic xóa
        if (idsToDelete.length > 0) {
          promises.push(deleteMutation.mutateAsync(idsToDelete));
        }

        try {
          await Promise.all(promises);
          queryClient.invalidateQueries({ queryKey: ["orders"] });
          showSuccessAlert("Cập nhật lệnh sản xuất thành công");
          onCancel();
        } catch (error: any) {
          showErrorAlert(
            error.response?.data?.message ||
              error.message ||
              "Lỗi khi cập nhật lệnh",
          );
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
                  formik.touched.workContent &&
                  Boolean(formik.errors.workContent)
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

export default DispatcherOrderFormEdit;
