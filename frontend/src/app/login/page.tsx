'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/services/auth';
import { useAuthStore } from '@/lib/stores';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Droplet, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

const formSchema = z.object({
  identifier: z.string().min(1, { message: 'Vui lòng nhập Email hoặc Tên đăng nhập' }),
  password: z.string().min(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' }),
});

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { identifier: '', password: '' },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setLoading(true);
      const res = await authService.login(values);
      if (res && res.data) {
        login(res.data.user, res.data.access_token, res.data.refresh_token);
        toast.success('Đăng nhập thành công!');
        router.push('/');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại!');
    } finally {
      setLoading(false);
    }
  }

  return (
    <MainLayout>
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center py-12 px-4 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-white rounded-lg shadow-xl shadow-slate-200/50 border border-slate-100 p-8">
            {/* Logo */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-14 h-14 flex items-center justify-center mb-4">
                <img src="/logo.png" alt="BloodLink Logo" className="w-full h-full object-contain" />
              </div>
              <h2 className="text-2xl font-bold text-navy">Đăng nhập</h2>
              <p className="text-slate-500 text-sm mt-1">Chào mừng bạn trở lại BloodLink</p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="identifier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-navy">Email hoặc Tên đăng nhập</FormLabel>
                      <FormControl>
                        <Input type="text" placeholder="Nhập địa chỉ email hoặc tên đăng nhập" className="h-12 rounded-lg border-slate-200 focus:border-blood focus:ring-blood/20" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-navy">Mật khẩu</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPass ? 'text' : 'password'}
                            placeholder="••••••••"
                            className="h-12 rounded-lg border-slate-200 focus:border-blood focus:ring-blood/20 pr-12"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPass(!showPass)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Link href="/forgot-password" className="text-sm text-blood hover:text-blood-dark font-medium transition-colors">
                    Quên mật khẩu?
                  </Link>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-blood hover:bg-blood-dark text-white font-semibold rounded-md transition-all hover:shadow-lg hover:shadow-blood/25"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-md animate-spin" />
                      Đang đăng nhập...
                    </span>
                  ) : (
                    'Đăng nhập'
                  )}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center text-sm text-slate-500">
              Chưa có tài khoản?{' '}
              <Link href="/register" className="text-blood hover:text-blood-dark font-semibold transition-colors">
                Đăng ký ngay
              </Link>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
