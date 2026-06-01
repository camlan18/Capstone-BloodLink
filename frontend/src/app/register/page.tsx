'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/services/auth';
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
import { Heart, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

const formSchema = z.object({
  username: z.string().min(3, { message: 'Tên đăng nhập phải có ít nhất 3 ký tự' }),
  password: z.string().min(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' }),
  email: z.string().email({ message: 'Email không hợp lệ' }),
  full_name: z.string().min(3, { message: 'Họ và tên phải có ít nhất 3 ký tự' }),
});

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { username: '', password: '', email: '', full_name: '' },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setLoading(true);
      await authService.register(values);
      toast.success('Đăng ký thành công! Vui lòng kiểm tra email để lấy mã OTP.');
      router.push(`/verify-otp?email=${encodeURIComponent(values.email)}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Đăng ký thất bại. Vui lòng kiểm tra lại!');
    } finally {
      setLoading(false);
    }
  }

  return (
    <MainLayout>
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center py-12 px-4 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-xl shadow-slate-200/50 border border-slate-100 p-8">
            <div className="flex flex-col items-center mb-8">
              <div className="w-14 h-14 bg-blood rounded-md flex items-center justify-center mb-4 shadow-lg shadow-blood/25">
                <Heart className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-navy">Tạo tài khoản</h2>
              <p className="text-slate-500 text-sm mt-1 text-center">Gia nhập cộng đồng hiến máu cứu người!</p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-navy">Họ và tên</FormLabel>
                      <FormControl>
                        <Input placeholder="Nguyễn Văn A" className="h-12 rounded-lg border-slate-200 focus:border-blood" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-navy">Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="example@gmail.com" className="h-12 rounded-lg border-slate-200 focus:border-blood" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-navy">Tên đăng nhập</FormLabel>
                      <FormControl>
                        <Input placeholder="username123" className="h-12 rounded-lg border-slate-200 focus:border-blood" {...field} />
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
                            className="h-12 rounded-lg border-slate-200 focus:border-blood pr-12"
                            {...field}
                          />
                          <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full h-12 bg-blood hover:bg-blood-dark text-white font-semibold rounded-md transition-all hover:shadow-lg hover:shadow-blood/25 mt-2"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-md animate-spin" />
                      Đang xử lý...
                    </span>
                  ) : (
                    'Đăng ký'
                  )}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center text-sm text-slate-500">
              Đã có tài khoản?{' '}
              <Link href="/login" className="text-blood hover:text-blood-dark font-semibold transition-colors">
                Đăng nhập
              </Link>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
