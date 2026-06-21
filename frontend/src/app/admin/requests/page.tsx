'use client';
import { useEffect, useState } from 'react';
import { adminRequestService } from '@/lib/services/admin-requests';
import { adminMasterDataService } from '@/lib/services/admin-master-data';
import { adminInventoryService } from '@/lib/services/admin-inventory';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Activity, Plus, Filter, Edit2, Trash2, XCircle, Eye, History, ArrowRight, Search, Box } from 'lucide-react';
import { format } from 'date-fns';
import { DataTable, Column, ActionItem } from '@/components/ui/DataTable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { BaseModal } from '@/components/ui/BaseModal';
import { ExcelImportModal } from '@/components/ui/ExcelImportModal';
import { ExportImportDropdown } from '@/components/ui/ExportImportDropdown';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const getStatusColor = (code?: string) => {
  if (!code) return 'bg-slate-100 text-slate-600 border-slate-200';
  const c = code.toLowerCase();
  if (c === 'pending') return 'bg-amber-50 text-amber-600 border border-amber-200';
  if (c === 'allocated') return 'bg-emerald-50 text-emerald-600 border border-emerald-200';
  if (c === 'approved') return 'bg-blue-50 text-blue-600 border border-blue-200';
  if (c === 'completed') return 'bg-green-50 text-green-600 border border-green-200';
  if (c === 'rejected') return 'bg-red-50 text-red-600 border border-red-200';
  return 'bg-slate-50 text-slate-600 border-slate-200';
};

