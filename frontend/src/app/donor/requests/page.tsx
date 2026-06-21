'use client';

import { useState, useEffect } from 'react';
import { bloodRequestService } from '@/lib/services/bloodRequest';
import { ClipboardList, Plus, Search, MapPin, Activity, Droplet, Clock, User as UserIcon, Phone, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DataTable, Column } from '@/components/ui/DataTable';
import { BaseModal } from '@/components/ui/BaseModal';

export default function MyRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Detail Modal State
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [detailTab, setDetailTab] = useState<'details' | 'history'>('details');
  const [detailLoading, setDetailLoading] = useState(false);
  
  const handleViewDetails = async (item: any) => {
    setIsDetailOpen(true);
    setDetailTab('details');
    setSelectedItem(item);
    
    try {
      setDetailLoading(true);
      const res = await bloodRequestService.getMyRequestDetails(item.request_id);
      if (res && res.data) {
        setSelectedItem(res.data);
      } else {
        setSelectedItem(res);
      }
    } catch (error) {
      console.error('Failed to fetch details:', error);
      toast.error('Không thể tải chi tiết yêu cầu');
    } finally {
      setDetailLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await bloodRequestService.getMyRequests({
        page,
        limit: pageSize,
        search,
      });
      if (res && res.data) {
        setRequests(res.data);
        if ((res as any).meta) {
          setTotalRecords((res as any).meta.total);
        }
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error);
      toast.error('Không thể tải lịch sử yêu cầu máu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRequests();
    }, 500);
    return () => clearTimeout(timer);
  }, [page, pageSize, search]);

  const getStatusColor = (status: string) => {
    if (!status) return 'bg-slate-100 text-slate-700';
    const s = status.toLowerCase();
    if (s.includes('pending')) return 'bg-yellow-100 text-yellow-700';
    if (s.includes('approved')) return 'bg-emerald-100 text-emerald-700';
    if (s.includes('completed')) return 'bg-blue-100 text-blue-700';
    if (s.includes('reject') || s.includes('cancel')) return 'bg-red-100 text-red-700';
    return 'bg-slate-100 text-slate-700';
  };

  const getUrgencyColor = (urgency: string) => {
    if (!urgency) return 'text-slate-500';
    const u = urgency.toLowerCase();
    if (u.includes('urgent') || u.includes('emergency')) return 'text-red-600 bg-red-50';
    if (u.includes('high')) return 'text-orange-600 bg-orange-50';
    return 'text-emerald-600 bg-emerald-50';
  };

  // Filter requests locally by status since we don't have status_id mapping easily accessible
  let displayRequests = requests;
  if (statusFilter !== 'all') {
    displayRequests = requests.filter(r => {
      const code = r.status?.status_code?.toLowerCase() || '';
      if (statusFilter === 'pending') return code.includes('pending');
      if (statusFilter === 'approved') return code.includes('approved') || code.includes('allocated') || code.includes('matching');
      if (statusFilter === 'completed') return code.includes('completed');
      if (statusFilter === 'rejected') return code.includes('reject') || code.includes('cancel');
      return true;
    });
  }

  // Sort locally
  const sortedRequests = [...displayRequests].sort((a, b) => {
    let aVal: any = a[sortBy];
    let bVal: any = b[sortBy];
    
    if (sortBy === 'patient_name') {
      aVal = a.patient_name;
      bVal = b.patient_name;
    } else if (sortBy === 'blood_type') {
      aVal = a.blood_type?.abo + a.blood_type?.rh_factor;
      bVal = b.blood_type?.abo + b.blood_type?.rh_factor;
    } else if (sortBy === 'facility') {
      aVal = a.facility?.name || a.hospital_name;
      bVal = b.facility?.name || b.hospital_name;
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const columns: Column<any>[] = [
    {
      key: 'created_at',
      title: 'Mã YC / Ngày tạo',
      sortable: true,
      render: (item) => (
        <div>
          <div className="font-semibold text-navy">{item.request_code}</div>
          <div className="text-slate-500 text-xs mt-1">
            {new Date(item.created_at).toLocaleDateString('vi-VN')}
          </div>
        </div>
      )
    },
    {
      key: 'patient_name',
      title: 'Bệnh nhân',
      sortable: true,
      render: (item) => (
        <div>
          <div className="font-medium text-slate-800">{item.patient_name}</div>
          {item.patient_phone && <div className="text-slate-500 text-xs mt-1">{item.patient_phone}</div>}
        </div>
      )
    },
    {
      key: 'blood_type',
      title: 'Nhóm máu',
      sortable: true,
      render: (item) => (
        <div>
          <div className="flex items-center gap-1.5 font-bold text-blood bg-red-50 w-fit px-2.5 py-1 rounded-md text-xs">
            <Droplet className="w-3.5 h-3.5" />
            {item.blood_type?.abo}{item.blood_type?.rh_factor}
          </div>
          <div className="text-xs text-slate-500 mt-1.5 font-medium">
            {item.units_needed} đ.vị
          </div>
        </div>
      )
    },
    {
      key: 'facility',
      title: 'Cơ sở / Bệnh viện',
      sortable: true,
      render: (item) => (
        <div className="flex items-start gap-1.5 text-slate-700">
          <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <span className="line-clamp-2 leading-relaxed text-sm">{item.facility?.name || item.hospital_name}</span>
        </div>
      )
    },
    {
      key: 'urgency_id',
      title: 'Mức độ',
      sortable: true,
      render: (item) => (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold ${getUrgencyColor(item.urgency?.urgency_code)}`}>
          <Activity className="w-3 h-3" />
          {item.urgency?.urgency_name}
        </span>
      )
    },
    {
      key: 'status',
      title: 'Trạng thái',
      sortable: false,
      render: (item) => (
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(item.status?.status_code)}`}>
          {item.status?.status_name}
        </span>
      )
    }
  ];

  const toolbarFilters = (
    <select
      value={statusFilter}
      onChange={(e) => setStatusFilter(e.target.value)}
      className="h-10 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blood/20 text-slate-700 shadow-sm"
    >
      <option value="all">Tất cả trạng thái</option>
      <option value="pending">Chờ xử lý</option>
      <option value="approved">Đã duyệt / Đang xử lý</option>
      <option value="completed">Đã hoàn thành</option>
      <option value="rejected">Đã hủy / Từ chối</option>
    </select>
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-navy flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-blood" />
            Lịch sử yêu cầu máu
          </h1>
          <p className="text-slate-500 mt-2">Theo dõi các yêu cầu cung cấp máu bạn đã tạo</p>
        </div>
        <Link 
          href="/blood-requests" 
          className="flex items-center gap-2 px-4 py-2 bg-blood hover:bg-blood-dark text-white rounded-lg transition-colors font-medium text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Tạo yêu cầu mới
        </Link>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
        <DataTable
          data={sortedRequests}
          columns={columns}
          totalRecords={totalRecords}
          loading={loading}
          page={page}
          pageSize={pageSize}
          keyword={search}
          sortBy={sortBy}
          sortDirection={sortDirection}
          itemName="yêu cầu máu"
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          onSearch={(val) => { setSearch(val); setPage(1); }}
          onSort={(key, dir) => {
            setSortBy(key);
            setSortDirection(dir || 'asc');
          }}
          toolbarFilters={toolbarFilters}
          rowActions={(item) => [
            {
              label: 'Xem chi tiết',
              onClick: () => handleViewDetails(item)
            }
          ]}
        />

      </div>

      <BaseModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Chi tiết Yêu cầu máu"
        size="4xl"
        hideFooter
      >
        {detailLoading ? (
          <div className="flex justify-center items-center py-12">
            <Activity className="w-8 h-8 animate-spin text-blood" />
          </div>
        ) : selectedItem ? (
          <div className="text-sm">
            {/* Header Mini */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
              <div>
                <h1 className="text-xl font-bold text-navy flex items-center gap-2">
                  Mã YC: <span className="text-blood">{selectedItem.request_code}</span>
                </h1>
                <p className="text-slate-500 mt-1 flex items-center gap-1.5 text-xs">
                  <Clock className="w-3.5 h-3.5" />
                  Tạo lúc {new Date(selectedItem.created_at).toLocaleString('vi-VN')}
                </p>
              </div>
              <div className={`px-3 py-1.5 rounded-md text-xs font-bold border ${getStatusColor(selectedItem.status?.status_code)}`}>
                {selectedItem.status?.status_name}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-6 border-b border-slate-200 mb-6">
              <button 
                onClick={() => setDetailTab('details')}
                className={`pb-2.5 text-sm font-bold border-b-2 transition-colors ${detailTab === 'details' ? 'border-blood text-blood' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                Thông tin chi tiết
              </button>
              <button 
                onClick={() => setDetailTab('history')}
                className={`pb-2.5 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${detailTab === 'history' ? 'border-blood text-blood' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                Lịch sử xử lý
                <span className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded-full">{selectedItem.status_history?.length || 0}</span>
              </button>
            </div>

            {detailTab === 'details' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="md:col-span-2 space-y-6">
                  {/* Medical Info */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                      <Droplet className="w-24 h-24 text-blood" />
                    </div>
                    <h2 className="text-lg font-bold text-navy flex items-center gap-2 mb-4">
                      <Activity className="w-4 h-4 text-blood" />
                      Thông tin y tế
                    </h2>
                    
                    <div className="grid grid-cols-2 gap-4 relative z-10">
                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Nhóm máu cần</label>
                        <div className="flex items-center gap-2 text-base font-bold text-blood">
                          <span className="bg-red-50 px-2.5 py-1 rounded-md border border-red-100 flex items-center gap-1.5">
                            <Droplet className="w-3.5 h-3.5 fill-blood/20" />
                            {selectedItem.blood_type?.abo}{selectedItem.blood_type?.rh_factor}
                          </span>
                        </div>
                      </div>
                      
                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Chế phẩm máu</label>
                        <p className="font-semibold text-slate-800">{selectedItem.component?.component_name}</p>
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Số lượng cần</label>
                        <p className="font-semibold text-slate-800 text-base">
                          {selectedItem.units_needed} <span className="text-xs font-medium text-slate-500">đơn vị</span>
                        </p>
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Mức độ khẩn cấp</label>
                        <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold border ${getUrgencyColor(selectedItem.urgency?.urgency_code)}`}>
                          {selectedItem.urgency?.urgency_name}
                        </span>
                      </div>
                      
                      {selectedItem.required_before && (
                        <div className="col-span-2">
                          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Cần trước ngày</label>
                          <p className="font-semibold text-slate-800 flex items-center gap-1.5 text-sm">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {new Date(selectedItem.required_before).toLocaleDateString('vi-VN')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Patient & Contact Info */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                    <h2 className="text-lg font-bold text-navy flex items-center gap-2 mb-4">
                      <UserIcon className="w-4 h-4 text-blood" />
                      Bệnh nhân & Liên hệ
                    </h2>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Họ và tên bệnh nhân</label>
                        <p className="font-semibold text-slate-800">{selectedItem.patient_name}</p>
                      </div>
                      
                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Số điện thoại liên hệ</label>
                        <p className="font-semibold text-slate-800 flex items-center gap-1.5 text-sm">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {selectedItem.patient_phone || 'Không cung cấp'}
                        </p>
                      </div>

                      {selectedItem.clinical_notes && (
                        <div className="col-span-2">
                          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Chẩn đoán / Ghi chú lâm sàng</label>
                          <div className="bg-slate-50 p-3 rounded-lg text-slate-700 text-xs leading-relaxed border border-slate-100">
                            {selectedItem.clinical_notes}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* Facility Info */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                    <h2 className="text-base font-bold text-navy flex items-center gap-2 mb-3 pb-3 border-b border-slate-50">
                      <MapPin className="w-4 h-4 text-blood" />
                      Nơi tiếp nhận
                    </h2>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Cơ sở / Bệnh viện</label>
                        <p className="font-semibold text-slate-800 leading-snug text-sm">
                          {selectedItem.facility?.name || selectedItem.hospital_name}
                        </p>
                      </div>
                      
                      {selectedItem.ward_room && (
                        <div>
                          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Phòng / Khoa</label>
                          <p className="font-medium text-slate-700 text-sm">{selectedItem.ward_room}</p>
                        </div>
                      )}
                      
                      {(selectedItem.address || selectedItem.facility?.address) && (
                        <div>
                          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Địa chỉ</label>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {selectedItem.facility?.address || selectedItem.address}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Timeline / History Tab */
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 max-w-2xl mx-auto">
                <h2 className="text-lg font-bold text-navy flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
                  <FileText className="w-5 h-5 text-blood" />
                  Lịch sử xử lý yêu cầu
                </h2>
                
                {selectedItem.status_history && selectedItem.status_history.length > 0 ? (
                  <div className="relative border-l-2 border-slate-100 ml-3 space-y-6 pb-2">
                    {selectedItem.status_history.map((hist: any, index: number) => (
                      <div key={hist.history_id} className="relative pl-6">
                        {/* Timeline dot */}
                        <div className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-[3px] border-white ${index === 0 ? 'bg-blood shadow-[0_0_0_2px_rgba(225,29,72,0.2)]' : 'bg-slate-300'}`}></div>
                        
                        {/* Content box */}
                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative group">
                          {/* Decorative pointer */}
                          <div className="absolute top-2 -left-1.5 w-3 h-3 bg-white border-l border-b border-slate-100 rotate-45 group-hover:border-slate-200 transition-colors"></div>
                          
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                            <p className="text-sm font-bold text-slate-800">
                              Chuyển sang <span className="text-blood">{hist.to_status?.status_name}</span>
                            </p>
                            <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-full w-fit">
                              <Clock className="w-3 h-3" />
                              {new Date(hist.created_at).toLocaleString('vi-VN')}
                            </span>
                          </div>
                          
                          {hist.change_reason ? (
                            <div className="bg-slate-50/50 p-2.5 rounded-lg border border-slate-100 text-xs text-slate-600 leading-relaxed">
                              <span className="font-semibold text-slate-700 mr-1">Ghi chú:</span> 
                              {hist.change_reason}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic">Không có ghi chú</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                    <p className="font-medium text-sm">Chưa có lịch sử xử lý nào cho yêu cầu này.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}
      </BaseModal>
    </div>
  );
}
