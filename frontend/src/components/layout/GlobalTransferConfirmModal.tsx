'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/stores';
import { adminTransferService } from '@/lib/services/admin-transfers';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { PackageCheck, AlertCircle, ArrowRightLeft, CheckSquare, Square, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';

export function GlobalTransferConfirmModal() {
  const { user } = useAuthStore();
  const [pendingTransfers, setPendingTransfers] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [batchLoading, setBatchLoading] = useState<'selected' | 'all' | null>(null);

  const fetchPendingTransfers = async () => {
    if (!user || !user.facility_id) return;
    try {
      setLoading(true);
      const res = await adminTransferService.getTransfers({
        to_facility_id: user.facility_id,
        status: 'DELIVERED', // Chờ xác nhận đã nhận kho
        limit: 100,
      });
      if (res && res.data) {
        const list = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
        setPendingTransfers(list);
        setSelectedIds((prev) => prev.filter((id) => list.some((item: any) => item.transfer_id === id)));
      } else {
        setPendingTransfers([]);
        setSelectedIds([]);
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
      const interval = setInterval(fetchPendingTransfers, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const isProcessing = actionLoadingId !== null || batchLoading !== null;
  const allSelected = pendingTransfers.length > 0 && selectedIds.length === pendingTransfers.length;

  const toggleSelectAll = () => {
    if (isProcessing) return;
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingTransfers.map((item) => item.transfer_id));
    }
  };

  const toggleSelectItem = (id: number) => {
    if (isProcessing) return;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const confirmMultipleIds = async (ids: number[]) => {
    try {
      const res = await adminTransferService.receiveBatchTransfers(ids);
      return (res as any)?.message || (res as any)?.data?.message || `Đã xác nhận nhận kho ${ids.length} phiếu thành công!`;
    } catch (err: any) {
      // Fallback gọi tuần tự nếu backend chưa kịp khởi động lại route batch
      if (err?.response?.status === 404 || err?.response?.status === 400) {
        for (const id of ids) {
          await adminTransferService.receiveTransfer(id);
        }
        return `Đã xác nhận nhận kho ${ids.length} phiếu thành công!`;
      }
      throw err;
    }
  };

  const handleConfirmReceive = async (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      setActionLoadingId(id);
      const res = await adminTransferService.receiveTransfer(id);
      toast.success((res as any)?.message || (res as any)?.data?.message || 'Đã xác nhận nhận kho thành công!');
      await fetchPendingTransfers();
      window.dispatchEvent(new Event('transfer-updated'));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi xác nhận nhận kho');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmSelected = async () => {
    if (selectedIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 phiếu để duyệt xác nhận kho');
      return;
    }
    try {
      setBatchLoading('selected');
      const msg = await confirmMultipleIds(selectedIds);
      toast.success(msg);
      setSelectedIds([]);
      await fetchPendingTransfers();
      window.dispatchEvent(new Event('transfer-updated'));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi xác nhận các phiếu đã chọn');
    } finally {
      setBatchLoading(null);
    }
  };

  const handleConfirmAll = async () => {
    const allIds = pendingTransfers.map((item) => item.transfer_id);
    if (allIds.length === 0) return;
    try {
      setBatchLoading('all');
      const msg = await confirmMultipleIds(allIds);
      toast.success(msg);
      setSelectedIds([]);
      await fetchPendingTransfers();
      window.dispatchEvent(new Event('transfer-updated'));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi duyệt tất cả phiếu chuyển máu');
    } finally {
      setBatchLoading(null);
    }
  };

  const getBagSummary = (item: any) => {
    if (item.inventory_ids) {
      try {
        const parsed = JSON.parse(item.inventory_ids);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const totalVol = parsed.reduce((sum: number, b: any) => sum + (Number(b?.volume) || 0), 0);
          return totalVol > 0 ? `${parsed.length} túi (${totalVol}ml)` : `${parsed.length} túi`;
        }
      } catch (e) {}
    }
    if (item.inventory?.bag_code) {
      return `${item.inventory.bag_code}${item.inventory.volume_ml ? ` (${item.inventory.volume_ml}ml)` : ''}`;
    }
    return `${item.units_requested || 1} đơn vị`;
  };

  if (!user || !user.facility_id || pendingTransfers.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-rose-100 bg-rose-50 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mb-3 border-4 border-white shadow-sm">
            <AlertCircle className="w-7 h-7 text-rose-600" />
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-rose-700">Yêu Cầu Xác Nhận Nhập Kho</h2>
          <p className="text-sm text-rose-600/80 mt-1.5 max-w-lg">
            Cơ sở của bạn có <span className="font-bold text-rose-700">{pendingTransfers.length}</span> phiếu chuyển máu đã được giao đến.
            Bạn có thể tích chọn các phiếu cần duyệt hoặc bấm <span className="font-semibold">&quot;Duyệt tất cả&quot;</span> để xác nhận nhập kho.
          </p>
        </div>

        {/* Toolbar Chọn tất cả */}
        <div className="px-6 py-3 bg-white border-b border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={toggleSelectAll}
            disabled={isProcessing}
            className="flex items-center gap-2.5 text-sm font-medium text-slate-700 hover:text-rose-600 transition-colors cursor-pointer disabled:opacity-50"
          >
            {allSelected ? (
              <CheckSquare className="w-5 h-5 text-rose-600" />
            ) : (
              <Square className="w-5 h-5 text-slate-400" />
            )}
            <span>
              Chọn tất cả ({selectedIds.length}/{pendingTransfers.length} phiếu)
            </span>
          </button>

          <span className="text-xs text-slate-500">
            Bấm vào từng dòng để chọn nhanh
          </span>
        </div>

        {/* Danh sách gom chung trong 1 form */}
        <div className="p-4 md:p-6 overflow-y-auto flex-1 bg-slate-50">
          <div className="space-y-3">
            {pendingTransfers.map((item) => {
              const isSelected = selectedIds.includes(item.transfer_id);
              const isRowLoading = actionLoadingId === item.transfer_id;

              return (
                <div
                  key={item.transfer_id}
                  onClick={() => toggleSelectItem(item.transfer_id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col md:flex-row gap-4 items-start md:items-center justify-between ${
                    isSelected
                      ? 'bg-rose-50/60 border-rose-300 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isProcessing}
                      onChange={() => toggleSelectItem(item.transfer_id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer shrink-0"
                    />

                    <div className="flex-1 space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-slate-800">{item.transfer_code}</span>
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-xs font-semibold">
                          Đã giao
                        </span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                          {getBagSummary(item)}
                        </span>
                      </div>

                      <div className="text-sm flex flex-wrap items-center gap-2 text-slate-600">
                        <span className="font-medium text-slate-800">
                          {item.from_facility?.short_name || item.from_facility?.facility_name || '---'}
                        </span>
                        <ArrowRightLeft className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span className="font-medium text-rose-600">
                          {item.to_facility?.short_name || item.to_facility?.facility_name || '---'}
                        </span>
                      </div>

                      <div className="text-sm flex flex-wrap items-center gap-x-4 gap-y-1">
                        <div>
                          <span className="text-slate-500">Nhóm máu: </span>
                          <span className="font-bold text-rose-600">{item.blood_type?.blood_type_code}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Chế phẩm: </span>
                          <span className="font-medium text-slate-700">{item.component?.component_name}</span>
                        </div>
                        <div className="text-xs text-slate-400">
                          Giao lúc: {item.updated_at ? format(new Date(item.updated_at), 'dd/MM/yyyy HH:mm') : '---'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    onClick={(e) => handleConfirmReceive(item.transfer_id, e)}
                    disabled={isProcessing}
                    variant="outline"
                    className="w-full md:w-auto border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 shrink-0"
                  >
                    {isRowLoading ? (
                      <span className="flex items-center gap-1.5">
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-emerald-600/20 border-t-emerald-600 animate-spin" />
                        Đang duyệt...
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <PackageCheck className="w-4 h-4" /> Duyệt lẻ
                      </span>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions: Duyệt đã chọn & Duyệt tất cả */}
        <div className="p-4 md:px-6 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-sm text-slate-600">
            Đã chọn: <span className="font-bold text-rose-600">{selectedIds.length}</span> / {pendingTransfers.length} phiếu
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
            <Button
              type="button"
              onClick={handleConfirmSelected}
              disabled={selectedIds.length === 0 || isProcessing}
              className="flex-1 sm:flex-initial bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            >
              {batchLoading === 'selected' ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                  Đang duyệt ({selectedIds.length})...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <PackageCheck className="w-4 h-4" />
                  Duyệt đã chọn ({selectedIds.length})
                </span>
              )}
            </Button>

            <Button
              type="button"
              onClick={handleConfirmAll}
              disabled={isProcessing}
              className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {batchLoading === 'all' ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                  Đang duyệt tất cả...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CheckCheck className="w-4 h-4" />
                  Duyệt tất cả ({pendingTransfers.length})
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

