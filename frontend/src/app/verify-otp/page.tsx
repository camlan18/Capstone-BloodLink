'use client';
import { useState, Suspense, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService } from '@/lib/services/auth';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import Link from 'next/link';
import { Mail, Edit2 } from 'lucide-react';

const formSchema = z.object({
  otp_code: z.string().length(6, { message: 'Mã xác thực phải gồm 6 chữ số' }),
});

function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { otp_code: '' },
  });

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!email) {
      toast.error('Không tìm thấy email. Vui lòng thử đăng ký lại.');
      return;
    }
    try {
      setLoading(true);
      await authService.verifyOtp({ email, otp_code: values.otp_code });
      toast.success('Xác thực thành công! Vui lòng đăng nhập.');
      router.push('/login');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Xác thực thất bại. Vui lòng kiểm tra lại mã OTP!');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!email) {
      toast.error('Không tìm thấy email.');
      return;
    }
    try {
      setResending(true);
      await authService.resendOtp({ email });
      toast.success('Đã gửi lại OTP vào email của bạn!');
      setCountdown(60); // 60s cooldown
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể gửi lại OTP.');
    } finally {
      setResending(false);
    }
  }

  const handleOtpChange = (index: number, e: React.ChangeEvent<HTMLInputElement>, field: any) => {
    const value = e.target.value;
    if (value && !/^[0-9]*$/.test(value)) return;
    
    const newValue = value.slice(-1);
    const currentOtp = field.value.split('');
    const newOtpArray = Array(6).fill('');
    for (let i = 0; i < currentOtp.length; i++) {
      newOtpArray[i] = currentOtp[i] || '';
    }
    
    newOtpArray[index] = newValue;
    field.onChange(newOtpArray.join(''));
    
    if (newValue && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>, field: any) => {
    if (e.key === 'Backspace' && !field.value[index] && index > 0) {
      const currentOtp = field.value.split('');
      currentOtp[index - 1] = '';
      field.onChange(currentOtp.join(''));
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent, field: any) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').replace(/[^0-9]/g, '').slice(0, 6);
    if (pastedData) {
      field.onChange(pastedData);
      const focusIndex = Math.min(pastedData.length, 5);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center py-12 px-4 bg-slate-50">
      <div className="w-full max-w-[480px]">
        <div className="bg-white rounded-lg shadow-xl shadow-slate-200/50 border border-slate-100 p-8 sm:p-12 text-center">
          
          <div className="mx-auto w-16 h-16 bg-blue-50 text-blood rounded-lg flex items-center justify-center mb-6">
            <Mail className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-bold text-navy mb-3">Kiểm tra hộp thư của bạn</h2>
          <p className="text-slate-500 text-sm mb-6">
            Vui lòng nhập mã bảo mật 6 số mà chúng tôi vừa gửi đến địa chỉ email
            <br />
            <span className="font-semibold text-navy inline-flex items-center gap-1 mt-1">
              {email || 'Không xác định'}
              <Link href="/register" className="text-blood hover:text-blood-dark">
                <Edit2 className="w-3.5 h-3.5" />
              </Link>
            </span>
          </p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="otp_code"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="flex justify-center gap-2 sm:gap-3">
                        {Array(6).fill(0).map((_, i) => (
                          <input
                            key={i}
                            ref={(el) => { inputRefs.current[i] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={field.value[i] || ''}
                            onChange={(e) => handleOtpChange(i, e, field)}
                            onKeyDown={(e) => handleKeyDown(i, e, field)}
                            onPaste={(e) => handlePaste(e, field)}
                            className="w-11 h-14 sm:w-12 sm:h-16 text-center text-2xl font-bold text-navy bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blood focus:ring-4 focus:ring-blood/10 transition-all outline-none"
                          />
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage className="mt-2" />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-14 bg-blood hover:bg-blood-dark text-white text-lg font-semibold rounded-lg transition-all shadow-lg shadow-blood/25"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-md animate-spin" />
                    Đang xác thực...
                  </span>
                ) : (
                  'Xác nhận'
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-8 text-center text-sm">
            <span className="text-slate-500">Chưa nhận được mã? </span>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || countdown > 0}
              className="font-semibold text-navy hover:text-blood transition-colors disabled:opacity-50 disabled:hover:text-navy"
            >
              {resending ? 'Đang gửi...' : countdown > 0 ? `Gửi lại sau ${countdown}s` : 'Gửi lại mã'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <MainLayout>
      <Suspense fallback={<div className="flex min-h-[calc(100vh-200px)] items-center justify-center">Đang tải...</div>}>
        <VerifyOtpForm />
      </Suspense>
    </MainLayout>
  );
}
