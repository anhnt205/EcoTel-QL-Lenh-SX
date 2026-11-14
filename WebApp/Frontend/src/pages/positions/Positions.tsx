import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Box,
    Typography,
    TextField,
    MenuItem,
    Switch,
    FormControlLabel,
    LinearProgress,
} from "@mui/material";
import { useFormik } from "formik";
import { Position } from "../../types";
import {
    showConfirmAlert,
    showErrorAlert,
    showSuccessAlert,
} from "../../components/Alert";
import { useAtom } from "jotai";
import { userAtom } from "../../atoms/userAtoms";
import { positionValidationSchema } from "../../utils/validation";
import PositionService from "../../services/positionService";
import { RoleEnum } from "../../enums";
import { parseAxiosError } from "../../utils/handleApiError";
import DepartmentService from "../../services/departmentService";
import PermissionMatrix from "../../components/permissions/PermissionMatrix";
import { PermRow } from "../../permissions/access";
import { DesignListView, type DesignColumn } from "../../components/design/DesignListView";
import DesignModal from "../../components/design/DesignModal";

/** Danh mục Chức vụ — bảng/cửa sổ theo thiết kế (cùng giao diện danh mục Thống kê). */
const Positions: React.FC = () => {
    const [open, setOpen] = useState(false);
    const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
    const [user] = useAtom(userAtom);
    const isAdmin = user?.role === RoleEnum.ADMIN;
    const queryClient = useQueryClient();

    // Phòng ban (để chọn phòng ban cho chức vụ và hiện tên trong bảng)
    const { data: departments = [] } = useQuery({
        queryKey: ["departments", ""],
        queryFn: () => DepartmentService.getAll({}),
    });
    const deptById = Object.fromEntries(departments.map((d: any) => [d._id, d]));

    // Tìm kiếm/lọc/sắp xếp/phân trang ở trình duyệt trên toàn bộ chức vụ
    const { data: positions = [], isLoading, refetch } = useQuery({
        queryKey: ["positions", ""],
        queryFn: () => PositionService.getAll({}),
    });

    const createMutation = useMutation({
        mutationFn: PositionService.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["positions"] });
            showSuccessAlert("Thêm chức danh thành công");
            handleClose();
        },
        onError: (error: any) => {
            showErrorAlert(error.response.data.message || error.message || "Lỗi");
        },
    });

    const updateMutation = useMutation({
        mutationFn: PositionService.update,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["positions"] });
            showSuccessAlert("Cập nhật chức danh thành công");
            handleClose();
        },
        onError: (error: any) => {
            showErrorAlert(error.response.data.message || error.message || "Lỗi");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: PositionService.delete,
        onSuccess: (message) => {
            queryClient.invalidateQueries({ queryKey: ["positions"] });
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
            PositionService.importFile(formData, setProgress),
        onMutate: () => {
            setIsUploading(true);
            setProgress(0); // Reset tiến trình khi bắt đầu
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["positions"] });
            setIsUploading(false);
            showSuccessAlert("Import thành công!");
        },
        onError: (error: any) => {
            setIsUploading(false);
            showErrorAlert(error.response?.data?.message || "Lỗi khi import");
        },
    });

    const exportExcel = useMutation({
        mutationFn: PositionService.exportFile,
        onSuccess: () => { },
        onError: async (error: any) => {
            const message = await parseAxiosError(error)
            showErrorAlert(message);
        }
    });
    const formik = useFormik({
        initialValues: {
            name: "",
            note: "",
            // phòng ban của chức vụ; quyền chỉ chọn trong phạm vi chức năng phòng ban được xem
            department: "",
            // null = chưa phân quyền (cán bộ theo vai trò cũ); mảng = đã phân quyền C/R/U/D theo chức năng
            permissions: null as PermRow[] | null,
        },
        validationSchema: positionValidationSchema,
        onSubmit: (values) => {
            const payload: any = { ...values, department: values.department || null };
            if (selectedPosition) {
                updateMutation.mutate({ ...payload, _id: selectedPosition._id });
            } else {
                // tạo mới: không gửi trường trống
                if (!payload.department) delete payload.department;
                if (!payload.permissions) delete payload.permissions;
                createMutation.mutate(payload);
            }
        },
    });

    const handleOpen = (position?: Position) => {
        if (position) {
            setSelectedPosition(position);
            formik.setValues({
                ...position,
                note: position.note ?? "",
                department: (position.department?._id || position.department || "") as string,
                permissions: Array.isArray(position.permissions) ? (position.permissions as PermRow[]) : null,
            });
        } else {
            setSelectedPosition(null);
            formik.resetForm();
        }
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setSelectedPosition(null);
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
            { key: "name", label: "Tên chức danh, nghề nghiệp", width: 300, value: (r) => String(r.name ?? "") },
            { key: "note", label: "Mô tả", width: 300, value: (r) => String(r.note ?? "") },
            {
                key: "department",
                label: "Phòng ban",
                width: 220,
                value: (r) => deptById[r.department?._id || r.department]?.name || "—",
            },
            {
                key: "permissions",
                label: "Phân quyền",
                width: 260,
                value: (r) =>
                    Array.isArray(r.permissions)
                        ? `Đã phân quyền (${r.permissions.length} chức năng)`
                        : "Chưa phân quyền (theo vai trò cũ)",
            },
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [departments],
    );

    const saving = createMutation.isPending || updateMutation.isPending;

    return (
        <DesignListView
            trail={["Danh mục", "Đơn vị"]}
            title="Chức vụ"
            description="Quản lý danh mục chức danh, nghề nghiệp và phân quyền chức năng"
            noun="chức vụ"
            rows={positions}
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
                title={selectedPosition ? "Chỉnh sửa chức vụ" : "Thêm mới chức vụ"}
                description="Các trường có dấu * là bắt buộc."
                confirmLabel={selectedPosition ? "Cập nhật" : "Thêm mới"}
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
                            label="Tên chức danh *"
                            value={formik.values.name}
                            onChange={formik.handleChange}
                            error={formik.touched.name && Boolean(formik.errors.name)}
                            helperText={formik.touched.name && formik.errors.name}
                        />
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            id="note"
                            name="note"
                            label="Mô tả"
                            value={formik.values.note}
                            onChange={formik.handleChange}
                            error={formik.touched.note && Boolean(formik.errors.note)}
                            helperText={formik.touched.note && formik.errors.note}
                        />
                        {isAdmin && (
                            <>
                                <TextField
                                    select
                                    fullWidth
                                    id="department"
                                    name="department"
                                    label="Phòng ban"
                                    value={formik.values.department}
                                    onChange={(e) => {
                                        const dId = e.target.value as string;
                                        formik.setFieldValue("department", dId);
                                        // đổi phòng ban: bỏ các quyền nằm ngoài phạm vi chức năng của phòng ban mới
                                        const allowed = deptById[dId]?.allowedModules;
                                        if (formik.values.permissions && Array.isArray(allowed)) {
                                            formik.setFieldValue(
                                                "permissions",
                                                formik.values.permissions.filter((p) => allowed.includes(p.module)),
                                            );
                                        }
                                    }}
                                    helperText="Chức vụ chỉ được cấp quyền cho các chức năng mà phòng ban này được xem"
                                >
                                    <MenuItem value="">(Không chọn)</MenuItem>
                                    {departments.map((d: any) => (
                                        <MenuItem key={d._id} value={d._id}>
                                            {d.name}
                                        </MenuItem>
                                    ))}
                                </TextField>
                                <Box>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={Array.isArray(formik.values.permissions)}
                                                onChange={(_, on) => formik.setFieldValue("permissions", on ? [] : null)}
                                            />
                                        }
                                        label="Phân quyền chức năng cho chức vụ này"
                                    />
                                    <Typography variant="caption" display="block" color="text.secondary">
                                        {Array.isArray(formik.values.permissions)
                                            ? "Cán bộ thuộc chức vụ này ăn theo quyền được tick bên dưới."
                                            : "Chưa phân quyền: cán bộ thuộc chức vụ này vẫn theo vai trò cũ."}
                                    </Typography>
                                    {Array.isArray(formik.values.permissions) && (
                                        <PermissionMatrix
                                            value={formik.values.permissions}
                                            onChange={(rows) => formik.setFieldValue("permissions", rows)}
                                            allowedKeys={deptById[formik.values.department]?.allowedModules}
                                        />
                                    )}
                                </Box>
                            </>
                        )}
                    </Box>
                </Box>
            </DesignModal>
        </DesignListView>
    );
};

export default Positions;
