'use client';
import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { donorService } from '@/lib/services/donor';
import { authService } from '@/lib/services/auth';
import { useAuthStore } from '@/lib/stores';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User as UserIcon, Camera, Loader2, Edit3, Save, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { BaseModal } from '@/components/ui/BaseModal';

const formSchema = z.object({
  full_name: z.string().min(3, 'Họ tên phải có ít nhất 3 ký tự'),
  identity_card: z.string().min(9, 'CCCD/CMND không hợp lệ').max(12),
  date_of_birth: z.string().min(1, 'Vui lòng chọn ngày sinh'),
  gender: z.string().min(1, 'Vui lòng chọn giới tính'),
  phone_number: z.string().min(10, 'Số điện thoại không hợp lệ'),
  address: z.string().min(5, 'Địa chỉ quá ngắn'),
  blood_type_id: z.coerce.number().min(1, 'Vui lòng chọn nhóm máu'),
  weight_kg: z.coerce.number().min(40, 'Cân nặng phải lớn hơn hoặc bằng 40kg'),
  height_cm: z.coerce.number().min(100, 'Chiều cao phải lớn hơn hoặc bằng 100cm'),
  health_notes: z.string().optional(),
  emergency_contact_name: z.string().min(3, 'Tên người liên hệ khẩn cấp quá ngắn'),
  emergency_contact_phone: z.string().min(10, 'SĐT khẩn cấp không hợp lệ'),
});

