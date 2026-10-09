import React, { useRef, useState } from "react";
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
  TextField,
  MenuItem,
  Autocomplete,
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
  Close,
  InfoOutlined,
  Download,
  Search,
  ResetTv,
} from "@mui/icons-material";
import { useFormik } from "formik";
import api from "../../config/api.config";
import { Department, Position, User } from "../../types";
import { DataGrid, GridColDef, GridToolbar } from "@mui/x-data-grid";
import { useAtom } from "jotai";
import { userAtom } from "../../atoms/userAtoms";
import imageCompression from "browser-image-compression";
import UserHistories from "../../components/Modal/UserHistories";
import {
  showConfirmAlert,
  showErrorAlert,
  showSuccessAlert,
} from "../../components/Alert";
import { StyledPopper } from "../../ui/poppers";
import { userValidationSchema } from "../../utils/validation";
import UserService from "../../services/userService";
import PositionService from "../../services/positionService";
import UserPermissionSection from "../../components/permissions/UserPermissionSection";
import DepartmentService from "../../services/departmentService";
import { RoleEnum } from "../../enums";
import { ROLE_TYPE_OPTIONS } from "../../utils/const";
import { parseAxiosError } from "../../utils/handleApiError";
import ImageUploadBox from "../../components/ImageUploadBox";
import SearchInput from "../../components/SearchInput";

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

  const [showPassword, setShowPassword] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const handleTogglePassword = () => {
    setShowPassword((prev) => !prev);
  };

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users", value, department, active],
    queryFn: () =>
      UserService.getAll({
        q: value,
        department: department,
      }),
  });
  const filteredOrders = React.useMemo(() => {
    if (!active) return users;
    return users.filter(
      (o: User) => o.active === (active === "true" ? true : false),
    );
  }, [users, active]);

  const { data: positions = [] } = useQuery({
    queryKey: ["positions"],
    queryFn: PositionService.getAll,
  });
  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: DepartmentService.getAll,
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
      role: "",
      // phân quyền chức năng: ăn theo chức vụ, hoặc quyền riêng khi bật customPermissions
      customPermissions: false,
      permissions: undefined as any,
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

  const userColumns: GridColDef[] = [
    {
      field: "fullName",
      headerName: "Họ tên",
      flex: 1,
      minWidth: 150,
      headerAlign: "center",
    },
    {
      field: "salaryCode",
      headerName: "Thẻ lương",
      align: "center",
      minWidth: 150,
      resizable: true,
      headerAlign: "center",
    },
    {
      field: "username",
      headerName: "Tài khoản",
      flex: 1,
      minWidth: 150,
      headerAlign: "center",
    },
    {
      field: "gender",
      headerName: "Giới tính",
      minWidth: 120,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "phone",
      headerName: "Số điện thoại",
      minWidth: 150,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "email",
      headerName: "Email",
      minWidth: 150,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "position",
      headerName: "Chức danh, nghề nghiệp",
      renderCell: (params: any) => params?.row?.position?.name || "",
      minWidth: 250,
      headerAlign: "center",
    },
    {
      field: "department",
      headerName: "Đơn vị",
      renderCell: (params: any) => {
        const dept = params?.row?.department;
        return typeof dept === "object" && dept !== null
          ? dept.name
          : "Chưa có";
      },
      minWidth: 250,
      flex: 1,
      headerAlign: "center",
    },
    {
      field: "role",
      headerName: "Phân quyền",
      width: 150,
      headerAlign: "center",
      renderCell: (params) => (
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
      field: "active",
      headerName: "Trạng thái",
      width: 100,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => (
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
      field: "info",
      headerName: "Xem",
      width: 60,
      headerAlign: "center",
      renderCell: (params) => (
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
      field: "edit",
      headerName: "Sửa",
      width: 60,
      headerAlign: "center",
      renderCell: (params) => (
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
      field: "resetpass",
      headerName: "Reset MK",
      width: 100,
      headerAlign: "center",
      renderCell: (params) => (
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
          (col: GridColDef) =>
            col.field !== "resetpass" &&
            col.field !== "active" &&
            col.field !== "edit",
        );

  return (
    <Box>
      <Breadcrumbs aria-label="breadcrumb">
        <Typography>Danh mục</Typography>
        <Typography>Cán bộ nhân viên</Typography>
      </Breadcrumbs>
      <Box
        sx={{ display: "flex", justifyContent: "space-between", mb: 3, mt: 3 }}
      >
        <Typography variant="h3" color="brand.title">
          Cán bộ nhân viên
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
                <SearchInput
                  placeholder="Tìm kiếm theo tên, mã thẻ lương cán bộ, nhân viên"
                  value={value}
                  onChange={setValue}
                />
                {user?.role === RoleEnum.ADMIN && (
                  <Autocomplete
                    fullWidth
                    size="small"
                    options={departments}
                    getOptionLabel={(option: Department) => option.code || ""}
                    onChange={(event, newValue) => {
                      setDepartment(newValue?._id || "");
                    }}
                    PopperComponent={StyledPopper}
                    renderInput={(params) => (
                      <TextField {...params} label="Tìm kiếm theo đơn vị" />
                    )}
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
            <Box component="form" onSubmit={formik.handleSubmit} sx={{ mt: 2 }}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <TextField
                  fullWidth
                  id="username"
                  name="username"
                  label="Tên đăng nhập"
                  value={formik.values.username}
                  onChange={formik.handleChange}
                  error={
                    formik.touched.username && Boolean(formik.errors.username)
                  }
                  helperText={formik.touched.username && formik.errors.username}
                />
                {!selectedUser && (
                  <TextField
                    fullWidth
                    id="password"
                    name="password"
                    label="Mật khẩu"
                    type={showPassword ? "text" : "password"}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={handleTogglePassword} edge="end">
                            {showPassword ? (
                              <Visibility />
                            ) : (
                              <VisibilityOff />
                            )}{" "}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    value={formik.values.password}
                    onChange={formik.handleChange}
                    error={
                      formik.touched.password && Boolean(formik.errors.password)
                    }
                    helperText={
                      formik.touched.password && formik.errors.password
                    }
                  />
                )}
                <TextField
                  fullWidth
                  id="fullName"
                  name="fullName"
                  label="Họ tên"
                  value={formik.values.fullName}
                  onChange={formik.handleChange}
                  error={
                    formik.touched.fullName && Boolean(formik.errors.fullName)
                  }
                  helperText={formik.touched.fullName && formik.errors.fullName}
                />
                <TextField
                  fullWidth
                  select
                  id="gender"
                  name="gender"
                  label="Giới tính"
                  value={formik.values.gender}
                  onChange={formik.handleChange}
                  error={formik.touched.gender && Boolean(formik.errors.gender)}
                  helperText={formik.touched.gender && formik.errors.gender}
                >
                  <MenuItem value="Nam">Nam</MenuItem>
                  <MenuItem value="Nữ">Nữ</MenuItem>
                </TextField>
                <TextField
                  fullWidth
                  id="salaryCode"
                  name="salaryCode"
                  label="Mã thẻ lương"
                  value={formik.values.salaryCode}
                  onChange={formik.handleChange}
                  error={
                    formik.touched.salaryCode &&
                    Boolean(formik.errors.salaryCode)
                  }
                  helperText={
                    formik.touched.salaryCode && formik.errors.salaryCode
                  }
                />
                <TextField
                  fullWidth
                  id="email"
                  name="email"
                  label="Email"
                  value={formik.values.email || ""}
                  onChange={formik.handleChange}
                  error={formik.touched.email && Boolean(formik.errors.email)}
                  helperText={formik.touched.email && formik.errors.email}
                />
                <TextField
                  fullWidth
                  id="phone"
                  name="phone"
                  label="Số điện thoại"
                  value={formik.values.phone || ""}
                  onChange={formik.handleChange}
                  error={formik.touched.phone && Boolean(formik.errors.phone)}
                  helperText={formik.touched.phone && formik.errors.phone}
                />
                <Autocomplete
                  fullWidth
                  options={positions}
                  getOptionLabel={(option: Position) => option.name || ""}
                  value={
                    positions.find(
                      (d: Position) => d._id === formik.values.position,
                    ) || null
                  }
                  onChange={(event, newValue) => {
                    formik.setFieldValue("position", newValue?._id || "");
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
                <Autocomplete
                  fullWidth
                  options={departments}
                  getOptionLabel={(option: Department) => option.name || ""}
                  value={
                    departments.find(
                      (p: any) =>
                        p._id ===
                        (user?.role === RoleEnum.MANAGER
                          ? user?.department?._id
                          : formik.values.department),
                    ) || null
                  }
                  onChange={(event, newValue) => {
                    formik.setFieldValue("department", newValue?._id || "");
                  }}
                  PopperComponent={StyledPopper}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Đơn vị"
                      error={
                        formik.touched.department &&
                        Boolean(formik.errors.department)
                      }
                      helperText={
                        formik.touched.department &&
                        typeof formik.errors.department === "string"
                          ? formik.errors.department
                          : ""
                      }
                    />
                  )}
                />
                <TextField
                  fullWidth
                  select
                  id="role"
                  name="role"
                  label="Vai trò (quyền cơ bản)"
                  SelectProps={{
                    displayEmpty: true,
                    MenuProps: {
                      style: {
                        maxHeight: 300,
                      },
                    },
                  }}
                  value={formik.values.role || ""}
                  onChange={formik.handleChange}
                  error={formik.touched.role && Boolean(formik.errors.role)}
                  helperText={formik.touched.role && formik.errors.role}
                  disabled={selectedUser?.role === RoleEnum.ADMIN}
                >
                  {ROLE_TYPE_OPTIONS.map((i) => (
                    <MenuItem
                      key={i.label}
                      value={i.label}
                      hidden={user?.role !== RoleEnum.ADMIN}
                    >
                      {i.value}
                    </MenuItem>
                  ))}
                </TextField>

                {user?.role === RoleEnum.ADMIN && (
                  <UserPermissionSection
                    position={positions.find((p: Position) => p._id === formik.values.position)}
                    positionDepartment={departments.find(
                      (d: Department) =>
                        d._id ===
                        (positions.find((p: Position) => p._id === formik.values.position) as any)?.department,
                    )}
                    userDepartment={departments.find((d: Department) => d._id === formik.values.department)}
                    customPermissions={Boolean(formik.values.customPermissions)}
                    rows={Array.isArray(formik.values.permissions) ? formik.values.permissions : []}
                    onChange={({ customPermissions, permissions }) => {
                      formik.setFieldValue("customPermissions", customPermissions);
                      formik.setFieldValue("permissions", permissions);
                    }}
                  />
                )}

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
                primary={`Tất cả (${users.length})`}
                sx={{ color: "brand.title" }}
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
                primary={`Hoạt động (${users.filter((o: User) => o.active).length})`}
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
                primary={`Không hoạt động (${users.filter((o: User) => !o.active).length})`}
                sx={{ color: "grey" }}
              />
            </Box>
          </Box>
        </Box>
        <DataGrid
          rows={filteredOrders}
          columns={visibleColumns}
          getRowId={(row) => row._id}
          pageSizeOptions={[10, 20, 50]}
          autoHeight
          disableRowSelectionOnClick
          checkboxSelection={user?.role === RoleEnum.ADMIN}
          isRowSelectable={(params) => params.row.role !== RoleEnum.ADMIN}
          onRowSelectionModelChange={(newSelection) => {
            setSelectedUsers(newSelection as string[]);
          }}
          slots={{ toolbar: GridToolbar }}
          localeText={{
            toolbarColumns: "Cột",
            toolbarFilters: "Bộ lọc",
            toolbarDensity: "Mật độ",
          }}
          slotProps={{
            filterPanel: { disableAddFilterButton: false },
            toolbar: {
              csvOptions: { disableToolbarButton: true },
              printOptions: { disableToolbarButton: true },
            },
          }}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 10, page: 0 },
            },
            density: "compact",
          }}
          loading={isLoading}
          sx={{
            "& .MuiDataGrid-columnHeaderTitle": {
              // width: '100%',
              textAlign: "center",
              fontWeight: "bold",
              fontSize: 18,
            },
            "& .MuiDataGrid-row:nth-of-type(odd)": {
              backgroundColor: "brand.zebra",
            },
            "& .MuiDataGrid-row:nth-of-type(even)": {
              backgroundColor: "white",
            },
          }}
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
