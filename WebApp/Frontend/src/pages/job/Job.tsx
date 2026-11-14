import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Box, TextField, MenuItem, Typography, LinearProgress } from "@mui/material";
import { useFormik } from "formik";
import { Job } from "../../types";
import {
    showConfirmAlert,
    showErrorAlert,
    showSuccessAlert,
} from "../../components/Alert";
import { useAtom } from "jotai";
import { userAtom } from "../../atoms/userAtoms";
import { jobValidationSchema } from "../../utils/validation";
import { JOB_TYPE_OPTIONS } from "../../utils/const";
import { RoleEnum } from "../../enums";
import { parseAxiosError } from '../../utils/handleApiError';
import JobService from '../../services/jobService'
import { DesignListView, type DesignColumn } from "../../components/design/DesignListView";
import DesignModal from "../../components/design/DesignModal";

/** Danh mục Công việc — bảng/cửa sổ theo thiết kế (cùng giao diện danh mục Thống kê). */
const Jobs: React.FC = () => {
    const [open, setOpen] = useState(false);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [user] = useAtom(userAtom);
    const isAdmin = user?.role === RoleEnum.ADMIN;
    const queryClient = useQueryClient();

    // Tìm kiếm/lọc/sắp xếp/phân trang ở trình duyệt trên toàn bộ công việc
    const { data: jobs = [], isLoading, refetch } = useQuery({
        queryKey: ["jobs", ""],
        queryFn: () => JobService.getAll({}),
    });

    const createMutation = useMutation({
        mutationFn: JobService.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["jobs"] });
            showSuccessAlert("Thêm công việc thành công");
            handleClose();
        },
        onError: (error: any) => {
            showErrorAlert(error.response.data.message || error.message || "Lỗi");
        },
    });

    const updateMutation = useMutation({
        mutationFn: JobService.update,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["jobs"] });
            showSuccessAlert("Cập nhật công việc thành công");
            handleClose();
        },
        onError: (error: any) => {
            showErrorAlert(error.response.data.message || error.message || "Lỗi");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: JobService.delete,
        onSuccess: (message) => {
            queryClient.invalidateQueries({ queryKey: ["jobs"] });
            showSuccessAlert(message || "Xóa thành công");
        },
        onError: (error: any) => {
            showErrorAlert(error.response.data.message || error.message || "Lỗi");
        },
    });

    const [progress, setProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const importFile = useMutation({
        mutationFn: (formData: FormData) =>
            JobService.importFile(formData, setProgress),
        onMutate: () => {
            setIsUploading(true);
            setProgress(0); // Reset tiến trình khi bắt đầu
        },
        onSuccess: (message) => {
            queryClient.invalidateQueries({ queryKey: ["jobs"] });
            setIsUploading(false);
            showSuccessAlert(message || "Import thành công!");
        },
        onError: (error: any) => {
            setIsUploading(false);
            showErrorAlert(error.response?.data?.message || "Lỗi khi import");
        },
    });
    const exportExcel = useMutation({
        mutationFn: JobService.exportFile,
        onSuccess: () => { },
        onError: async (error: any) => {
            const message = await parseAxiosError(error)
            showErrorAlert(message);
        }
    });

    const formik = useFormik({
        initialValues: {
            name: "",
            type: "",
        },
        validationSchema: jobValidationSchema,
        onSubmit: (values) => {
            if (selectedJob) {
                updateMutation.mutate({
                    ...values,
                    _id: selectedJob._id,
                    type: values.type as Job["type"],
                });
            } else {
                createMutation.mutate({ ...values, type: values.type as Job["type"] });
            }
        },
    });

    const handleOpen = (job?: Job) => {
        if (job) {
            setSelectedJob(job);
            formik.setValues(job);
        } else {
            setSelectedJob(null);
            formik.resetForm();
        }
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setSelectedJob(null);
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
            { key: "name", label: "Tên công việc", width: 420, value: (r) => String(r.name ?? "") },
            { key: "type", label: "Loại công việc", width: 280, value: (r) => String(r.type ?? "") },
        ],
        [],
    );

    const saving = createMutation.isPending || updateMutation.isPending;

    return (
        <DesignListView
            trail={["Danh mục", "Đơn vị"]}
            title="Công việc"
            description="Quản lý danh mục công việc và loại công việc"
            noun="công việc"
            rows={jobs}
            getId={(r: any) => r._id}
            columns={columns}
            loading={isLoading}
            onRefresh={() => refetch()}
            onAdd={isAdmin ? () => handleOpen() : undefined}
            onEdit={isAdmin ? (r) => handleOpen(r) : undefined}
            onDelete={isAdmin ? handleDelete : undefined}
            onImport={isAdmin ? (file) => {
                const formData = new FormData();
                formData.append("file", file);
                importFile.mutate(formData);
            } : undefined}
            isImporting={isUploading}
            onExport={isAdmin ? () => exportExcel.mutate() : undefined}
            belowToolbar={
                isUploading ? (
                    <Box sx={{ mb: 2 }}>
                        {progress < 100 ? (
                            <>
                                <Typography variant="body2" align="center">
                                    Đang tải lên... {progress}%
                                </Typography>
                                <LinearProgress variant="determinate" value={progress} />
                            </>
                        ) : (
                            <>
                                <Typography variant="body2" align="center">
                                    Đang xử lý dữ liệu trên server...
                                </Typography>
                                <LinearProgress />
                            </>
                        )}
                    </Box>
                ) : null
            }
        >
            <DesignModal
                open={open}
                title={selectedJob ? "Chỉnh sửa công việc" : "Thêm mới công việc"}
                description="Các trường có dấu * là bắt buộc."
                confirmLabel={selectedJob ? "Cập nhật" : "Thêm mới"}
                busy={saving}
                onClose={handleClose}
                onConfirm={() => formik.submitForm()}
            >
                <Box component="form" onSubmit={formik.handleSubmit}>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <TextField
                            fullWidth
                            id="name"
                            name="name"
                            label="Tên công việc *"
                            value={formik.values.name}
                            onChange={formik.handleChange}
                            error={formik.touched.name && Boolean(formik.errors.name)}
                            helperText={formik.touched.name && formik.errors.name}
                        />
                        <TextField
                            fullWidth
                            select
                            id="type"
                            name="type"
                            label="Loại công việc *"
                            value={formik.values.type}
                            onChange={formik.handleChange}
                            error={formik.touched.type && Boolean(formik.errors.type)}
                            helperText={formik.touched.type && formik.errors.type}
                        >
                            {JOB_TYPE_OPTIONS.map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Box>
                </Box>
            </DesignModal>
        </DesignListView>
    );
};

export default Jobs;
