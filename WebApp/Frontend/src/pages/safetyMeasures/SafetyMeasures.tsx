import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Box, TextField, Typography, LinearProgress, Autocomplete } from "@mui/material";
import { useFormik } from "formik";
import api from "../../config/api.config";
import { Job, Position, SafetyMeasure } from "../../types";
import {
    showConfirmAlert,
    showErrorAlert,
    showSuccessAlert,
} from "../../components/Alert";
import { useAtom } from "jotai";
import { userAtom } from "../../atoms/userAtoms";
import { StyledPopper } from "../../ui/poppers";
import { safetyMeasureValidationSchema } from "../../utils/validation";
import PositionService from "../../services/positionService";
import SafetyService from "../../services/SafetyService";
import { RoleEnum } from "../../enums";
import { parseAxiosError } from "../../utils/handleApiError";
import { DesignListView, type DesignColumn } from "../../components/design/DesignListView";
import DesignModal from "../../components/design/DesignModal";

/** Danh mục Biện pháp an toàn — bảng/cửa sổ theo thiết kế (cùng giao diện danh mục Thống kê). */
const SafetyMeasures: React.FC = () => {
    const [open, setOpen] = useState(false);
    const [selectedSafetyMeasure, setSelectedSafetyMeasure] = useState<SafetyMeasure | null>(null);
    const queryClient = useQueryClient();
    const [user] = useAtom(userAtom);
    const isAdmin = user?.role === RoleEnum.ADMIN;

    // Tìm kiếm/lọc/sắp xếp/phân trang ở trình duyệt trên toàn bộ biện pháp an toàn
    const { data: safetyMeasures = [], isLoading, refetch } = useQuery({
        queryKey: ["safetyMeasures", ""],
        queryFn: () => SafetyService.getAll({}),
    });
    const { data: positions = [] } = useQuery({
        queryKey: ["positions"],
        queryFn: () => PositionService.getAll({}),
    });
    const { data: jobs = [] } = useQuery({
        queryKey: ["jobs"],
        queryFn: () => api.get(`/jobs`).then((res) => res.data.data),
    });
    const createMutation = useMutation({
        mutationFn: SafetyService.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["safetyMeasures"] });
            showSuccessAlert("Thêm biện pháp an toàn thành công");
            handleClose();
        },
        onError: (error: any) => {
            showErrorAlert(error.response.data.message || error.message || "Lỗi");
        },
    });
    const [progress, setProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const importFile = useMutation({
        mutationFn: (formData: FormData) =>
            SafetyService.importFile(formData, setProgress),
        onMutate: () => {
            setIsUploading(true);
            setProgress(0); // Reset tiến trình khi bắt đầu
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["safetyMeasures"] });
            setIsUploading(false);
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
        },
        onError: (error: any) => {
            setIsUploading(false);
            showErrorAlert(error.response?.data?.message || "Lỗi khi import");
        },
    });

    const exportExcel = useMutation({
        mutationFn: SafetyService.exportFile,
        onSuccess: () => { },
        onError: async (error: any) => {
            const message = await parseAxiosError(error)
            showErrorAlert(message);
        }
    });

    const updateMutation = useMutation({
        mutationFn: (updatedsafetyMeasure: Partial<SafetyMeasure>) =>
            api
                .put(
                    `/safetyMeasures/${updatedsafetyMeasure._id}`,
                    updatedsafetyMeasure
                )
                .then((res) => res.data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["safetyMeasures"] });
            showSuccessAlert("Cập nhật biện pháp an toàn thành công");
            handleClose();
        },
        onError: (error: any) => {
            showErrorAlert(error.response.data.message || error.message || "Lỗi");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (ids: string[]) =>
            api
                .delete(`/safetyMeasures`, { data: { ids } })
                .then((res) => res.data.message),
        onSuccess: (message) => {
            queryClient.invalidateQueries({ queryKey: ["safetyMeasures"] });
            showSuccessAlert(message || "Xóa thành công");
        },
        onError: (error: any) => {
            showErrorAlert(error.response.data.message || error.message || "Lỗi");
        },
    });

    const formik = useFormik({
        initialValues: {
            name: "",
            content: "",
            job: [] as string[],
            position: [] as string[],
        },
        validationSchema: safetyMeasureValidationSchema,
        onSubmit: (values) => {
            if (selectedSafetyMeasure) {
                updateMutation.mutate({ ...values, _id: selectedSafetyMeasure._id });
            } else {
                createMutation.mutate({ ...values });
            }
        },
    });

    const idsOf = (v: any): string[] =>
        Array.isArray(v)
            ? v.map((d: any) => (typeof d === "object" ? d._id : d))
            : v
                ? [typeof v === "object" ? v._id : v]
                : [];

    const handleOpen = (safetyMeasure?: any) => {
        if (safetyMeasure) {
            setSelectedSafetyMeasure(safetyMeasure);
            formik.setValues({
                name: safetyMeasure.name,
                content: safetyMeasure.content,
                job: idsOf(safetyMeasure.job),
                position: idsOf(safetyMeasure.position),
            });
        } else {
            setSelectedSafetyMeasure(null);
            formik.resetForm();
        }
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setSelectedSafetyMeasure(null);
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
            { key: "name", label: "Tên biện pháp an toàn chung", width: 320, value: (r) => String(r.name ?? "") },
            { key: "content", label: "Biện pháp an toàn chung", width: 520, value: (r) => String(r.content ?? "") },
        ],
        [],
    );

    const saving = createMutation.isPending || updateMutation.isPending;

    return (
        <DesignListView
            trail={["Danh mục", "Đơn vị"]}
            title="Biện pháp an toàn"
            description="Quản lý danh mục biện pháp an toàn chung theo loại công việc và chức danh"
            noun="biện pháp an toàn"
            rows={safetyMeasures}
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
                title={selectedSafetyMeasure ? "Chỉnh sửa biện pháp an toàn" : "Thêm mới biện pháp an toàn"}
                description="Các trường có dấu * là bắt buộc."
                confirmLabel={selectedSafetyMeasure ? "Cập nhật" : "Thêm mới"}
                busy={saving}
                wide
                onClose={handleClose}
                onConfirm={() => formik.submitForm()}
            >
                <Box component="form" onSubmit={formik.handleSubmit}>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <TextField
                            fullWidth
                            id="name"
                            name="name"
                            label="Tên biện pháp an toàn chung *"
                            value={formik.values.name}
                            onChange={formik.handleChange}
                            error={formik.touched.name && Boolean(formik.errors.name)}
                            helperText={formik.touched.name && formik.errors.name}
                        />
                        <TextField
                            fullWidth
                            multiline
                            rows={5}
                            id="content"
                            name="content"
                            label="Biện pháp an toàn chung"
                            value={formik.values.content}
                            onChange={formik.handleChange}
                            error={formik.touched.content && Boolean(formik.errors.content)}
                            helperText={formik.touched.content && formik.errors.content}
                        />
                        <Autocomplete
                            fullWidth
                            multiple
                            options={jobs}
                            getOptionLabel={(option: Job) => option.name || ""}
                            value={jobs.filter((d: Job) => formik.values.job.includes(d._id))}
                            onChange={(event, newValue) => {
                                formik.setFieldValue("job", newValue.map((item: any) => item._id));
                            }}
                            PopperComponent={StyledPopper}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Loại công việc"
                                    error={formik.touched.job && Boolean(formik.errors.job)}
                                    helperText={
                                        formik.touched.job && typeof formik.errors.job === "string"
                                            ? formik.errors.job
                                            : ""
                                    }
                                />
                            )}
                        />
                        <Autocomplete
                            fullWidth
                            multiple
                            options={positions}
                            getOptionLabel={(option: Position) => option.name || ""}
                            value={positions.filter((d: Position) => formik.values.position.includes(d._id))}
                            onChange={(event, newValue) => {
                                formik.setFieldValue("position", newValue.map((item: any) => item._id));
                            }}
                            PopperComponent={StyledPopper}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Chức danh, nghề nghiệp"
                                    error={formik.touched.position && Boolean(formik.errors.position)}
                                    helperText={
                                        formik.touched.position && typeof formik.errors.position === "string"
                                            ? formik.errors.position
                                            : ""
                                    }
                                />
                            )}
                        />
                    </Box>
                </Box>
            </DesignModal>
        </DesignListView>
    );
};

export default SafetyMeasures;
