'use client';
import { useEffect, useState, useRef } from 'react';
import apiClient from '@/lib/services/apiClient';
import { useAuthStore } from '@/lib/stores';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileSignature, Upload, CheckCircle2, RotateCcw, Building2, ShieldCheck, Sparkles, Loader2, Eye, PenTool } from 'lucide-react';
import { VietnameseBloodCertificate, CertificateData } from '@/components/certificate/VietnameseBloodCertificate';
import { DigitalSignaturePad } from '@/components/ui/DigitalSignaturePad';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/ui/PageHeader';

export default function FacilitySealPage() {
  const currentUser = useAuthStore(state => state.user);
  const isAdmin = currentUser?.role?.role_code === 'ADMIN' || (typeof currentUser?.role === 'string' && currentUser.role === 'ADMIN');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    facility_name: '',
    address: '',
    seal_image_url: '',
    signature_image_url: '',
    director_name: '',
    director_title: '',
  });

  const [uploadingSeal, setUploadingSeal] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);

  const sealInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadInitialData();
  }, [currentUser]);

  const loadInitialData = async () => {
    try {
      setLoading(true);

      // 1. Fetch facilities list
      let facs: any[] = [];
      try {
        const res = await apiClient.get<any, any>('/master-data/facilities?limit=100');
        facs = Array.isArray(res?.data) ? res.data : (res?.data?.data || (Array.isArray(res) ? res : []));
        setFacilities(facs);
      } catch (e) {
        console.warn('Could not load facilities list:', e);
      }

      const userFacilityId = (currentUser as any)?.facility_id || ((currentUser as any)?.facility?.facility_id);
      if (userFacilityId && facs.length > 0) {
        const myFac = facs.find(f => f.facility_id === userFacilityId);
        if (myFac) {
          setSelectedFacilityId(myFac.facility_id);
          fillFormData(myFac);
          return;
        }
      }

      if (facs.length > 0) {
        const targetFac = selectedFacilityId ? (facs.find(f => f.facility_id === selectedFacilityId) || facs[0]) : facs[0];
        setSelectedFacilityId(targetFac.facility_id);
        fillFormData(targetFac);
        return;
      }

      const res = await apiClient.get<any, any>('/master-data/my-facility');
      const facData = res?.data || res;
      if (facData && facData.facility_id) {
        setFacilities([facData]);
        setSelectedFacilityId(facData.facility_id);
        fillFormData(facData);
      }
    } catch (error: any) {
      console.error('Lỗi khi tải thông tin cơ sở y tế:', error);
      toast.error('Không thể tải thông tin cơ sở y tế');
    } finally {
      setLoading(false);
    }
  };

  const fillFormData = (fac: any) => {
    setFormData({
      facility_name: fac.facility_name || '',
      address: fac.address || '',
      seal_image_url: fac.seal_image_url || '',
      signature_image_url: fac.signature_image_url || '',
      director_name: fac.director_name || '',
      director_title: fac.director_title || 'KT. GIÁM ĐỐC - PHÓ GIÁM ĐỐC',
    });
  };

  const handleFacilityChange = (facIdStr: string | null) => {
    if (!facIdStr) return;
    const id = parseInt(facIdStr);
    setSelectedFacilityId(id);
    const target = facilities.find(f => f.facility_id === id);
    if (target) {
      fillFormData(target);
    }
  };

  const handleUploadFile = async (file: File, type: 'seal' | 'signature') => {
    try {
      if (type === 'seal') setUploadingSeal(true);
      else setUploadingSignature(true);

      const body = new FormData();
      body.append('file', file);

      const res = await apiClient.post<any, any>('/upload/image', body, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const uploadedUrl = res?.data?.url || res?.url || (typeof res?.data === 'string' ? res.data : null);

      if (uploadedUrl) {
        if (type === 'seal') {
          setFormData(prev => ({ ...prev, seal_image_url: uploadedUrl }));
          toast.success('Đã tải lên hình ảnh con dấu tròn tách nền!');
        } else {
          setFormData(prev => ({ ...prev, signature_image_url: uploadedUrl }));
          toast.success('Đã tải lên chữ ký số / chữ ký bác sĩ tách nền!');
        }
      } else {
        toast.error('Không tìm thấy đường dẫn ảnh từ máy chủ');
      }
    } catch (error: any) {
      console.error('Upload lỗi:', error);
      toast.error(error.response?.data?.message || 'Tải ảnh thất bại. Vui lòng chọn file PNG dưới 5MB.');
    } finally {
      if (type === 'seal') setUploadingSeal(false);
      else setUploadingSignature(false);
    }
  };

  const handleSave = async () => {
    if (!selectedFacilityId) return;
    try {
      setSaving(true);

      let finalSignatureUrl = formData.signature_image_url;
      if (finalSignatureUrl && finalSignatureUrl.startsWith('data:image/')) {
        try {
          const resBlob = await fetch(finalSignatureUrl);
          const blob = await resBlob.blob();
          const file = new File([blob], `signature_${selectedFacilityId}_${Date.now()}.png`, { type: 'image/png' });
          const uploadData = new FormData();
          uploadData.append('file', file);
          const uploadRes = await apiClient.post<any, any>('/upload/image', uploadData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          if (uploadRes && uploadRes.url) {
            finalSignatureUrl = uploadRes.url;
            setFormData(prev => ({ ...prev, signature_image_url: finalSignatureUrl }));
          }
        } catch (uploadErr) {
          console.warn('Upload signature as file failed, fallback to raw string:', uploadErr);
        }
      }

      await apiClient.put(`/master-data/facilities/${selectedFacilityId}/seal-signature`, {
        seal_image_url: formData.seal_image_url || null,
        signature_image_url: finalSignatureUrl || null,
        director_name: formData.director_name || null,
        director_title: formData.director_title || null,
      });

      toast.success('Đã lưu cấu hình con dấu và chữ ký số thành công!');
    } catch (error: any) {
      console.error('Lưu lỗi:', error);
      toast.error(error.response?.data?.message || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const previewCertData: CertificateData = {
    certificate_no: 'BL-2026-PREVIEW',
    donation_id: 1,
    donor_name: 'NGUYỄN VĂN AN (MẪU XEM TRƯỚC)',
    donor_dob: '2000-01-01',
    donor_address: formData.address || 'Phường An Phú, TP. Cần Thơ',
    donor_identity_card: '092000001234',
    blood_type: 'O+',
    donation_date: new Date(),
    volume_ml: 350,
    facility_id: selectedFacilityId || 1,
    facility_name: formData.facility_name || 'BỆNH VIỆN TIẾP NHẬN MÁU',
    facility_address: formData.address,
    facility_seal_url: formData.seal_image_url || null,
    facility_signature_url: formData.signature_image_url || null,
    director_name: formData.director_name || 'TS. BS. Nguyễn Tri Thức',
    director_title: formData.director_title || 'KT. GIÁM ĐỐC - PHÓ GIÁM ĐỐC',
    issue_date: new Date(),
    cert_status: 'APPROVED',
    approved_by_name: formData.director_name,
    approved_at: new Date(),
    seal_number: 'SEAL-2026-DEMO',
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="w-10 h-10 animate-spin text-blood mx-auto mb-3" />
        <p className="text-sm text-slate-500">Đang tải cấu hình con dấu bệnh viện...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-full mx-auto pb-12">
      {/* Header */}
      <PageHeader
        title="Cấu Hình Con Dấu Bệnh Viện"
        description="Thiết lập con dấu mộc đỏ tròn (tách nền PNG) để tự động đóng dấu lên Giấy Chứng Nhận Hiến Máu."
        action={
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-blood hover:bg-red-700 text-white font-semibold shadow-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
            Lưu Cấu Hình
          </Button>
        }
      />

      {/* Admin Facility Selector */}
      {isAdmin && facilities.length > 0 && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <Building2 className="w-5 h-5 text-blood shrink-0" />
          <div className="flex-1 max-w-md">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Chọn Bệnh viện / Cơ sở Y tế cấu hình:
            </label>
            <Select value={selectedFacilityId?.toString()} onValueChange={handleFacilityChange}>
              <SelectTrigger className="bg-slate-50 border-slate-200">
                <span className="truncate text-left flex-1 font-semibold text-slate-800">
                  {facilities.find(f => f.facility_id === selectedFacilityId)
                    ? `${facilities.find(f => f.facility_id === selectedFacilityId).facility_name} (${facilities.find(f => f.facility_id === selectedFacilityId).short_name || facilities.find(f => f.facility_id === selectedFacilityId).facility_code || ''})`
                    : 'Chọn cơ sở y tế'}
                </span>
              </SelectTrigger>
              <SelectContent>
                {facilities.map(f => (
                  <SelectItem key={f.facility_id} value={f.facility_id.toString()}>
                    {f.facility_name} ({f.short_name || f.facility_code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Cột Trái: Form Upload & Nhập liệu */}
        <div className="lg:col-span-5 space-y-6">

          {/* Box 1: Thông tin cơ sở */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Building2 className="w-5 h-5 text-navy" />
              Thông Tin Ký Duyệt
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Tên cơ sở y tế:</label>
              <Input
                value={formData.facility_name}
                disabled
                className="bg-slate-50 font-semibold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Chức vụ người ký:</label>
              <Input
                value={formData.director_title}
                onChange={(e) => setFormData(prev => ({ ...prev, director_title: e.target.value }))}
                placeholder="VD: KT. GIÁM ĐỐC - PHÓ GIÁM ĐỐC hoặc GIÁM ĐỐC"
              />
              <p className="text-[11px] text-slate-400 mt-1">Dòng chữ chức danh in phía trên con dấu</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Họ tên người ký duyệt:</label>
              <Input
                value={formData.director_name}
                onChange={(e) => setFormData(prev => ({ ...prev, director_name: e.target.value }))}
                placeholder="VD: TS. BS. CKII. Nguyễn Tri Thức"
              />
              <p className="text-[11px] text-slate-400 mt-1">Họ tên bác sĩ lãnh đạo in bên dưới con dấu</p>
            </div>
          </div>

          {/* Box 2: Upload Mộc đỏ tách nền */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-red-600" />
                Con Dấu Mộc Đỏ Bệnh Viện
              </h3>
              {formData.seal_image_url && (
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, seal_image_url: '' }))}
                  className="text-xs text-red-600 hover:underline flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Dùng mộc tự động
                </button>
              )}
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Tải lên ảnh <strong>con dấu tròn đỏ tách nền (PNG trong suốt)</strong> của bệnh viện. Nếu chưa có ảnh tải lên, hệ thống sẽ tự động vẽ con dấu chuẩn Bộ Y Tế mang tên bệnh viện.
            </p>

            {/* Preview Seal */}
            <div className="flex items-center gap-6 p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/50">
              <div className="w-28 h-28 rounded-xl border border-slate-200 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:8px_8px] flex items-center justify-center p-2 shrink-0 relative shadow-inner">
                {formData.seal_image_url ? (
                  <img
                    src={formData.seal_image_url}
                    alt="Con dấu hiện tại"
                    className="w-full h-full object-contain drop-shadow-md"
                  />
                ) : (
                  <div className="text-center p-2">
                    <Sparkles className="w-6 h-6 text-amber-500 mx-auto mb-1" />
                    <span className="text-[10px] font-bold text-slate-500 block leading-tight">Mộc đỏ SVG tự động</span>
                  </div>
                )}
              </div>

              <div className="space-y-2 flex-1">
                <input
                  ref={sealInputRef}
                  type="file"
                  accept="image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUploadFile(f, 'seal');
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => sealInputRef.current?.click()}
                  disabled={uploadingSeal}
                  className="w-full text-xs font-semibold h-9 border-slate-300"
                >
                  {uploadingSeal ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-2" />}
                  Tải lên ảnh mộc tách nền (.PNG)
                </Button>
                <p className="text-[11px] text-slate-400">Khuyến nghị ảnh tròn kích thước 400x400px, nền trong suốt.</p>
              </div>
            </div>
          </div>



        </div>

        {/* Cột Phải: Live Preview trực quan thời gian thực */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
              <Eye className="w-5 h-5 text-blood" />
              Xem Trước Chứng Nhận Thực Tế (Live Preview)
            </h3>
            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Cập nhật tức thì
            </span>
          </div>

          {/* Certificate Scrollable Frame */}
          <div className="bg-slate-100 p-2 sm:p-4 rounded-2xl border border-slate-300 shadow-inner overflow-x-auto">
            <div className="min-w-[780px]">
              <VietnameseBloodCertificate data={previewCertData} />
            </div>
          </div>

          <p className="text-xs text-slate-500 text-center italic">
            * Kéo thanh trượt ngang để xem trọn vẹn cả 2 mặt giấy chứng nhận chuẩn khổ in. Mọi thay đổi con dấu sẽ áp dụng ngay khi cấp chứng nhận mới.
          </p>
        </div>

      </div>
    </div>
  );
}
