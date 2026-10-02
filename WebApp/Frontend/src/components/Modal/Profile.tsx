import React, {
  Dispatch,
  SetStateAction,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  MenuItem,
  Grid,
  Autocomplete,
  Typography,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import imageCompression from "browser-image-compression";
import api from "../../config/api.config";
import * as yup from "yup";
import { FormikProvider, useFormik } from "formik";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Department, User } from "../../types";
import { showErrorAlert, showSuccessAlert } from "../Alert";
import { RoleEnum } from "../../enums";
import { ROLE_TYPE_OPTIONS } from "../../utils/const";
import ImageUploadBox from "../ImageUploadBox";
import FieldInput from "../field/FieldInput";
import FieldAutoCompleted from "../field/FieldAutoCompleted";
import PositionService from "../../services/positionService";
import DepartmentService from "../../services/departmentService";

export default function Profile({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const [avatar, setAvatar] = useState("");
  const [signatureUrl, setSignatureUrl] = useState("");

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: () => api.get(`/auth/me`).then((res) => res.data.data.user),
  });

  const { data: positions = { data: [] } } = useQuery({
    queryKey: ["positions"],
    queryFn: () => PositionService.getAll(),
  });
  const { data: departments = { data: [] } } = useQuery({
    queryKey: ["departments"],
    queryFn: () => DepartmentService.getAll(),
  });

  const updateMutation = useMutation({
    mutationFn: (updatedUser: Partial<User>) =>
      api
        .put(`/users/update/${updatedUser._id}`, updatedUser)
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
      showSuccessAlert("Cập nhật thông tin thành công");
      handleClose();
    },
    onError: (error: any) => {
      showErrorAlert(error.response?.data?.message || "Lỗi");
    },
  });

  const formik = useFormik({
    initialValues: {
      _id: "",
      username: "",
      password: "",
      fullName: "",
      gender: "",
      email: "",
      phone: "",
      avatar: "",
      signature: "",
      salaryCode: "",
      department: "",
      position: "",
      role: "",
    },
    enableReinitialize: true,
    onSubmit: (values) => {
      updateMutation.mutate({ ...values });
    },
    validationSchema: yup.object({
      fullName: yup.string().required("Vui lòng nhập họ tên"),
      email: yup.string().email("Email không hợp lệ"),
      phone: yup.string(),
      salaryCode: yup.string(),
    }),
  });

  useEffect(() => {
    if (user && open) {
      setAvatar(user.avatar || "");
      setSignatureUrl(user.signature || "");
      formik.setValues({
        _id: user._id,
        username: user.username || "",
        password: "",
        fullName: user.fullName || "",
        gender: user.gender || "",
        email: user.email || "",
        phone: user.phone || "",
        avatar: user.avatar || "",
        signature: user.signature || "",
        salaryCode: user.salaryCode || "",
        department: user.department?._id || "",
        position: user.position?._id || "",
        role: user.role || "",
      });
    }
  }, [user, open]);

  const handleClose = () => {
    setOpen(false);
    formik.resetForm();
  };

  const handleImageUpload = async (
    file: File,
    type: "avatar" | "signature",
  ) => {
    try {
      const resizedFile = await imageCompression(file, {
        maxWidthOrHeight: 300,
        maxSizeMB: 1,
        fileType: "image/webp", // ✅ Force convert sang webp
        useWebWorker: true,
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
      if (type === "avatar") {
        setAvatar(fileKey);
        formik.setFieldValue("avatar", fileKey);
      } else {
        setSignatureUrl(fileKey);
        formik.setFieldValue("signature", fileKey);
      }
    } catch (err) {
      // ✅ Catch mọi lỗi, không silent fail
      showErrorAlert(
        err instanceof Error
          ? err.message
          : "Tải ảnh lên thất bại, vui lòng thử lại",
      );
    }
  };

  const roles = useMemo(
    () => ROLE_TYPE_OPTIONS.map((r) => ({ _id: r.label, name: r.value })),
    [],
  );

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Thông tin người dùng</DialogTitle>
      <DialogContent>
        <FormikProvider value={formik}>
          <Box component="form" onSubmit={formik.handleSubmit} sx={{ mt: 2 }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <FieldInput name="username" title="Tên đằng nhập" disabled />

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
                disabled
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

                <Grid item>
                  <ImageUploadBox
                    type="signature"
                    currentKey={signatureUrl}
                    onClear={() => {
                      setSignatureUrl("");
                      formik.setFieldValue("signature", "");
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
        <Button variant="contained" onClick={() => formik.handleSubmit()}>
          Cập nhật
        </Button>
      </DialogActions>
    </Dialog>
  );
}
