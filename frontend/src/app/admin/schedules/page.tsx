'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { adminSchedulesService, FacilityDonationSchedule } from '@/lib/services/admin-schedules';
import { adminMasterDataService } from '@/lib/services/admin-master-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Eye, Calendar as CalendarIcon, MapPin } from 'lucide-react';
import { DataTable, Column, ActionItem } from '@/components/ui/DataTable';
import { BaseModal } from '@/components/ui/BaseModal';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';
import { format, parseISO } from 'date-fns';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

export default function AdminSchedulesPage() {
  const [data, setData] = useState<FacilityDonationSchedule[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterFacility, setFilterFacility] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [currentView, setCurrentView] = useState<FacilityDonationSchedule | null>(null);

  const [formData, setFormData] = useState({
    facility_id: '',
    date: '',
    start_time: '08:00',
    end_time: '17:00',
    max_donors: 50,
    status: 'OPEN',
    terms_html: ''
  });

  // Detail Tabs State
  const [activeDetailTab, setActiveDetailTab] = useState<'info' | 'donors'>('info');
  const [scheduleDonors, setScheduleDonors] = useState<any[]>([]);
  const [donorsLoading, setDonorsLoading] = useState(false);
  const [donorStatusFilter, setDonorStatusFilter] = useState<string>('all');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { page, limit };
      if (filterFacility !== 'all') params.facility_id = filterFacility;
      if (filterStatus !== 'all') params.status = filterStatus;

      const res = await adminSchedulesService.getSchedules(params);
      if (res.data) {
        setData(res.data);
        setTotal((res as any).meta?.total || 0);
      }
    } catch (error) {
      toast.error('Lỗi khi tải dữ liệu lịch hiến máu');
    } finally {
      setLoading(false);
    }
  }, [page, limit, filterFacility, filterStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const fetchFacilities = async () => {
      try {
        const res = await adminMasterDataService.getFacilities({ limit: 1000 });
        if (res.data) setFacilities(res.data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchFacilities();
  }, []);

  const openCreateModal = () => {
    setFormData({
      facility_id: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      start_time: '08:00',
      end_time: '17:00',
      max_donors: 50,
      status: 'OPEN',
      terms_html: ''
    });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: FacilityDonationSchedule) => {
    // start_time / end_time might be returned as ISO strings from Prisma
    const formatTime = (timeStr: string) => {
      try {
        if (!timeStr) return '00:00';
        // If it's a date string like "1970-01-01T08:00:00.000Z"
        if (timeStr.includes('T')) {
          return timeStr.substring(11, 16);
        }
        return timeStr;
      } catch (e) {
        return '00:00';
      }
    };

    setFormData({
      facility_id: item.facility_id.toString(),
      date: item.date ? item.date.split('T')[0] : '',
      start_time: formatTime(item.start_time),
      end_time: formatTime(item.end_time),
      max_donors: item.max_donors,
      status: item.status,
      terms_html: item.terms_html || ''
    });
    setEditingId(item.schedule_id);
    setIsModalOpen(true);
  };

  const openViewModal = (item: FacilityDonationSchedule) => {
    setCurrentView(item);
    setIsViewModalOpen(true);
    setActiveDetailTab('info');
    setDonorStatusFilter('all');
    fetchDonors(item.schedule_id, 'all');
  };

  const fetchDonors = async (scheduleId: number, status?: string) => {
    try {
      setDonorsLoading(true);
      const res = await adminSchedulesService.getScheduleDonors(scheduleId, { 
        status: status || donorStatusFilter,
        limit: 1000 
      });
      if (res.data) {
        setScheduleDonors(res.data as any);
      }
    } catch (e) {
      toast.error('Lỗi khi tải danh sách người đăng ký');
    } finally {
      setDonorsLoading(false);
    }
  };

  const handleUpdateDonorStatus = async (slotId: number, status: string) => {
    if (!currentView) return;
    try {
      await adminSchedulesService.updateDonorStatus(currentView.schedule_id, slotId, status);
      toast.success('Đã cập nhật trạng thái');
      fetchDonors(currentView.schedule_id);
    } catch (e) {
      toast.error('Lỗi khi cập nhật trạng thái');
    }
  };

  const handleExportDonors = async () => {
    if (!currentView) return;
    try {
      toast.info('Đang xuất file Excel...');
      await adminSchedulesService.exportScheduleDonors(currentView.schedule_id);
    } catch (e) {
      toast.error('Lỗi khi xuất danh sách');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa lịch này không?')) return;
    try {
      await adminSchedulesService.deleteSchedule(id);
      toast.success('Đã xóa thành công');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi xóa lịch');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.facility_id) {
      toast.error('Vui lòng chọn Cơ sở y tế');
      return;
    }
    if (!formData.date) {
      toast.error('Vui lòng chọn ngày');
      return;
    }

    if (formData.start_time >= formData.end_time) {
      toast.error('Giờ kết thúc phải lớn hơn giờ bắt đầu (trong cùng 1 ngày)');
      return;
    }

    try {
      const payload = {
        facility_id: parseInt(formData.facility_id),
        date: formData.date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        max_donors: formData.max_donors,
        status: formData.status,
        terms_html: formData.terms_html
      };

      if (editingId) {
        await adminSchedulesService.updateSchedule(editingId, payload);
        toast.success('Đã cập nhật lịch');
      } else {
        await adminSchedulesService.createSchedule(payload);
        toast.success('Đã thêm lịch mới');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const columns: Column<FacilityDonationSchedule>[] = [
    {
      key: 'facility_name',
      title: 'Cơ sở y tế',
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-800">{row.facility?.name}</p>
          <p className="text-xs text-slate-500 line-clamp-1">{row.facility?.address}</p>
        </div>
      )
    },
    {
      key: 'time',
      title: 'Thời gian',
      render: (row) => {
        const d = row.date ? new Date(row.date) : null;
        
        const formatTime = (timeStr: string) => {
          try {
            if (!timeStr) return '--:--';
            if (timeStr.includes('T')) return timeStr.substring(11, 16);
            return timeStr;
          } catch(e) { return '--:--'; }
        };

        return (
          <div>
            <p className="font-medium text-slate-800 flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-blood" />
              {d ? format(d, 'dd/MM/yyyy') : '---'}
            </p>
            <p className="text-sm text-slate-500 mt-0.5">
              {formatTime(row.start_time)} - {formatTime(row.end_time)}
            </p>
          </div>
        );
      }
    },
    {
      key: 'donors',
      title: 'Đăng ký',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-full bg-slate-100 rounded-full h-2 min-w-[80px]">
            <div 
              className="bg-emerald-500 h-2 rounded-full" 
              style={{ width: `${Math.min(100, (row.current_donors / row.max_donors) * 100)}%` }}
            ></div>
          </div>
          <span className="text-xs font-medium text-slate-600 whitespace-nowrap">
            {row.current_donors}/{row.max_donors}
          </span>
        </div>
      )
    },
    {
      key: 'status',
      title: 'Trạng thái',
      render: (row) => (
        <span className={`px-2.5 py-1 text-xs font-semibold rounded-md ${
          row.status === 'OPEN' ? 'bg-emerald-100 text-emerald-700' :
          row.status === 'CLOSED' ? 'bg-slate-100 text-slate-600' :
          row.status === 'FULL' ? 'bg-amber-100 text-amber-700' :
          row.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
          'bg-slate-100 text-slate-700'
        }`}>
          {row.status === 'OPEN' ? 'Đang mở' : 
           row.status === 'CLOSED' ? 'Đã đóng' : 
           row.status === 'FULL' ? 'Đã đầy' : 
           row.status === 'CANCELLED' ? 'Đã hủy' : row.status}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quản lý Lịch hiến máu</h1>
          <p className="text-sm text-slate-500 mt-1">Sắp xếp và quản lý lịch tổ chức tại các cơ sở</p>
        </div>
        <Button onClick={openCreateModal} className="bg-blood hover:bg-blood-dark text-white">
          <Plus className="w-4 h-4 mr-2" /> Thêm lịch mới
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={data}
          rowActions={(row) => [
            {
              label: 'Xem chi tiết',
              icon: <Eye className="w-4 h-4" />,
              onClick: () => openViewModal(row)
            },
            {
              label: 'Chỉnh sửa',
              icon: <Edit className="w-4 h-4" />,
              onClick: () => openEditModal(row)
            },
            {
              label: 'Xóa',
              icon: <Trash2 className="w-4 h-4" />,
              onClick: () => handleDelete(row.schedule_id),
              className: "text-red-600"
            }
          ]}
          loading={loading}
          totalRecords={total}
          page={page}
          pageSize={limit}
          onPageChange={setPage}
          onPageSizeChange={setLimit}
          keyword=""
          onSearch={() => {}}
          toolbarFilters={
            <>
              <div className="w-[180px]">
                <Select value={filterFacility} onValueChange={v => setFilterFacility(v || 'all')}>
                  <SelectTrigger className="bg-white border-slate-200 text-slate-800">
                    <SelectValue placeholder="Tất cả cơ sở">
                      {filterFacility === 'all' ? 'Tất cả cơ sở' :
                       facilities.find(f => f.facility_id.toString() === filterFacility)?.facility_name || 'Tất cả cơ sở'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả cơ sở</SelectItem>
                    {facilities.map(f => (
                      <SelectItem key={f.facility_id} value={f.facility_id.toString()}>{f.facility_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[180px]">
                <Select value={filterStatus} onValueChange={v => setFilterStatus(v || 'all')}>
                  <SelectTrigger className="bg-white border-slate-200 text-slate-800">
                    <SelectValue placeholder="Tất cả trạng thái">
                      {filterStatus === 'all' ? 'Tất cả trạng thái' :
                       filterStatus === 'OPEN' ? 'Đang mở' :
                       filterStatus === 'FULL' ? 'Đã đầy' :
                       filterStatus === 'CLOSED' ? 'Đã đóng' :
                       filterStatus === 'CANCELLED' ? 'Đã hủy' : 'Tất cả trạng thái'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả trạng thái</SelectItem>
                    <SelectItem value="OPEN">Đang mở</SelectItem>
                    <SelectItem value="FULL">Đã đầy</SelectItem>
                    <SelectItem value="CLOSED">Đã đóng</SelectItem>
                    <SelectItem value="CANCELLED">Đã hủy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          }
        />
      </div>

      {/* Form Modal */}
      <BaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Chỉnh sửa lịch hiến máu' : 'Thêm lịch hiến máu mới'}
        size="4xl"
        hideFooter={true}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Cơ sở y tế <span className="text-red-500">*</span></label>
              <Select value={formData.facility_id} onValueChange={(val) => setFormData({...formData, facility_id: val || ''})}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn cơ sở y tế">
                    {formData.facility_id ? facilities.find(f => f.facility_id.toString() === formData.facility_id)?.facility_name : 'Chọn cơ sở y tế'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {facilities.map(f => (
                    <SelectItem key={f.facility_id} value={f.facility_id.toString()}>{f.facility_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ngày tổ chức <span className="text-red-500">*</span></label>
              <Input 
                type="date" 
                min={format(new Date(), 'yyyy-MM-dd')}
                value={formData.date} 
                onChange={e => setFormData({...formData, date: e.target.value})}
                required 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Giờ bắt đầu <span className="text-red-500">*</span></label>
                <Input 
                  type="time" 
                  value={formData.start_time} 
                  onChange={e => setFormData({...formData, start_time: e.target.value})}
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Giờ kết thúc <span className="text-red-500">*</span></label>
                <Input 
                  type="time" 
                  value={formData.end_time} 
                  onChange={e => setFormData({...formData, end_time: e.target.value})}
                  required 
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Số lượng người hiến tối đa</label>
              <Input 
                type="number" 
                min="1"
                value={formData.max_donors} 
                onChange={e => setFormData({...formData, max_donors: parseInt(e.target.value) || 0})}
                required 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Trạng thái</label>
              <Select value={formData.status} onValueChange={(val) => setFormData({...formData, status: val || ''})}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn trạng thái">
                    {formData.status === 'OPEN' ? 'Đang mở' :
                     formData.status === 'FULL' ? 'Đã đầy' :
                     formData.status === 'CLOSED' ? 'Đã đóng' :
                     formData.status === 'CANCELLED' ? 'Đã hủy' : 'Chọn trạng thái'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Đang mở</SelectItem>
                  <SelectItem value="FULL">Đã đầy</SelectItem>
                  <SelectItem value="CLOSED">Đã đóng</SelectItem>
                  <SelectItem value="CANCELLED">Đã hủy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Quy định / Điều khoản / Ghi chú (nếu có)</label>
              <div className="bg-white rounded-md border border-slate-200">
                <ReactQuill 
                  theme="snow" 
                  value={formData.terms_html} 
                  onChange={(val) => setFormData({...formData, terms_html: val})}
                  className="h-48 mb-12"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button type="submit" className="bg-blood hover:bg-blood-dark text-white">Lưu lịch</Button>
          </div>
        </form>
      </BaseModal>

      {/* View Detail Modal */}
      <BaseModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Chi tiết Lịch hiến máu"
        size="7xl"
        hideFooter={true}
      >
        {currentView && (
          <div className="space-y-6">
            <div className="flex border-b border-slate-200">
              <button 
                className={`px-4 py-2 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap ${activeDetailTab === 'info' ? 'border-blood text-blood' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                onClick={() => setActiveDetailTab('info')}
              >
                Thông tin lịch
              </button>
              <button 
                className={`px-4 py-2 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap ${activeDetailTab === 'donors' ? 'border-blood text-blood' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                onClick={() => setActiveDetailTab('donors')}
              >
                Danh sách đăng ký ({scheduleDonors.length}/{currentView.max_donors})
              </button>
            </div>

            {activeDetailTab === 'info' && (
              <div className="space-y-6">
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
                    <MapPin className="w-6 h-6 text-blood" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">{currentView.facility?.name}</h3>
                    <p className="text-slate-500 mt-1">{currentView.facility?.address}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-center">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Ngày</p>
                    <p className="text-lg font-bold text-slate-800">{currentView.date ? format(new Date(currentView.date), 'dd/MM/yyyy') : '---'}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-center">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Khung giờ</p>
                    <p className="text-base font-bold text-slate-800">
                      {currentView.start_time?.includes('T') ? currentView.start_time.substring(11, 16) : currentView.start_time} - 
                      {currentView.end_time?.includes('T') ? currentView.end_time.substring(11, 16) : currentView.end_time}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-center">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Trạng thái</p>
                    <p className={`text-base font-bold ${
                      currentView.status === 'OPEN' ? 'text-emerald-600' :
                      currentView.status === 'CLOSED' ? 'text-slate-600' :
                      currentView.status === 'FULL' ? 'text-amber-600' :
                      currentView.status === 'CANCELLED' ? 'text-red-600' : 'text-slate-800'
                    }`}>{currentView.status}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-center">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Lượt đăng ký</p>
                    <p className="text-lg font-bold text-blood">{scheduleDonors.length} / {currentView.max_donors}</p>
                  </div>
                </div>

                {currentView.terms_html && (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                      <h4 className="font-semibold text-slate-800">Điều khoản / Ghi chú</h4>
                    </div>
                    <div className="p-5 prose prose-sm max-w-none prose-a:text-blood">
                      <div dangerouslySetInnerHTML={{ __html: currentView.terms_html }} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeDetailTab === 'donors' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">Lọc trạng thái:</span>
                    <Select value={donorStatusFilter} onValueChange={(val) => {
                      setDonorStatusFilter(val || 'all');
                      fetchDonors(currentView.schedule_id, val || 'all');
                    }}>
                      <SelectTrigger className="w-[180px] bg-white h-9">
                        <SelectValue placeholder="Tất cả trạng thái">
                          {donorStatusFilter === 'all' ? 'Tất cả trạng thái' :
                           donorStatusFilter === 'PENDING' ? 'Đã đăng ký (Chờ)' :
                           donorStatusFilter === 'CONFIRMED' ? 'Đã xác nhận' :
                           donorStatusFilter === 'ARRIVED' ? 'Đã đến' :
                           donorStatusFilter === 'EXAMINED_PASSED' ? 'Khám đạt' :
                           donorStatusFilter === 'EXAMINED_FAILED' ? 'Không đạt' :
                           donorStatusFilter === 'COMPLETED' ? 'Đã hiến máu' :
                           donorStatusFilter === 'CANCELLED' ? 'Đã hủy' : 'Tất cả trạng thái'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả trạng thái</SelectItem>
                        <SelectItem value="PENDING">Đã đăng ký (Chờ)</SelectItem>
                        <SelectItem value="CONFIRMED">Đã xác nhận</SelectItem>
                        <SelectItem value="ARRIVED">Đã đến</SelectItem>
                        <SelectItem value="EXAMINED_PASSED">Khám đạt</SelectItem>
                        <SelectItem value="EXAMINED_FAILED">Không đạt</SelectItem>
                        <SelectItem value="COMPLETED">Đã hiến máu</SelectItem>
                        <SelectItem value="CANCELLED">Đã hủy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleExportDonors} variant="outline" className="h-9">
                    Xuất Excel
                  </Button>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Người đăng ký</th>
                        <th className="px-4 py-3">Số điện thoại</th>
                        <th className="px-4 py-3">Nhóm máu</th>
                        <th className="px-4 py-3">Giờ đăng ký</th>
                        <th className="px-4 py-3">Trạng thái</th>
                        <th className="px-4 py-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {donorsLoading ? (
                        <tr><td colSpan={6} className="text-center py-8 text-slate-500">Đang tải dữ liệu...</td></tr>
                      ) : scheduleDonors.length === 0 ? (
                        <tr><td colSpan={6} className="text-center py-8 text-slate-500">Chưa có ai đăng ký hoặc không có dữ liệu phù hợp</td></tr>
                      ) : (
                        scheduleDonors.map((slot: any) => (
                          <tr key={slot.slot_id} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <div className="font-medium text-slate-800">{slot.user?.full_name}</div>
                              <div className="text-xs text-slate-500">{slot.user?.email}</div>
                            </td>
                            <td className="px-4 py-3 text-slate-700">{slot.user?.phone || '-'}</td>
                            <td className="px-4 py-3 font-semibold text-blood">{slot.user?.blood_type?.blood_type_code || '-'}</td>
                            <td className="px-4 py-3 text-slate-600">{format(new Date(slot.created_at), 'HH:mm dd/MM/yyyy')}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs font-semibold
                                ${slot.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                                  slot.status === 'EXAMINED_PASSED' ? 'bg-blue-100 text-blue-700' :
                                  slot.status === 'ARRIVED' ? 'bg-purple-100 text-purple-700' :
                                  slot.status === 'CONFIRMED' ? 'bg-amber-100 text-amber-700' :
                                  (slot.status === 'CANCELLED' || slot.status === 'EXAMINED_FAILED') ? 'bg-red-100 text-red-700' :
                                  'bg-slate-100 text-slate-700'}`}>
                                {slot.status === 'COMPLETED' ? 'Đã hiến' : 
                                 slot.status === 'EXAMINED_PASSED' ? 'Khám đạt' : 
                                 slot.status === 'EXAMINED_FAILED' ? 'Không đạt' : 
                                 slot.status === 'ARRIVED' ? 'Đã đến' : 
                                 slot.status === 'CONFIRMED' ? 'Đã xác nhận' : 
                                 slot.status === 'PENDING' ? 'Chờ khám' : slot.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Select value={slot.status} onValueChange={(val) => handleUpdateDonorStatus(slot.slot_id, val || '')}>
                                <SelectTrigger className="w-[140px] h-8 text-xs ml-auto">
                                  <SelectValue placeholder="Cập nhật">
                                    {slot.status === 'COMPLETED' ? 'Đã hiến' : 
                                     slot.status === 'EXAMINED_PASSED' ? 'Khám đạt' : 
                                     slot.status === 'EXAMINED_FAILED' ? 'Không đạt' : 
                                     slot.status === 'ARRIVED' ? 'Đã đến' : 
                                     slot.status === 'CONFIRMED' ? 'Đã xác nhận' : 
                                     slot.status === 'PENDING' ? 'Chờ khám (Reset)' : 
                                     slot.status === 'CANCELLED' ? 'Đã hủy' : 'Cập nhật'}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="PENDING" className="text-xs">Chờ khám (Reset)</SelectItem>
                                  <SelectItem value="CONFIRMED" className="text-xs">Đã xác nhận</SelectItem>
                                  <SelectItem value="ARRIVED" className="text-xs">Đã đến</SelectItem>
                                  <SelectItem value="EXAMINED_PASSED" className="text-xs">Khám đạt</SelectItem>
                                  <SelectItem value="EXAMINED_FAILED" className="text-xs">Không đạt</SelectItem>
                                  <SelectItem value="COMPLETED" className="text-xs">Đã hiến máu</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setIsViewModalOpen(false)}>Đóng</Button>
            </div>
          </div>
        )}
      </BaseModal>
    </div>
  );
}
