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
import { ArrowLeft, Send, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
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

  const selectedUrgency = urgencyLevels.find(u => u.urgency_id.toString() === formData.urgency_id);
  const isCritical = selectedUrgency?.urgency_code === 'CRITICAL';

  return (
    <MainLayout>
      <div className="bg-[#f0f2f5] min-h-screen">
        {/* Top bar */}
        <div className="bg-white border-b border-slate-200">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="flex items-center justify-between h-14">
              <Link href="/blood-requests" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 font-medium transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Quay lại danh sách
              </Link>
              <div className="text-xs text-slate-400 font-mono">
                {format(new Date(), 'dd/MM/yyyy HH:mm')}
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 max-w-5xl py-6">
          {/* Header */}
          <div className="bg-[#1a2332] text-white px-8 py-6 rounded-sm mb-0">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-10 h-10 bg-white/10 rounded-sm flex items-center justify-center">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                  </div>
                  <div>
                    <h1 className="text-xl font-bold tracking-tight">PHIẾU YÊU CẦU MÁU KHẨN CẤP</h1>
                    <p className="text-white/50 text-xs font-medium mt-0.5 tracking-wide">EMERGENCY BLOOD REQUEST FORM</p>
                  </div>
                </div>
              </div>
              <div className="text-right hidden sm:block">
                <div className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Trạng thái</div>
                <div className="bg-amber-500/20 text-amber-300 text-xs font-bold px-3 py-1 rounded-sm border border-amber-500/30">
                  CHỜ DUYỆT
                </div>
              </div>
            </div>
          </div>

          {/* Notice bar */}
          <div className="bg-amber-50 border border-amber-200 border-t-0 px-6 py-3 flex items-start gap-3 rounded-b-sm mb-6">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>Lưu ý:</strong> Yêu cầu sau khi gửi sẽ ở trạng thái <strong>Chờ duyệt</strong>. Ban quản trị sẽ xác minh thông tin trước khi hiển thị công khai để kêu gọi hiến máu.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* ===== LEFT COLUMN ===== */}
              <div className="lg:col-span-7 space-y-6">

                {/* Section 1: Thông tin bệnh nhân */}
                <div className="bg-white border border-slate-200 rounded-sm overflow-hidden">
                  <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center gap-3">
                    <span className="w-6 h-6 bg-[#1a2332] text-white text-xs font-bold rounded-sm flex items-center justify-center">1</span>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Thông tin Bệnh nhân</h3>
                  </div>
                  <div className="p-5 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                        Họ và tên bệnh nhân <span className="text-red-500">*</span>
                      </label>
                      <Input 
                        name="patient_name" 
                        value={formData.patient_name} 
                        onChange={handleChange} 
                        placeholder="Nhập đầy đủ họ và tên" 
                        className="h-10 bg-white border-slate-300 rounded-sm text-sm font-medium focus:border-[#1a2332] focus:ring-[#1a2332]/10"
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                        Số điện thoại liên hệ <span className="text-red-500">*</span>
                      </label>
                      <Input 
                        name="patient_phone" 
                        value={formData.patient_phone} 
                        onChange={handleChange} 
                        placeholder="SĐT người nhà hoặc bệnh nhân" 
                        className="h-10 bg-white border-slate-300 rounded-sm text-sm font-medium focus:border-[#1a2332] focus:ring-[#1a2332]/10"
                        required 
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Cơ sở điều trị */}
                <div className="bg-white border border-slate-200 rounded-sm overflow-hidden">
                  <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center gap-3">
                    <span className="w-6 h-6 bg-[#1a2332] text-white text-xs font-bold rounded-sm flex items-center justify-center">2</span>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Cơ sở điều trị</h3>
                  </div>
                  <div className="p-5 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                        Cơ sở y tế / Bệnh viện <span className="text-red-500">*</span>
                      </label>
                      <SearchableSelect
                        value={formData.facility_id}
                        onValueChange={handleFacilityChange}
                        options={facilities.map(f => ({ value: f.facility_id.toString(), label: f.facility_name }))}
                        placeholder="Tìm và chọn cơ sở y tế..."
                        triggerClassName="w-full h-10 bg-white border-slate-300 rounded-sm text-sm font-medium focus:border-[#1a2332]"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                          Khoa / Phòng điều trị
                        </label>
                        <Input 
                          name="ward_room" 
                          value={formData.ward_room} 
                          onChange={handleChange} 
                          placeholder="VD: Khoa Hồi sức, Tầng 3" 
                          className="h-10 bg-white border-slate-300 rounded-sm text-sm focus:border-[#1a2332] focus:ring-[#1a2332]/10"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                          Địa chỉ giao máu
                        </label>
                        <Input 
                          name="address" 
                          value={formData.address} 
                          onChange={handleChange} 
                          placeholder="Tự động lấy theo cơ sở" 
                          className="h-10 bg-slate-50 border-slate-300 rounded-sm text-sm focus:border-[#1a2332] focus:ring-[#1a2332]/10"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Ghi chú lâm sàng */}
                <div className="bg-white border border-slate-200 rounded-sm overflow-hidden">
                  <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center gap-3">
                    <span className="w-6 h-6 bg-[#1a2332] text-white text-xs font-bold rounded-sm flex items-center justify-center">3</span>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Ghi chú lâm sàng</h3>
                  </div>
                  <div className="p-5">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Mô tả tình trạng bệnh nhân
                    </label>
                    <Textarea 
                      name="clinical_notes" 
                      value={formData.clinical_notes} 
                      onChange={handleChange} 
                      placeholder="Ghi chú chi tiết về tình trạng bệnh nhân (tai nạn, phẫu thuật, xuất huyết...) để người hiến máu nắm rõ tình huống."
                      rows={4}
                      className="bg-white border-slate-300 rounded-sm text-sm leading-relaxed focus:border-[#1a2332] focus:ring-[#1a2332]/10 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* ===== RIGHT COLUMN ===== */}
              <div className="lg:col-span-5 space-y-6">

                {/* Section: Yêu cầu y tế */}
                <div className="bg-white border border-slate-200 rounded-sm overflow-hidden">
                  <div className="bg-red-50 border-b border-red-100 px-5 py-3 flex items-center gap-3">
                    <span className="w-6 h-6 bg-blood text-white text-xs font-bold rounded-sm flex items-center justify-center">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
                    </span>
                    <h3 className="text-sm font-bold text-red-900 uppercase tracking-wide">Yêu cầu máu</h3>
                  </div>
                  <div className="p-5 space-y-4">
                    {/* Nhóm máu + Chế phẩm */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                          Nhóm máu <span className="text-red-500">*</span>
                        </label>
                        <SearchableSelect
                          value={formData.blood_type_id}
                          onValueChange={v => setFormData({...formData, blood_type_id: v})}
                          options={bloodTypes.map(bt => ({ value: bt.blood_type_id.toString(), label: bt.blood_type_code }))}
                          placeholder="Chọn"
                          triggerClassName="w-full h-10 bg-white border-slate-300 rounded-sm text-sm font-bold text-blood focus:border-blood"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                          Chế phẩm máu <span className="text-red-500">*</span>
                        </label>
                        <SearchableSelect
                          value={formData.component_id}
                          onValueChange={v => setFormData({...formData, component_id: v})}
                          options={bloodComponents.map(c => ({ value: c.component_id.toString(), label: c.component_name }))}
                          placeholder="Chọn"
                          triggerClassName="w-full h-10 bg-white border-slate-300 rounded-sm text-sm font-medium focus:border-blood"
                        />
                      </div>
                    </div>

                    {/* Số lượng + Mức khẩn */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                          Số lượng (ĐV) <span className="text-red-500">*</span>
                        </label>
                        <Input 
                          type="number" 
                          name="units_needed" 
                          min="1" max="20"
                          value={formData.units_needed} 
                          onChange={handleChange} 
                          className="h-10 bg-white border-slate-300 rounded-sm text-sm font-bold text-center text-lg focus:border-[#1a2332] focus:ring-[#1a2332]/10"
                          required 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                          Mức độ khẩn <span className="text-red-500">*</span>
                        </label>
                        <SearchableSelect
                          value={formData.urgency_id}
                          onValueChange={v => setFormData({...formData, urgency_id: v})}
                          options={urgencyLevels.map(u => ({ value: u.urgency_id.toString(), label: u.urgency_name }))}
                          placeholder="Chọn"
                          triggerClassName="w-full h-10 bg-white border-slate-300 rounded-sm text-sm font-medium focus:border-blood"
                        />
                      </div>
                    </div>

                    {/* Cần trước ngày */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                        Cần máu trước ngày
                      </label>
                      <Input 
                        type="datetime-local"
                        name="required_before" 
                        min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                        value={formData.required_before} 
                        onChange={handleChange} 
                        className="h-10 bg-white border-slate-300 rounded-sm text-sm focus:border-[#1a2332] focus:ring-[#1a2332]/10"
                      />
                    </div>

                    {/* Urgency indicator */}
                    {isCritical && (
                      <div className="bg-red-50 border border-red-200 rounded-sm p-3 flex items-center gap-2.5">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-xs font-bold text-red-700 uppercase tracking-wide">Trường hợp cấp cứu — Ưu tiên xử lý ngay</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Summary card */}
                <div className="bg-white border border-slate-200 rounded-sm overflow-hidden">
                  <div className="bg-slate-50 border-b border-slate-200 px-5 py-3">
                    <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Tóm tắt yêu cầu</h3>
                  </div>
                  <div className="p-5 space-y-3">
                    <div className="flex justify-between items-center py-1.5 border-b border-dashed border-slate-200">
                      <span className="text-xs text-slate-500">Bệnh nhân</span>
                      <span className="text-xs font-semibold text-slate-800 max-w-[200px] truncate">{formData.patient_name || '—'}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-dashed border-slate-200">
                      <span className="text-xs text-slate-500">Cơ sở y tế</span>
                      <span className="text-xs font-semibold text-slate-800 max-w-[200px] truncate">
                        {facilities.find(f => f.facility_id.toString() === formData.facility_id)?.short_name || 
                         facilities.find(f => f.facility_id.toString() === formData.facility_id)?.facility_name || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-dashed border-slate-200">
                      <span className="text-xs text-slate-500">Nhóm máu</span>
                      <span className="text-xs font-bold text-blood">
                        {bloodTypes.find(bt => bt.blood_type_id.toString() === formData.blood_type_id)?.blood_type_code || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-dashed border-slate-200">
                      <span className="text-xs text-slate-500">Chế phẩm</span>
                      <span className="text-xs font-semibold text-slate-800">
                        {bloodComponents.find(c => c.component_id.toString() === formData.component_id)?.component_name || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-dashed border-slate-200">
                      <span className="text-xs text-slate-500">Số lượng</span>
                      <span className="text-sm font-bold text-[#1a2332]">{formData.units_needed} đơn vị</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-xs text-slate-500">Mức khẩn cấp</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-sm ${
                        isCritical 
                          ? 'bg-red-100 text-red-700' 
                          : selectedUrgency 
                            ? 'bg-amber-100 text-amber-700' 
                            : 'text-slate-400'
                      }`}>
                        {selectedUrgency?.urgency_name || '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="space-y-3">
                  <Button 
                    type="submit" 
                    disabled={loading} 
                    className="w-full bg-blood hover:bg-red-700 text-white h-12 font-bold text-sm rounded-sm shadow-sm transition-colors uppercase tracking-wide disabled:opacity-60"
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang xử lý...</>
                    ) : (
                      <><Send className="w-4 h-4 mr-2" /> Gửi yêu cầu cứu trợ</>
                    )}
                  </Button>
                  <Link href="/blood-requests" className="block">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full h-10 font-semibold text-sm text-slate-600 rounded-sm border-slate-300 hover:bg-slate-50 transition-colors"
                    >
                      Hủy bỏ
                    </Button>
                  </Link>
                </div>

                {/* Required fields note */}
                <div className="flex items-start gap-2 px-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Các trường đánh dấu <span className="text-red-500 font-bold">*</span> là bắt buộc. Thông tin bạn cung cấp sẽ được bảo mật theo quy định.
                  </p>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </MainLayout>
  );
}
