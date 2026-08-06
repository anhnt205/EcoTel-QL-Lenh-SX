import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { signInSchema, type SignInFormData } from '@/modules/auth/schemas/auth.schema';
import { useAuthStore } from '@/modules/auth/stores/auth.store';
import { toast } from 'sonner';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

function EcotelLogo({ className = "h-11 w-11" }: { className?: string }) {
  return (
    <div className={`rounded-full bg-white p-1 shadow-md flex items-center justify-center shrink-0 border border-emerald-100/20 ${className}`}>
      <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="46" fill="#ffffff" stroke="#137947" strokeWidth="4" />
        <circle cx="50" cy="50" r="38" fill="none" stroke="#d97706" strokeWidth="2.5" strokeDasharray="6 3" />
        <path d="M 50 16 L 75 68 L 25 68 Z" fill="#dc2626" opacity="0.95" />
        <path d="M 50 25 L 68 64 L 32 64 Z" fill="#ffffff" />
        <circle cx="50" cy="46" r="14" fill="#0284c7" />
        <path d="M 32 50 Q 50 32 68 50 Q 50 68 32 50 Z" fill="none" stroke="#ffffff" strokeWidth="2.5" />
        <text x="50" y="85" textAnchor="middle" fill="#137947" fontSize="10" fontWeight="900" fontFamily="sans-serif">
          ECOTEL
        </text>
      </svg>
    </div>
  );
}

export function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const signIn = useAuthStore((s) => s.signIn);
  const loading = useAuthStore((s) => s.loading);

  const form = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: { username: '', password: '' },
  });

  const onSubmit = async (data: SignInFormData) => {
    setError(null);
    try {
      await signIn(data);
      toast.success('Đăng nhập thành công');
      const currentUser = useAuthStore.getState().user;
      if (currentUser?.role === 'bao_cao') {
        navigate('/nhap-lieu/doi-chieu');
      } else {
        navigate('/nhap-lieu/van-tai');
      }
    } catch {
      setError('Tên đăng nhập hoặc mật khẩu không đúng');
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-gray-50/50">
      {/* Left Panel: Branding & Company Info (Hidden on mobile) */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[#137947] p-12 lg:flex">
        {/* Background decorative elements */}
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-emerald-600/20 blur-3xl"></div>
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-emerald-800/40 blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col">
          <EcotelLogo className="mb-8 h-20 w-20 shadow-xl" />
          <h1 className="text-4xl font-extrabold tracking-tight text-white uppercase leading-[1.15]">
            Công ty Cổ phần<br />
            Than Cao Sơn - TKV
          </h1>
          <p className="mt-5 max-w-md text-lg text-emerald-50 leading-relaxed font-medium">
            Phần mềm thống kê Cao Sơn. Hỗ trợ tổng hợp, giám sát, phân tích và báo cáo số liệu chuyên sâu.
          </p>
          
          <div className="mt-10 space-y-4">
            <div className="flex items-center gap-3 text-emerald-100">
              <CheckCircle2 className="h-5 w-5 text-amber-400" />
              <span>Thống kê số liệu chính xác 100%</span>
            </div>
            <div className="flex items-center gap-3 text-emerald-100">
              <CheckCircle2 className="h-5 w-5 text-amber-400" />
              <span>Hệ thống báo cáo đa chiều, trực quan</span>
            </div>
            <div className="flex items-center gap-3 text-emerald-100">
              <CheckCircle2 className="h-5 w-5 text-amber-400" />
              <span>Phân quyền bảo mật đa lớp</span>
            </div>
          </div>
        </div>
        
        <div className="relative z-10 font-medium text-emerald-200/60 text-sm">
          &copy; {new Date().getFullYear()} TKV - Vinacomin. All rights reserved.
        </div>
      </div>

      {/* Right Panel: Login Form */}
      <div className="flex w-full flex-col justify-center px-4 py-12 sm:px-6 lg:w-1/2 lg:px-20 xl:px-32">
        <div className="mx-auto w-full max-w-[420px]">
          
          {/* Mobile Logo */}
          <div className="mb-8 flex justify-center lg:hidden">
            <EcotelLogo className="h-20 w-20 shadow-lg" />
          </div>

          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Chào mừng trở lại
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Đăng nhập để truy cập phần mềm thống kê Cao Sơn
            </p>
          </div>

          <div className="rounded-2xl bg-white p-8 shadow-xl shadow-gray-200/50 border border-gray-100">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-600">
                        Tên đăng nhập
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Nhập tên đăng nhập"
                          className="h-12 rounded-xl bg-gray-50/50 px-4 text-sm border-gray-200 focus-visible:ring-1 focus-visible:ring-emerald-600 focus-visible:border-emerald-600 transition-colors"
                        />
                      </FormControl>
                      <FormMessage className="text-xs text-red-500" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-600">
                        Mật khẩu
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Nhập mật khẩu"
                            className="h-12 rounded-xl bg-gray-50/50 px-4 pr-12 text-sm border-gray-200 focus-visible:ring-1 focus-visible:ring-emerald-600 focus-visible:border-emerald-600 transition-colors"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-1.5 top-1/2 h-9 w-9 -translate-y-1/2 text-gray-400 hover:text-emerald-600 cursor-pointer rounded-lg"
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs text-red-500" />
                    </FormItem>
                  )}
                />

                {error && (
                  <Alert variant="destructive" className="rounded-xl border-red-200 bg-red-50/80 p-3.5">
                    <AlertDescription className="text-sm font-medium text-red-600 text-center">{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="mt-2 h-12 w-full rounded-xl bg-[#137947] text-sm font-bold text-white hover:bg-emerald-800 transition-all shadow-md shadow-emerald-700/20 disabled:opacity-70 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    'ĐĂNG NHẬP HỆ THỐNG'
                  )}
                </Button>
              </form>
            </Form>

            {/* Quick Login Demo Accounts */}
            <div className="mt-8 border-t border-gray-100 pt-6">
              <p className="mb-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Truy cập nhanh (Dùng thử)
              </p>
              <div className="grid grid-cols-3 gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    form.setValue('username', 'admin');
                    form.setValue('password', '123456');
                    form.handleSubmit(onSubmit)();
                  }}
                  className="h-10 rounded-lg border-gray-200 bg-white px-2 text-xs font-semibold text-gray-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer transition-colors"
                >
                  <span className="mr-1.5">👑</span> Admin
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    form.setValue('username', 'nhaplieu');
                    form.setValue('password', '123456');
                    form.handleSubmit(onSubmit)();
                  }}
                  className="h-10 rounded-lg border-gray-200 bg-white px-2 text-xs font-semibold text-gray-700 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 cursor-pointer transition-colors"
                >
                  <span className="mr-1.5">✍️</span> Nhập liệu
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    form.setValue('username', 'baocao');
                    form.setValue('password', '123456');
                    form.handleSubmit(onSubmit)();
                  }}
                  className="h-10 rounded-lg border-gray-200 bg-white px-2 text-xs font-semibold text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 cursor-pointer transition-colors"
                >
                  <span className="mr-1.5">📊</span> Báo cáo
                </Button>
              </div>
              <p className="mt-4 text-center text-xs text-gray-400">
                Mật khẩu mặc định: <code className="rounded-md bg-gray-100 px-1.5 py-0.5 font-mono text-gray-600 font-bold">123456</code>
              </p>
            </div>
          </div>
          
          <div className="mt-8 text-center text-sm text-gray-400 lg:hidden">
            &copy; {new Date().getFullYear()} TKV - Vinacomin.
          </div>
        </div>
      </div>
    </div>
  );
}

