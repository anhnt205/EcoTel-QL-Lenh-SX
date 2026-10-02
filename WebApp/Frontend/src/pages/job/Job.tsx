import React, { useEffect, useMemo, useRef, useState } from "react";
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
  Menu,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  InputAdornment,
  Breadcrumbs,
  LinearProgress,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Settings,
  Search,
  Download,
  UploadFile,
} from "@mui/icons-material";
import { FormikProvider, useFormik } from "formik";
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
import CustomDataGrid from "../../components/Table/CustomDataGrid";
import { parseAxiosError } from "../../utils/handleApiError";
import JobService from "../../services/jobService";
import FieldSearch from "../../components/field/FieldSearch";
import FieldInput from "../../components/field/FieldInput";
import FieldAutoCompleted from "../../components/field/FieldAutoCompleted";

const Jobs: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [value, setValue] = useState("");
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [user] = useAtom(userAtom);
  const formRef = useRef<HTMLDivElement>(null);

  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0,
  });

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const defaultColumns = [
    { id: "name", label: "Tên công việc", align: "left" as "left" },
    { id: "type", label: "Loại công việc", align: "left" as "left" },
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

  const { data: jobs = { data: [], totalDocs: 0 }, isLoading } = useQuery({
    queryKey: ["jobs", value, paginationModel],
    queryFn: () =>
      JobService.getAll({
        name: value,
        page: paginationModel.page + 1,
        pageSize: paginationModel.pageSize,
      }),
    placeholderData: (previousData) => previousData,
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
      setSelectedJobs([]);
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
      JobService.importFile(formData, setProgress),
    onMutate: () => {
      setIsUploading(true);
      setProgress(0); // Reset tiến trình khi bắt đầu
    },
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
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
    mutationFn: JobService.exportFile,
    onSuccess: () => {},
    onError: async (error: any) => {
      const message = await parseAxiosError(error);
      showErrorAlert(message);
    },
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
    setSelectedJob(null);
    setExpanded(false);
    formik.resetForm();
  };

  const handleDelete = () => {
    if (selectedJobs.length === 0) {
      showErrorAlert("Không tìm thấy bản ghi cần xóa");
      return;
    }
    showConfirmAlert(`Bạn có muốn xóa ${selectedJobs.length} bản ghi?`).then(
      (result) => {
        if (result.isConfirmed) {
          deleteMutation.mutate(selectedJobs);
        }
      },
    );
  };

  const jobtypes = useMemo(
    () => JOB_TYPE_OPTIONS.map((opt) => ({ _id: opt.label, name: opt.value })),
    [],
  );

  return (
    <Box>
      <Breadcrumbs aria-label="breadcrumb">
        <Typography>Danh mục</Typography>
        <Typography>Công việc</Typography>
      </Breadcrumbs>
      <Box
        sx={{ display: "flex", justifyContent: "space-between", mb: 3, mt: 3 }}
      >
        <Typography variant="h3" color={"blue"}>
          Công việc
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
                    xs: "100%",
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
                titleSearch={`Tìm kiếm theo tên công việc`}
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
            {selectedJob ? "Sửa công việc" : "Thêm công việc"}
          </DialogTitle>
          <DialogContent>
            <FormikProvider value={formik}>
              <Box
                component="form"
                onSubmit={formik.handleSubmit}
                sx={{ mt: 2 }}
              >
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <FieldInput name="name" title="Tên công việc" />
                  <FieldAutoCompleted
                    title="Loại công việc"
                    data={jobtypes}
                    labelkey="name"
                    name="type"
                  />
                </Box>
              </Box>
            </FormikProvider>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Hủy</Button>
            <Button onClick={() => formik.submitForm()} variant="contained">
              {selectedJob ? "Cập nhật" : "Thêm mới"}
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
        <Typography variant="h4">Bảng công việc</Typography>
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
        rows={jobs.data}
        defaultColumns={defaultColumns.filter((c) =>
          visibleColumns.includes(c.id),
        )}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        paginationMode="server"
        rowCount={jobs.totalDocs}
        isAdmin={user?.role === RoleEnum.ADMIN}
        onEdit={handleOpen}
        onSelectionChange={setSelectedJobs}
        isLoading={isLoading}
      />
    </Box>
  );
};

export default Jobs;
