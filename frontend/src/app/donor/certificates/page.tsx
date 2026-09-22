'use client';
import { useEffect, useState } from 'react';
import { donorService } from '@/lib/services/donor';
import { Award, CheckCircle2, Clock, XCircle, Printer, Eye, Droplet, FileCheck, ExternalLink, Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { BaseModal } from '@/components/ui/BaseModal';
import { VietnameseBloodCertificate, CertificateData, printCertificate } from '@/components/certificate/VietnameseBloodCertificate';

export default function DonorCertificatesPage() {
  const [loading, setLoading] = useState(true);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // Modal Preview Certificate
  const [selectedCert, setSelectedCert] = useState<CertificateData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchCertificates();
  }, [statusFilter]);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const res = await donorService.getMyCertificates({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        limit: 50
      });
      if (res && res.data) {
        setCertificates(Array.isArray(res.data) ? res.data : (res.data.data || []));
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách chứng chỉ:', error);
      toast.error('Không thể tải danh sách chứng nhận hiến máu');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCertificate = (item: any) => {
    const donation = item.donation || {};
    const facility = donation.facility || {};

    const certData: CertificateData = {
      certificate_no: item.certificate_code,
      donation_id: item.donation_id,
      donor_name: donation.donor?.full_name || 'Người hiến máu',
      donor_dob: donation.donor?.date_of_birth,
      donor_address: donation.donor?.address,
      donor_identity_card: donation.donor?.identity_card,
      blood_type: donation.blood_type?.blood_type_code || donation.donor?.blood_type?.blood_type_code,
      donation_date: donation.donation_date,
      volume_ml: donation.volume_ml,
      facility_id: facility.facility_id,
      facility_name: facility.facility_name || 'Cơ sở Y tế Tiếp Nhận',
      facility_address: facility.address,
      facility_seal_url: facility.seal_image_url,
      facility_signature_url: facility.signature_image_url,
      director_name: facility.director_name,
      director_title: facility.director_title,
      issue_date: item.issued_at || item.approved_at,
      cert_status: item.status,
      approved_by_name: item.approver?.full_name,
      approved_at: item.approved_at,
      seal_number: item.seal_number,
      reject_reason: item.reject_reason,
    };

    setSelectedCert(certData);
    setIsModalOpen(true);
  };

  const handlePrint = () => {
    printCertificate('vietnamese-blood-certificate');
  };

  // Stats calculation
  const totalCount = certificates.length;
  const approvedCount = certificates.filter(c => c.status === 'APPROVED').length;
  const pendingCount = certificates.filter(c => c.status === 'PENDING').length;
  const rejectedCount = certificates.filter(c => c.status === 'REJECTED').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-navy tracking-tight flex items-center gap-2.5">
          <Award className="w-7 h-7 text-blood" />
          Giấy Chứng Nhận Hiến Máu
        </h2>
        <p className="text-slate-500 mt-1 text-sm sm:text-base">
          Tra cứu, quản lý và in Giấy chứng nhận hiến máu tình nguyện chuẩn Bộ Y Tế của bạn.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-red-50 text-blood rounded-xl flex items-center justify-center font-bold">
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tổng chứng nhận</p>
            <p className="text-2xl font-black text-slate-800">{totalCount}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Đã cấp chứng nhận</p>
            <p className="text-2xl font-black text-slate-800">{approvedCount}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Đang chờ duyệt</p>
            <p className="text-2xl font-black text-slate-800">{pendingCount}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center font-bold">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-red-500 uppercase tracking-wider">Từ chối cấp</p>
            <p className="text-2xl font-black text-slate-800">{rejectedCount}</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { key: 'ALL', label: 'Tất cả' },
          { key: 'APPROVED', label: 'Đã cấp chứng nhận' },
          { key: 'PENDING', label: 'Chờ duyệt' },
          { key: 'REJECTED', label: 'Bị từ chối' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              statusFilter === tab.key
                ? 'bg-blood text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blood mx-auto mb-4"></div>
          <p className="text-sm text-slate-500">Đang tải danh sách giấy chứng nhận...</p>
        </div>
      ) : certificates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-red-50 text-blood rounded-full flex items-center justify-center mx-auto mb-4">
            <Award className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">Chưa có chứng nhận nào</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
            Sau khi bạn tham gia hiến máu và ca hiến được cơ sở y tế xác nhận, giấy chứng nhận sẽ hiển thị tại đây.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {certificates.map((cert) => {
            const donation = cert.donation || {};
            const facility = donation.facility || {};
            const isApproved = cert.status === 'APPROVED';
            const isPending = cert.status === 'PENDING';
            const isRejected = cert.status === 'REJECTED';

            return (
              <div 
                key={cert.certificate_id} 
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow relative flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Code & Status */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <span className="text-xs font-bold font-mono bg-slate-100 text-slate-800 px-2.5 py-1 rounded-md border border-slate-200">
                        {cert.certificate_code}
                      </span>
                      <h4 className="text-base font-bold text-navy mt-2 line-clamp-1" title={facility.facility_name}>
                        {facility.facility_name || 'Cơ sở y tế'}
                      </h4>
                    </div>

                    {isApproved && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Đã cấp chứng nhận
                      </span>
                    )}
                    {isPending && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        Đang chờ duyệt
                      </span>
                    )}
                    {isRejected && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200 shrink-0">
                        <XCircle className="w-3.5 h-3.5 text-red-600" />
                        Từ chối
                      </span>
                    )}
                  </div>

                  {/* Metadata Info */}
                  <div className="space-y-2 text-xs sm:text-sm text-slate-600 mb-6 bg-slate-50/80 p-3.5 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        Ngày hiến máu:
                      </span>
                      <span className="font-semibold text-slate-800">
                        {donation.donation_date ? format(new Date(donation.donation_date), 'dd/MM/yyyy') : '-'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Droplet className="w-4 h-4 text-blood" />
                        Thể tích & Nhóm máu:
                      </span>
                      <span className="font-bold text-blood">
                        {donation.volume_ml} ml {donation.blood_type?.blood_type_code ? `(${donation.blood_type.blood_type_code})` : ''}
                      </span>
                    </div>

                    {cert.seal_number && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Số con dấu:</span>
                        <span className="font-mono font-medium text-slate-700">{cert.seal_number}</span>
                      </div>
                    )}

                    {facility.address && (
                      <div className="flex items-start gap-1.5 pt-1 text-slate-500 border-t border-slate-200/60 mt-2">
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <span className="text-xs line-clamp-1">{facility.address}</span>
                      </div>
                    )}
                  </div>

                  {isRejected && cert.reject_reason && (
                    <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
                      <strong>Lý do từ chối:</strong> {cert.reject_reason}
                    </div>
                  )}
                </div>

                {/* Actions */}
                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <Button
                    onClick={() => handleOpenCertificate(cert)}
                    className="flex-1 bg-navy hover:bg-navy/90 text-white text-xs sm:text-sm font-semibold h-9"
                  >
                    <Eye className="w-4 h-4 mr-1.5" />
                    Xem Giấy Chứng Nhận
                  </Button>

                  {isApproved && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => {
                          handleOpenCertificate(cert);
                          setTimeout(() => handlePrint(), 300);
                        }}
                        className="text-xs sm:text-sm font-medium h-9 border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-blood"
                        title="In chứng nhận này"
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => window.open(`/certificate/${cert.donation_id}`, '_blank')}
                        className="text-xs sm:text-sm font-semibold h-9 border-slate-200 hover:bg-slate-50 text-slate-600"
                        title="Mở liên kết công khai"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Preview Certificate - Size 5xl để chứng chỉ hiển thị to, đẹp, trọn vẹn không bị scrollbar */}
      <BaseModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        title="Giấy Chứng Nhận Hiến Máu Tình Nguyện"
        subtitle="Mẫu song bản 2 mặt chuẩn Bộ Y Tế, có mã QR xác thực và dấu mộc điện tử"
        size="5xl"
        hideFooter
      >
        {selectedCert && (
          <div className="space-y-6">
            {/* Certificate Render - Căn giữa, không bị ép hẹp */}
            <div className="w-full flex justify-center py-2 bg-slate-50/50 rounded-2xl border border-slate-100 p-2 sm:p-4 overflow-x-auto">
              <VietnameseBloodCertificate data={selectedCert} />
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 print-hidden">
              <div className="text-xs text-slate-500">
                {selectedCert.cert_status === 'APPROVED' ? (
                  <span className="text-emerald-600 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Chứng nhận điện tử có giá trị sử dụng trên toàn quốc
                  </span>
                ) : (
                  <span className="text-amber-600 font-semibold flex items-center gap-1.5">
                    <Clock className="w-4 h-4" /> Chứng nhận đang chờ cơ sở y tế thẩm định và đóng dấu
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                  Đóng
                </Button>
                {selectedCert.donation_id && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(`/certificate/${selectedCert.donation_id}`, '_blank')}
                    className="border-slate-200 text-slate-700 hover:bg-slate-50"
                  >
                    <ExternalLink className="w-4 h-4 mr-1.5" />
                    Mở trang riêng
                  </Button>
                )}
                {selectedCert.cert_status === 'APPROVED' && (
                  <Button 
                    onClick={handlePrint}
                    className="bg-blood hover:bg-red-700 text-white font-semibold shadow-sm"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    In Giấy Chứng Nhận (A4)
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </BaseModal>
    </div>
  );
}
