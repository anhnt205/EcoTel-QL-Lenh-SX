import React, { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Typography,
  InputAdornment,
  Grid,
  Checkbox,
  AccordionDetails,
  AccordionSummary,
  Accordion,
  Breadcrumbs,
  LinearProgress,
  ListItemText,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility,
  VisibilityOff,
  UploadFile,
  InfoOutlined,
  Download,
  ResetTv,
} from "@mui/icons-material";
import { FormikProvider, useFormik } from "formik";
import api from "../../config/api.config";
import { User } from "../../types";
import { useAtom } from "jotai";
import { userAtom } from "../../atoms/userAtoms";
import imageCompression from "browser-image-compression";
import UserHistories from "../../components/Modal/UserHistories";
import {
  showConfirmAlert,
  showErrorAlert,
  showSuccessAlert,
} from "../../components/Alert";
import { userValidationSchema } from "../../utils/validation";
import UserService from "../../services/userService";
import PositionService from "../../services/positionService";
import DepartmentService from "../../services/departmentService";
import { RoleEnum } from "../../enums";
import { ROLE_TYPE_OPTIONS } from "../../utils/const";
import { parseAxiosError } from "../../utils/handleApiError";
import ImageUploadBox from "../../components/ImageUploadBox";
import CustomDataGrid, {
  ColumnDef,
} from "../../components/Table/CustomDataGrid";
import FieldSearch from "../../components/field/FieldSearch";
import FieldAutoCompleted from "../../components/field/FieldAutoCompleted";
import FieldInput from "../../components/field/FieldInput";

