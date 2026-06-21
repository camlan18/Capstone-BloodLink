'use client';
import { useEffect, useState } from 'react';
import { adminDonationService } from '@/lib/services/admin-donations';
import { adminUserService } from '@/lib/services/admin-users';
import { adminMasterDataService } from '@/lib/services/admin-master-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2, Stethoscope, FileSignature, Plus, Filter, Eye, Save, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { BaseModal } from '@/components/ui/BaseModal';
import { ExcelImportModal } from '@/components/ui/ExcelImportModal';
import { ExportImportDropdown } from '@/components/ui/ExportImportDropdown';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { DataTable, Column, ActionItem } from '@/components/ui/DataTable';

export default function AdminDonationsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({});
  const [users, setUsers] = useState<any[]>([]);
  
  // DataTable state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [keyword, setKeyword] = useState('');
  const [statusCode, setStatusCode] = useState<string>('ALL');
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Master Data
  const [bloodTypes, setBloodTypes] = useState<any[]>([]);
  const [bloodComponents, setBloodComponents] = useState<any[]>([]);

  const [facilities, setFacilities] = useState<any[]>([]);

  // Modal Record Donation
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailActiveTab, setDetailActiveTab] = useState('donor_info');
  const [activeTab, setActiveTab] = useState('donor_info');
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);
  const [recordData, setRecordData] = useState({
    blood_type_id: '',
    component_id: '',
    volume_ml: '',
    facility_id: '',
    donation_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    health_check_passed: true,
    result_notes: '',
  });
  const [recording, setRecording] = useState(false);

  // Modal Create Slot
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createData, setCreateData] = useState({
    user_id: '',
    specific_date: format(new Date(), 'yyyy-MM-dd'),
    notes: ''
  });

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    fetchData();
    fetchUsers();
  }, [page, pageSize, keyword, statusCode]);

  const fetchMasterData = async () => {
    try {
      const [btRes, compRes, facRes] = await Promise.all([
        adminMasterDataService.getBloodTypes({ limit: 100 }),
        adminMasterDataService.getBloodComponents(),
        adminMasterDataService.getFacilities({ limit: 100 })
      ]);
      if (btRes) setBloodTypes(Array.isArray(btRes.data) ? btRes.data : (Array.isArray(btRes) ? btRes : []));
      if (compRes) setBloodComponents(Array.isArray(compRes.data) ? compRes.data : (Array.isArray(compRes) ? compRes : []));
      if (facRes) setFacilities(Array.isArray(facRes.data) ? facRes.data : (Array.isArray(facRes) ? facRes : []));
    } catch (error) {
      console.error('Failed to load master data');
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await adminUserService.getUsers({ limit: 100 });
      if (res && res.data) {
        setUsers(res.data);
      }
    } catch (err) {
      console.error("Lỗi khi tải danh sách người dùng", err);
    }
  };

  const handleSearch = (val: string) => {
    setKeyword(val);
    setPage(1);
  };

  const handleStatusChange = (val: string | null) => {
    setStatusCode(val || 'ALL');
    setPage(1);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await adminDonationService.getSlots({ 
        page, 
        limit: pageSize,
        search: keyword || undefined,
        status: statusCode === 'ALL' ? undefined : statusCode
      });
      if (res) {
        setData(Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []));
        setMeta((res as any).meta || {});
      }
    } catch (error) {
      toast.error('Lỗi khi tải danh sách đăng ký');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      await adminDonationService.exportExcel({
        search: keyword || undefined,
        status: statusCode === 'ALL' ? undefined : statusCode,
      });
    } catch (error) {
      toast.error('Lỗi khi xuất file Excel');
    }
  };

  const handleImport = async (file: File) => {
    try {
      const res = await adminDonationService.importExcel(file);
      toast.success(res?.data?.message || 'Nhập dữ liệu thành công');
      setIsImportOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi nhập dữ liệu');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await adminDonationService.downloadTemplate();
    } catch (error) {
      toast.error('Lỗi khi tải file mẫu');
    }
  };

  const handleOpenRecord = (slot: any) => {
    setSelectedSlot(slot);
    setRecordData({ 
      blood_type_id: (slot.user?.blood_type_id || slot.user?.donor_profile?.blood_type_id)?.toString() || '',
      component_id: '',
      volume_ml: '',
      facility_id: slot.schedule?.facility_id?.toString() || (facilities.length > 0 ? facilities[0].facility_id.toString() : ''),
      donation_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      health_check_passed: true,
      result_notes: '',
    });
    setActiveTab('donor_info');
    setIsModalOpen(true);
  };

  const handleRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (recordData.health_check_passed) {
      if (!recordData.blood_type_id) {
        toast.error('Vui lòng chọn nhóm máu');
        return;
      }
      if (!recordData.component_id) {
        toast.error('Vui lòng chọn thành phần máu');
        return;
      }
      if (!recordData.volume_ml) {
        toast.error('Vui lòng chọn thể tích');
        return;
      }
    }

    try {
      setRecording(true);
      if (recordData.health_check_passed) {
        await adminDonationService.recordDonation({
          facility_id: Number(recordData.facility_id),
          donor_user_id: selectedSlot.user_id,
          blood_type_id: Number(recordData.blood_type_id),
          component_id: Number(recordData.component_id),
          volume_ml: Number(recordData.volume_ml),
          donation_date: new Date(recordData.donation_date).toISOString(),
          health_check_passed: true,
          result_notes: recordData.result_notes,
        });
        await adminDonationService.updateSlotStatus(selectedSlot.slot_id, 'COMPLETED', recordData.result_notes);
        toast.success('Ghi nhận ca hiến máu thành công!');
      } else {
        await adminDonationService.updateSlotStatus(selectedSlot.slot_id, 'EXAMINED_FAILED', recordData.result_notes);
        toast.success('Đã cập nhật trạng thái không đạt yêu cầu sức khỏe!');
      }
      
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ghi nhận thất bại');
    } finally {
      setRecording(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      await adminDonationService.createSlot({
        user_id: Number(createData.user_id),
        specific_date: createData.specific_date,
        notes: createData.notes || undefined
      });
      toast.success('Tạo lượt hẹn hiến máu thành công!');
      setIsCreateOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Tạo lượt hẹn thất bại');
    } finally {
      setCreating(false);
    }
  };

  const getStatusLabel = (status: string, notes?: string) => {
    if (status === 'COMPLETED' || notes === 'COMPLETED') return 'Đã hiến';
    if (status === 'EXAMINED_PASSED') return 'Khám đạt';
    if (status === 'EXAMINED_FAILED') return 'Không đạt';
    if (status === 'ARRIVED') return 'Đã đến';
    if (status === 'CONFIRMED') return 'Đã xác nhận';
    if (status === 'PENDING') return 'Đã đăng ký (Chờ)';
    if (status === 'CANCELLED') return 'Đã hủy';
    return status;
  };

  const getStatusBadgeClass = (status: string, notes?: string) => {
    if (status === 'COMPLETED' || notes === 'COMPLETED') return 'bg-emerald-100 text-emerald-700';
    if (status === 'EXAMINED_PASSED') return 'bg-blue-100 text-blue-700';
    if (status === 'ARRIVED') return 'bg-purple-100 text-purple-700';
    if (status === 'CONFIRMED') return 'bg-amber-100 text-amber-700';
    if (status === 'CANCELLED' || status === 'EXAMINED_FAILED') return 'bg-red-100 text-red-700';
    return 'bg-slate-100 text-slate-700';
  };

  const columns: Column<any>[] = [
    {
      key: 'user',
      title: 'Người đăng ký',
      render: (slot) => <span className="font-medium text-slate-800">{slot.user?.full_name}</span>
    },
    {
      key: 'email',
      title: 'Email',
      render: (slot) => <span className="text-slate-500">{slot.user?.email}</span>
    },
    {
      key: 'date',
      title: 'Ngày đăng ký',
      render: (slot) => <span className="text-slate-800">{slot.specific_date ? format(new Date(slot.specific_date), 'dd/MM/yyyy') : (slot.schedule?.date ? format(new Date(slot.schedule.date), 'dd/MM/yyyy') : 'Theo lịch')}</span>
    },
    {
      key: 'notes',
      title: 'Ghi chú',
      render: (slot) => <span className="text-slate-500 max-w-[200px] truncate block">{slot.notes || '-'}</span>
    },
    {
      key: 'status',
      title: 'Trạng thái',
      render: (slot) => {
        return (
          <span className={`px-2.5 py-1 rounded text-xs font-semibold ${getStatusBadgeClass(slot.status, slot.notes)}`}>
            {getStatusLabel(slot.status, slot.notes)}
          </span>
        );
      }
    }
  ];

  const getRowActions = (slot: any): ActionItem[] => [
    {
      label: 'Khám & Thu máu',
      icon: <Stethoscope className="w-4 h-4 text-blood" />,
      hidden: slot.status === 'CANCELLED' || slot.notes === 'COMPLETED' || slot.status === 'COMPLETED',
      onClick: () => handleOpenRecord(slot)
    },
    {
      label: 'Xem chi tiết',
      icon: <Eye className="w-4 h-4 text-slate-500" />,
      onClick: () => {
        setSelectedSlot(slot);
        setIsDetailOpen(true);
      }
    }
  ];

  // Calculate next eligible date dynamically
  const selectedComponent = bloodComponents.find(c => c.component_id.toString() === recordData.component_id);
  let minIntervalDays = 84;
  let nextEligibleDateStr = '';
  
  if (selectedComponent && recordData.donation_date) {
    minIntervalDays = selectedComponent.interval_rules?.min_interval_days || 84;
    const nextDateObj = new Date(recordData.donation_date);
    nextDateObj.setDate(nextDateObj.getDate() + minIntervalDays);
    nextEligibleDateStr = format(nextDateObj, 'dd/MM/yyyy');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Tiếp nhận Hiến máu</h1>
          <p className="text-sm text-slate-500 mt-1">{meta?.total || 0} lượt hẹn trong hệ thống</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportImportDropdown 
            onImportClick={() => setIsImportOpen(true)}
            onExportClick={handleExport}
            onDownloadTemplateClick={handleDownloadTemplate}
          />
          <Button onClick={() => setIsCreateOpen(true)} className="bg-blood hover:bg-blood-deep text-white shadow-none rounded-md px-4">
            <Plus className="w-4 h-4 mr-2" /> Tạo lượt đăng ký mới
          </Button>
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
          itemName="lượt đăng ký"
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSearch={handleSearch}
          rowActions={getRowActions}
          toolbarFilters={
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-[180px]">
                <Select value={statusCode} onValueChange={handleStatusChange}>
                  <SelectTrigger className="bg-white border-slate-200 text-slate-800">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-slate-500" />
                      <SelectValue placeholder="Trạng thái">
                        {statusCode === 'ALL' ? 'Tất cả trạng thái' : getStatusLabel(statusCode)}
                      </SelectValue>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
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
            </div>
          }
        />
      </div>

      <BaseModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        title="Tạo lượt đăng ký hiến máu mới"
        size="4xl"
        hideFooter
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Người dùng</label>
            <SearchableSelect 
              value={createData.user_id} 
              onValueChange={v => setCreateData({...createData, user_id: v})}
              options={users.map(u => ({ value: u.user_id.toString(), label: `${u.full_name} (${u.email})` }))}
              placeholder="Chọn người dùng"
              triggerClassName="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ngày hẹn</label>
            <Input 
              type="date"
              value={createData.specific_date} 
              onChange={e => setCreateData({...createData, specific_date: e.target.value})} 
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú (Tùy chọn)</label>
            <Input 
              value={createData.notes} 
              onChange={e => setCreateData({...createData, notes: e.target.value})} 
              placeholder="Ghi chú thêm..."
            />
          </div>
          
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Hủy</Button>
            <Button type="submit" disabled={creating}>
              {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Tạo lượt đăng ký
            </Button>
          </div>
        </form>
      </BaseModal>

      <BaseModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        title="Ghi nhận ca hiến máu"
        subtitle={`Người hiến: ${selectedSlot?.user?.full_name}`}
        size="4xl"
        hideFooter
      >
        <div className="flex gap-4 border-b border-slate-200 mb-6">
          <button 
            type="button" 
            className={`pb-2 px-1 border-b-2 text-sm font-medium ${activeTab === 'donor_info' ? 'border-blood text-blood' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
            onClick={() => setActiveTab('donor_info')}
          >
            Thông tin người hiến
          </button>
          <button 
            type="button" 
            className={`pb-2 px-1 border-b-2 text-sm font-medium ${activeTab === 'donation_record' ? 'border-blood text-blood' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
            onClick={() => setActiveTab('donation_record')}
          >
            Thông tin khám & Lấy máu
          </button>
        </div>

        <form onSubmit={handleRecordSubmit}>
          {activeTab === 'donor_info' && (
            <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Họ tên</label>
                <div className="text-sm font-medium text-slate-800">{selectedSlot?.user?.full_name || 'Không có'}</div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
                <div className="text-sm text-slate-800">{selectedSlot?.user?.email || 'Không có'}</div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Số điện thoại</label>
                <div className="text-sm text-slate-800">{selectedSlot?.user?.phone || 'Không có'}</div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Ngày sinh</label>
                <div className="text-sm text-slate-800">{selectedSlot?.user?.date_of_birth ? format(new Date(selectedSlot?.user?.date_of_birth), 'dd/MM/yyyy') : 'Không có'}</div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Giới tính</label>
                <div className="text-sm text-slate-800">{selectedSlot?.user?.gender === 'M' ? 'Nam' : selectedSlot?.user?.gender === 'F' ? 'Nữ' : 'Khác'}</div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Địa chỉ</label>
                <div className="text-sm text-slate-800">{selectedSlot?.user?.address || 'Không có'}</div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Nhóm máu hiện tại</label>
                <div className="text-sm font-bold text-blood">
                  {bloodTypes.find(bt => bt.blood_type_id.toString() === (selectedSlot?.user?.blood_type_id || selectedSlot?.user?.donor_profile?.blood_type_id)?.toString())?.blood_type_code || 'Chưa xác định'}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'donation_record' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Cơ sở thu nhận</label>
                <SearchableSelect
                  value={recordData.facility_id}
                  onValueChange={v => setRecordData({...recordData, facility_id: v})}
                  options={facilities.map(f => ({ value: f.facility_id.toString(), label: f.facility_name }))}
                  placeholder="Chọn cơ sở thu nhận"
                  triggerClassName="w-full bg-slate-50 cursor-not-allowed opacity-80"
                  disabled={true}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ngày giờ hiến</label>
                <Input 
                  type="datetime-local" 
                  value={recordData.donation_date} 
                  onChange={e => setRecordData({...recordData, donation_date: e.target.value})} 
                  required
                />
              </div>

              <div className="flex items-center mt-6">
                <input 
                  type="checkbox" 
                  id="health_check"
                  checked={recordData.health_check_passed}
                  onChange={e => setRecordData({...recordData, health_check_passed: e.target.checked})}
                  className="w-4 h-4 text-blood rounded border-slate-300 focus:ring-blood"
                />
                <label htmlFor="health_check" className="ml-2 text-sm font-medium text-slate-700">Đạt yêu cầu sức khỏe (Cho phép hiến)</label>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nhóm máu</label>
                <SearchableSelect
                  value={recordData.blood_type_id}
                  onValueChange={v => setRecordData({...recordData, blood_type_id: v})}
                  options={bloodTypes.map(bt => ({ value: bt.blood_type_id.toString(), label: bt.blood_type_code }))}
                  placeholder="Xác nhận nhóm máu"
                  triggerClassName={`w-full ${!recordData.health_check_passed ? 'bg-slate-50 cursor-not-allowed opacity-70' : ''}`}
                  disabled={!recordData.health_check_passed}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Thể tích (ml)</label>
                <SearchableSelect
                  value={recordData.volume_ml}
                  onValueChange={v => setRecordData({...recordData, volume_ml: v})}
                  options={[
                    { value: '250', label: '250 ml' },
                    { value: '350', label: '350 ml' },
                    { value: '450', label: '450 ml' }
                  ]}
                  placeholder="Chọn thể tích"
                  triggerClassName={`w-full ${!recordData.health_check_passed ? 'bg-slate-50 cursor-not-allowed opacity-70' : ''}`}
                  disabled={!recordData.health_check_passed}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Thành phần máu thu được</label>
                <SearchableSelect
                  value={recordData.component_id}
                  onValueChange={v => setRecordData({...recordData, component_id: v})}
                  options={bloodComponents.map(c => ({ value: c.component_id.toString(), label: c.component_name }))}
                  placeholder="Chọn thành phần"
                  triggerClassName={`w-full ${!recordData.health_check_passed ? 'bg-slate-50 cursor-not-allowed opacity-70' : ''}`}
                  disabled={!recordData.health_check_passed}
                />
                {nextEligibleDateStr && (
                  <p className="mt-2 text-sm text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                    <span className="font-semibold">Lưu ý:</span> Ngày dự kiến có thể hiến máu lần tiếp theo là <b>{nextEligibleDateStr}</b> (sau {minIntervalDays} ngày). Vui lòng nhắc nhở người hiến.
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú kết quả khám</label>
                <Input 
                  value={recordData.result_notes} 
                  onChange={e => setRecordData({...recordData, result_notes: e.target.value})} 
                  placeholder="Huyết áp, tình trạng, v.v..."
                />
              </div>
            </div>
          )}

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Hủy</Button>
              <Button type="submit" disabled={recording} className="bg-blood hover:bg-blood/90 text-white min-w-[140px]">
                {recording ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {recordData.health_check_passed ? 'Lưu & Nhập kho' : 'Cập nhật (Không đạt)'}
              </Button>
            </div>
        </form>
      </BaseModal>

      <BaseModal 
        open={isDetailOpen} 
        onOpenChange={setIsDetailOpen} 
        title="Chi tiết lượt đăng ký hiến máu" 
        size="lg"
        hideFooter
      >
        {selectedSlot && (
          <div>
            <div className="flex gap-4 border-b border-slate-200 mb-6">
              <button 
                type="button" 
                className={`pb-2 px-1 border-b-2 text-sm font-medium ${detailActiveTab === 'donor_info' ? 'border-blood text-blood' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                onClick={() => setDetailActiveTab('donor_info')}
              >
                Thông tin người đăng ký
              </button>
              <button 
                type="button" 
                className={`pb-2 px-1 border-b-2 text-sm font-medium ${detailActiveTab === 'schedule_info' ? 'border-blood text-blood' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                onClick={() => setDetailActiveTab('schedule_info')}
              >
                Thông tin lịch hẹn
              </button>
            </div>

            <div className="min-h-[250px]">
              {detailActiveTab === 'donor_info' && (
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <div className="grid grid-cols-2 gap-y-4 text-sm">
                    <div>
                      <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Họ và tên</span>
                      <span className="font-medium text-slate-800 text-base">{selectedSlot.user?.full_name || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Email</span>
                      <span className="font-medium text-slate-800 text-base">{selectedSlot.user?.email || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Số điện thoại</span>
                      <span className="font-medium text-slate-800 text-base">{selectedSlot.user?.phone || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Giới tính</span>
                      <span className="font-medium text-slate-800 text-base">{selectedSlot.user?.gender === 'M' ? 'Nam' : selectedSlot.user?.gender === 'F' ? 'Nữ' : 'Khác'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Ngày sinh</span>
                      <span className="font-medium text-slate-800 text-base">{selectedSlot.user?.date_of_birth ? format(new Date(selectedSlot.user.date_of_birth), 'dd/MM/yyyy') : '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">CMND/CCCD</span>
                      <span className="font-medium text-slate-800 text-base">{selectedSlot.user?.identity_card || '-'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Địa chỉ</span>
                      <span className="font-medium text-slate-800 text-base">{selectedSlot.user?.address || '-'}</span>
                    </div>
                  </div>
                </div>
              )}

              {detailActiveTab === 'schedule_info' && (
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <div className="grid grid-cols-2 gap-y-4 text-sm">
                    <div className="col-span-2">
                      <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Cơ sở thu nhận</span>
                      <span className="font-medium text-slate-800 text-base">{selectedSlot.schedule?.facility?.facility_name || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Ngày hẹn</span>
                      <span className="font-medium text-slate-800 text-base">{selectedSlot.specific_date ? format(new Date(selectedSlot.specific_date), 'dd/MM/yyyy') : (selectedSlot.schedule?.date ? format(new Date(selectedSlot.schedule.date), 'dd/MM/yyyy') : '-')}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Trạng thái</span>
                      <span className={`px-2.5 py-1 rounded text-xs font-semibold inline-block ${getStatusBadgeClass(selectedSlot.status, selectedSlot.notes)}`}>
                        {getStatusLabel(selectedSlot.status, selectedSlot.notes)}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Ghi chú</span>
                      <span className="font-medium text-slate-800 text-base">{selectedSlot.notes || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Ngày tạo</span>
                      <span className="font-medium text-slate-800 text-base">{selectedSlot.created_at ? format(new Date(selectedSlot.created_at), 'dd/MM/yyyy HH:mm') : '-'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-6 mt-6 flex justify-end gap-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setIsDetailOpen(false)}>Đóng</Button>
              {(selectedSlot.status === 'PENDING' || selectedSlot.status === 'APPROVED') && (
                <Button type="button" className="bg-blood hover:bg-blood-deep text-white" onClick={() => {
                  setIsDetailOpen(false);
                  handleOpenRecord(selectedSlot);
                }}>
                  <Stethoscope className="w-4 h-4 mr-2" /> Khám & Thu máu
                </Button>
              )}
            </div>
          </div>
        )}
      </BaseModal>

      <ExcelImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Nhập dữ liệu Lịch hẹn"
        onImport={handleImport}
        onDownloadTemplate={handleDownloadTemplate}
      />
    </div>
  );
}
