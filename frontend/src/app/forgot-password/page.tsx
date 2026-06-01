'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

const formSchema = z.object({
  email: z.string().email({ message: 'Vui lòng nhập đúng định dạng email' }),
});

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');

  const [resetData, setResetData] = useState({
    otp_code: '',
    new_password: '',
    confirm_password: '',
  });
  const [resetting, setResetting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setLoading(true);
      await authService.forgotPassword(values.email);
      setEmail(values.email);
      setStep('reset');
      toast.success('Đã gửi email chứa mã OTP khôi phục mật khẩu!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể gửi email. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (resetData.new_password !== resetData.confirm_password) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }
    if (resetData.new_password.length < 6) {
      toast.error('Mật khẩu phải từ 6 ký tự');
      return;
    }
    
    try {
      setResetting(true);
      await authService.resetPassword({
        email,
        otp_code: resetData.otp_code,
        new_password: resetData.new_password
      });
      toast.success('Khôi phục mật khẩu thành công! Hãy đăng nhập lại.');
      window.location.href = '/login';
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể đổi mật khẩu. Mã OTP có thể không đúng hoặc đã hết hạn.');
    } finally {
      setResetting(false);
    }
  }

  return (
    <MainLayout>
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center py-12 px-4 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-xl shadow-slate-200/50 border border-slate-100 p-8">
            {step === 'reset' ? (
              /* Reset Password Form */
              <div className="space-y-4">
                <div className="flex flex-col items-center mb-6">
                  <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-navy">Nhập mã xác thực</h2>
                  <p className="text-slate-500 text-sm mt-1 text-center px-4">
                    Mã OTP đã được gửi đến email <strong>{email}</strong>
                  </p>
                </div>
                
                <form onSubmit={handleReset} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-navy mb-1">Mã OTP (6 số)</label>
                    <Input 
                      placeholder="Nhập mã OTP" 
                      value={resetData.otp_code}
                      onChange={e => setResetData({...resetData, otp_code: e.target.value})}
                      required
                      className="h-12 bg-slate-50 border-slate-200 focus:border-blood"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy mb-1">Mật khẩu mới</label>
                    <Input 
                      type="password" 
                      placeholder="Nhập mật khẩu mới" 
                      value={resetData.new_password}
                      onChange={e => setResetData({...resetData, new_password: e.target.value})}
                      required
                      minLength={6}
                      className="h-12 bg-slate-50 border-slate-200 focus:border-blood"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy mb-1">Xác nhận mật khẩu</label>
                    <Input 
                      type="password" 
                      placeholder="Nhập lại mật khẩu" 
                      value={resetData.confirm_password}
                      onChange={e => setResetData({...resetData, confirm_password: e.target.value})}
                      required
                      className="h-12 bg-slate-50 border-slate-200 focus:border-blood"
                    />
                  </div>
                  
                  <div className="pt-2">
                    <Button 
                      type="submit" 
                      disabled={resetting}
                      className="w-full h-12 bg-blood hover:bg-blood-dark text-white font-semibold rounded-md transition-all hover:shadow-lg hover:shadow-blood/25"
                    >
                      {resetting ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Đang xử lý...
                        </span>
                      ) : (
                        'Khôi phục mật khẩu'
                      )}
                    </Button>
                  </div>
                </form>
                
                <div className="mt-6 text-center">
                  <button 
                    onClick={() => setStep('request')}
                    className="text-sm text-slate-500 hover:text-blood transition-colors inline-flex items-center gap-1"
                  >
                    <ArrowLeft className="h-3 w-3" /> Trở lại gửi mã
                  </button>
                </div>
              </div>
            ) : (
              /* Request Form */
              <>
                <div className="flex flex-col items-center mb-8">
                  <div className="w-14 h-14 bg-blood rounded-md flex items-center justify-center mb-4 shadow-lg shadow-blood/25">
                    <KeyRound className="w-7 h-7 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-navy">Quên mật khẩu</h2>
                  <p className="text-slate-500 text-sm mt-1 text-center">Nhập email để nhận liên kết khôi phục mật khẩu</p>
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-navy">Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="Nhập email đã đăng ký"
                              className="h-12 rounded-lg border-slate-200 focus:border-blood"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full h-12 bg-blood hover:bg-blood-dark text-white font-semibold rounded-md transition-all hover:shadow-lg hover:shadow-blood/25"
                      disabled={loading}
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Đang gửi...
                        </span>
                      ) : (
                        'Gửi mã xác thực'
                      )}
                    </Button>
                  </form>
                </Form>

                <div className="mt-6 text-center">
                  <Link href="/login" className="text-sm text-slate-500 hover:text-blood transition-colors inline-flex items-center gap-1">
                    <ArrowLeft className="h-3 w-3" /> Quay lại đăng nhập
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