export default function DonorProfilePage() {
  const { user, setUser, donorProfile, setDonorProfile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password Change State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [submittingPassword, setSubmittingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({ otp_code: '', new_password: '', confirm_password: '' });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: '',
      identity_card: '',
      date_of_birth: '',
      gender: '',
      phone_number: '',
      address: '',
      blood_type_id: 0,
      weight_kg: 0,
      height_cm: 0,
      health_notes: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
    },
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const [donorRes, authRes] = await Promise.all([
        donorService.getProfile().catch(() => null),
        authService.getProfile().catch(() => null)
      ]);
      
      let currentDonor = donorProfile;
      let currentUser = user;

      if (donorRes && donorRes.data) {
        setDonorProfile(donorRes.data);
        currentDonor = donorRes.data;
      }
      if (authRes && authRes.data) {
        setUser(authRes.data);
        currentUser = authRes.data;
      }

      form.reset({
        full_name: currentUser?.full_name || '',
        identity_card: (currentUser as any)?.identity_card || '',
        date_of_birth: currentUser?.date_of_birth ? new Date(currentUser.date_of_birth).toISOString().split('T')[0] : '',
        gender: currentUser?.gender || '',
        phone_number: currentUser?.phone || currentDonor?.phone_number || '',
        address: currentUser?.address || currentDonor?.address || '',
        blood_type_id: currentDonor?.blood_type_id || currentUser?.blood_type_id || 0,
        weight_kg: currentDonor?.weight_kg ? Number(currentDonor.weight_kg) : 0,
        height_cm: currentDonor?.height_cm || 0,
        health_notes: currentDonor?.health_notes || '',
        emergency_contact_name: currentDonor?.emergency_contact_name || '',
        emergency_contact_phone: currentDonor?.emergency_contact_phone || '',
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setSubmitting(true);
      await donorService.updateProfile(values);
      toast.success('Cập nhật hồ sơ thành công!');
      setIsEditing(false);
      fetchProfile();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật hồ sơ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ảnh không được vượt quá 5MB');
      return;
    }

    try {
      setUploadingAvatar(true);
      const res = await authService.uploadAvatar(file);
      if (res && res.data) {
        setUser(res.data);
        toast.success('Cập nhật ảnh đại diện thành công!');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Có lỗi khi tải ảnh lên');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRequestOtp = async () => {
    try {
      setSendingOtp(true);
      await authService.requestChangePasswordOtp();
      setIsOtpSent(true);
      toast.success('Đã gửi mã OTP. Vui lòng kiểm tra email của bạn.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Có lỗi khi gửi mã OTP');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }
    if (passwordData.new_password.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    try {
      setSubmittingPassword(true);
      await authService.changePassword({ 
        otp_code: passwordData.otp_code, 
        new_password: passwordData.new_password 
      });
      toast.success('Đổi mật khẩu thành công!');
      setIsPasswordModalOpen(false);
      setIsOtpSent(false);
      setPasswordData({ otp_code: '', new_password: '', confirm_password: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Đổi mật khẩu thất bại');
    } finally {
      setSubmittingPassword(false);
    }
  };

  const getGenderText = (g: string) => {
    if (g === 'M') return 'Nam';
    if (g === 'F') return 'Nữ';
    if (g === 'O') return 'Khác';
    return 'Chưa cập nhật';
  };

  const getBloodTypeText = (id: number) => {
    const map: Record<number, string> = { 1: 'O+', 2: 'O-', 3: 'A+', 4: 'A-', 5: 'B+', 6: 'B-', 7: 'AB+', 8: 'AB-' };
    return map[id] || 'Chưa rõ';
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="h-8 bg-slate-200 rounded-md w-1/4"></div>
        <div className="h-64 bg-slate-200 rounded-lg w-full"></div>
      </div>
    );
  }

  // View Mode
  if (!isEditing) {
    return (
      <div className="max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold text-navy">Hồ sơ cá nhân</h2>
          <div className="flex items-center gap-3">
            <Button onClick={() => setIsPasswordModalOpen(true)} variant="outline" className="flex items-center gap-2 border-slate-300 text-slate-700">
              <KeyRound className="w-4 h-4" /> Đổi mật khẩu
            </Button>
            <Button onClick={() => setIsEditing(true)} variant="outline" className="flex items-center gap-2">
              <Edit3 className="w-4 h-4" /> Chỉnh sửa
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-6 mb-8">
          <div className="relative group">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden shrink-0 border-2 border-white shadow-sm">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-12 h-12 text-slate-400" />
              )}
            </div>
            
            {/* Avatar Upload Overlay */}
            <div 
              className={`absolute inset-0 bg-black/40 rounded-full flex items-center justify-center cursor-pointer transition-opacity ${uploadingAvatar ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
              onClick={() => !uploadingAvatar && fileInputRef.current?.click()}
            >
              {uploadingAvatar ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : (
                <Camera className="w-6 h-6 text-white" />
              )}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-navy">{user?.full_name || 'Chưa cập nhật tên'}</h3>
            <p className="text-slate-500">{user?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12 mb-8">
          <div><p className="text-sm text-slate-500 mb-1">CCCD / CMND</p><p className="font-medium text-navy">{(user as any)?.identity_card || 'Chưa cập nhật'}</p></div>
          <div><p className="text-sm text-slate-500 mb-1">Ngày sinh</p><p className="font-medium text-navy">{user?.date_of_birth ? new Date(user.date_of_birth).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}</p></div>
          <div><p className="text-sm text-slate-500 mb-1">Giới tính</p><p className="font-medium text-navy">{getGenderText(user?.gender || '')}</p></div>
          <div><p className="text-sm text-slate-500 mb-1">Số điện thoại</p><p className="font-medium text-navy">{user?.phone || donorProfile?.phone_number || 'Chưa cập nhật'}</p></div>
          <div className="md:col-span-2"><p className="text-sm text-slate-500 mb-1">Địa chỉ hiện tại</p><p className="font-medium text-navy">{user?.address || donorProfile?.address || 'Chưa cập nhật'}</p></div>
        </div>

        <hr className="border-slate-100 mb-8" />

        <h2 className="text-xl font-bold text-navy mb-6">Chỉ số sức khỏe</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div><p className="text-sm text-slate-500 mb-1">Nhóm máu</p><p className="font-medium text-navy font-bold text-blood">{getBloodTypeText(donorProfile?.blood_type_id || user?.blood_type_id || 0)}</p></div>
          <div><p className="text-sm text-slate-500 mb-1">Cân nặng (kg)</p><p className="font-medium text-navy">{donorProfile?.weight_kg ? Number(donorProfile.weight_kg) : '—'}</p></div>
          <div><p className="text-sm text-slate-500 mb-1">Chiều cao (cm)</p><p className="font-medium text-navy">{donorProfile?.height_cm || '—'}</p></div>
          <div className="md:col-span-3"><p className="text-sm text-slate-500 mb-1">Ghi chú sức khỏe</p><p className="font-medium text-navy">{donorProfile?.health_notes || 'Không có ghi chú'}</p></div>
        </div>

        <hr className="border-slate-100 mb-8" />

        <h2 className="text-xl font-bold text-navy mb-6">Liên hệ khẩn cấp</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div><p className="text-sm text-slate-500 mb-1">Họ và tên người thân</p><p className="font-medium text-navy">{donorProfile?.emergency_contact_name || 'Chưa cập nhật'}</p></div>
          <div><p className="text-sm text-slate-500 mb-1">Số điện thoại khẩn cấp</p><p className="font-medium text-navy">{donorProfile?.emergency_contact_phone || 'Chưa cập nhật'}</p></div>
        </div>

        {/* Change Password Modal */}
        <BaseModal
          open={isPasswordModalOpen}
          onOpenChange={(open) => {
            setIsPasswordModalOpen(open);
            if (!open) {
              setIsOtpSent(false);
              setPasswordData({ otp_code: '', new_password: '', confirm_password: '' });
            }
          }}
          title="Đổi mật khẩu"
          subtitle="Tăng cường bảo mật tài khoản với xác thực OTP."
          size="md"
          hideFooter
        >
          <div className="space-y-5">
            {!isOtpSent ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <KeyRound className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">Xác thực Email</h3>
                <p className="text-sm text-slate-500 mb-6">Chúng tôi sẽ gửi một mã OTP gồm 6 chữ số về địa chỉ email của bạn để xác thực yêu cầu này.</p>
                <Button 
                  onClick={handleRequestOtp} 
                  disabled={sendingOtp}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white h-11"
                >
                  {sendingOtp ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang gửi...</>
                  ) : (
                    'Nhận mã xác thực'
                  )}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-4 pt-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mã OTP từ Email</label>
                  <Input 
                    placeholder="Nhập mã 6 chữ số" 
                    value={passwordData.otp_code}
                    onChange={e => setPasswordData({...passwordData, otp_code: e.target.value})}
                    required
                    className="bg-slate-50 border-slate-200 h-11"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu mới</label>
                  <Input 
                    type="password" 
                    placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)" 
                    value={passwordData.new_password}
                    onChange={e => setPasswordData({...passwordData, new_password: e.target.value})}
                    required
                    minLength={6}
                    className="bg-slate-50 border-slate-200 h-11"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Xác nhận mật khẩu</label>
                  <Input 
                    type="password" 
                    placeholder="Nhập lại mật khẩu mới" 
                    value={passwordData.confirm_password}
                    onChange={e => setPasswordData({...passwordData, confirm_password: e.target.value})}
                    required
                    className="bg-slate-50 border-slate-200 h-11"
                  />
                </div>
                
                <div className="pt-2">
                  <Button 
                    type="submit" 
                    disabled={submittingPassword}
                    className="w-full bg-blood hover:bg-blood-dark text-white h-11 font-semibold"
                  >
                    {submittingPassword ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang xử lý...</>
                    ) : (
                      'Xác nhận đổi mật khẩu'
                    )}
                  </Button>
                  <div className="text-center mt-4">
                    <button 
                      type="button" 
                      onClick={handleRequestOtp}
                      disabled={sendingOtp}
                      className="text-sm text-blue-600 hover:underline font-medium"
                    >
                      Gửi lại mã OTP
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </BaseModal>
      </div>
    );
  }

  // Edit Mode
  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-bold text-navy">Cập nhật hồ sơ</h2>
        <Button onClick={() => setIsEditing(false)} variant="ghost" className="text-slate-500">Hủy</Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
          
          <div>
            <h3 className="text-lg font-bold text-navy mb-6">Thông tin cá nhân</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="full_name" render={({ field }) => (
                <FormItem><FormLabel className="text-slate-700">Họ và tên</FormLabel><FormControl><Input className="bg-slate-50 border-slate-200 h-10" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="identity_card" render={({ field }) => (
                <FormItem><FormLabel className="text-slate-700">CCCD / CMND</FormLabel><FormControl><Input className="bg-slate-50 border-slate-200 h-10" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="date_of_birth" render={({ field }) => (
                <FormItem><FormLabel className="text-slate-700">Ngày sinh</FormLabel><FormControl><Input type="date" className="bg-slate-50 border-slate-200 h-10" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="gender" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700">Giới tính</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger className="bg-slate-50 border-slate-200 h-10"><SelectValue placeholder="Chọn giới tính" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="M">Nam</SelectItem>
                      <SelectItem value="F">Nữ</SelectItem>
                      <SelectItem value="O">Khác</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </div>

          <hr className="border-slate-100" />

          <div>
            <h3 className="text-lg font-bold text-navy mb-6">Liên hệ</h3>
            <div className="space-y-6">
              <FormField control={form.control} name="phone_number" render={({ field }) => (
                <FormItem><FormLabel className="text-slate-700">Số điện thoại</FormLabel><FormControl><Input className="bg-slate-50 border-slate-200 h-10" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem><FormLabel className="text-slate-700">Địa chỉ hiện tại</FormLabel><FormControl><Input className="bg-slate-50 border-slate-200 h-10" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
          </div>

          <hr className="border-slate-100" />

          <div>
            <h3 className="text-lg font-bold text-navy mb-6">Chỉ số sức khỏe</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <FormField control={form.control} name="blood_type_id" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700">Nhóm máu</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value?.toString()}>
                    <FormControl><SelectTrigger className="bg-slate-50 border-slate-200 h-10"><SelectValue placeholder="Chọn nhóm máu" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="1">O+</SelectItem><SelectItem value="2">O-</SelectItem>
                      <SelectItem value="3">A+</SelectItem><SelectItem value="4">A-</SelectItem>
                      <SelectItem value="5">B+</SelectItem><SelectItem value="6">B-</SelectItem>
                      <SelectItem value="7">AB+</SelectItem><SelectItem value="8">AB-</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="weight_kg" render={({ field }) => (
                <FormItem><FormLabel className="text-slate-700">Cân nặng (kg)</FormLabel><FormControl><Input type="number" step="0.1" className="bg-slate-50 border-slate-200 h-10" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="height_cm" render={({ field }) => (
                <FormItem><FormLabel className="text-slate-700">Chiều cao (cm)</FormLabel><FormControl><Input type="number" className="bg-slate-50 border-slate-200 h-10" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="health_notes" render={({ field }) => (
              <FormItem><FormLabel className="text-slate-700">Ghi chú sức khỏe</FormLabel><FormControl><Input placeholder="Bệnh lý, dị ứng..." className="bg-slate-50 border-slate-200 h-10" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>

          <hr className="border-slate-100" />

          <div>
            <h3 className="text-lg font-bold text-navy mb-6">Liên hệ khẩn cấp</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="emergency_contact_name" render={({ field }) => (
                <FormItem><FormLabel className="text-slate-700">Họ và tên người thân</FormLabel><FormControl><Input className="bg-slate-50 border-slate-200 h-10" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="emergency_contact_phone" render={({ field }) => (
                <FormItem><FormLabel className="text-slate-700">Số điện thoại</FormLabel><FormControl><Input className="bg-slate-50 border-slate-200 h-10" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" onClick={() => setIsEditing(false)} variant="outline" className="h-10">Hủy</Button>
            <Button type="submit" className="bg-blood hover:bg-blood-dark text-white px-8 h-10 font-semibold" disabled={submitting}>
              {submitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang lưu...</>
              ) : (
                <><Save className="mr-2 h-4 w-4" /> Lưu Thay Đổi</>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
