import React, { useEffect, useRef, useState } from "react";
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
    ListItemText,
    Switch,
    AccordionDetails,
    AccordionSummary,
    Accordion,
    Breadcrumbs,
    LinearProgress,
    Autocomplete,
    InputAdornment,
} from "@mui/material";
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Settings,
    UploadFile,
    Download,
    Search,
} from "@mui/icons-material";
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
import CustomDataGrid from "../../components/Table/CustomDataGrid";
import { parseAxiosError } from "../../utils/handleApiError";

const SafetyMeasures: React.FC = () => {
    const [open, setOpen] = useState(false);
    const [selectedSafetyMeasure, setSelectedSafetyMeasure] =
        useState<SafetyMeasure | null>(null);
    const [value, setValue] = useState("");
    const queryClient = useQueryClient();
    const [expanded, setExpanded] = useState(false);
    const [selectedSafetyMeasures, setSelectedSafetyMeasures] = useState<
        string[]
    >([]);
    const [user] = useAtom(userAtom);
    const formRef = useRef<HTMLDivElement>(null);

    const defaultColumns = [
        { id: "stt", label: "STT", width: 50 },
        { id: "name", label: "Tên biện pháp an toàn chung", width: 300, align: "left" as "left" },
        { id: "content", label: "Biện pháp an toàn chung", align: "left" as "left" },
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

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

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

    const handleToggleColumn = (columnId: string) => {
        setVisibleColumns((prev) =>
            prev.includes(columnId)
                ? prev.filter((id) => id !== columnId)
                : [...prev, columnId]
        );
    };

    const { data: safetyMeasures = [], isLoading } = useQuery({
        queryKey: ["safetyMeasures", value],
        queryFn: () => SafetyService.getAll({ q: value }),
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
            handleClose();
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
            setSelectedSafetyMeasures([]);
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

    const handleOpen = (safetyMeasure?: any) => {
        if (safetyMeasure) {
            setSelectedSafetyMeasure(safetyMeasure);
            formik.setValues({
                name: safetyMeasure.name,
                content: safetyMeasure.content,
                job: Array.isArray(safetyMeasure.job)
                    ? safetyMeasure.job.map((d: any) =>
                        typeof d === "object" ? d._id : d
                    )
                    : safetyMeasure.job
                        ? [
                            typeof safetyMeasure.job === "object"
                                ? safetyMeasure.job._id
                                : safetyMeasure.job,
                        ]
                        : [],
                position: Array.isArray(safetyMeasure.position)
                    ? safetyMeasure.position.map((d: any) =>
                        typeof d === "object" ? d._id : d
                    )
                    : safetyMeasure.position
                        ? [
                            typeof safetyMeasure.position === "object"
                                ? safetyMeasure.position._id
                                : safetyMeasure.position,
                        ]
                        : [],
            });
        } else {
            setSelectedSafetyMeasure(null);
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
        setSelectedSafetyMeasure(null);
        setExpanded(false);
        formik.resetForm();
    };

    const handleDelete = () => {
        if (selectedSafetyMeasures.length === 0) {
            showErrorAlert("Không tìm thấy bản ghi cần xóa");
            return;
        }
        showConfirmAlert(
            `Bạn có muốn xóa ${selectedSafetyMeasures.length} bản ghi?`
        ).then((result) => {
            if (result.isConfirmed) {
                deleteMutation.mutate(selectedSafetyMeasures);
            }
        });
    };

    return (
        <Box>
            <Breadcrumbs aria-label="breadcrumb">
                <Typography>Danh mục</Typography>
                <Typography>Biện pháp an toàn</Typography>
            </Breadcrumbs>
            <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 3, mt: 3 }}
            >
                <Typography variant="h3" color="brand.title">
                    Biện pháp an toàn
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
                                placeholder="Tìm kiếm theo tên biện pháp an toàn chung"
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
                        {selectedSafetyMeasure
                            ? "Sửa biện pháp an toàn"
                            : "Thêm biện pháp an toàn"}
                    </DialogTitle>
                    <DialogContent>
                        <Box component="form" onSubmit={formik.handleSubmit} sx={{ mt: 2 }}>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                <TextField
                                    fullWidth
                                    id="name"
                                    name="name"
                                    label="Tên biện pháp an toàn chung"
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
                                    error={
                                        formik.touched.content && Boolean(formik.errors.content)
                                    }
                                    helperText={formik.touched.content && formik.errors.content}
                                />
                                <Autocomplete
                                    fullWidth
                                    multiple
                                    options={jobs}
                                    getOptionLabel={(option: Job) => option.name || ""}
                                    value={jobs.filter((d: Job) =>
                                        formik.values.job.includes(d._id)
                                    )}
                                    onChange={(event, newValue) => {
                                        const selectedIds = newValue.map((item: any) => item._id);

                                        formik.setFieldValue("job", selectedIds);
                                    }}
                                    PopperComponent={StyledPopper}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Loại công việc"
                                            error={formik.touched.job && Boolean(formik.errors.job)}
                                            helperText={
                                                formik.touched.job &&
                                                    typeof formik.errors.job === "string"
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
                                    value={positions.filter((d: Position) =>
                                        formik.values.position.includes(d._id)
                                    )}
                                    onChange={(event, newValue) => {
                                        const selectedIds = newValue.map((item: any) => item._id);

                                        formik.setFieldValue("position", selectedIds);
                                    }}
                                    PopperComponent={StyledPopper}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Chức danh, nghề nghiệp"
                                            error={
                                                formik.touched.position &&
                                                Boolean(formik.errors.position)
                                            }
                                            helperText={
                                                formik.touched.position &&
                                                    typeof formik.errors.position === "string"
                                                    ? formik.errors.position
                                                    : ""
                                            }
                                        />
                                    )}
                                />
                            </Box>
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose}>Hủy</Button>
                        <Button onClick={() => formik.submitForm()} variant="contained">
                            {selectedSafetyMeasure ? "Cập nhật" : "Thêm mới"}
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
                <Typography variant="h4">Bảng biện pháp chung</Typography>
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
                rows={safetyMeasures.map((sm, index) => ({
                    ...sm,
                    stt: index + 1,
                }))}
                defaultColumns={defaultColumns.filter((c) =>
                    visibleColumns.includes(c.id)
                )}
                isAdmin={user?.role === RoleEnum.ADMIN}
                onEdit={handleOpen}
                onSelectionChange={setSelectedSafetyMeasures}
                isLoading={isLoading}
            />
        </Box>
    );
};

export default SafetyMeasures;