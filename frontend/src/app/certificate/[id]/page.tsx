'use client';
import { useEffect, useState } from 'react';
import apiClient from '@/lib/services/apiClient';
import { Printer, ArrowLeft, Droplet, Heart, Share2, Medal, CheckCircle2, Award, ShieldCheck, Clock, XCircle } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { VietnameseBloodCertificate, printCertificate } from '@/components/certificate/VietnameseBloodCertificate';

export default function PublicCertificatePage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchCertificate(Number(params.id));
    }
  }, [params.id]);

  const fetchCertificate = async (id: number) => {
    try {
      setLoading(true);
      // Gọi API public không cần token
      const res = await apiClient.get<any, any>(`/donor/public/certificate/${id}`);
      if (res && res.data) {
        setData(res.data);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể tải giấy chứng nhận. Vui lòng thử lại sau.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    printCertificate('vietnamese-blood-certificate');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blood"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Droplet className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Không tìm thấy chứng nhận</h2>
          <p className="text-slate-500 mb-6">{error}</p>
          <button onClick={() => router.push('/')} className="bg-navy text-white px-6 py-2 rounded-lg font-medium hover:bg-navy/90 transition-colors w-full">
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  const isApproved = data?.cert_status === 'APPROVED';
  const isPending = data?.cert_status === 'PENDING';
  const isRejected = data?.cert_status === 'REJECTED';

  return (
    <div className="min-h-screen bg-slate-100 py-12 px-4 sm:px-6 lg:px-8 font-sans print:bg-white print:py-0 print:px-0">
      <div className="max-w-4xl mx-auto space-y-6 relative">
        
        {/* Toolbar - Ẩn khi in */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden bg-white p-4 rounded-2xl shadow-sm relative z-50">
          <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-navy transition-colors font-medium">
            <ArrowLeft className="w-4 h-4" />
            Về trang chủ
          </Link>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleCopyLink} 
              className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors font-medium"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
              {copied ? 'Đã chép link' : 'Chia sẻ'}
            </button>
            {isApproved && (
              <button 
                onClick={handlePrint} 
                className="flex items-center gap-2 bg-blood text-white px-5 py-2 rounded-lg hover:bg-red-700 transition-colors shadow-sm font-medium"
              >
                <Printer className="w-4 h-4" />
                In chứng nhận
              </button>
            )}
          </div>
        </div>

        {/* Status Banner */}
        {isPending && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 print:hidden">
            <Clock className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <p className="font-semibold text-amber-800">Chứng nhận đang chờ duyệt</p>
              <p className="text-sm text-amber-600">Chứng nhận này cần được admin hoặc nhân viên bệnh viện duyệt trước khi có hiệu lực chính thức.</p>
            </div>
          </div>
        )}
        {isRejected && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 print:hidden">
            <XCircle className="w-5 h-5 text-red-500 shrink-0" />
            <div>
              <p className="font-semibold text-red-800">Chứng nhận đã bị từ chối</p>
              {data?.reject_reason && <p className="text-sm text-red-600">Lý do: {data.reject_reason}</p>}
            </div>
          </div>
        )}

        {/* Vietnamese Official Certificate (Song Bản 2 Mặt) */}
        {data && (
          <div className="bg-white p-4 sm:p-8 rounded-2xl shadow-xl print:shadow-none print:p-0">
            <VietnameseBloodCertificate data={data} />
          </div>
        )}
      </div>
    </div>
  );
}
