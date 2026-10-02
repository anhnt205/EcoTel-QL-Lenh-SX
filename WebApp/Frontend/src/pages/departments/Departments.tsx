import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Typography,
  MenuItem,
  ListItemText,
  Switch,
  Menu,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Breadcrumbs,
  InputAdornment,
  LinearProgress,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Settings,
  Search,
  UploadFile,
  Download,
} from "@mui/icons-material";
import { FormikProvider, useFormik } from "formik";
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
import CustomDataGrid from "../../components/Table/CustomDataGrid";
import { parseAxiosError } from "../../utils/handleApiError";
import FieldSearch from "../../components/field/FieldSearch";
import FieldInput from "../../components/field/FieldInput";

const Departments = () => {
  const [open, setOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<any>(null);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [value, setValue] = useState("");
  const [user] = useAtom(userAtom);
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0,
  });

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const defaultColumns = [
    { id: "code", label: "Mã đơn vị", width: 150, align: "left" as "left" },
    { id: "name", label: "Tên đơn vị", align: "left" as "left" },
    { id: "description", label: "Chức năng", align: "left" as "left" },
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
                "Bạn đang cập nhật một mục. Nếu tiếp tục chỉnh sửa, dữ liệu hiện tại sẽ bị ghi đè. Bạn có chắc chắn muốn tiếp tục?",
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

  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
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
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const { data: departments = { data: [], totalDocs: 0 }, isLoading } =
    useQuery({
      queryKey: ["departments", value, paginationModel],
      queryFn: () =>
        DepartmentService.getAll({
          code: value,
          page: paginationModel.page + 1,
          pageSize: paginationModel.pageSize,
        }),
      placeholderData: (previousData) => previousData,
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
      setSelectedDepartments([]);
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
      DepartmentService.importFile(formData, setProgress),
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
    mutationFn: DepartmentService.exportFile,
    onSuccess: () => {},
    onError: async (error: any) => {
      const message = await parseAxiosError(error);
      showErrorAlert(message);
    },
  });

  const formik = useFormik({
    initialValues: {
      name: "",
      code: "",
      description: "",
    },
    validationSchema: departmentValidationSchema,
    onSubmit: (values) => {
      if (selectedDepartment) {
        updateMutation.mutate({ ...values, _id: selectedDepartment?._id });
      } else {
        createMutation.mutate(values);
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
      });
    } else {
      setSelectedDepartment(null);
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
    setSelectedDepartment(null);
    setExpanded(false);
    formik.resetForm();
  };

  const handleDelete = () => {
    if (selectedDepartments.length === 0) {
      showErrorAlert("Không tìm thấy bản ghi cần xóa");
      return;
    }
    showConfirmAlert(
      `Bạn có muốn xóa ${selectedDepartments.length} bản ghi?`,
    ).then((result) => {
      if (result.isConfirmed) {
        deleteMutation.mutate(selectedDepartments);
      }
    });
  };

  return (
    <Box>
      <Breadcrumbs aria-label="breadcrumb">
        <Typography>Danh mục</Typography>
        <Typography>Đơn vị</Typography>
      </Breadcrumbs>
      <Box
        sx={{ display: "flex", justifyContent: "space-between", mb: 3, mt: 3 }}
      >
        <Typography variant="h3" color={"blue"}>
          Đơn vị
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
              <FieldSearch
                titleSearch={`Tìm kiếm theo mã đơn vị`}
                searchValue={value}
                setSearchValue={setValue}
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
          <DialogTitle>
            {selectedDepartment ? "Sửa đơn vị" : "Thêm đơn vị mới"}
          </DialogTitle>
          <DialogContent>
            <FormikProvider value={formik}>
              <Box
                component="form"
                onSubmit={formik.handleSubmit}
                sx={{ display: "flex", flexDirection: "column", gap: 2 }}
              >
                <FieldInput name="code" title="Mã đơn vị" />
                <FieldInput name="name" title="Tên đơn vị" />
                <FieldInput
                  name="description"
                  title="Chức năng"
                  multiline
                  rows={3}
                />
              </Box>
            </FormikProvider>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Hủy</Button>
            <Button
              onClick={() => formik.handleSubmit()}
              variant="contained"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Đang lưu..."
                : selectedDepartment
                  ? "Cập nhật"
                  : "Thêm mới"}
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
        <Typography variant="h4">Bảng đơn vị</Typography>
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
        rows={departments.data}
        defaultColumns={defaultColumns.filter((c) =>
          visibleColumns.includes(c.id),
        )}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        paginationMode="server"
        rowCount={departments.totalDocs}
        isAdmin={user?.role === RoleEnum.ADMIN}
        onEdit={(department) => handleOpen(department)}
        onSelectionChange={setSelectedDepartments}
        isLoading={isLoading}
      />
    </Box>
  );
};

export default Departments;
