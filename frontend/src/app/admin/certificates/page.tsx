'use client';
import { useEffect, useState } from 'react';
import { adminCertificateService } from '@/lib/services/admin-certificates';
import { toast } from 'sonner';
import { Award, CheckCircle, XCircle, Clock, Filter, Eye, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BaseModal } from '@/components/ui/BaseModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable, Column, ActionItem } from '@/components/ui/DataTable';
import { VietnameseBloodCertificate, CertificateData } from '@/components/certificate/VietnameseBloodCertificate';

export default function AdminCertificatesPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Reject modal
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Detail modal
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedCert, setSelectedCert] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [page, pageSize, keyword, statusFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await adminCertificateService.getCertificates({
        page, limit: pageSize,
        search: keyword || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter
      });
      if (res) {
        const resData = (res as any).data;
        setData(Array.isArray(resData?.data) ? resData.data : (Array.isArray(resData) ? resData : []));
        setMeta(resData?.meta || (res as any).meta || {});
      }
    } catch (error) {
      toast.error('Lỗi khi tải danh sách chứng nhận');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (certId: number) => {
    try {
      setSubmitting(true);
      await adminCertificateService.approveCertificate(certId);
      toast.success('Đã duyệt chứng nhận thành công!');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Duyệt thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectingId || !rejectReason.trim()) {
      toast.error('Vui lòng nhập lý do từ chối');
      return;
    }
    try {
      setSubmitting(true);
      await adminCertificateService.rejectCertificate(rejectingId, rejectReason);
      toast.success('Đã từ chối chứng nhận');
      setIsRejectOpen(false);
      setRejectReason('');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Từ chối thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { cls: string; label: string; icon: any }> = {
      PENDING: { cls: 'bg-amber-50 text-amber-600 border border-amber-200', label: 'Chờ duyệt', icon: <Clock className="w-3 h-3" /> },
      APPROVED: { cls: 'bg-emerald-50 text-emerald-600 border border-emerald-200', label: 'Đã duyệt', icon: <CheckCircle className="w-3 h-3" /> },
      REJECTED: { cls: 'bg-red-50 text-red-600 border border-red-200', label: 'Từ chối', icon: <XCircle className="w-3 h-3" /> },
    };
    const s = map[status] || { cls: 'bg-slate-50 text-slate-600 border border-slate-200', label: status, icon: null };
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${s.cls}`}>
        {s.icon} {s.label}
      </span>
    );
  };

  const columns: Column<any>[] = [
    {
      key: 'certificate_code',
      title: 'Mã chứng nhận',
      render: (cert) => <span className="font-mono text-sm font-bold text-slate-800">{cert.certificate_code}</span>
    },
    {
      key: 'donor',
      title: 'Người hiến',
      render: (cert) => (
        <div>
          <div className="font-medium text-slate-800">{cert.donation?.donor?.full_name}</div>
          <div className="text-xs text-slate-500">{cert.donation?.donor?.email}</div>
        </div>
      )
    },
    {
      key: 'facility',
      title: 'Cơ sở',
      render: (cert) => <span className="text-slate-600 text-sm">{cert.donation?.facility?.facility_name || '-'}</span>
    },
    {
      key: 'blood_type',
      title: 'Nhóm máu',
      render: (cert) => (
        <span className="font-bold text-blood">{cert.donation?.blood_type?.blood_type_code || '-'}</span>
      )
    },
    {
      key: 'created_at',
      title: 'Ngày tạo',
      render: (cert) => <span className="text-slate-600 text-sm">{cert.created_at ? format(new Date(cert.created_at), 'dd/MM/yyyy') : '-'}</span>
    },
    {
      key: 'status',
      title: 'Trạng thái',
      render: (cert) => getStatusBadge(cert.status)
    }
  ];

  const getRowActions = (cert: any): ActionItem[] => {
    const actions: ActionItem[] = [];

    if (cert.status === 'PENDING') {
      actions.push({
        label: 'Duyệt chứng nhận',
        icon: <CheckCircle className="w-4 h-4 text-emerald-500" />,
        onClick: () => handleApprove(cert.certificate_id)
      });
      actions.push({
        label: 'Từ chối',
        icon: <XCircle className="w-4 h-4 text-red-500" />,
        onClick: () => { setRejectingId(cert.certificate_id); setRejectReason(''); setIsRejectOpen(true); }
      });
    }

    actions.push({
      label: 'Xem chi tiết',
      icon: <Eye className="w-4 h-4 text-slate-500" />,
      onClick: () => { setSelectedCert(cert); setIsDetailOpen(true); }
    });

    if (cert.status === 'APPROVED') {
      actions.push({
        label: 'Xem chứng nhận',
        icon: <Award className="w-4 h-4 text-amber-500" />,
        onClick: () => window.open(`/certificate/${cert.donation_id}`, '_blank')
      });
    }

    return actions;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            Quản lý Chứng nhận Hiến máu
          </h1>
          <p className="text-sm text-slate-500 mt-1">{meta?.total || 0} chứng nhận trong hệ thống</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <DataTable
          data={data}
          columns={columns}
          totalRecords={meta?.total || 0}
          loading={loading}
          page={page}
          pageSize={pageSize}
          keyword={keyword}
          itemName="chứng nhận"
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSearch={(val) => { setKeyword(val); setPage(1); }}
          rowActions={getRowActions}
          toolbarFilters={
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-[180px]">
                <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val || 'ALL'); setPage(1); }}>
                  <SelectTrigger className="bg-white border-slate-200 text-slate-800">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-slate-500" />
                      <SelectValue placeholder="Trạng thái">
                        {statusFilter === 'ALL' ? 'Tất cả trạng thái' : statusFilter === 'PENDING' ? 'Chờ duyệt' : statusFilter === 'APPROVED' ? 'Đã duyệt' : 'Từ chối'}
                      </SelectValue>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                    <SelectItem value="PENDING">Chờ duyệt</SelectItem>
                    <SelectItem value="APPROVED">Đã duyệt</SelectItem>
                    <SelectItem value="REJECTED">Từ chối</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          }
        />
      </div>

      {/* Reject Modal */}
      <BaseModal
        open={isRejectOpen}
        onOpenChange={setIsRejectOpen}
        title="Từ chối chứng nhận"
        size="md"
        hideFooter
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Vui lòng nhập lý do từ chối chứng nhận này:</p>
          <Input
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Lý do từ chối..."
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setIsRejectOpen(false)}>Hủy</Button>
            <Button
              onClick={handleRejectSubmit}
              disabled={submitting || !rejectReason.trim()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
              Từ chối
            </Button>
          </div>
        </div>
      </BaseModal>

      {/* Detail Modal */}
      <BaseModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        title="Giấy Chứng Nhận Hiến Máu Tình Nguyện"
        subtitle="Mẫu song bản 2 mặt chuẩn Bộ Y Tế, có mã QR xác thực và con dấu mộc điện tử"
        size="5xl"
        hideFooter
      >
        {selectedCert && (
          <div className="space-y-6">
            {/* Vietnamese Official Certificate (Song Bản 2 Mặt) */}
            <div className="overflow-x-auto py-1">
              <VietnameseBloodCertificate
                data={{
                  certificate_no: selectedCert.certificate_code,
                  donation_id: selectedCert.donation_id,
                  donor_name: selectedCert.donation?.donor?.full_name || 'Người hiến',
                  donor_dob: selectedCert.donation?.donor?.date_of_birth,
                  donor_address: selectedCert.donation?.donor?.address,
                  donor_identity_card: selectedCert.donation?.donor?.identity_card,
                  blood_type: selectedCert.donation?.blood_type?.blood_type_code,
                  donation_date: selectedCert.donation?.donation_date,
                  volume_ml: selectedCert.donation?.volume_ml || 350,
                  facility_id: selectedCert.donation?.facility?.facility_id,
                  facility_name: selectedCert.donation?.facility?.facility_name || 'Cơ sở Y tế Tiếp Nhận',
                  facility_address: selectedCert.donation?.facility?.address,
                  facility_seal_url: selectedCert.donation?.facility?.seal_image_url,
                  facility_signature_url: selectedCert.donation?.facility?.signature_image_url,
                  director_name: selectedCert.donation?.facility?.director_name,
                  director_title: selectedCert.donation?.facility?.director_title,
                  issue_date: selectedCert.issued_at || selectedCert.approved_at,
                  cert_status: selectedCert.status,
                  approved_by_name: selectedCert.approver?.full_name,
                  approved_at: selectedCert.approved_at,
                  seal_number: selectedCert.seal_number,
                  reject_reason: selectedCert.reject_reason,
                }}
              />
            </div>

            {selectedCert.reject_reason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <label className="block text-xs font-medium text-red-600 mb-1">Lý do từ chối</label>
                <div className="text-sm text-red-800">{selectedCert.reject_reason}</div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="text-xs text-slate-500">
                Trạng thái hiện tại: {getStatusBadge(selectedCert.status)}
              </div>
              <div className="flex justify-end gap-2 w-full sm:w-auto">
                <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Đóng</Button>
                {selectedCert.status === 'PENDING' && (
                  <>
                    <Button onClick={() => handleApprove(selectedCert.certificate_id)} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      <CheckCircle className="w-4 h-4 mr-2" /> Duyệt cấp chứng nhận
                    </Button>
                    <Button
                      onClick={() => { setRejectingId(selectedCert.certificate_id); setRejectReason(''); setIsRejectOpen(true); setIsDetailOpen(false); }}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <XCircle className="w-4 h-4 mr-2" /> Từ chối
                    </Button>
                  </>
                )}
                {selectedCert.status === 'APPROVED' && (
                  <Button onClick={() => window.open(`/certificate/${selectedCert.donation_id}`, '_blank')} className="bg-amber-500 hover:bg-amber-600 text-white">
                    <Award className="w-4 h-4 mr-2" /> Mở trang in riêng
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
