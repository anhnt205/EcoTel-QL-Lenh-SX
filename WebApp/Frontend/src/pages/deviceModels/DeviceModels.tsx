import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Box,
    Button,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Typography,
    TextField,
    MenuItem,
    Switch,
    ListItemText,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Breadcrumbs,
    InputAdornment,
    LinearProgress,
    Menu,
} from "@mui/material";
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Settings,
    Search,
    Download,
    UploadFile,
} from "@mui/icons-material";
import { useFormik } from "formik";
import api from "../../config/api.config";
import { DeviceModel } from "../../types";
import { useAtom } from "jotai";
import { userAtom } from "../../atoms/userAtoms";
import {
    showConfirmAlert,
    showErrorAlert,
    showSuccessAlert,
} from "../../components/Alert";
import { deviceModelValidationSchema } from "../../utils/validation";
import { RoleEnum } from "../../enums";
import CustomDataGrid from "../../components/Table/CustomDataGrid";
import { parseAxiosError } from "../../utils/handleApiError";

const DeviceModels: React.FC = () => {
    const [open, setOpen] = useState(false);
    const [selectedDeviceModel, setSelectedDeviceModel] =
        useState<DeviceModel | null>(null);
    const [selectedDeviceModels, setSelectedDeviceModels] = useState<string[]>(
        []
    );
    const queryClient = useQueryClient();
    const [user] = useAtom(userAtom);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [expanded, setExpanded] = useState(false);
    const [value, setValue] = useState("");

    const defaultColumns = [
        { id: "name", label: "Tên chủng loại", align: "left" as "left" },
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

    const { data: devicemodels = [], isLoading } = useQuery({
        queryKey: ["devicemodels", value],
        queryFn: () =>
            api.get(`/devicemodels?q=${value}`).then((res) => res.data.data),
    });

    const [progress, setProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const importFile = useMutation({
        mutationFn: (formData: FormData) =>
            api
                .post("/devicemodels/importFile", formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                    onUploadProgress: (progressEvent) => {
                        const percent = Math.round(
                            (progressEvent.loaded * 100) / (progressEvent.total ?? 1)
                        );
                        setProgress(percent);
                    },
                })
                .then((res) => res.data.message),
        onMutate: () => {
            setIsUploading(true);
            setProgress(0); // Reset tiến trình khi bắt đầu
        },
        onSuccess: (message) => {
            queryClient.invalidateQueries({ queryKey: ["departments"] });
            setIsUploading(false);
            showSuccessAlert(message || "Import thành công!");
            handleClose();
        },
        onError: (error: any) => {
            setIsUploading(false);
            showErrorAlert(error.response?.data?.message || "Lỗi khi import");
        },
    });

    const exportExcel = useMutation({
        mutationFn: () => {
            return api
                .post(
                    "/devicemodels/exportFile",
                    {},
                    {
                        responseType: "blob",
                    }
                )
                .then((res) => {
                    const blob = new Blob([res.data], {
                        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    });

                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.setAttribute("download", `*.xlsx`);

                    document.body.appendChild(link);
                    link.click();
                    link.parentNode?.removeChild(link);
                    window.URL.revokeObjectURL(url);
                });
        },
        onSuccess: () => { },
        onError: async (error: any) => {
            const message = await parseAxiosError(error)
            showErrorAlert(message);
        }
    });

    const createMutation = useMutation({
        mutationFn: (newDeviceModel: Partial<DeviceModel>) =>
            api.post("/devicemodels", newDeviceModel).then((res) => res.data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["devicemodels"] });
            showSuccessAlert("Thêm chủng loại thành công");
            handleClose();
        },
        onError: (error: any) => {
            showErrorAlert(error.response.data.message || error.message || "Lỗi");
        },
    });

    const updateMutation = useMutation({
        mutationFn: (updatedDeviceModel: Partial<DeviceModel>) =>
            api
                .put(`/devicemodels/${updatedDeviceModel._id}`, updatedDeviceModel)
                .then((res) => res.data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["devicemodels"] });
            showSuccessAlert("Cập nhật chủng loại thành công");
            handleClose();
        },
        onError: (error: any) => {
            showErrorAlert(error.response.data.message || error.message || "Lỗi");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (ids: string[]) =>
            api
                .delete(`/devicemodels`, { data: { ids } })
                .then((res) => res.data.message),
        onSuccess: (message) => {
            queryClient.invalidateQueries({ queryKey: ["devicemodels"] });
            setSelectedDeviceModels([]);
            showSuccessAlert(message || "Xóa thành công");
            handleClose();
        },
        onError: (error: any) => {
            showErrorAlert(error.response.data.message || error.message || "Lỗi");
        },
    });

    const formik = useFormik({
        initialValues: {
            name: "",
        },
        validationSchema: deviceModelValidationSchema,
        onSubmit: (values) => {
            if (selectedDeviceModel) {
                updateMutation.mutate({ ...values, _id: selectedDeviceModel._id });
            } else {
                createMutation.mutate({ ...values });
            }
        },
    });

    const handleOpen = (DeviceModel?: DeviceModel) => {
        if (DeviceModel) {
            setSelectedDeviceModel(DeviceModel);
            formik.setValues(DeviceModel);
        } else {
            setSelectedDeviceModel(null);
            formik.resetForm();
        }
        setExpanded(true);
        setOpen(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleClose = () => {
        setOpen(false);
        setSelectedDeviceModel(null);
        setExpanded(false);
        formik.resetForm();
    };

    const handleDelete = () => {
        if (selectedDeviceModels.length === 0) {
            showErrorAlert("Không tìm thấy bản ghi cần xóa");
            return;
        }
        showConfirmAlert(
            `Bạn có muốn xóa ${selectedDeviceModels.length} bản ghi?`
        ).then((result) => {
            if (result.isConfirmed) {
                deleteMutation.mutate(selectedDeviceModels);
            }
        });
    };


    return (
        <Box>
            <Breadcrumbs aria-label="breadcrumb">
                <Typography>Danh mục</Typography>
                <Typography>Chủng loại thiết bị</Typography>
            </Breadcrumbs>
            <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 3, mt: 3 }}
            >
                <Typography variant="h3" color="brand.title">
                    Chủng loại thiết bị
                </Typography>
            </Box>
            <Accordion expanded={expanded}>
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
                            justifyContent: {
                                xs: "flex-start",
                                md: "space-between",
                            },
                        }}
                    >
                        {user?.role === RoleEnum.ADMIN && (
                            <Box
                                sx={{
                                    display: "flex",
                                    gap: 1, // Khoảng cách nhỏ hơn giữa các nút
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
                        <Box sx={{ display: "flex", flex: 1, width: "100%" }}>
                            <TextField
                                fullWidth
                                size="small"
                                value={value}
                                placeholder="Tìm kiếm theo tên chủng loại"
                                onChange={(e) => setValue(e.target.value)}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <Search sx={{ fontSize: 24 }} />
                                        </InputAdornment>
                                    ),
                                }}
                            ></TextField>
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
                    <DialogTitle>
                        {selectedDeviceModel ? "Sửa chủng loại" : "Thêm chủng loại"}
                    </DialogTitle>
                    <DialogContent>
                        <Box component="form" onSubmit={formik.handleSubmit} sx={{ mt: 2 }}>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                <TextField
                                    fullWidth
                                    id="name"
                                    name="name"
                                    label="Tên chủng loại"
                                    value={formik.values.name}
                                    onChange={formik.handleChange}
                                    error={formik.touched.name && Boolean(formik.errors.name)}
                                    helperText={formik.touched.name && formik.errors.name}
                                />
                            </Box>
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose}>Hủy</Button>
                        <Button onClick={() => formik.submitForm()} variant="contained">
                            {selectedDeviceModel ? "Cập nhật" : "Thêm mới"}
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
                <Typography variant="h4">Bảng chủng loại thiết bị</Typography>
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
                rows={devicemodels}
                defaultColumns={defaultColumns.filter((c) =>
                    visibleColumns.includes(c.id)
                )}
                isAdmin={user?.role === RoleEnum.ADMIN}
                onEdit={handleOpen}
                onSelectionChange={setSelectedDeviceModels}
                isLoading={isLoading}
            />
        </Box>
    );
};

export default DeviceModels;