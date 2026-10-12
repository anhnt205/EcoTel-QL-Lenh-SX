import React, { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Box,
    Button,
    DialogActions,
    DialogContent,
    IconButton,
    Typography,
    TextField,
    MenuItem,
    Menu,
    Switch,
    FormControlLabel,
    ListItemText,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Breadcrumbs,
    InputAdornment,
    LinearProgress,
} from "@mui/material";
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Settings,
    Search,
    UploadFile,
    Download,
} from "@mui/icons-material";
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
import CustomDataGrid from "../../components/Table/CustomDataGrid";
import { parseAxiosError } from "../../utils/handleApiError";
import DepartmentService from "../../services/departmentService";
import PermissionMatrix from "../../components/permissions/PermissionMatrix";
import { PermRow } from "../../permissions/access";
import SearchInput from "../../components/SearchInput";

const Positions: React.FC = () => {
    const [open, setOpen] = useState(false);
    const [selectedPosition, setSelectedPosition] = useState<Position | null>(
        null
    );
    const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
    const [value, setValue] = useState("");
    const [user] = useAtom(userAtom);
    const queryClient = useQueryClient();
    const [expanded, setExpanded] = useState(false);
    const formRef = useRef<HTMLDivElement>(null);

    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    // Phòng ban (để chọn phòng ban cho chức vụ và hiện tên trong bảng)
    const { data: departments = [] } = useQuery({
        queryKey: ["departments", ""],
        queryFn: () => DepartmentService.getAll({}),
    });
    const deptById = Object.fromEntries(departments.map((d: any) => [d._id, d]));

    const defaultColumns = [
        { id: "name", label: "Tên chức danh, nghề nghiệp", align: "left" as "left" },
        { id: "note", label: "Mô tả", align: "left" as "left" },
        {
            id: "department",
            label: "Phòng ban",
            align: "left" as "left",
            renderCell: (params: { row: any }) => deptById[params.row.department]?.name || "—",
        },
        {
            id: "permissions",
            label: "Phân quyền",
            align: "left" as "left",
            renderCell: (params: { row: any }) =>
                Array.isArray(params.row.permissions)
                    ? `Đã phân quyền (${params.row.permissions.length} chức năng)`
                    : "Chưa phân quyền (theo vai trò cũ)",
        },
        {
            id: "edit",
            label: "Sửa",
            width: 60,
            renderCell: (params: { row: any }) => (
                <IconButton
                    color="primary"
                    disabled={user?.role !== RoleEnum.ADMIN}
                    onClick={async () => {
                        if (user?.role !== RoleEnum.ADMIN) return;
                        if (open) {
                            const result = await showConfirmAlert(
                                "Bạn đang cập nhật một mục. Nếu tiếp tục chỉnh sửa, dữ liệu hiện tại sẽ bị ghi đè. Bạn có chắc chắn muốn tiếp tục?"
                            );
                            if (result.isConfirmed) {
                                handleOpen(params.row);
                            }
                        } else {
                            handleOpen(params.row);
                        }
                    }}
                >
                    <EditIcon />
                </IconButton>
            ),
            sortable: false,
            filterable: false,
        },
    ];
    const [visibleColumns, setVisibleColumns] = useState<string[]>([])
    useEffect(() => {
        if (user) {
            let initialColumns: string[];

            if (user.role === RoleEnum.ADMIN) {
                initialColumns = defaultColumns.map((i) => i.id);
            } else {
                initialColumns = defaultColumns
                    .filter((i) => i.id !== "edit")
                    .map((i) => i.id);
            }

            setVisibleColumns(initialColumns);
        }

    }, [user, defaultColumns]);

    const handleToggleColumn = (id: string) => {
        setVisibleColumns((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    const { data: positions = [], isLoading } = useQuery({
        queryKey: ["positions", value],
        queryFn: () => PositionService.getAll({ name: value }),
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
            setSelectedPositions([]);
            showSuccessAlert(message || "Xóa thành công");
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
            PositionService.importFile(formData, setProgress),
        onMutate: () => {
            setIsUploading(true);
            setProgress(0); // Reset tiến trình khi bắt đầu
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["positions"] });
            setIsUploading(false);
            showSuccessAlert("Import thành công!");
            handleClose();
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
        setExpanded(false);
        setSelectedPosition(null);
        formik.resetForm();
    };

    const handleDelete = () => {
        if (selectedPositions.length === 0) {
            showErrorAlert("Không tìm thấy bản ghi cần xóa");
            return;
        }
        showConfirmAlert(
            `Bạn có muốn xóa ${selectedPositions.length} bản ghi?`
        ).then((result) => {
            if (result.isConfirmed) {
                deleteMutation.mutate(selectedPositions);
            }
        });
    };

    return (
        <Box>
            <Breadcrumbs aria-label="breadcrumb">
                <Typography>Danh mục</Typography>
                <Typography>Chức vụ</Typography>
            </Breadcrumbs>
            <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 3, mt: 3 }}
            >
                <Typography variant="h3" color="brand.title">
                    Chức vụ
                </Typography>
            </Box>
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
                            flexDirection: {
                                xs: "column",
                                md: "row",
                            },
                        }}
                    >
                        {user?.role === RoleEnum.ADMIN && (
                            <Box
                                display={"flex"}
                                gap={2}
                                sx={{
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
                        <Box
                            flex={2}
                            sx={{
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
                            <SearchInput
                                placeholder="Tìm kiếm theo tên chức danh, nghề nghiệp"
                                value={value}
                                onChange={setValue}
                            />
                        </Box>
                        {user?.role === RoleEnum.ADMIN && (
                            <Box
                                display="flex"
                                gap={2}
                                sx={{
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
                                    onClick={() => exportExcel.mutate()}
                                >
                                    Tải xuống
                                </Button>
                            </Box>
                        )}
                    </Box>
                </AccordionSummary>
                <AccordionDetails>
                    <DialogContent>
                        <Box component="form" onSubmit={formik.handleSubmit} sx={{ mt: 2 }}>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                <TextField
                                    fullWidth
                                    id="name"
                                    name="name"
                                    label="Tên chức danh"
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
                                {user?.role === RoleEnum.ADMIN && (
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
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose}>Hủy</Button>
                        <Button onClick={() => formik.submitForm()} variant="contained">
                            {selectedPosition ? "Cập nhật" : "Thêm mới"}
                        </Button>
                    </DialogActions>
                </AccordionDetails>
            </Accordion>
            {isUploading && (
                <Box sx={{ mt: 2 }}>
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
            )}
            <Box display="flex" alignItems="center" sx={{ mb: 2, mt: 2 }}>
                <Typography variant="h4">Bảng chức danh, nghề nghiệp</Typography>
                <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
                    <Settings sx={{ fontSize: 30 }} />
                </IconButton>
                <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={() => setAnchorEl(null)}
                    sx={{ maxHeight: 400 }}
                >
                    {defaultColumns.map((col) => (
                        <MenuItem key={col.id} onClick={() => handleToggleColumn(col.id)}>
                            <Switch checked={visibleColumns.includes(col.id)} />
                            <ListItemText primary={col.label} />
                        </MenuItem>
                    ))}
                </Menu>
            </Box>
            <CustomDataGrid
                rows={positions}
                defaultColumns={defaultColumns.filter((c) =>
                    visibleColumns.includes(c.id)
                )}
                isAdmin={user?.role === RoleEnum.ADMIN}
                onEdit={handleOpen}
                onSelectionChange={setSelectedPositions}
                isLoading={isLoading}
            />
        </Box>
    );
};

export default Positions;