const Users: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [value, setValue] = useState("");
  const [department, setDepartment] = useState("");
  const [active, setActive] = useState("");
  const [avatar, setAvatar] = useState("");
  const queryClient = useQueryClient();
  const [user] = useAtom(userAtom);

  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const handleTogglePassword = () => {
    setShowPassword((prev) => !prev);
  };

  const {
    data: users = {
      data: [],
      totalDocs: 0,
      statusCounts: { all: 0, active: 0, inactive: 0 },
    },
    isLoading,
  } = useQuery({
    queryKey: ["users", value, department, active, paginationModel],
    queryFn: () =>
      UserService.getAll({
        q: value,
        department: department,
        active: active,
        page: paginationModel.page + 1,
        pageSize: paginationModel.pageSize,
      }),
    placeholderData: (previousData) => previousData,
  });

  const { data: positions = { data: [] } } = useQuery({
    queryKey: ["positions"],
    queryFn: () => PositionService.getAll(),
  });
  const { data: departments = { data: [] } } = useQuery({
    queryKey: ["departments"],
    queryFn:()=> DepartmentService.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: UserService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      showSuccessAlert("Thêm người dùng thành công");
      handleClose();
    },
    onError: async (error: any) => {
      const message = await parseAxiosError(error);
      showErrorAlert(message);
    },
  });
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const importFile = useMutation({
    mutationFn: (formData: FormData) =>
      UserService.importFile(formData, setProgress),
    onMutate: () => {
      setIsUploading(true);
      setProgress(0); // Reset tiến trình khi bắt đầu
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
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
    mutationFn: UserService.exportFile,
    onSuccess: () => {},
    onError: async (error: any) => {
      const message = await parseAxiosError(error);
      showErrorAlert(message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: UserService.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      showSuccessAlert("Cập nhật người dùng thành công");
      handleClose();
    },
    onError: (error: any) => {
      showErrorAlert(error.response.data.message || error.message || "Lỗi");
    },
  });
  const resetMutation = useMutation({
    mutationFn: UserService.resetPass,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      showSuccessAlert('Reset mật khẩu thành công. Mật khẩu là:"123456"');
      handleClose();
    },
    onError: async (error: any) => {
      const message = await parseAxiosError(error);
      showErrorAlert(message);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: UserService.delete,
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setSelectedUsers([]);
      showSuccessAlert(message || "Xóa thành công");
      handleClose();
    },
    onError: (error: any) => {
      showErrorAlert(error.response.data.message || error.message || "Lỗi");
    },
  });

  const formik = useFormik({
    initialValues: {
      username: "",
      password: "",
      fullName: "",
      gender: "",
      email: "",
      phone: "",
      avatar: avatar,
      salaryCode: "",
      department: user?.role === RoleEnum.ADMIN ? user?.department?._id : "",
      position: undefined,
      role: RoleEnum.EMPLOYEE,
      ...selectedUser,
    },
    validationSchema: userValidationSchema,
    onSubmit: (values) => {
      const submitValues: Partial<User> = {
        ...values,
        // phone: values.phone ?? '',
      };
      if (!values.password) {
        delete submitValues.password;
      }
      if (selectedUser) {
        updateMutation.mutate({ ...submitValues, _id: selectedUser._id });
      } else {
        createMutation.mutate(submitValues);
      }
    },
  });

  const handleOpen = (user?: any) => {
    if (user) {
      setSelectedUser(user);
      formik.setValues({
        ...user,
        password: "",
        position:
          user.position !== null && typeof user.position === "object"
            ? user.position._id
            : user.position || "",
        department:
          user.department !== null && typeof user.department === "object"
            ? user.department._id
            : user.department || undefined,
      });
      setAvatar(user.avatar);
    } else {
      setSelectedUser(null);
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
    setSelectedUser(null);
    setAvatar("");
    setExpanded(false);
    formik.resetForm();
  };

  const handleDelete = () => {
    if (selectedUsers.length === 0) {
      showErrorAlert("Không tìm thấy bản ghi cần xóa");
      return;
    }
    showConfirmAlert(`Bạn có muốn xóa ${selectedUsers.length} bản ghi?`).then(
      (result) => {
        if (result.isConfirmed) {
          deleteMutation.mutate(selectedUsers);
        }
      },
    );
  };

  const handleImageUpload = async (
    file: File,
    type: "avatar" | "signature",
  ) => {
    try {
      const resizedFile = await imageCompression(file, {
        maxWidthOrHeight: 300,
        maxSizeMB: 1,
        initialQuality: 0.8,
        useWebWorker: true,
        fileType: "image/webp",
      });
      const ext = "webp";
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const res = await api.get(`/uploads/put`, { params: { fileName, type } });
      const { uploadUrl, fileKey } = res.data.data;
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "image/webp" },
        body: resizedFile,
      });
      if (!uploadRes.ok) {
        throw new Error(
          `Upload failed: ${uploadRes.status} ${uploadRes.statusText}`,
        );
      }
      setAvatar(fileKey);
      formik.setFieldValue("avatar", fileKey);
    } catch (err) {
      // ✅ Không set key nếu có lỗi bất kỳ bước nào
      showErrorAlert(
        err instanceof Error
          ? err.message
          : "Tải ảnh lên thất bại, vui lòng thử lại",
      );
    }
  };

  const userColumns: ColumnDef[] = [
    {
      id: "fullName",
      label: "Họ tên",
      flex: 1,
      minWidth: 150,
    },
    {
      id: "salaryCode",
      label: "Thẻ lương",
      align: "center",
      minWidth: 150,
      resizable: true,
    },
    {
      id: "username",
      label: "Tài khoản",
      flex: 1,
      minWidth: 150,
    },
    {
      id: "gender",
      label: "Giới tính",
      minWidth: 120,
    },
    {
      id: "phone",
      label: "Số điện thoại",
      minWidth: 150,
    },
    {
      id: "email",
      label: "Email",
      minWidth: 150,
    },
    {
      id: "position",
      label: "Chức danh, nghề nghiệp",
      renderCell: (params: any) => params?.row?.position?.name || "",
      minWidth: 250,
    },
    {
      id: "department",
      label: "Đơn vị",
      renderCell: (params: any) => {
        const dept = params?.row?.department;
        return typeof dept === "object" && dept !== null
          ? dept.name
          : "Chưa có";
      },
      minWidth: 250,
      flex: 1,
      headerAlign: "center" as "center",
    },
    {
      id: "role",
      label: "Phân quyền",
      width: 150,
      headerAlign: "center" as "center",
      renderCell: (params: any) => (
        <Typography>
          {params.row.role === RoleEnum.ADMIN
            ? "Quản trị hệ thống"
            : params.row.role === RoleEnum.DISPATCHER
              ? "Điều hành sản xuất"
              : params.row.role === RoleEnum.MANAGER
                ? "Quản lý"
                : "Nhân viên"}
        </Typography>
      ),
    },
    {
      id: "active",
      label: "Trạng thái",
      width: 100,
      headerAlign: "center" as "center",
      align: "center" as "center",
      renderCell: (params: any) => (
        <Checkbox
          checked={params.row?.active}
          onChange={(e) =>
            updateMutation.mutate({
              _id: params.row?._id,
              active: e.target.checked,
            })
          }
        />
      ),
    },
    {
      id: "info",
      label: "Xem",
      width: 60,
      headerAlign: "center" as "center",
      renderCell: (params: any) => (
        <>
          <IconButton
            color="info"
            onClick={() => {
              setSelectedUser(params.row);
              setHistory(true);
            }}
          >
            <InfoOutlined />
          </IconButton>
        </>
      ),
      sortable: false,
      filterable: false,
    },
    {
      id: "edit",
      label: "Sửa",
      width: 60,
      headerAlign: "center" as "center",
      renderCell: (params: any) => (
        <>
          <IconButton
            color="primary"
            onClick={async () => {
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
        </>
      ),
      sortable: false,
      filterable: false,
    },
    {
      id: "resetpass",
      label: "Reset MK",
      width: 100,
      headerAlign: "center" as "center",
      renderCell: (params: any) => (
        <>
          <IconButton
            color="primary"
            onClick={async () => {
              const result = await showConfirmAlert(
                `Bạn có muốn reset mật khẩu cho người dùng ${params.row?.username}?`,
              );
              if (result.isConfirmed) {
                resetMutation.mutate(params.row._id);
              }
            }}
          >
            <ResetTv />
          </IconButton>
        </>
      ),
      sortable: false,
      filterable: false,
    },
  ];
  const visibleColumns =
    user?.role === RoleEnum.ADMIN
      ? userColumns
      : userColumns.filter(
          (col) =>
            col.id !== "resetpass" && col.id !== "active" && col.id !== "edit",
        );

  const roles = useMemo(
    () => ROLE_TYPE_OPTIONS.map((r) => ({ _id: r.label, name: r.value })),
    [],
  );

  return (
    <Box>
      <Breadcrumbs aria-label="breadcrumb">
        <Typography>Danh mục</Typography>
        <Typography>Người dùng</Typography>
      </Breadcrumbs>
      <Box
        sx={{ display: "flex", justifyContent: "space-between", mb: 3, mt: 3 }}
      >
        <Typography variant="h3" color={"blue"}>
          Người dùng
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
              flex={1}
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
              <Box sx={{ display: "flex", gap: 4 }}>
                <FieldSearch
                  titleSearch={`Tìm kiếm theo tên, mã thẻ lương cán bộ, nhân viên`}
                  searchValue={value}
                  setSearchValue={setValue}
                />
                {user?.role === RoleEnum.ADMIN && (
                  <FieldAutoCompleted
                    data={departments.data}
                    labelkey="code"
                    title="Tìm kiếm theo đơn vị"
                    value={department}
                    setValue={setDepartment}
                    size="small"
                  />
                )}
              </Box>
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
            {selectedUser ? "Sửa người dùng" : "Thêm người dùng"}
          </DialogTitle>
          <DialogContent>
            <FormikProvider value={formik}>
              <Box
                component="form"
                onSubmit={formik.handleSubmit}
                sx={{ mt: 2 }}
              >
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <FieldInput name="username" title="Tên đăng nhập" />
                  {!selectedUser && (
                    <FieldInput
                      name="password"
                      title="Mật khẩu"
                      type={showPassword ? "text" : "password"}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={handleTogglePassword}
                              edge="end"
                            >
                              {showPassword ? (
                                <Visibility />
                              ) : (
                                <VisibilityOff />
                              )}{" "}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                  <FieldInput name="fullName" title="Họ tên" />
                  <FieldAutoCompleted
                    name="gender"
                    title="Giới tính"
                    data={[
                      { _id: "Nam", name: "Nam" },
                      { _id: "Nữ", name: "Nữ" },
                    ]}
                    labelkey="name"
                  />
                  <FieldInput name="salaryCode" title="Mã thẻ lương" />
                  <FieldInput name="email" title="Email" />
                  <FieldInput name="phone" title="Số điện thoại" />
                  <FieldAutoCompleted
                    name="position"
                    title="Chức danh, nghề nghiệp"
                    data={positions.data}
                    labelkey="name"
                  />
                  <FieldAutoCompleted
                    name="department"
                    title="Đơn vị"
                    data={departments.data}
                    labelkey="name"
                  />
                  <FieldAutoCompleted
                    name="role"
                    title="Phân quyền"
                    data={roles}
                    labelkey="name"
                  />

                  <Grid container spacing={2}>
                    <Grid item>
                      <ImageUploadBox
                        type="avatar"
                        currentKey={avatar}
                        onClear={() => {
                          setAvatar("");
                          formik.setFieldValue("avatar", "");
                        }}
                        onUpload={handleImageUpload}
                      />
                    </Grid>
                  </Grid>
                </Box>
              </Box>
            </FormikProvider>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Hủy</Button>
            <Button onClick={() => formik.handleSubmit()} variant="contained">
              {selectedUser ? "Cập nhật" : "Thêm mới"}
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
      <Paper sx={{ width: "100%", overflowX: "auto", mt: 3 }}>
        <Box display="flex" justifyContent={"space-between"}>
          <Typography variant="h4">Bảng người dùng</Typography>
          <Box
            display="flex"
            gap={2}
            alignItems={"center"}
            justifyContent="flex-end"
          >
            <Box display="flex" alignItems={"center"}>
              <Checkbox
                color="info"
                name="status"
                checked={active === ""}
                onChange={() => setActive("")}
              />
              <ListItemText
                primary={`Tất cả (${users.statusCounts?.all})`}
                sx={{ color: "blue" }}
              />
            </Box>
            <Box display="flex" alignItems={"center"}>
              <Checkbox
                color="default"
                name="status"
                checked={active === "true"}
                onChange={() => setActive("true")}
              />
              <ListItemText
                primary={`Hoạt động (${users.statusCounts?.active})`}
                sx={{ color: "grey" }}
              />
            </Box>
            <Box display="flex" alignItems={"center"}>
              <Checkbox
                color="default"
                name="status"
                checked={active === "false"}
                onChange={() => setActive("false")}
              />
              <ListItemText
                primary={`Không hoạt động (${users.statusCounts?.inactive})`}
                sx={{ color: "grey" }}
              />
            </Box>
          </Box>
        </Box>
        <CustomDataGrid
          rows={users.data}
          defaultColumns={visibleColumns}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          paginationMode="server"
          rowCount={users.totalDocs}
          isAdmin={user?.role === RoleEnum.ADMIN}
          isRowSelectable={(params) => params.row.role !== RoleEnum.ADMIN}
          onEdit={handleOpen}
          onSelectionChange={setSelectedUsers}
          isLoading={isLoading}
        />
      </Paper>

      <UserHistories
        open={history}
        setOpen={setHistory}
        initialValues={selectedUser}
      />
    </Box>
  );
};

export default Users;
