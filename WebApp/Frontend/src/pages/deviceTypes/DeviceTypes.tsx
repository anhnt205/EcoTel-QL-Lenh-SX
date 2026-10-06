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
    Menu,
    Switch,
    ListItemText,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Breadcrumbs,
    InputAdornment,
} from "@mui/material";
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Settings,
    Search,
} from "@mui/icons-material";
import { useFormik } from "formik";
import { DeviceType } from "../../types";
import { useAtom } from "jotai";
import { userAtom } from "../../atoms/userAtoms";
import {
    showConfirmAlert,
    showErrorAlert,
    showSuccessAlert,
} from "../../components/Alert";
import { deviceTypeValidationSchema } from "../../utils/validation";
import DeviceTypeService from "../../services/deviceTypeService";
import { RoleEnum } from "../../enums";
import CustomDataGrid from "../../components/Table/CustomDataGrid";
import { DEVICE_TYPE_OPTIONS } from "../../utils/const";

const DeviceTypes: React.FC = () => {
    const [open, setOpen] = useState(false);
    const [selectedDeviceType, setSelectedDeviceType] =
        useState<DeviceType | null>(null);
    const [selectedDeviceTypes, setSelectedDeviceTypes] = useState<string[]>([]);
    const queryClient = useQueryClient();
    const [user] = useAtom(userAtom);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [expanded, setExpanded] = useState(false);
    const [value, setValue] = useState("");

    const defaultColumns = [
        { id: "name", label: "Tên loại thiết bị", align: "left" as "left" },
        { id: "group", label: "Nhóm thiết bị" },
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

    const { data: DeviceTypes = [], isLoading } = useQuery({
        queryKey: ["DeviceTypes", value],
        queryFn: () => DeviceTypeService.getAll({ q: value }),
    });

    const createMutation = useMutation({
        mutationFn: DeviceTypeService.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["DeviceTypes"] });
            showSuccessAlert("Thêm loại thiết bị thành công");
            handleClose();
        },
        onError: (error: any) => {
            showErrorAlert(error.response.data.message || error.message || "Lỗi");
        },
    });

    const updateMutation = useMutation({
        mutationFn: DeviceTypeService.update,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["DeviceTypes"] });
            showSuccessAlert("Cập nhật loại thiết bị thành công");
            handleClose();
        },
        onError: (error: any) => {
            showErrorAlert(error.response.data.message || error.message || "Lỗi");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: DeviceTypeService.delete,
        onSuccess: (message) => {
            queryClient.invalidateQueries({ queryKey: ["DeviceTypes"] });
            setSelectedDeviceTypes([]);
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
            group: "",
        },
        validationSchema: deviceTypeValidationSchema,
        onSubmit: (values) => {
            if (selectedDeviceType) {
                updateMutation.mutate({
                    ...values,
                    _id: selectedDeviceType._id,
                    group: values.group as DeviceType["group"],
                });
            } else {
                createMutation.mutate({
                    ...values,
                    group: values.group as DeviceType["group"],
                });
            }
        },
    });

    const handleOpen = (DeviceType?: DeviceType) => {
        if (DeviceType) {
            setSelectedDeviceType(DeviceType);
            formik.setValues(DeviceType);
        } else {
            setSelectedDeviceType(null);
            formik.resetForm();
        }
        setExpanded(true);
        setOpen(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleClose = () => {
        setOpen(false);
        setSelectedDeviceType(null);
        setExpanded(false);
        formik.resetForm();
    };

    const handleDelete = () => {
        if (selectedDeviceTypes.length === 0) {
            showErrorAlert("Không tìm thấy bản ghi cần xóa");
            return;
        }
        showConfirmAlert(
            `Bạn có muốn xóa ${selectedDeviceTypes.length} bản ghi?`
        ).then((result) => {
            if (result.isConfirmed) {
                deleteMutation.mutate(selectedDeviceTypes);
            }
        });
    };

    return (
        <Box>
            <Breadcrumbs aria-label="breadcrumb">
                <Typography>Danh mục</Typography>
                <Typography>Phân loại thiết bị</Typography>
            </Breadcrumbs>
            <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 3, mt: 3 }}
            >
                <Typography variant="h3" color="brand.title">
                    Phân loại thiết bị
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
                                placeholder="Tìm kiếm theo tên loại thiết bị"
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
                    </Box>
                </AccordionSummary>
                <AccordionDetails>
                    <DialogTitle>
                        {selectedDeviceType ? "Sửa loại thiết bị" : "Thêm loại thiết bị"}
                    </DialogTitle>
                    <DialogContent>
                        <Box component="form" onSubmit={formik.handleSubmit} sx={{ mt: 2 }}>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                <TextField
                                    fullWidth
                                    id="name"
                                    name="name"
                                    label="Tên loại thiết bị"
                                    value={formik.values.name}
                                    onChange={formik.handleChange}
                                    error={formik.touched.name && Boolean(formik.errors.name)}
                                    helperText={formik.touched.name && formik.errors.name}
                                />
                                <TextField
                                    fullWidth
                                    id="group"
                                    select
                                    name="group"
                                    label="Nhóm thiết bị"
                                    value={formik.values.group}
                                    onChange={formik.handleChange}
                                    error={formik.touched.group && Boolean(formik.errors.group)}
                                    helperText={formik.touched.group && formik.errors.group}
                                >
                                    {DEVICE_TYPE_OPTIONS.map(o => (
                                        <MenuItem key={o.label} value={o.value}>{o.label}</MenuItem>
                                    ))}
                                </TextField>
                            </Box>
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose}>Hủy</Button>
                        <Button onClick={() => formik.submitForm()} variant="contained">
                            {selectedDeviceType ? "Cập nhật" : "Thêm mới"}
                        </Button>
                    </DialogActions>
                </AccordionDetails>
            </Accordion>
            <Box display="flex" alignItems="center" sx={{ mb: 2, mt: 2 }}>
                <Typography variant="h4">Bảng phân loại thiết bị</Typography>
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
                rows={DeviceTypes}
                defaultColumns={defaultColumns.filter((c) =>
                    visibleColumns.includes(c.id)
                )}
                isAdmin={user?.role === RoleEnum.ADMIN}
                onEdit={handleOpen}
                onSelectionChange={setSelectedDeviceTypes}
                isLoading={isLoading}
            />
        </Box>
    );
};

export default DeviceTypes;