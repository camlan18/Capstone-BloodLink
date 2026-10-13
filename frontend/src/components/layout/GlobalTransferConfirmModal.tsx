'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/stores';
import { adminTransferService } from '@/lib/services/admin-transfers';
import { BaseModal } from '@/components/ui/BaseModal';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { PackageCheck, AlertCircle, ArrowRightLeft } from 'lucide-react';
import { format } from 'date-fns';

export function GlobalTransferConfirmModal() {
  const { user } = useAuthStore();
  const [pendingTransfers, setPendingTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const fetchPendingTransfers = async () => {
    if (!user || !user.facility_id) return;
    try {
      setLoading(true);
      const res = await adminTransferService.getTransfers({
        to_facility_id: user.facility_id,
        status: 'DELIVERED', // Chờ xác nhận đã nhận
        limit: 50,
      });
      if (res && res.data) {
        setPendingTransfers(Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []));
      } else {
        setPendingTransfers([]);
      }
    } catch (error) {
      console.error('Failed to fetch pending transfers', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.facility_id) {
      fetchPendingTransfers();
      // Optional: poll every 30 seconds
      const interval = setInterval(fetchPendingTransfers, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleConfirmReceive = async (id: number) => {
    try {
      setActionLoadingId(id);
      const res = await adminTransferService.receiveTransfer(id);
      toast.success((res as any)?.message || (res as any)?.data?.message || 'Đã xác nhận nhận máu thành công!');
      // Refresh list
      await fetchPendingTransfers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi xác nhận nhận máu');
    } finally {
      setActionLoadingId(null);
    }
  };

  if (!user || !user.facility_id || pendingTransfers.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-rose-100 bg-rose-50 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-sm">
            <AlertCircle className="w-8 h-8 text-rose-600" />
          </div>
          <h2 className="text-2xl font-bold text-rose-700">Yêu Cầu Xác Nhận Khẩn Cấp</h2>
          <p className="text-rose-600/80 mt-2 max-w-md">
            Cơ sở của bạn có {pendingTransfers.length} phiếu chuyển máu đã được giao đến. Vui lòng xác nhận nhận hàng ngay lập tức để tiếp tục sử dụng hệ thống.
          </p>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
          <div className="space-y-4">
            {pendingTransfers.map((item) => (
              <div key={item.transfer_id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-800">{item.transfer_code}</span>
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-xs font-semibold">Đã giao</span>
                  </div>
                  
                  <div className="text-sm flex items-center gap-2 text-slate-600">
                    <span className="font-medium text-slate-800">{item.from_facility?.short_name || item.from_facility?.facility_name || '---'}</span>
                    <ArrowRightLeft className="w-3 h-3 text-rose-500" />
                    <span className="font-medium text-rose-600">{item.to_facility?.short_name || item.to_facility?.facility_name || '---'}</span>
                  </div>

                  <div className="text-sm">
                    <span className="text-slate-500">Nhóm máu: </span>
                    <span className="font-bold text-rose-600 mr-3">{item.blood_type?.blood_type_code}</span>
                    <span className="text-slate-500">Chế phẩm: </span>
                    <span className="font-medium text-slate-700">{item.component?.component_name}</span>
                  </div>
                  
                  <div className="text-xs text-slate-400">
                    Giao lúc: {item.updated_at ? format(new Date(item.updated_at), 'dd/MM/yyyy HH:mm') : '---'}
                  </div>
                </div>

                <Button 
                  onClick={() => handleConfirmReceive(item.transfer_id)}
                  disabled={actionLoadingId === item.transfer_id}
                  className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                >
                  {actionLoadingId === item.transfer_id ? (
                    <span className="flex items-center gap-2"><div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" /> Đang xử lý...</span>
                  ) : (
                    <span className="flex items-center gap-2"><PackageCheck className="w-4 h-4" /> Xác nhận đã nhận</span>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
