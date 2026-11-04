'use client';
import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { donorService } from '@/lib/services/donor';
import { authService } from '@/lib/services/auth';
import { adminMasterDataService } from '@/lib/services/admin-master-data';
import { useAuthStore } from '@/lib/stores';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User as UserIcon, Camera, Loader2, Edit3, Save, KeyRound, Fingerprint, Calendar, Users, Phone, MapPin, Heart, Droplet, ShieldAlert, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { BaseModal } from '@/components/ui/BaseModal';
import { useTranslations } from 'next-intl';

export default function DonorProfilePage() {
  const t = useTranslations('DonorProfile');
  
  const formSchema = z.object({
    full_name: z.string().min(3, t('errNameMin')),
    identity_card: z.string().min(9, t('errIdCardInv')).max(12),
    date_of_birth: z.string().min(1, t('errDobReq')),
    gender: z.string().min(1, t('errGenderReq')),
    phone_number: z.string().min(10, t('errPhoneInv')),
    address: z.string().min(5, t('errAddressMin')),
    blood_type_id: z.coerce.number().min(1, t('errBloodTypeReq')),
    weight_kg: z.coerce.number().min(40, t('errWeightMin')),
    height_cm: z.coerce.number().min(100, t('errHeightMin')),
    health_notes: z.string().optional(),
    emergency_contact_name: z.string().min(3, t('errEmeNameMin')),
    emergency_contact_phone: z.string().min(10, t('errEmePhoneInv')),
  });


  const { user, setUser, donorProfile, setDonorProfile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [bloodTypes, setBloodTypes] = useState<any[]>([]);

  // Password Change State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [submittingPassword, setSubmittingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({ otp_code: '', new_password: '', confirm_password: '' });

  const form = useForm<any>({
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
      const [donorRes, authRes, btRes] = await Promise.all([
        donorService.getProfile().catch(() => null),
        authService.getProfile().catch(() => null),
        adminMasterDataService.getBloodTypes({ limit: 100 }).catch(() => null)
      ]);
      
      let currentDonor = donorProfile;
      let currentUser = user;

      if (btRes) {
        const fetchedBloodTypes = Array.isArray(btRes.data?.data) ? btRes.data.data : (Array.isArray(btRes.data) ? btRes.data : (Array.isArray(btRes) ? btRes : []));
        console.log('FETCHED BLOOD TYPES:', fetchedBloodTypes, 'RAW BTRES:', btRes);
        setBloodTypes(fetchedBloodTypes);
      }

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
      toast.success(t('successUpdate'));
      setIsEditing(false);
      fetchProfile();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('errorUpdate'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('errAvatarSize'));
      return;
    }

    try {
      setUploadingAvatar(true);
      const res = await authService.uploadAvatar(file);
      if (res && res.data) {
        setUser(res.data);
        toast.success(t('successAvatar'));
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('errAvatarUpload'));
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
      toast.success(t('successOtp'));
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('errorOtp'));
    } finally {
      setSendingOtp(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error(t('errPassMismatch'));
      return;
    }
    if (passwordData.new_password.length < 6) {
      toast.error(t('errPassMin'));
      return;
    }
    try {
      setSubmittingPassword(true);
      await authService.changePassword({ 
        otp_code: passwordData.otp_code, 
        new_password: passwordData.new_password 
      });
      toast.success(t('successPass'));
      setIsPasswordModalOpen(false);
      setIsOtpSent(false);
      setPasswordData({ otp_code: '', new_password: '', confirm_password: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('errorPass'));
    } finally {
      setSubmittingPassword(false);
    }
  };

  const getGenderText = (g: string) => {
    if (g === 'M') return t('genderM');
    if (g === 'F') return t('genderF');
    if (g === 'O') return t('genderO');
    return t('notUpdated');
  };

  const getBloodTypeText = (id: number) => {
    const bt = bloodTypes.find((b: any) => b.blood_type_id === id);
    return bt ? bt.blood_type_code : t('notUpdated');
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="h-8 bg-slate-200 rounded-md w-1/4"></div>
        <div className="h-64 bg-slate-200 rounded-lg w-full"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto pb-12 animate-in fade-in duration-500">
      <Form {...form}>
        <form onSubmit={isEditing ? form.handleSubmit(onSubmit) : (e) => e.preventDefault()} className="space-y-6">
          
          {/* Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row items-center gap-6">
             <div className="relative group shrink-0">
                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden border-2 border-slate-200 relative">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-10 h-10 text-slate-400" />
                  )}
                  {/* Upload Overlay */}
                  <div 
                    className={`absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer backdrop-blur-[2px] transition-all duration-300 ${uploadingAvatar ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    onClick={() => !uploadingAvatar && fileInputRef.current?.click()}
                  >
                    {uploadingAvatar ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Camera className="w-6 h-6 text-white" />}
                  </div>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
             </div>
             
             <div className="text-center md:text-left flex-1">
                <h2 className="text-2xl font-bold text-navy">{user?.full_name || t('unnamed')}</h2>
                <p className="text-slate-500 mb-3">{user?.email}</p>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                   <div className="bg-slate-50 border border-slate-200 rounded-full px-4 py-1.5 flex items-center gap-2">
                     <Droplet className="w-4 h-4 text-blood" />
                     <span className="text-sm font-semibold text-navy">{donorProfile?.total_volume || 0} ml đã hiến</span>
                   </div>
                   <div className="bg-slate-50 border border-slate-200 rounded-full px-4 py-1.5 flex items-center gap-2">
                     <Heart className="w-4 h-4 text-blood" />
                     <span className="text-sm font-semibold text-navy">{donorProfile?.total_donations || 0} lần hiến</span>
                   </div>
                   {donorProfile?.is_eligible === false ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-full text-xs font-semibold">
                        <Clock className="w-3.5 h-3.5" />
                        {t('eligibleIn', { days: donorProfile.days_until_next_donation })}
                      </span>
                    ) : donorProfile?.is_eligible ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-xs font-semibold">
                        <CheckCircle className="w-3.5 h-3.5" />
                        {t('eligible')}
                      </span>
                    ) : null}
                </div>
             </div>

             <div className="flex flex-col gap-3 shrink-0 w-full md:w-auto mt-4 md:mt-0">
               {!isEditing ? (
                  <>
                    <Button type="button" onClick={() => setIsEditing(true)} className="bg-blood hover:bg-blood-dark text-white rounded-xl h-11 w-full md:w-auto px-6 font-semibold transition-all hover:-translate-y-0.5">
                      <Edit3 className="w-4 h-4 mr-2" /> {t('edit')}
                    </Button>
                    <Button type="button" onClick={() => setIsPasswordModalOpen(true)} variant="outline" className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 h-11 w-full md:w-auto px-5">
                      <KeyRound className="w-4 h-4 mr-2" /> {t('changePassword')}
                    </Button>
                  </>
               ) : (
                  <>
                    <Button type="submit" disabled={submitting} className="bg-blood hover:bg-blood-dark text-white rounded-xl h-11 w-full md:w-auto px-6 font-semibold transition-all hover:-translate-y-0.5">
                      {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      Lưu thay đổi
                    </Button>
                    <Button type="button" onClick={() => setIsEditing(false)} variant="outline" className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 h-11 w-full md:w-auto px-5">
                      Hủy bỏ
                    </Button>
                  </>
               )}
             </div>
          </div>

          {/* Body Sections - One Column */}
          
          {/* Identity Section */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
               <h3 className="text-lg font-bold text-navy flex items-center gap-2">
                 <UserIcon className="w-5 h-5 text-slate-400" /> Thông tin cá nhân
               </h3>
            </div>
            <div className="p-6 md:p-8">
              {!isEditing ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                   <div>
                     <p className="text-sm font-medium text-slate-500 mb-1">{t('idCard')}</p>
                     <p className="font-semibold text-navy text-base">{(user as any)?.identity_card || <span className="text-slate-400 font-normal italic">{t('notUpdated')}</span>}</p>
                   </div>
                   <div>
                     <p className="text-sm font-medium text-slate-500 mb-1">{t('dob')}</p>
                     <p className="font-semibold text-navy text-base">{user?.date_of_birth ? new Date(user.date_of_birth).toLocaleDateString('vi-VN') : <span className="text-slate-400 font-normal italic">{t('notUpdated')}</span>}</p>
                   </div>
                   <div>
                     <p className="text-sm font-medium text-slate-500 mb-1">{t('gender')}</p>
                     <p className="font-semibold text-navy text-base">{getGenderText(user?.gender || '')}</p>
                   </div>
                 </div>
              ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <FormField control={form.control} name="full_name" render={({ field }) => (
                      <FormItem><FormLabel className="text-slate-700">{t('fullName')}</FormLabel><FormControl><Input className="h-11 rounded-lg border-slate-200" {...field} /></FormControl><FormMessage /></FormItem>
                   )} />
                   <FormField control={form.control} name="identity_card" render={({ field }) => (
                      <FormItem><FormLabel className="text-slate-700">{t('idCard')}</FormLabel><FormControl><Input className="h-11 rounded-lg border-slate-200" {...field} /></FormControl><FormMessage /></FormItem>
                   )} />
                   <FormField control={form.control} name="date_of_birth" render={({ field }) => (
                      <FormItem><FormLabel className="text-slate-700">{t('dob')}</FormLabel><FormControl><Input type="date" className="h-11 rounded-lg border-slate-200" {...field} /></FormControl><FormMessage /></FormItem>
                   )} />
                   <FormField control={form.control} name="gender" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700">{t('gender')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger className="h-11 rounded-lg border-slate-200"><SelectValue placeholder={t('selectGender')} /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="M">{t('genderM')}</SelectItem>
                            <SelectItem value="F">{t('genderF')}</SelectItem>
                            <SelectItem value="O">{t('genderO')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                   )} />
                 </div>
              )}
            </div>
          </div>

          {/* Health Stats Section */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
               <h3 className="text-lg font-bold text-navy flex items-center gap-2">
                 <Heart className="w-5 h-5 text-slate-400" /> Chỉ số sức khỏe
               </h3>
            </div>
            <div className="p-6 md:p-8">
              {!isEditing ? (
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-y-6 gap-x-8">
                   <div>
                     <p className="text-sm font-medium text-slate-500 mb-1">{t('bloodType')}</p>
                     <p className="font-bold text-blood text-xl">{getBloodTypeText(donorProfile?.blood_type_id || user?.blood_type_id || 0)}</p>
                   </div>
                   <div>
                     <p className="text-sm font-medium text-slate-500 mb-1">{t('weight')}</p>
                     <p className="font-semibold text-navy text-base">{donorProfile?.weight_kg ? Number(donorProfile.weight_kg) : '—'} <span className="text-slate-400 font-normal">kg</span></p>
                   </div>
                   <div>
                     <p className="text-sm font-medium text-slate-500 mb-1">{t('height')}</p>
                     <p className="font-semibold text-navy text-base">{donorProfile?.height_cm || '—'} <span className="text-slate-400 font-normal">cm</span></p>
                   </div>
                   <div className="md:col-span-3 mt-2">
                     <p className="text-sm font-medium text-slate-500 mb-2">{t('healthNotes')}</p>
                     <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-navy min-h-[60px]">
                       {donorProfile?.health_notes || <span className="text-slate-400 italic font-normal">{t('noNotes')}</span>}
                     </div>
                   </div>
                 </div>
              ) : (
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <FormField control={form.control} name="blood_type_id" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700">{t('bloodType')}</FormLabel>
                        <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value ? field.value.toString() : ""}>
                          <FormControl>
                            <SelectTrigger className="h-11 rounded-lg border-slate-200">
                              <SelectValue placeholder={t('selectBloodType')}>
                                {field.value && field.value !== "0" && bloodTypes && bloodTypes.length > 0
                                  ? (bloodTypes.find((bt: any) => bt.blood_type_id.toString() === field.value?.toString())?.blood_type_code)
                                  : null}
                              </SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {bloodTypes && bloodTypes.length > 0 ? bloodTypes.map((bt: any) => (
                              <SelectItem key={bt.blood_type_id} value={bt.blood_type_id.toString()}>{bt.blood_type_code}</SelectItem>
                            )) : <SelectItem value={field.value ? field.value.toString() : "0"}>{t('loading')}</SelectItem>}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                   )} />
                   <FormField control={form.control} name="weight_kg" render={({ field }) => (
                      <FormItem><FormLabel className="text-slate-700">{t('weight')} (kg)</FormLabel><FormControl><Input type="number" step="0.1" className="h-11 rounded-lg border-slate-200" {...field} /></FormControl><FormMessage /></FormItem>
                   )} />
                   <FormField control={form.control} name="height_cm" render={({ field }) => (
                      <FormItem><FormLabel className="text-slate-700">{t('height')} (cm)</FormLabel><FormControl><Input type="number" className="h-11 rounded-lg border-slate-200" {...field} /></FormControl><FormMessage /></FormItem>
                   )} />
                   <div className="md:col-span-3">
                     <FormField control={form.control} name="health_notes" render={({ field }) => (
                        <FormItem><FormLabel className="text-slate-700">{t('healthNotes')}</FormLabel><FormControl><Input className="h-11 rounded-lg border-slate-200" placeholder="Bệnh lý nền, dị ứng..." {...field} /></FormControl><FormMessage /></FormItem>
                     )} />
                   </div>
                 </div>
              )}
            </div>
          </div>

          {/* Contact & Emergency Section */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
               <h3 className="text-lg font-bold text-navy flex items-center gap-2 min-w-max">
                 <Phone className="w-5 h-5 text-slate-400" /> Thông tin liên lạc
               </h3>
            </div>
            <div className="p-6 md:p-8">
              {!isEditing ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
                   {/* Personal Contact */}
                   <div className="space-y-5">
                     <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-100 pb-2">Cá nhân</h4>
                     <div>
                       <p className="text-sm font-medium text-slate-500 mb-1">{t('phone')}</p>
                       <p className="font-semibold text-navy text-base">{user?.phone || donorProfile?.phone_number || <span className="text-slate-400 font-normal italic">{t('notUpdated')}</span>}</p>
                     </div>
                     <div>
                       <p className="text-sm font-medium text-slate-500 mb-1">{t('address')}</p>
                       <p className="font-semibold text-navy text-base leading-relaxed">{user?.address || donorProfile?.address || <span className="text-slate-400 font-normal italic">{t('notUpdated')}</span>}</p>
                     </div>
                   </div>

                   {/* Emergency Contact */}
                   <div className="space-y-5">
                     <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-100 pb-2">{t('emergencyContact')}</h4>
                     <div>
                       <p className="text-sm font-medium text-slate-500 mb-1">{t('relativeName')}</p>
                       <p className="font-semibold text-navy text-base">{donorProfile?.emergency_contact_name || <span className="text-slate-400 font-normal italic">{t('notUpdated')}</span>}</p>
                     </div>
                     <div>
                       <p className="text-sm font-medium text-slate-500 mb-1">{t('emergencyPhone')}</p>
                       <p className="font-semibold text-navy text-base">{donorProfile?.emergency_contact_phone || <span className="text-slate-400 font-normal italic">{t('notUpdated')}</span>}</p>
                     </div>
                   </div>
                 </div>
              ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                   <div className="space-y-5">
                     <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-100 pb-2">Cá nhân</h4>
                     <FormField control={form.control} name="phone_number" render={({ field }) => (
                        <FormItem><FormLabel className="text-slate-700">{t('phone')}</FormLabel><FormControl><Input className="h-11 rounded-lg border-slate-200" {...field} /></FormControl><FormMessage /></FormItem>
                     )} />
                     <FormField control={form.control} name="address" render={({ field }) => (
                        <FormItem><FormLabel className="text-slate-700">{t('address')}</FormLabel><FormControl><Input className="h-11 rounded-lg border-slate-200" {...field} /></FormControl><FormMessage /></FormItem>
                     )} />
                   </div>
                   <div className="space-y-5">
                     <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-100 pb-2">{t('emergencyContact')}</h4>
                     <FormField control={form.control} name="emergency_contact_name" render={({ field }) => (
                        <FormItem><FormLabel className="text-slate-700">{t('relativeName')}</FormLabel><FormControl><Input className="h-11 rounded-lg border-slate-200" {...field} /></FormControl><FormMessage /></FormItem>
                     )} />
                     <FormField control={form.control} name="emergency_contact_phone" render={({ field }) => (
                        <FormItem><FormLabel className="text-slate-700">{t('emergencyPhone')}</FormLabel><FormControl><Input className="h-11 rounded-lg border-slate-200" {...field} /></FormControl><FormMessage /></FormItem>
                     )} />
                   </div>
                 </div>
              )}
            </div>
          </div>

        </form>
      </Form>

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
          title={t('changePassword')}
          subtitle={t('securitySubtitle')}
          size="md"
          hideFooter
        >
          <div className="space-y-5">
            {!isOtpSent ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <KeyRound className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">{t('verifyEmail')}</h3>
                <p className="text-sm text-slate-500 mb-6">{t('otpDesc')}</p>
                <Button 
                  onClick={handleRequestOtp} 
                  disabled={sendingOtp}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white h-11"
                >
                  {sendingOtp ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('sending')}</>
                  ) : (
                    t('sendOtpBtn')
                  )}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-4 pt-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('otpCode')}</label>
                  <Input 
                    placeholder={t('otpPlaceholder')} 
                    value={passwordData.otp_code}
                    onChange={e => setPasswordData({...passwordData, otp_code: e.target.value})}
                    required
                    className="bg-slate-50 border-slate-200 h-11"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('newPassword')}</label>
                  <Input 
                    type="password" 
                    placeholder={t('newPasswordPlaceholder')} 
                    value={passwordData.new_password}
                    onChange={e => setPasswordData({...passwordData, new_password: e.target.value})}
                    required
                    minLength={6}
                    className="bg-slate-50 border-slate-200 h-11"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('confirmPassword')}</label>
                  <Input 
                    type="password" 
                    placeholder={t('confirmPasswordPlaceholder')} 
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
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('processing')}</>
                    ) : (
                      t('confirmChangeBtn')
                    )}
                  </Button>
                  <div className="text-center mt-4">
                    <button 
                      type="button" 
                      onClick={handleRequestOtp}
                      disabled={sendingOtp}
                      className="text-sm text-blue-600 hover:underline font-medium"
                    >
                      {t('resendOtp')}
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

