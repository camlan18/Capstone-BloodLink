'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { adminMasterDataService } from '@/lib/services/admin-master-data';
import { bloodRequestService } from '@/lib/services/bloodRequest';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { toast } from 'sonner';
import { Activity, ArrowLeft, Heart, Info, Send, User, Phone, Building2, Droplet, Calendar, FileText, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

export default function CreateBloodRequestPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [bloodTypes, setBloodTypes] = useState<any[]>([]);
  const [bloodComponents, setBloodComponents] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [urgencyLevels, setUrgencyLevels] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    facility_id: '',
    patient_name: '',
    patient_phone: '',
    hospital_name: '',
    ward_room: '',
    blood_type_id: '',
    component_id: '',
    units_needed: '1',
    urgency_id: '',
    required_before: '',
    address: '',
    clinical_notes: ''
  });

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [btRes, compRes, facRes, urgRes] = await Promise.all([
          adminMasterDataService.getBloodTypes({ limit: 100 }),
          adminMasterDataService.getBloodComponents(),
          adminMasterDataService.getFacilities({ limit: 100 }),
          adminMasterDataService.getUrgencyLevels()
        ]);
        if (btRes) setBloodTypes(Array.isArray(btRes.data) ? btRes.data : (Array.isArray(btRes) ? btRes : []));
        if (compRes) setBloodComponents(Array.isArray(compRes.data) ? compRes.data : (Array.isArray(compRes) ? compRes : []));
        if (facRes) setFacilities(Array.isArray(facRes.data) ? facRes.data : (Array.isArray(facRes) ? facRes : []));
        if (urgRes) setUrgencyLevels(Array.isArray(urgRes.data) ? urgRes.data : (Array.isArray(urgRes) ? urgRes : []));
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu master:', error);
      }
    };
    fetchMasterData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFacilityChange = (facId: string) => {
    const facility = facilities.find(f => f.facility_id.toString() === facId);
    if (facility) {
      setFormData(prev => ({
        ...prev,
        facility_id: facId,
        hospital_name: facility.facility_name || '',
        address: facility.address || ''
      }));
    } else {
      setFormData(prev => ({ ...prev, facility_id: facId }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.facility_id || !formData.patient_name || !formData.blood_type_id || !formData.component_id || !formData.urgency_id) {
      toast.error('Vui lòng điền đầy đủ các thông tin bắt buộc');
      return;
    }

    try {
      setLoading(true);
      const selectedUrgency = urgencyLevels.find(u => u.urgency_id.toString() === formData.urgency_id);
      
      const payload = {
        facility_id: Number(formData.facility_id),
        patient_name: formData.patient_name,
        blood_type_id: Number(formData.blood_type_id),
        component_id: Number(formData.component_id),
        units_needed: Number(formData.units_needed),
        urgency_id: Number(formData.urgency_id),
        is_emergency: selectedUrgency?.urgency_code === 'CRITICAL',
        clinical_notes: formData.clinical_notes || undefined,
        patient_phone: formData.patient_phone || undefined,
        hospital_name: formData.hospital_name || undefined,
        ward_room: formData.ward_room || undefined,
        address: formData.address || undefined,
        required_before: formData.required_before || undefined,
      };

      await bloodRequestService.createPublicRequest(payload);
      toast.success('Yêu cầu đã được gửi và đang chờ Quản trị viên duyệt', {
        duration: 5000
      });
      router.push('/blood-requests');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại sau');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="bg-slate-50 min-h-screen py-10">
        <div className="container mx-auto px-4 max-w-3xl">
          <Link href="/blood-requests" className="inline-flex items-center text-slate-500 hover:text-blood font-medium mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại danh sách
          </Link>
          
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blood to-red-600 px-6 md:px-10 py-8 text-white">
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
                <Heart className="w-8 h-8 fill-current opacity-90" />
                Đăng ký Yêu cầu máu khẩn cấp
              </h1>
              <p className="mt-2 text-red-100 max-w-xl text-sm md:text-base">
                Hãy cung cấp thông tin chính xác để hệ thống có thể kết nối những người hiến máu phù hợp nhất đến bệnh nhân.
              </p>
            </div>
            
            <div className="p-6 md:p-10">
              <div className="bg-blue-50 text-blue-800 p-4 rounded-xl border border-blue-100 flex gap-3 mb-8 text-sm md:text-base">
                <Info className="w-5 h-5 shrink-0 text-blue-600 mt-0.5" />
                <p>
                  <strong>Lưu ý:</strong> Yêu cầu của bạn sau khi gửi sẽ ở trạng thái <b>Chờ duyệt</b>. Ban quản trị sẽ xác minh thông tin trước khi hiển thị công khai lên hệ thống để kêu gọi hiến máu.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                
                {/* Section 1: Thông tin bệnh nhân */}
                <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] hover:shadow-[0_8px_30px_-4px_rgba(6,81,237,0.1)] transition-all duration-300">
                  <h3 className="text-xl font-bold text-navy border-b border-slate-100 pb-4 mb-6 flex items-center gap-2.5">
                    <div className="bg-blue-50 p-2 rounded-lg text-blue-600"><User className="w-5 h-5" /></div>
                    Thông tin Bệnh nhân
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">Tên bệnh nhân <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <Input 
                          name="patient_name" 
                          value={formData.patient_name} 
                          onChange={handleChange} 
                          placeholder="Nhập đầy đủ họ và tên" 
                          className="h-12 pl-10 bg-slate-50 border-slate-200 focus:bg-white transition-colors rounded-xl"
                          required 
                        />
                        <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-4" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">Số điện thoại liên hệ <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <Input 
                          name="patient_phone" 
                          value={formData.patient_phone} 
                          onChange={handleChange} 
                          placeholder="SĐT người nhà hoặc bệnh nhân" 
                          className="h-12 pl-10 bg-slate-50 border-slate-200 focus:bg-white transition-colors rounded-xl"
                          required 
                        />
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-4" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Nơi điều trị */}
                <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] hover:shadow-[0_8px_30px_-4px_rgba(6,81,237,0.1)] transition-all duration-300">
                  <h3 className="text-xl font-bold text-navy border-b border-slate-100 pb-4 mb-6 flex items-center gap-2.5">
                    <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600"><Building2 className="w-5 h-5" /></div>
                    Nơi điều trị
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">Cơ sở y tế điều trị <span className="text-red-500">*</span></label>
                      <SearchableSelect
                        value={formData.facility_id}
                        onValueChange={handleFacilityChange}
                        options={facilities.map(f => ({ value: f.facility_id.toString(), label: f.facility_name }))}
                        placeholder="Chọn bệnh viện/cơ sở y tế"
                        triggerClassName="w-full h-12 bg-slate-50 border-slate-200 hover:bg-slate-100 transition-colors rounded-xl font-medium"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">Phòng / Khoa điều trị</label>
                      <div className="relative">
                        <Input 
                          name="ward_room" 
                          value={formData.ward_room} 
                          onChange={handleChange} 
                          placeholder="VD: Khoa Hồi sức tích cực, Tầng 3" 
                          className="h-12 pl-10 bg-slate-50 border-slate-200 focus:bg-white transition-colors rounded-xl"
                        />
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-4" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Yêu cầu máu */}
                <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] hover:shadow-[0_8px_30px_-4px_rgba(6,81,237,0.1)] transition-all duration-300">
                  <h3 className="text-xl font-bold text-navy border-b border-slate-100 pb-4 mb-6 flex items-center gap-2.5">
                    <div className="bg-red-50 p-2 rounded-lg text-blood"><Droplet className="w-5 h-5" /></div>
                    Chi tiết Yêu cầu Y tế
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">Nhóm máu cần <span className="text-red-500">*</span></label>
                      <SearchableSelect
                        value={formData.blood_type_id}
                        onValueChange={v => setFormData({...formData, blood_type_id: v})}
                        options={bloodTypes.map(bt => ({ value: bt.blood_type_id.toString(), label: bt.blood_type_code }))}
                        placeholder="Chọn nhóm máu"
                        triggerClassName="w-full h-12 bg-slate-50 border-slate-200 hover:bg-slate-100 transition-colors rounded-xl font-bold text-blood"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">Chế phẩm máu <span className="text-red-500">*</span></label>
                      <SearchableSelect
                        value={formData.component_id}
                        onValueChange={v => setFormData({...formData, component_id: v})}
                        options={bloodComponents.map(c => ({ value: c.component_id.toString(), label: c.component_name }))}
                        placeholder="Chọn thành phần"
                        triggerClassName="w-full h-12 bg-slate-50 border-slate-200 hover:bg-slate-100 transition-colors rounded-xl font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">Số lượng (Đơn vị) <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <Input 
                          type="number" 
                          name="units_needed" 
                          min="1" max="20"
                          value={formData.units_needed} 
                          onChange={handleChange} 
                          className="h-12 pl-10 bg-slate-50 border-slate-200 focus:bg-white transition-colors rounded-xl font-bold text-lg"
                          required 
                        />
                        <Activity className="w-4 h-4 text-slate-400 absolute left-3.5 top-4" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">Mức độ khẩn <span className="text-red-500">*</span></label>
                      <SearchableSelect
                        value={formData.urgency_id}
                        onValueChange={v => setFormData({...formData, urgency_id: v})}
                        options={urgencyLevels.map(u => ({ value: u.urgency_id.toString(), label: u.urgency_name }))}
                        placeholder="Chọn mức độ"
                        triggerClassName="w-full h-12 bg-slate-50 border-slate-200 hover:bg-slate-100 transition-colors rounded-xl font-medium"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">Cần trước ngày</label>
                      <div className="relative">
                        <Input 
                          type="datetime-local"
                          name="required_before" 
                          min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                          value={formData.required_before} 
                          onChange={handleChange} 
                          className="h-12 pl-10 bg-slate-50 border-slate-200 focus:bg-white transition-colors rounded-xl"
                        />
                        <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-4" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">Ghi chú tình trạng lâm sàng</label>
                    <div className="relative">
                      <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-4" />
                      <Textarea 
                        name="clinical_notes" 
                        value={formData.clinical_notes} 
                        onChange={handleChange} 
                        placeholder="Ghi chú thêm về tình trạng của bệnh nhân (Tai nạn, phẫu thuật, v.v) để người hiến máu hiểu rõ hoàn cảnh."
                        rows={3}
                        className="pl-10 pt-3.5 bg-slate-50 border-slate-200 focus:bg-white transition-colors rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-200 flex flex-col-reverse sm:flex-row justify-end gap-4 mt-8">
                  <Link href="/blood-requests" className="w-full sm:w-auto">
                    <Button type="button" variant="outline" className="w-full h-14 px-8 font-bold text-slate-600 rounded-xl hover:bg-slate-100 border-2 border-slate-200 transition-colors">Hủy bỏ</Button>
                  </Link>
                  <Button type="submit" disabled={loading} className="w-full sm:w-auto bg-blood hover:bg-blood-deep text-white h-14 px-10 font-bold text-lg rounded-xl shadow-[0_8px_16px_rgba(230,57,70,0.3)] hover:shadow-[0_12px_24px_rgba(230,57,70,0.4)] transition-all transform hover:-translate-y-1">
                    {loading ? 'Đang xử lý...' : (
                      <>
                        Gửi Yêu Cầu Cứu Trợ <Send className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
