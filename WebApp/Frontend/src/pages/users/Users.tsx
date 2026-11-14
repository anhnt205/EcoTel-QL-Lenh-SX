import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  IconButton,
  Typography,
  TextField,
  MenuItem,
  Autocomplete,
  InputAdornment,
  Grid,
  LinearProgress,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useFormik } from "formik";
import api from "../../config/api.config";
import { Department, Position, User } from "../../types";
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
import { DesignListView, type DesignColumn } from "../../components/design/DesignListView";
import DesignModal from "../../components/design/DesignModal";
import DIcon from "../../components/design/DIcon";

const roleLabel = (role: unknown) =>
  role === RoleEnum.ADMIN
    ? "Quản trị hệ thống"
    : role === RoleEnum.DISPATCHER
      ? "Điều hành sản xuất"
      : role === RoleEnum.MANAGER
        ? "Quản lý"
        : "Nhân viên";

/** Danh mục Cán bộ nhân viên — bảng/cửa sổ theo thiết kế (cùng giao diện danh mục Thống kê). */
const Users: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [department, setDepartment] = useState("");
  const [active, setActive] = useState("");
  const [avatar, setAvatar] = useState("");
  const queryClient = useQueryClient();
  const [user] = useAtom(userAtom);
  const isAdmin = user?.role === RoleEnum.ADMIN;

  const [showPassword, setShowPassword] = useState(false);
  const handleTogglePassword = () => {
    setShowPassword((prev) => !prev);
  };

  // Lọc theo đơn vị ở máy chủ; tìm kiếm và lọc cột ở trình duyệt
  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ["users", "", department],
    queryFn: () =>
      UserService.getAll({
        q: "",
        department: department,
      }),
  });
  const filteredUsers = React.useMemo(() => {
    if (!active) return users;
    return users.filter((o: User) => o.active === (active === "true"));
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
      showSuccessAlert(message || "Xóa thành công");
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
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedUser(null);
    setAvatar("");
    formik.resetForm();
  };

  const handleDelete = (rows: any[]) => {
    // không xóa tài khoản quản trị hệ thống
    const ids = rows.filter((r) => r.role !== RoleEnum.ADMIN).map((r) => r._id);
    if (ids.length === 0) {
      showErrorAlert("Không tìm thấy bản ghi cần xóa");
      return;
    }
    showConfirmAlert(`Bạn có muốn xóa ${ids.length} bản ghi?`).then((result) => {
      if (result.isConfirmed) {
        deleteMutation.mutate(ids);
      }
    });
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
      // Không set key nếu có lỗi bất kỳ bước nào
      showErrorAlert(
        err instanceof Error
          ? err.message
          : "Tải ảnh lên thất bại, vui lòng thử lại",
      );
    }
  };

  const columns = useMemo<DesignColumn<any>[]>(
    () => [
      { key: "fullName", label: "Họ tên", width: 200, value: (r) => String(r.fullName ?? "") },
      { key: "salaryCode", label: "Thẻ lương", width: 120, value: (r) => String(r.salaryCode ?? "") },
      { key: "username", label: "Tài khoản", width: 150, value: (r) => String(r.username ?? "") },
      { key: "gender", label: "Giới tính", width: 100, value: (r) => String(r.gender ?? "") },
      { key: "phone", label: "Số điện thoại", width: 140, value: (r) => String(r.phone ?? "") },
      { key: "email", label: "Email", width: 210, value: (r) => String(r.email ?? "") },
      { key: "position", label: "Chức danh, nghề nghiệp", width: 220, value: (r) => r?.position?.name || "" },
      {
        key: "department",
        label: "Đơn vị",
        width: 200,
        value: (r) => (typeof r.department === "object" && r.department !== null ? r.department.name : "Chưa có"),
      },
      { key: "role", label: "Phân quyền", width: 160, value: (r) => roleLabel(r.role) },
      {
        key: "active",
        label: "Trạng thái",
        width: 130,
        value: (r) => (r.active ? "Hoạt động" : "Không hoạt động"),
        render: (r) =>
          isAdmin ? (
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input
                className="checkbox"
                type="checkbox"
                checked={!!r.active}
                onChange={(e) => updateMutation.mutate({ _id: r._id, active: e.target.checked })}
              />
              {r.active ? "Hoạt động" : "Tạm dừng"}
            </label>
          ) : r.active ? (
            "Hoạt động"
          ) : (
            "Không hoạt động"
          ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isAdmin],
  );

  const saving = createMutation.isPending || updateMutation.isPending;
  const countActive = users.filter((o: User) => o.active).length;

  return (
    <DesignListView
      trail={["Danh mục", "Đơn vị"]}
      title="Cán bộ nhân viên"
      description="Quản lý tài khoản, đơn vị, chức danh và phân quyền của cán bộ nhân viên"
      noun="cán bộ nhân viên"
      rows={filteredUsers}
      getId={(r: any) => r._id}
      columns={columns}
      loading={isLoading}
      onRefresh={() => refetch()}
      onAdd={isAdmin ? () => handleOpen() : undefined}
      onEdit={isAdmin ? (r) => handleOpen(r) : undefined}
      onView={(r) => {
        setSelectedUser(r);
        setHistory(true);
      }}
      onDelete={isAdmin ? handleDelete : undefined}
      isRowSelectable={(r) => r.role !== RoleEnum.ADMIN}
      onImport={isAdmin ? (file) => {
        const formData = new FormData();
        formData.append("file", file);
        importFile.mutate(formData);
      } : undefined}
      isImporting={isUploading}
      onExport={isAdmin ? () => exportExcel.mutate() : undefined}
      extraRowActions={
        isAdmin
          ? (r: any) => (
              <button
                className="row-action copy"
                title="Reset mật khẩu"
                onClick={async () => {
                  const result = await showConfirmAlert(
                    `Bạn có muốn reset mật khẩu cho người dùng ${r?.username}?`,
                  );
                  if (result.isConfirmed) {
                    resetMutation.mutate(r._id);
                  }
                }}
              >
                <DIcon name="refresh" />
              </button>
            )
          : undefined
      }
      toolbarSlot={
        <>
          <select className="select" aria-label="Lọc theo trạng thái" value={active} onChange={(e) => setActive(e.target.value)}>
            <option value="">{`Tất cả (${users.length})`}</option>
            <option value="true">{`Hoạt động (${countActive})`}</option>
            <option value="false">{`Không hoạt động (${users.length - countActive})`}</option>
          </select>
          {isAdmin && (
            <select className="select" aria-label="Lọc theo đơn vị" value={department} onChange={(e) => setDepartment(e.target.value)}>
              <option value="">Tất cả đơn vị</option>
              {departments.map((d: Department) => (
                <option key={d._id} value={d._id}>
                  {d.code}
                </option>
              ))}
            </select>
          )}
        </>
      }
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
        title={selectedUser ? "Chỉnh sửa cán bộ nhân viên" : "Thêm mới cán bộ nhân viên"}
        description="Các trường có dấu * là bắt buộc."
        confirmLabel={selectedUser ? "Cập nhật" : "Thêm mới"}
        busy={saving}
        wide
        onClose={handleClose}
        onConfirm={() => formik.handleSubmit()}
      >
        <Box component="form" onSubmit={formik.handleSubmit}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
            <TextField
              fullWidth
              id="username"
              name="username"
              label="Tên đăng nhập *"
              value={formik.values.username}
              onChange={formik.handleChange}
              error={formik.touched.username && Boolean(formik.errors.username)}
              helperText={formik.touched.username && formik.errors.username}
            />
            {!selectedUser && (
              <TextField
                fullWidth
                id="password"
                name="password"
                label="Mật khẩu *"
                type={showPassword ? "text" : "password"}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={handleTogglePassword} edge="end">
                        {showPassword ? <Visibility /> : <VisibilityOff />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                value={formik.values.password}
                onChange={formik.handleChange}
                error={formik.touched.password && Boolean(formik.errors.password)}
                helperText={formik.touched.password && formik.errors.password}
              />
            )}
            <TextField
              fullWidth
              id="fullName"
              name="fullName"
              label="Họ tên *"
              value={formik.values.fullName}
              onChange={formik.handleChange}
              error={formik.touched.fullName && Boolean(formik.errors.fullName)}
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
              error={formik.touched.salaryCode && Boolean(formik.errors.salaryCode)}
              helperText={formik.touched.salaryCode && formik.errors.salaryCode}
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
              value={positions.find((d: Position) => d._id === formik.values.position) || null}
              onChange={(event, newValue) => {
                formik.setFieldValue("position", newValue?._id || "");
              }}
              PopperComponent={StyledPopper}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Chức danh, nghề nghiệp"
                  error={formik.touched.position && Boolean(formik.errors.position)}
                  helperText={
                    formik.touched.position && typeof formik.errors.position === "string"
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
                    (user?.role === RoleEnum.MANAGER ? user?.department?._id : formik.values.department),
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
                  error={formik.touched.department && Boolean(formik.errors.department)}
                  helperText={
                    formik.touched.department && typeof formik.errors.department === "string"
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
                MenuProps: { style: { maxHeight: 300 } },
              }}
              value={formik.values.role || ""}
              onChange={formik.handleChange}
              error={formik.touched.role && Boolean(formik.errors.role)}
              helperText={formik.touched.role && formik.errors.role}
              disabled={selectedUser?.role === RoleEnum.ADMIN}
            >
              {ROLE_TYPE_OPTIONS.map((i) => (
                <MenuItem key={i.label} value={i.label} hidden={user?.role !== RoleEnum.ADMIN}>
                  {i.value}
                </MenuItem>
              ))}
            </TextField>

            {isAdmin && (
              <Box sx={{ gridColumn: "1 / -1" }}>
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
              </Box>
            )}

            <Box sx={{ gridColumn: "1 / -1" }}>
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
        </Box>
      </DesignModal>

      <UserHistories
        open={history}
        setOpen={setHistory}
        initialValues={selectedUser}
      />
    </DesignListView>
  );
};

export default Users;
