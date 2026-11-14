import React, { useMemo, useState } from "react";
import { Box, TextField, Typography, LinearProgress } from "@mui/material";
import { useFormik } from "formik";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    showConfirmAlert,
    showErrorAlert,
    showSuccessAlert,
} from "../../components/Alert";
import { useAtom } from "jotai";
import { userAtom } from "../../atoms/userAtoms";
import { departmentValidationSchema } from "../../utils/validation";
import DepartmentService from "../../services/departmentService";
import { RoleEnum } from "../../enums";
import { parseAxiosError } from "../../utils/handleApiError";
import ModuleChecklist from "../../components/permissions/ModuleChecklist";
import { DesignListView, type DesignColumn } from "../../components/design/DesignListView";
import DesignModal from "../../components/design/DesignModal";

/** Danh mục Phòng ban — bảng/cửa sổ theo thiết kế (cùng giao diện danh mục Thống kê). */
const Departments = () => {
    const [open, setOpen] = useState(false);
    const [selectedDepartment, setSelectedDepartment] = useState<any>(null);
    const [user] = useAtom(userAtom);
    const isAdmin = user?.role === RoleEnum.ADMIN;
    const queryClient = useQueryClient();

    // Tìm kiếm/lọc/sắp xếp/phân trang ở trình duyệt trên toàn bộ phòng ban
    const { data: departments = [], isLoading, refetch } = useQuery({
        queryKey: ["departments", ""],
        queryFn: () => DepartmentService.getAll({}),
    });

    const createMutation = useMutation({
        mutationFn: DepartmentService.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["departments"] });
            showSuccessAlert("Thêm đơn vị thành công");
            handleClose();
        },
        onError: (error: any) => {
            showErrorAlert(error.response.data.message || error.message || "Lỗi");
        },
    });

    const updateMutation = useMutation({
        mutationFn: DepartmentService.update,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["departments"] });
            showSuccessAlert("Cập nhật đơn vị thành công");
            handleClose();
        },
        onError: (error: any) => {
            showErrorAlert(error.response.data.message || error.message || "Lỗi");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: DepartmentService.delete,
        onSuccess: (message) => {
            queryClient.invalidateQueries({ queryKey: ["departments"] });
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
            DepartmentService.importFile(formData, setProgress),
        onMutate: () => {
            setIsUploading(true);
            setProgress(0); // Reset tiến trình khi bắt đầu
        },
        onSuccess: (message) => {
            queryClient.invalidateQueries({ queryKey: ["departments"] });
            setIsUploading(false);
            showSuccessAlert(message || "Import thành công!");
        },
        onError: (error: any) => {
            setIsUploading(false);
            showErrorAlert(error.response?.data?.message || "Lỗi khi import");
        },
    });

    const exportExcel = useMutation({
        mutationFn: DepartmentService.exportFile,
        onSuccess: () => { },
        onError: async (error: any) => {
            const message = await parseAxiosError(error)
            showErrorAlert(message);
        }
    });

    const formik = useFormik({
        initialValues: {
            name: "",
            code: "",
            description: "",
            // chức năng (module) phòng ban được xem; null = chưa giới hạn (theo quyền vai trò cũ)
            allowedModules: null as string[] | null,
        },
        validationSchema: departmentValidationSchema,
        onSubmit: (values) => {
            if (selectedDepartment) {
                updateMutation.mutate({ ...values, _id: selectedDepartment?._id });
            } else {
                // chưa giới hạn thì không gửi trường này khi tạo mới
                const { allowedModules, ...rest } = values;
                createMutation.mutate(allowedModules ? values : rest);
            }
        },
    });

    const handleOpen = (department?: any) => {
        if (department) {
            setSelectedDepartment(department);
            formik.setValues({
                name: department.name,
                code: department.code,
                description: department.description || "",
                allowedModules: Array.isArray(department.allowedModules) ? department.allowedModules : null,
            });
        } else {
            setSelectedDepartment(null);
            formik.resetForm();
        }
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setSelectedDepartment(null);
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
            { key: "code", label: "Mã đơn vị", width: 170, value: (r) => String(r.code ?? "") },
            { key: "name", label: "Tên đơn vị", width: 320, value: (r) => String(r.name ?? "") },
            { key: "description", label: "Chức năng", width: 420, value: (r) => String(r.description ?? "") },
        ],
        [],
    );

    const saving = createMutation.isPending || updateMutation.isPending;

    return (
        <DesignListView
            trail={["Danh mục", "Đơn vị"]}
            title="Phòng ban"
            description="Quản lý danh mục phòng ban và chức năng được phép sử dụng"
            noun="phòng ban"
            rows={departments}
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
                title={selectedDepartment ? "Chỉnh sửa phòng ban" : "Thêm mới phòng ban"}
                description="Các trường có dấu * là bắt buộc."
                confirmLabel={selectedDepartment ? "Cập nhật" : "Thêm mới"}
                busy={saving}
                wide
                onClose={handleClose}
                onConfirm={() => formik.handleSubmit()}
            >
                <Box component="form" onSubmit={formik.handleSubmit}>
                    <TextField
                        fullWidth
                        margin="normal"
                        id="code"
                        name="code"
                        label="Mã đơn vị *"
                        value={formik.values.code}
                        onChange={formik.handleChange}
                        error={formik.touched.code && Boolean(formik.errors.code)}
                        helperText={formik.touched.code && formik.errors.code}
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        id="name"
                        name="name"
                        label="Tên đơn vị *"
                        value={formik.values.name}
                        onChange={formik.handleChange}
                        error={formik.touched.name && Boolean(formik.errors.name)}
                        helperText={formik.touched.name && formik.errors.name}
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        id="description"
                        name="description"
                        label="Chức năng"
                        multiline
                        rows={3}
                        value={formik.values.description}
                        onChange={formik.handleChange}
                        error={formik.touched.description && Boolean(formik.errors.description)}
                        helperText={formik.touched.description && formik.errors.description}
                    />
                    {isAdmin && (
                        <ModuleChecklist
                            value={formik.values.allowedModules}
                            onChange={(v) => formik.setFieldValue("allowedModules", v)}
                        />
                    )}
                </Box>
            </DesignModal>
        </DesignListView>
    );
};

export default Departments;