export default function AdminRequestsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({});
  
  // DataTable state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [keyword, setKeyword] = useState('');
  
  // Filters
  const [statusId, setStatusId] = useState<string>('ALL');
  const [urgencyId, setUrgencyId] = useState<string>('ALL');

  // Master Data
  const [bloodTypes, setBloodTypes] = useState<any[]>([]);
  const [bloodComponents, setBloodComponents] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [urgencyLevels, setUrgencyLevels] = useState<any[]>([]);

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  
  // Import Modal State
  const [isImportOpen, setIsImportOpen] = useState(false);
  
  // Detail Modal State
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'history' | 'matching' | 'allocation'>('info');

  // Matching & Allocation State
  const [matches, setMatches] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [availableInventory, setAvailableInventory] = useState<any[]>([]);
  const [selectedInventoryIds, setSelectedInventoryIds] = useState<number[]>([]);
  const [isMatchingLoading, setIsMatchingLoading] = useState(false);
  const [isAllocationLoading, setIsAllocationLoading] = useState(false);

  const [createData, setCreateData] = useState({
    facility_id: '',
    patient_name: '',
    blood_type_id: '',
    component_id: '',
    units_needed: '1',
    urgency_id: '',
    clinical_notes: '',
    patient_phone: '',
    hospital_name: '',
    ward_room: '',
    province_id: '',
    district_id: '',
    ward_id: '',
    address: '',
    latitude: '',
    longitude: '',
    required_before: ''
  });

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    fetchData();
  }, [page, pageSize, keyword, statusId, urgencyId]);

  useEffect(() => {
    if (isDetailOpen && selectedItem) {
      if (detailTab === 'matching') {
        fetchMatches(selectedItem.request_id);
      } else if (detailTab === 'allocation') {
        fetchAllocations(selectedItem.request_id);
        if (selectedItem.units_fulfilled < selectedItem.units_needed) {
          fetchAvailableInventory(selectedItem.blood_type_id, selectedItem.component_id);
        }
      }
    }
  }, [isDetailOpen, selectedItem, detailTab]);

  const fetchMasterData = async () => {
    try {
      const [btRes, compRes, facRes, urgRes] = await Promise.all([
        adminMasterDataService.getBloodTypes({ limit: 100 }),
        adminMasterDataService.getBloodComponents(),
        adminMasterDataService.getFacilities({ limit: 100 }),
        adminMasterDataService.getUrgencyLevels()
      ]);
      if (btRes) setBloodTypes(Array.isArray(btRes.data) ? btRes.data : (Array.isArray(btRes) ? btRes : []));
      if (compRes) setBloodComponents(Array.isArray(compRes.data) ? compRes.data : (Array.isArray(compRes) ? compRes : []));
      if (facRes) setFacilities(Array.isArray(facRes.data) ? facRes.data : (Array.isArray(facRes) ? facRes : []));
      if (urgRes) setUrgencyLevels(Array.isArray(urgRes.data) ? urgRes.data : (Array.isArray(urgRes) ? urgRes : []));
    } catch (error) {
      console.error('Failed to load master data');
    }
  };

  const handleSearch = (val: string) => {
    setKeyword(val);
    setPage(1);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await adminRequestService.getRequests({ 
        page, 
        limit: pageSize,
        search: keyword || undefined,
        status_id: statusId === 'ALL' ? undefined : statusId,
        urgency_id: urgencyId === 'ALL' ? undefined : urgencyId
      });
      if (res) {
        setData(Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []));
        setMeta((res as any).meta || {});
      }
    } catch (error) {
      toast.error('Lỗi khi tải danh sách yêu cầu máu');
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async (id: number) => {
    try {
      const res = await adminRequestService.processRequest(id);
      toast.success(res?.data?.message || 'Xử lý thành công');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi xử lý yêu cầu');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa yêu cầu này?')) return;
    try {
      await adminRequestService.deleteRequest(id);
      toast.success('Xóa yêu cầu thành công');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi xóa yêu cầu');
    }
  };

  const handleCancel = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy yêu cầu này?')) return;
    try {
      await adminRequestService.cancelRequest(id);
      toast.success('Hủy yêu cầu thành công');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi hủy yêu cầu');
    }
  };

  const handleEdit = (req: any) => {
    setEditId(req.request_id);
    setCreateData({
      facility_id: req.facility_id?.toString() || '',
      patient_name: req.patient_name || '',
      blood_type_id: req.blood_type_id?.toString() || '',
      component_id: req.component_id?.toString() || '',
      units_needed: req.units_needed?.toString() || '1',
      urgency_id: req.urgency_id?.toString() || '',
      clinical_notes: req.clinical_notes || '',
      patient_phone: req.patient_phone || '',
      hospital_name: req.hospital_name || '',
      ward_room: req.ward_room || '',
      province_id: req.province_id?.toString() || '',
      district_id: req.district_id?.toString() || '',
      ward_id: req.ward_id?.toString() || '',
      address: req.address || '',
      latitude: req.latitude?.toString() || '',
      longitude: req.longitude?.toString() || '',
      required_before: req.required_before ? format(new Date(req.required_before), "yyyy-MM-dd'T'HH:mm") : ''
    });
    setIsCreateOpen(true);
  };

  const handleFacilityChange = (facId: string) => {
    const facility = facilities.find(f => f.facility_id.toString() === facId);
    if (facility) {
      setCreateData(prev => ({
        ...prev,
        facility_id: facId,
        hospital_name: facility.facility_name || '',
        address: facility.address || '',
        province_id: facility.province_id?.toString() || '',
        district_id: facility.district_id?.toString() || '',
        ward_id: facility.ward_id?.toString() || '',
        latitude: facility.latitude?.toString() || '',
        longitude: facility.longitude?.toString() || '',
      }));
    } else {
      setCreateData(prev => ({ ...prev, facility_id: facId }));
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      const selectedUrgency = urgencyLevels.find(u => u.urgency_id.toString() === createData.urgency_id);
      
      const payload = {
        facility_id: Number(createData.facility_id),
        patient_name: createData.patient_name,
        blood_type_id: Number(createData.blood_type_id),
        component_id: Number(createData.component_id),
        units_needed: Number(createData.units_needed),
        urgency_id: Number(createData.urgency_id),
        is_emergency: selectedUrgency?.urgency_code === 'CRITICAL',
        clinical_notes: createData.clinical_notes || undefined,
        patient_phone: createData.patient_phone || undefined,
        hospital_name: createData.hospital_name || undefined,
        ward_room: createData.ward_room || undefined,
        province_id: createData.province_id ? Number(createData.province_id) : undefined,
        district_id: createData.district_id ? Number(createData.district_id) : undefined,
        ward_id: createData.ward_id ? Number(createData.ward_id) : undefined,
        address: createData.address || undefined,
        latitude: createData.latitude ? parseFloat(createData.latitude) : undefined,
        longitude: createData.longitude ? parseFloat(createData.longitude) : undefined,
        required_before: createData.required_before || undefined,
      };

      if (editId) {
        await adminRequestService.updateRequest(editId, payload);
        toast.success('Cập nhật yêu cầu thành công');
      } else {
        await adminRequestService.createRequest(payload);
        toast.success('Tạo yêu cầu thành công');
      }
      
      setIsCreateOpen(false);
      setEditId(null);
      setCreateData({ 
        facility_id: '', patient_name: '', blood_type_id: '', component_id: '', 
        units_needed: '1', urgency_id: '', clinical_notes: '', patient_phone: '', 
        hospital_name: '', ward_room: '', province_id: '', district_id: '', 
        ward_id: '', address: '', latitude: '', longitude: '', required_before: '' 
      });
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi lưu yêu cầu');
    } finally {
      setCreating(false);
    }
  };

  // --- MATCHING & ALLOCATION METHODS ---

  const fetchMatches = async (requestId: number) => {
    try {
      setIsMatchingLoading(true);
      const res = await adminRequestService.getMatches(requestId);
      if (res) setMatches(Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []));
    } catch (error) {
      toast.error('Lỗi khi tải danh sách ghép nối');
    } finally {
      setIsMatchingLoading(false);
    }
  };

  const handleFindMatches = async () => {
    if (!selectedItem) return;
    try {
      setIsMatchingLoading(true);
      const res = await adminRequestService.findMatches(selectedItem.request_id);
      toast.success(res?.data?.message || 'Đã tìm kiếm thành công');
      fetchMatches(selectedItem.request_id);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi tìm kiếm ghép nối');
    } finally {
      setIsMatchingLoading(false);
    }
  };

  const handleUpdateMatchStatus = async (matchId: number, status: string) => {
    try {
      await adminRequestService.updateMatchStatus(matchId, status);
      toast.success('Cập nhật trạng thái thành công');
      if (selectedItem) fetchMatches(selectedItem.request_id);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi cập nhật trạng thái');
    }
  };

  const fetchAllocations = async (requestId: number) => {
    try {
      setIsAllocationLoading(true);
      const res = await adminRequestService.getAllocations(requestId);
      if (res) setAllocations(Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []));
    } catch (error) {
      toast.error('Lỗi khi tải danh sách cấp phát');
    } finally {
      setIsAllocationLoading(false);
    }
  };

  const fetchAvailableInventory = async (bloodTypeId: number, componentId: number) => {
    try {
      setIsAllocationLoading(true);
      const res = await adminInventoryService.getInventoryList({
        blood_type_id: bloodTypeId,
        component_id: componentId,
        status_code: 'AVAILABLE',
        limit: 100
      });
      if (res) setAvailableInventory(Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []));
    } catch (error) {
      toast.error('Lỗi khi tải kho máu có sẵn');
    } finally {
      setIsAllocationLoading(false);
    }
  };

  const handleAllocate = async () => {
    if (!selectedItem || selectedInventoryIds.length === 0) return;
    try {
      setIsAllocationLoading(true);
      const res = await adminRequestService.allocateInventory(selectedItem.request_id, selectedInventoryIds);
      toast.success(res?.data?.message || 'Cấp phát thành công');
      setSelectedInventoryIds([]);
      
      // Refresh all data
      fetchAllocations(selectedItem.request_id);
      fetchAvailableInventory(selectedItem.blood_type_id, selectedItem.component_id);
      fetchData(); // Refresh list to update numbers
      
      // Re-fetch detail
      const detailRes = await adminRequestService.getRequests({ search: selectedItem.request_code });
      if (detailRes && detailRes.data && detailRes.data.length > 0) {
        setSelectedItem(detailRes.data[0]);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi cấp phát máu');
    } finally {
      setIsAllocationLoading(false);
    }
  };

  const handleReleaseAllocation = async (allocationId: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn thu hồi túi máu này về kho?')) return;
    try {
      setIsAllocationLoading(true);
      const res = await adminRequestService.releaseAllocation(allocationId);
      toast.success(res?.data?.message || 'Thu hồi thành công');
      
      if (selectedItem) {
        fetchAllocations(selectedItem.request_id);
        fetchAvailableInventory(selectedItem.blood_type_id, selectedItem.component_id);
        fetchData();
        
        // Re-fetch detail
        const detailRes = await adminRequestService.getRequests({ search: selectedItem.request_code });
        if (detailRes && detailRes.data && detailRes.data.length > 0) {
          setSelectedItem(detailRes.data[0]);
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi thu hồi máu');
    } finally {
      setIsAllocationLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      await adminRequestService.exportExcel({
        search: keyword || undefined,
        status_id: statusId === 'ALL' ? undefined : statusId,
        urgency_id: urgencyId === 'ALL' ? undefined : urgencyId
      });
    } catch (error) {
      toast.error('Lỗi khi xuất file Excel');
    }
  };

  const handleImport = async (file: File) => {
    try {
      const res = await adminRequestService.importExcel(file);
      toast.success(res?.data?.message || 'Nhập dữ liệu thành công');
      setIsImportOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi nhập dữ liệu');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await adminRequestService.downloadTemplate();
    } catch (error) {
      toast.error('Lỗi khi tải file mẫu');
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'request_code',
      title: 'Mã YC',
      render: (req) => <span className="font-mono font-medium text-slate-800">{req.request_code}</span>
    },
    {
      key: 'patient',
      title: 'Bệnh nhân / Bệnh viện',
      render: (req) => (
        <div>
          <div className="font-medium text-slate-800">{req.patient_name}</div>
          <div className="text-xs text-slate-500 line-clamp-1">{req.facility?.facility_name || req.hospital_name}</div>
        </div>
      )
    },
    {
      key: 'blood_type',
      title: 'Nhóm máu / TP',
      render: (req) => (
        <div>
          <div className="text-blood font-bold">{req.blood_type?.blood_type_code}</div>
          <div className="text-xs text-slate-500">{req.component?.component_name}</div>
        </div>
      )
    },
    {
      key: 'urgency',
      title: 'Độ khẩn cấp',
      render: (req) => {
        const ucode = req.urgency?.urgency_code;
        return (
          <span className={`text-xs font-medium px-2 py-1 rounded-full
            ${ucode === 'CRITICAL' ? 'bg-red-100 text-red-700' : 
              ucode === 'HIGH' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>
            {req.urgency?.urgency_name}
          </span>
        );
      }
    },
    {
      key: 'units',
      title: 'Số lượng',
      render: (req) => (
        <div className="text-center text-slate-800 font-semibold">
          {req.units_fulfilled} / {req.units_needed}
        </div>
      )
    },
    {
      key: 'status',
      title: 'Trạng thái',
      render: (req) => {
        const status = req.status?.status_code?.toLowerCase();
        return (
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold
            ${status === 'pending' ? 'bg-amber-50 text-amber-600 border border-amber-200' : 
              status === 'allocated' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 
              status === 'approved' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
              status === 'completed' ? 'bg-green-50 text-green-600 border border-green-200' :
              status === 'rejected' ? 'bg-red-50 text-red-600 border border-red-200' :
              'bg-slate-50 text-slate-500 border border-slate-200'}
          `}>
            {req.status?.status_name}
          </span>
        );
      }
    }
  ];

  const getRowActions = (req: any): ActionItem[] => {
    const status = req.status?.status_code?.toLowerCase();
    const isPending = status === 'pending';
    const isPendingOrApproved = status === 'pending' || status === 'approved';
    
    return [
      {
        label: 'Xem chi tiết',
        icon: <Eye className="w-4 h-4 text-slate-500" />,
        onClick: () => { setSelectedItem(req); setIsDetailOpen(true); }
      },
      {
        label: 'Xử lý yêu cầu',
        icon: <Activity className="w-4 h-4 text-blood" />,
        hidden: !isPending,
        onClick: () => handleProcess(req.request_id)
      },
      {
        label: 'Sửa',
        icon: <Edit2 className="w-4 h-4 text-blue-600" />,
        hidden: !isPending,
        onClick: () => handleEdit(req)
      },
      {
        label: 'Hủy',
        icon: <XCircle className="w-4 h-4 text-orange-600" />,
        hidden: !isPendingOrApproved,
        onClick: () => handleCancel(req.request_id)
      },
      {
        label: 'Xóa',
        icon: <Trash2 className="w-4 h-4 text-red-600" />,
        hidden: !isPendingOrApproved,
        onClick: () => handleDelete(req.request_id)
      }
    ];
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Yêu cầu từ Bệnh viện</h1>
          <p className="text-sm text-slate-500 mt-1">{meta?.total || 0} yêu cầu trong hệ thống</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportImportDropdown 
            onImportClick={() => setIsImportOpen(true)}
            onExportClick={handleExport}
            onDownloadTemplateClick={handleDownloadTemplate}
          />
          <Button onClick={() => setIsCreateOpen(true)} className="bg-blood hover:bg-blood-deep text-white shadow-none rounded-md px-4">
            <Plus className="w-4 h-4 mr-2" /> Tạo yêu cầu mới
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
          itemName="yêu cầu"
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSearch={handleSearch}
          rowActions={getRowActions}
          toolbarFilters={
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-[180px]">
                <Select value={statusId} onValueChange={v => { setStatusId(v || 'ALL'); setPage(1); }}>
                  <SelectTrigger className="bg-white border-slate-200 text-slate-800">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-slate-500" />
                      <SelectValue placeholder="Trạng thái">
                        {statusId === 'ALL' ? 'Tất cả trạng thái' :
                         statusId === '1' ? 'Chờ xử lý' :
                         statusId === '2' ? 'Đã duyệt' :
                         statusId === '3' ? 'Đã phân bổ' :
                         statusId === '4' ? 'Hoàn thành' :
                         statusId === '5' ? 'Từ chối' : 'Trạng thái'}
                      </SelectValue>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                    <SelectItem value="1">Chờ xử lý</SelectItem>
                    <SelectItem value="2">Đã duyệt</SelectItem>
                    <SelectItem value="3">Đã phân bổ</SelectItem>
                    <SelectItem value="4">Hoàn thành</SelectItem>
                    <SelectItem value="5">Từ chối</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[180px]">
                <Select value={urgencyId} onValueChange={v => { setUrgencyId(v || 'ALL'); setPage(1); }}>
                  <SelectTrigger className="bg-white border-slate-200 text-slate-800">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-slate-500" />
                      <SelectValue placeholder="Độ khẩn cấp">
                        {urgencyId === 'ALL' ? 'Tất cả độ khẩn' :
                         urgencyLevels.find(u => u.urgency_id.toString() === urgencyId)?.urgency_name || 'Độ khẩn cấp'}
                      </SelectValue>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tất cả độ khẩn</SelectItem>
                    {urgencyLevels.map(u => (
                      <SelectItem key={u.urgency_id} value={u.urgency_id.toString()}>
                        {u.urgency_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          }
        />
      </div>

      <BaseModal
        isOpen={isCreateOpen}
        onClose={() => { 
          setIsCreateOpen(false); 
          setEditId(null); 
          setCreateData({ 
            facility_id: '', patient_name: '', blood_type_id: '', component_id: '', 
            units_needed: '1', urgency_id: '', clinical_notes: '', patient_phone: '', 
            hospital_name: '', ward_room: '', province_id: '', district_id: '', 
            ward_id: '', address: '', latitude: '', longitude: '', required_before: '' 
          }); 
        }}
        title={editId ? "Cập nhật yêu cầu máu" : "Tạo yêu cầu máu mới"}
        size="4xl"
        hideFooter={true}
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cơ sở y tế</label>
              <SearchableSelect
                value={createData.facility_id}
                onValueChange={handleFacilityChange}
                options={facilities.map(f => ({ value: f.facility_id.toString(), label: f.facility_name }))}
                placeholder="Chọn cơ sở"
                triggerClassName="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bệnh viện điều trị</label>
              <Input 
                value={createData.hospital_name} 
                onChange={e => setCreateData({...createData, hospital_name: e.target.value})} 
                placeholder="Ví dụ: Bệnh viện Chợ Rẫy"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tên bệnh nhân</label>
              <Input 
                value={createData.patient_name} 
                onChange={e => setCreateData({...createData, patient_name: e.target.value})} 
                placeholder="Nhập tên bệnh nhân"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Số điện thoại bệnh nhân</label>
              <Input 
                value={createData.patient_phone} 
                onChange={e => setCreateData({...createData, patient_phone: e.target.value})} 
                placeholder="Nhập SĐT..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phòng / Khoa điều trị</label>
              <Input 
                value={createData.ward_room} 
                onChange={e => setCreateData({...createData, ward_room: e.target.value})} 
                placeholder="Khoa Hồi sức, Phòng 102..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cần máu trước ngày (Tùy chọn)</label>
              <Input 
                type="datetime-local"
                value={createData.required_before} 
                onChange={e => setCreateData({...createData, required_before: e.target.value})} 
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nhóm máu</label>
              <SearchableSelect
                value={createData.blood_type_id}
                onValueChange={v => setCreateData({...createData, blood_type_id: v})}
                options={bloodTypes.map(bt => ({ value: bt.blood_type_id.toString(), label: bt.blood_type_code }))}
                placeholder="Chọn nhóm máu"
                triggerClassName="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Thành phần</label>
              <SearchableSelect
                value={createData.component_id}
                onValueChange={v => setCreateData({...createData, component_id: v})}
                options={bloodComponents.map(c => ({ value: c.component_id.toString(), label: c.component_name }))}
                placeholder="Chọn thành phần"
                triggerClassName="w-full"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Số lượng (Đơn vị)</label>
              <Input 
                type="number" min="1" max="20"
                value={createData.units_needed} 
                onChange={e => setCreateData({...createData, units_needed: e.target.value})} 
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Độ khẩn cấp</label>
              <SearchableSelect
                value={createData.urgency_id}
                onValueChange={v => setCreateData({...createData, urgency_id: v})}
                options={urgencyLevels.map(u => ({ value: u.urgency_id.toString(), label: u.urgency_name }))}
                placeholder="Chọn độ khẩn"
                triggerClassName="w-full"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Địa chỉ giao máu (Tự động lấy theo cơ sở y tế nếu để trống)</label>
              <Input 
                value={createData.address} 
                onChange={e => setCreateData({...createData, address: e.target.value})} 
                placeholder="Số nhà, Tên đường..."
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú lâm sàng</label>
            <Textarea 
              value={createData.clinical_notes} 
              onChange={e => setCreateData({...createData, clinical_notes: e.target.value})} 
              placeholder="Ghi chú thêm (Tình trạng bệnh, nhóm máu đặc biệt...)"
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => { 
              setIsCreateOpen(false); 
              setEditId(null); 
              setCreateData({ 
                facility_id: '', patient_name: '', blood_type_id: '', component_id: '', 
                units_needed: '1', urgency_id: '', clinical_notes: '', patient_phone: '', 
                hospital_name: '', ward_room: '', province_id: '', district_id: '', 
                ward_id: '', address: '', latitude: '', longitude: '', required_before: '' 
              }); 
            }}>Hủy</Button>
            <Button type="submit" className="bg-blood hover:bg-blood-deep text-white" disabled={creating}>
              {creating ? 'Đang lưu...' : (editId ? 'Cập nhật' : 'Tạo yêu cầu')}
            </Button>
          </div>
        </form>
      </BaseModal>

      <BaseModal
        isOpen={isDetailOpen}
        onClose={() => { setIsDetailOpen(false); setDetailTab('info'); }}
        title="Chi tiết Yêu cầu máu"
        size="4xl"
        hideFooter
      >
        {selectedItem && (
          <div className="text-sm">
            {/* Tabs Navigation */}
            <div className="flex border-b border-slate-200 mb-4 overflow-x-auto">
              <button 
                className={`px-4 py-2 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap ${detailTab === 'info' ? 'border-blood text-blood' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                onClick={() => setDetailTab('info')}
              >
                Chi tiết khám & lấy máu
              </button>
              <button 
                className={`px-4 py-2 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap ${detailTab === 'matching' ? 'border-blood text-blood' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                onClick={() => setDetailTab('matching')}
              >
                Ghép nối Người hiến
              </button>
              <button 
                className={`px-4 py-2 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap ${detailTab === 'allocation' ? 'border-blood text-blood' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                onClick={() => setDetailTab('allocation')}
              >
                Cấp phát Kho
              </button>
              <button 
                className={`px-4 py-2 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap ${detailTab === 'history' ? 'border-blood text-blood' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                onClick={() => setDetailTab('history')}
              >
                Lịch sử trạng thái
              </button>
            </div>

            {/* Tab Content */}
            {detailTab === 'info' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Mã yêu cầu</span>
                    <span className="font-bold text-slate-800 text-base">{selectedItem.request_code}</span>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Trạng thái</span>
                    <span className="font-semibold text-slate-800">{selectedItem.status?.status_name}</span>
                  </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Cơ sở y tế yêu cầu</span>
                <span className="font-medium text-slate-800">{selectedItem.facility?.facility_name}</span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Bệnh viện & Phòng điều trị</span>
                <span className="font-medium text-slate-800">
                  {selectedItem.hospital_name || selectedItem.facility?.facility_name}
                  {selectedItem.ward_room && ` - ${selectedItem.ward_room}`}
                </span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Bệnh nhân</span>
                <span className="font-bold text-slate-800 text-base">{selectedItem.patient_name}</span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Điện thoại liên hệ</span>
                <span className="font-medium text-slate-800">{selectedItem.patient_phone || '-'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Địa chỉ giao máu</span>
                <span className="font-medium text-slate-800">{selectedItem.address || selectedItem.facility?.address || '-'}</span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Nhóm máu / Thành phần</span>
                <span className="font-bold text-blood">{selectedItem.blood_type?.blood_type_code}</span>
                <span className="text-slate-600 ml-2">({selectedItem.component?.component_name})</span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Độ khẩn cấp</span>
                <span className={`font-semibold ${selectedItem.urgency?.urgency_code === 'CRITICAL' ? 'text-red-600' : 'text-slate-800'}`}>
                  {selectedItem.urgency?.urgency_name}
                </span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Số lượng (Đơn vị)</span>
                <span className="font-medium text-slate-800">{selectedItem.units_fulfilled} / {selectedItem.units_needed}</span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Ngày tạo</span>
                <span className="font-medium text-slate-800">
                  {selectedItem.created_at ? format(new Date(selectedItem.created_at), 'dd/MM/yyyy HH:mm') : '-'}
                </span>
              </div>

              <div className="col-span-2">
                <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Ghi chú y khoa</span>
                <span className="font-medium text-slate-800">{selectedItem.clinical_notes || '-'}</span>
              </div>
            </div>
          </div>
            )}

            {detailTab === 'history' && (
              <div className="space-y-4 pt-2">
                <div className="relative pl-6 border-l-2 border-slate-200 ml-3 space-y-8 pb-4">
                  {(!selectedItem.status_history || selectedItem.status_history.length === 0) ? (
                    <div className="text-slate-500 text-sm">Chưa có lịch sử trạng thái</div>
                  ) : (
                    selectedItem.status_history.map((hist: any, index: number) => (
                      <div key={hist.history_id} className="relative">
                        {/* Timeline Dot */}
                        <div className="absolute -left-[31px] top-1.5 w-[14px] h-[14px] rounded-full bg-blood border-[3px] border-white shadow-sm ring-1 ring-slate-200" />
                        
                        <div className="flex gap-4">
                          <div className="flex-1 space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-800 text-base">{hist.user?.full_name || 'Hệ thống'}</span>
                              <span className="text-slate-500 text-xs">({hist.user?.email || 'System'})</span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-xs font-semibold mt-1">
                              {hist.from_status ? (
                                <span className={`px-2.5 py-1 rounded-md border ${getStatusColor(hist.from_status.status_code)}`}>
                                  {hist.from_status.status_name}
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-md border bg-slate-100 text-slate-500 border-slate-200">
                                  Khởi tạo
                                </span>
                              )}
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                              <span className={`px-2.5 py-1 rounded-md border ${getStatusColor(hist.to_status?.status_code)}`}>
                                {hist.to_status?.status_name || 'Không rõ'}
                              </span>
                            </div>

                            <div className="text-slate-600 italic mt-2 bg-slate-50 p-3 rounded border border-slate-100 inline-block w-full">
                              "{hist.change_reason || 'Không có ghi chú cụ thể'}"
                            </div>
                            <div className="text-xs text-slate-400 mt-1 font-medium flex items-center gap-1.5">
                              <History className="w-3.5 h-3.5" />
                              {format(new Date(hist.created_at), 'dd/MM/yyyy HH:mm:ss')}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {detailTab === 'matching' && (
              <div className="space-y-4 pt-2">
                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div>
                    <h3 className="font-semibold text-slate-800">Ghép nối Người hiến máu</h3>
                    <p className="text-sm text-slate-500">Tự động tìm kiếm những người hiến máu phù hợp (nhóm máu, vị trí) đang trong trạng thái sẵn sàng.</p>
                  </div>
                  <Button 
                    onClick={handleFindMatches} 
                    disabled={isMatchingLoading || selectedItem.status?.status_code === 'COMPLETED' || selectedItem.status?.status_code === 'REJECTED'}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {isMatchingLoading ? 'Đang tìm kiếm...' : 'Tìm kiếm Người hiến'}
                  </Button>
                </div>

                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                      <tr>
                        <th className="px-4 py-3">Người hiến</th>
                        <th className="px-4 py-3">Liên hệ</th>
                        <th className="px-4 py-3">Nhóm máu</th>
                        <th className="px-4 py-3">Độ phù hợp</th>
                        <th className="px-4 py-3">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {matches.length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Chưa có dữ liệu ghép nối. Hãy nhấn Tìm kiếm.</td></tr>
                      ) : matches.map(match => (
                        <tr key={match.match_id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-800">{match.donor?.full_name}</td>
                          <td className="px-4 py-3">
                            <div className="text-slate-800">{match.donor?.phone}</div>
                            <div className="text-xs text-slate-500">{match.donor?.email}</div>
                          </td>
                          <td className="px-4 py-3 font-bold text-blood">{match.donor?.blood_type?.blood_type_code}</td>
                          <td className="px-4 py-3 text-emerald-600 font-semibold">{match.match_score}%</td>
                          <td className="px-4 py-3">
                            <Select value={match.match_status} onValueChange={(v) => handleUpdateMatchStatus(match.match_id, v)}>
                              <SelectTrigger className="h-8 text-xs bg-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PENDING">Chờ liên hệ</SelectItem>
                                <SelectItem value="CONTACTED">Đã liên hệ</SelectItem>
                                <SelectItem value="ACCEPTED">Đồng ý hiến</SelectItem>
                                <SelectItem value="REJECTED">Từ chối</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {detailTab === 'allocation' && (
              <div className="space-y-6 pt-2">
                {/* Currently Allocated */}
                <div>
                  <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <Box className="w-4 h-4 text-emerald-600" /> 
                    Túi máu đã cấp phát cho yêu cầu này ({allocations.length})
                  </h3>
                  <div className="bg-emerald-50/50 rounded-lg border border-emerald-100 overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-emerald-50 border-b border-emerald-100 text-emerald-700 font-medium">
                        <tr>
                          <th className="px-4 py-2">Mã túi máu</th>
                          <th className="px-4 py-2">Nhóm máu / TP</th>
                          <th className="px-4 py-2">Ngày lấy</th>
                          <th className="px-4 py-2">Hành động</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-emerald-50">
                        {allocations.length === 0 ? (
                          <tr><td colSpan={4} className="px-4 py-4 text-center text-slate-500">Chưa có túi máu nào được cấp phát</td></tr>
                        ) : allocations.map(alloc => (
                          <tr key={alloc.allocation_id}>
                            <td className="px-4 py-2 font-medium">{alloc.inventory?.bag_code}</td>
                            <td className="px-4 py-2">
                              <span className="font-bold text-blood">{alloc.inventory?.blood_type?.blood_type_code}</span> - {alloc.inventory?.component?.component_name}
                            </td>
                            <td className="px-4 py-2">{alloc.inventory?.collection_date ? format(new Date(alloc.inventory?.collection_date), 'dd/MM/yyyy') : ''}</td>
                            <td className="px-4 py-2">
                              <Button 
                                size="sm" variant="outline" 
                                className="h-7 text-xs border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                                onClick={() => handleReleaseAllocation(alloc.allocation_id)}
                              >
                                Thu hồi
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Available Inventory to Allocate */}
                {selectedItem.units_fulfilled < selectedItem.units_needed && (
                  <div className="border-t border-slate-200 pt-6">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        <Search className="w-4 h-4 text-blue-600" /> 
                        Kho máu sẵn có ({availableInventory.length})
                      </h3>
                      <Button 
                        onClick={handleAllocate} 
                        disabled={selectedInventoryIds.length === 0 || isAllocationLoading}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs"
                      >
                        {isAllocationLoading ? 'Đang xử lý...' : `Cấp phát ${selectedInventoryIds.length} túi máu đã chọn`}
                      </Button>
                    </div>
                    
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden max-h-[300px] overflow-y-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium sticky top-0">
                          <tr>
                            <th className="px-4 py-2 w-10"></th>
                            <th className="px-4 py-2">Mã túi máu</th>
                            <th className="px-4 py-2">Nhóm máu</th>
                            <th className="px-4 py-2">Thành phần</th>
                            <th className="px-4 py-2">Ngày hết hạn</th>
                            <th className="px-4 py-2">Thể tích</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {availableInventory.length === 0 ? (
                            <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Không có túi máu nào phù hợp trong kho.</td></tr>
                          ) : availableInventory.map(inv => (
                            <tr key={inv.inventory_id} className="hover:bg-slate-50 cursor-pointer" onClick={() => {
                              setSelectedInventoryIds(prev => 
                                prev.includes(inv.inventory_id) 
                                  ? prev.filter(id => id !== inv.inventory_id)
                                  : [...prev, inv.inventory_id]
                              );
                            }}>
                              <td className="px-4 py-2">
                                <input 
                                  type="checkbox" 
                                  className="w-4 h-4 text-blood rounded border-slate-300"
                                  checked={selectedInventoryIds.includes(inv.inventory_id)}
                                  readOnly
                                />
                              </td>
                              <td className="px-4 py-2 font-medium">{inv.bag_code}</td>
                              <td className="px-4 py-2 font-bold text-blood">{inv.blood_type?.blood_type_code}</td>
                              <td className="px-4 py-2">{inv.component?.component_name}</td>
                              <td className="px-4 py-2 text-orange-600">{inv.expiry_date ? format(new Date(inv.expiry_date), 'dd/MM/yyyy') : ''}</td>
                              <td className="px-4 py-2 font-semibold">{inv.volume_ml} ml</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex justify-end pt-4 mt-4 border-t border-slate-100">
              <Button onClick={() => { setIsDetailOpen(false); setDetailTab('info'); }} variant="outline">Đóng</Button>
            </div>
          </div>
        )}
      </BaseModal>

      <ExcelImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Nhập dữ liệu Yêu cầu máu"
        onImport={handleImport}
        onDownloadTemplate={handleDownloadTemplate}
      />
    </div>
  );
}
