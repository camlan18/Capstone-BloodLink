'use client';
import { useEffect, useState } from 'react';
import { donorService } from '@/lib/services/donor';
import { DonationHistory } from '@/types';
import { Calendar, Droplet, MapPin, Eye, FileText } from 'lucide-react';
import { BaseModal } from '@/components/ui/BaseModal';
import { DataTable, Column, ActionItem } from '@/components/ui/DataTable';

export default function DonorHistoryPage() {
  const [history, setHistory] = useState<DonationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<string>('donation_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await donorService.getHistory();
      if (res && res.data) setHistory(res.data);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { cls: string; label: string }> = {
      COMPLETED: { cls: 'bg-emerald-100 text-emerald-700', label: 'Đã hoàn thành' },
      CANCELLED: { cls: 'bg-red-100 text-red-700', label: 'Đã hủy' },
      PENDING: { cls: 'bg-amber-100 text-amber-700', label: 'Chờ xác nhận' },
      SCHEDULED: { cls: 'bg-blue-100 text-blue-700', label: 'Đã lên lịch' },
      EXAMINED_FAILED: { cls: 'bg-red-100 text-red-700', label: 'Khám không đạt' },
      CONFIRMED: { cls: 'bg-blue-100 text-blue-700', label: 'Đã xác nhận' },
      ARRIVED: { cls: 'bg-purple-100 text-purple-700', label: 'Đã đến' },
    };
    const s = map[status] || { cls: 'bg-slate-100 text-slate-700', label: status };
    return <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-md text-xs font-medium ${s.cls}`}>{s.label}</span>;
  };

  const filteredHistory = history.filter(h =>
    h.facility?.facility_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    new Date(h.donation_date).toLocaleDateString('vi-VN').includes(searchTerm)
  ).sort((a, b) => {
    let aVal: any = a[sortBy as keyof DonationHistory];
    let bVal: any = b[sortBy as keyof DonationHistory];
    
    if (sortBy === 'facility') {
      aVal = a.facility?.facility_name || '';
      bVal = b.facility?.facility_name || '';
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const paginatedHistory = filteredHistory.slice((page - 1) * pageSize, page * pageSize);

  const columns: Column<DonationHistory>[] = [
    {
      key: 'donation_date',
      title: 'Ngày hiến',
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          {new Date(item.donation_date).toLocaleDateString('vi-VN')}
        </div>
      )
    },
    {
      key: 'facility',
      title: 'Cơ sở tiếp nhận',
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="line-clamp-1">{item.facility?.facility_name}</span>
        </div>
      )
    },
    {
      key: 'volume_ml',
      title: 'Lượng máu',
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-1 font-bold text-blood">
          {item.volume_ml > 0 ? (
            <>
              <Droplet className="w-4 h-4 fill-current" />
              {item.volume_ml} ml
            </>
          ) : (
            <span className="text-slate-400 font-normal">-</span>
          )}
        </div>
      )
    },
    {
      key: 'status',
      title: 'Trạng thái',
      sortable: true,
      render: (item: any) => getStatusBadge(item.status)
    }
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-navy">Lịch Sử Hiến Máu</h1>
          <p className="text-slate-500 text-sm mt-1">Quản lý các lần hiến máu trước đây</p>
        </div>
      </div>

      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
        <DataTable
          data={paginatedHistory}
          columns={columns}
          totalRecords={filteredHistory.length}
          loading={loading}
          page={page}
          pageSize={pageSize}
          keyword={searchTerm}
          sortBy={sortBy}
          sortDirection={sortDirection}
          itemName="lần hiến máu"
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          onSearch={(val) => { setSearchTerm(val); setPage(1); }}
          onSort={(key, dir) => {
            setSortBy(key);
            setSortDirection(dir || 'asc');
          }}
          rowActions={(item) => [
            {
              label: 'Xem chi tiết',
              icon: <Eye className="w-4 h-4" />,
              onClick: () => {
                setSelectedItem(item);
                setIsDetailOpen(true);
              }
            }
          ]}
        />
      </div>

      <BaseModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        title="Chi tiết lịch sử"
        hideFooter
      >
        {selectedItem && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              {getStatusBadge(selectedItem.status)}
              <span className="text-sm font-medium text-slate-500 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(selectedItem.donation_date).toLocaleDateString('vi-VN')}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Cơ sở tiếp nhận</label>
                <div className="font-medium text-navy">{selectedItem.facility?.facility_name || '-'}</div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Lượng máu</label>
                <div className="font-bold text-blood">{selectedItem.volume_ml > 0 ? `${selectedItem.volume_ml} ml` : '-'}</div>
              </div>
            </div>

            {selectedItem.notes && (
              <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <label className="flex items-center gap-1 text-xs font-medium text-slate-500 mb-1"><FileText className="w-3 h-3"/> Ghi chú / Lý do</label>
                <div className="text-sm text-slate-700 whitespace-pre-wrap">{selectedItem.notes}</div>
              </div>
            )}
          </div>
        )}
      </BaseModal>
    </div>
  );
}
