import { z } from 'zod';

// Schema đăng nhập
export const signInSchema = z.object({
  username: z
    .string()
    .min(1, 'Tên đăng nhập không được để trống')
    .min(3, 'Tên đăng nhập phải có ít nhất 3 ký tự'),
  password: z
    .string()
    .min(1, 'Mật khẩu không được để trống')
    .min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
});

export type SignInFormData = z.infer<typeof signInSchema>;

// Schema tạo user mới
export const createUserSchema = z
  .object({
    hoTen: z
      .string()
      .min(1, 'Họ tên không được để trống')
      .min(2, 'Họ tên phải có ít nhất 2 ký tự'),
    username: z
      .string()
      .min(1, 'Tên đăng nhập không được để trống')
      .min(3, 'Tên đăng nhập phải có ít nhất 3 ký tự')
      .regex(
        /^[a-zA-Z0-9_]+$/,
        'Tên đăng nhập chỉ chứa chữ, số và dấu gạch dưới'
      ),
    password: z
      .string()
      .min(1, 'Mật khẩu không được để trống')
      .min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
      .regex(/\d/, 'Mật khẩu phải chứa ít nhất 1 chữ số'),
    confirmPassword: z.string().min(1, 'Xác nhận mật khẩu không được để trống'),
    role: z.enum(['admin', 'nhap_lieu', 'bao_cao'], 'Vai trò không hợp lệ'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

export type CreateUserFormData = z.infer<typeof createUserSchema>;

// Schema cập nhật user
export const updateUserSchema = z.object({
  hoTen: z
    .string()
    .min(1, 'Họ tên không được để trống')
    .min(2, 'Họ tên phải có ít nhất 2 ký tự'),
  role: z.enum(['admin', 'nhap_lieu', 'bao_cao'], 'Vai trò không hợp lệ'),
  trangThai: z.enum(['active', 'inactive'], 'Trạng thái không hợp lệ'),
});

export type UpdateUserFormData = z.infer<typeof updateUserSchema>;

// Schema đặt lại mật khẩu
export const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(1, 'Mật khẩu mới không được để trống')
      .min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
      .regex(/\d/, 'Mật khẩu phải chứa ít nhất 1 chữ số'),
    confirmPassword: z.string().min(1, 'Xác nhận mật khẩu không được để trống'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

// Schema đổi mật khẩu
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Mật khẩu hiện tại không được để trống'),
    newPassword: z
      .string()
      .min(1, 'Mật khẩu mới không được để trống')
      .min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
      .regex(/\d/, 'Mật khẩu phải chứa ít nhất 1 chữ số'),
    confirmPassword: z.string().min(1, 'Xác nhận mật khẩu không được để trống'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
