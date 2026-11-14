import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Box, TextField } from "@mui/material";
import { useFormik } from "formik";
import { Shift } from "../../types";
import { LocalizationProvider, TimePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "../../components/design/AdapterDayjs";
import dayjs from "dayjs";
import {
    showConfirmAlert,
    showErrorAlert,
    showSuccessAlert,
} from "../../components/Alert";
import { useAtom } from "jotai";
import { userAtom } from "../../atoms/userAtoms";
import { shiftValidationSchema } from "../../utils/validation";
import ShiftService from "../../services/shiftService";
import { RoleEnum } from "../../enums";
import { DesignListView, type DesignColumn } from "../../components/design/DesignListView";
import DesignModal from "../../components/design/DesignModal";

/** Danh mục Ca làm việc — bảng/cửa sổ theo thiết kế (cùng giao diện danh mục Thống kê). */
const Shifts: React.FC = () => {
    const [open, setOpen] = useState(false);
    const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
    const queryClient = useQueryClient();
    const [user] = useAtom(userAtom);
    const isAdmin = user?.role === RoleEnum.ADMIN;

    const { data: shifts = [], isLoading, refetch } = useQuery({
        queryKey: ["shifts"],
        queryFn: () => ShiftService.getAll({}),
    });

    const createMutation = useMutation({
        mutationFn: ShiftService.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["shifts"] });
            showSuccessAlert("Thêm ca làm việc thành công");
            handleClose();
        },
        onError: (error: any) => {
            showErrorAlert(error.response.data.message || error.message || "Lỗi");
        },
    });

    const updateMutation = useMutation({
        mutationFn: ShiftService.update,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["shifts"] });
            showSuccessAlert("Cập nhật ca làm việc thành công");
            handleClose();
        },
        onError: (error: any) => {
            showErrorAlert(error.response.data.message || error.message || "Lỗi");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: ShiftService.delete,
        onSuccess: (message) => {
            queryClient.invalidateQueries({ queryKey: ["shifts"] });
            showSuccessAlert(message || "Xóa thành công");
        },
        onError: (error: any) => {
            showErrorAlert(error.response.data.message || error.message || "Lỗi");
        },
    });

    const formik = useFormik({
        initialValues: {
            name: undefined as number | undefined,
            startTime: "",
            endTime: "",
        },
        validationSchema: shiftValidationSchema,
        onSubmit: (values) => {
            if (selectedShift) {
                updateMutation.mutate({ ...values, _id: selectedShift._id });
            } else {
                createMutation.mutate(values);
            }
        },
    });

    const handleOpen = (shift?: Shift) => {
        if (shift) {
            setSelectedShift(shift);
            formik.setValues(shift);
        } else {
            setSelectedShift(null);
            formik.resetForm();
        }
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setSelectedShift(null);
        formik.resetForm();
    };

    const handleDelete = (rows: any[]) => {
        if (rows.length === 0) {
            showErrorAlert("Không tìm thấy bản ghi cần xóa");
            return;
        }
        showConfirmAlert(`Bạn có muốn xóa ${rows.length} bản ghi?`).then((result) => {
            if (result.isConfirmed) {
                deleteMutation.mutate(rows.map((r) => r._id));
            }
        });
    };

    const columns = useMemo<DesignColumn<any>[]>(
        () => [
            { key: "name", label: "Ca", width: 160, value: (r) => (r.name != null && r.name !== "" ? `Ca ${r.name}` : "") },
            { key: "startTime", label: "Thời gian bắt đầu", width: 220, value: (r) => String(r.startTime ?? "") },
            { key: "endTime", label: "Thời gian kết thúc", width: 220, value: (r) => String(r.endTime ?? "") },
        ],
        [],
    );

    const saving = createMutation.isPending || updateMutation.isPending;

    return (
        <DesignListView
            trail={["Danh mục", "Danh mục khác"]}
            title="Ca làm việc"
            description="Quản lý danh mục ca làm việc và thời gian bắt đầu, kết thúc"
            noun="ca làm việc"
            rows={shifts}
            getId={(r: any) => r._id}
            columns={columns}
            loading={isLoading}
            onRefresh={() => refetch()}
            onAdd={isAdmin ? () => handleOpen() : undefined}
            onEdit={isAdmin ? (r) => handleOpen(r) : undefined}
            onDelete={isAdmin ? handleDelete : undefined}
        >
            <DesignModal
                open={open}
                title={selectedShift ? "Chỉnh sửa ca làm việc" : "Thêm mới ca làm việc"}
                description="Các trường có dấu * là bắt buộc."
                confirmLabel={selectedShift ? "Cập nhật" : "Thêm mới"}
                busy={saving}
                onClose={handleClose}
                onConfirm={() => formik.submitForm()}
            >
                <Box component="form" onSubmit={formik.handleSubmit}>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <TextField
                            fullWidth
                            type="number"
                            id="name"
                            name="name"
                            label="Ca làm việc *"
                            value={formik.values.name?.toString() ?? ""}
                            onChange={formik.handleChange}
                            error={formik.touched.name && Boolean(formik.errors.name)}
                            helperText={formik.touched.name && formik.errors.name}
                        />
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <TimePicker
                                label="Bắt đầu *"
                                ampm={false}
                                value={formik.values.startTime ? dayjs(formik.values.startTime, "HH:mm") : null}
                                onChange={(value) => {
                                    formik.setFieldValue("startTime", value?.format("HH:mm") || "");
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        fullWidth
                                        size="small"
                                        error={formik.touched.startTime && Boolean(formik.errors.startTime)}
                                        helperText={formik.touched.startTime && formik.errors.startTime}
                                    />
                                )}
                            />

                            <TimePicker
                                label="Kết thúc *"
                                ampm={false}
                                value={formik.values.endTime ? dayjs(formik.values.endTime, "HH:mm") : null}
                                onChange={(value) => {
                                    formik.setFieldValue("endTime", value?.format("HH:mm") || "");
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        fullWidth
                                        size="small"
                                        error={formik.touched.endTime && Boolean(formik.errors.endTime)}
                                        helperText={formik.touched.endTime && formik.errors.endTime}
                                    />
                                )}
                            />
                        </LocalizationProvider>
                    </Box>
                </Box>
            </DesignModal>
        </DesignListView>
    );
};

export default Shifts;
