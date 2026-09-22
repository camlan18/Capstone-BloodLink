'use client';
import { useEffect, useState } from 'react';
import { donorService } from '@/lib/services/donor';
import { Calendar, Droplet, MapPin, Activity, User } from 'lucide-react';
import { BaseModal } from '@/components/ui/BaseModal';
import { DataTable, Column } from '@/components/ui/DataTable';

export default function MyMatchesPage() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => { fetchMatches(); }, []);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const res = await donorService.getMyMatches();
      if (res && res.data) setMatches(res.data);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { cls: string; label: string }> = {
      PENDING: { cls: 'bg-amber-100 text-amber-700', label: 'Chờ phản hồi' },
      CONTACTED: { cls: 'bg-blue-100 text-blue-700', label: 'Đã liên hệ' },
      ACCEPTED: { cls: 'bg-emerald-100 text-emerald-700', label: 'Đã đồng ý' },
      DECLINED: { cls: 'bg-red-100 text-red-700', label: 'Từ chối' },
      COMPLETED: { cls: 'bg-purple-100 text-purple-700', label: 'Đã hiến máu' },
    };
    const s = map[status] || { cls: 'bg-slate-100 text-slate-700', label: status };
    return <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-md text-xs font-medium ${s.cls}`}>{s.label}</span>;
  };

  const filteredMatches = matches.filter(m =>
    m.request?.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.request?.facility?.facility_name?.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    let aVal: any = a[sortBy];
    let bVal: any = b[sortBy];
    
    if (sortBy === 'patient') {
      aVal = a.request?.patient_name || '';
      bVal = b.request?.patient_name || '';
    } else if (sortBy === 'facility') {
      aVal = a.request?.facility?.facility_name || '';
      bVal = b.request?.facility?.facility_name || '';
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const paginatedMatches = filteredMatches.slice((page - 1) * pageSize, page * pageSize);

  const columns: Column<any>[] = [
    {
      key: 'created_at',
      title: 'Ngày nhận',
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          {new Date(item.created_at).toLocaleDateString('vi-VN')}
        </div>
      )
    },
    {
      key: 'patient',
      title: 'Bệnh nhân',
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-2 font-medium text-navy">
          <User className="w-4 h-4 text-slate-400 shrink-0" />
          {item.request?.patient_name}
        </div>
      )
    },
    {
      key: 'blood_type',
      title: 'Nhóm máu cần',
      sortable: false,
      render: (item) => (
        <div className="flex items-center gap-1 font-bold text-blood">
          <Droplet className="w-4 h-4 fill-current" />
          {item.request?.blood_type?.name}
        </div>
      )
    },
    {
      key: 'facility',
      title: 'Tại cơ sở y tế',
      sortable: true,
      render: (item) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-2 text-sm font-medium">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="line-clamp-1">{item.request?.facility?.facility_name}</span>
          </div>
          <span className="text-xs text-slate-500 line-clamp-1 ml-5 mt-0.5">{item.request?.facility?.address}</span>
        </div>
      )
    },
    {
      key: 'match_score',
      title: 'Độ phù hợp',
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-500" />
          <div className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden">
            <div className="bg-emerald-500 h-full" style={{ width: `${item.match_score}%` }}></div>
          </div>
          <span className="text-xs font-medium text-slate-600">{item.match_score}%</span>
        </div>
      )
    },
    {
      key: 'match_status',
      title: 'Trạng thái ghép nối',
      sortable: true,
      render: (item: any) => getStatusBadge(item.match_status)
    }
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-navy">Lịch Sử Giúp Đỡ</h1>
          <p className="text-slate-500 text-sm mt-1">Danh sách các yêu cầu máu khẩn cấp mà bạn phù hợp và được hệ thống kêu gọi</p>
        </div>
      </div>

      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
        <DataTable
          data={paginatedMatches}
          columns={columns}
          totalRecords={filteredMatches.length}
          loading={loading}
          page={page}
          pageSize={pageSize}
          keyword={searchTerm}
          sortBy={sortBy}
          sortDirection={sortDirection}
          itemName="lần được kêu gọi"
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          onSearch={(val) => { setSearchTerm(val); setPage(1); }}
          onSort={(key, dir) => {
            setSortBy(key);
            setSortDirection(dir || 'asc');
          }}
        />
      </div>
    </div>
  );
}
