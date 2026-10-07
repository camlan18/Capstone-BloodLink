'use client';
import { useEffect, useState } from 'react';
import { adminTransferService } from '@/lib/services/admin-transfers';
import { adminMasterDataService } from '@/lib/services/admin-master-data';
import { adminInventoryService } from '@/lib/services/admin-inventory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Plus, Filter, Eye, ArrowRightLeft, CheckCircle2, Truck, PackageCheck, XCircle, Ban } from 'lucide-react';
import { format } from 'date-fns';
import { DataTable, Column, ActionItem } from '@/components/ui/DataTable';
import { BaseModal } from '@/components/ui/BaseModal';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAuthStore } from '@/lib/stores';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Chờ duyệt', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  APPROVED: { label: 'Đã duyệt', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  IN_TRANSIT: { label: 'Đang vận chuyển', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  RECEIVED: { label: 'Đã nhận', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  REJECTED: { label: 'Từ chối', color: 'bg-red-50 text-red-700 border-red-200' },
  CANCELLED: { label: 'Đã hủy', color: 'bg-slate-50 text-slate-500 border-slate-200' },
};

export default function AdminTransfersPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [keyword, setKeyword] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const currentUser = useAuthStore(state => state.user);
  const isStaff = currentUser?.role?.role_code === 'HOSPITAL_STAFF' || (typeof currentUser?.role === 'string' && currentUser.role === 'HOSPITAL_STAFF');

  // Master Data
  const [facilities, setFacilities] = useState<any[]>([]);
  const [bloodTypes, setBloodTypes] = useState<any[]>([]);
  const [bloodComponents, setBloodComponents] = useState<any[]>([]);
  const [inventoryStats, setInventoryStats] = useState<any[]>([]);

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createData, setCreateData] = useState({
    from_facility_id: '',
    to_facility_id: '',
    blood_type_id: '',
    component_id: '',
    units_requested: '1',
    reason: '',
    notes: '',
  });

  // Detail Modal
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Approve Modal - choose inventory
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [approveItem, setApproveItem] = useState<any>(null);
  const [availableInventory, setAvailableInventory] = useState<any[]>([]);
  const [selectedInventoryIds, setSelectedInventoryIds] = useState<number[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);

  // Reject Modal
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectItem, setRejectItem] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    fetchData();
  }, [page, pageSize, keyword, filterStatus]);

  const fetchMasterData = async () => {
    try {
      const [facRes, btRes, compRes, statsRes] = await Promise.all([
        adminMasterDataService.getFacilities({ limit: 100 }),
        adminMasterDataService.getBloodTypes({ limit: 100 }),
        adminMasterDataService.getBloodComponents(),
        adminInventoryService.getInventoryStats({ global: 'true' }),
      ]);
      if (facRes) setFacilities(Array.isArray(facRes.data) ? facRes.data : (Array.isArray(facRes) ? facRes : []));
      if (btRes) setBloodTypes(Array.isArray(btRes.data) ? btRes.data : (Array.isArray(btRes) ? btRes : []));
      if (compRes) setBloodComponents(Array.isArray(compRes.data) ? compRes.data : (Array.isArray(compRes) ? compRes : []));
      if (statsRes) setInventoryStats(Array.isArray(statsRes.data) ? statsRes.data : (Array.isArray(statsRes) ? statsRes : []));
    } catch (error) {
      console.error('Failed to load master data');
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await adminTransferService.getTransfers({
        page,
        limit: pageSize,
        search: keyword || undefined,
        status: filterStatus === 'ALL' ? undefined : filterStatus,
      });
      if (res) {
        setData(Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []));
        setMeta((res as any).meta || {});
      }
    } catch (error) {
      toast.error('Lỗi khi tải danh sách phiếu chuyển máu');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (val: string) => {
    setKeyword(val);
    setPage(1);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      const res = await adminTransferService.createTransfer({
        from_facility_id: Number(createData.from_facility_id),
        to_facility_id: Number(createData.to_facility_id),
        blood_type_id: Number(createData.blood_type_id),
        component_id: Number(createData.component_id),
        units_requested: Number(createData.units_requested),
        reason: createData.reason || undefined,
        notes: createData.notes || undefined,
      });
      toast.success((res as any)?.message || (res as any)?.data?.message || 'Tạo phiếu yêu cầu chuyển máu thành công!');
      setIsCreateOpen(false);
      setCreateData({ from_facility_id: '', to_facility_id: '', blood_type_id: '', component_id: '', units_requested: '1', reason: '', notes: '' });
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi tạo phiếu chuyển máu');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenApprove = async (item: any) => {
    setApproveItem(item);
    setSelectedInventoryIds([]);
    setIsApproveOpen(true);
    try {
      setLoadingInventory(true);
      const res = await adminInventoryService.getInventoryList({
        facility_id: item.from_facility_id,
        blood_type_id: item.blood_type_id,
        status_code: 'AVAILABLE',
        limit: 100,
      });
      if (res) setAvailableInventory(Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []));
    } catch (error) {
      toast.error('Lỗi khi tải danh sách kho máu');
    } finally {
      setLoadingInventory(false);
    }
  };

  const handleApprove = async () => {
    if (!approveItem) return;
    if (selectedInventoryIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 túi máu để chuyển');
      return;
    }

    const requiredVolume = (approveItem.units_requested || 1) * 250;
    const selectedVolume = selectedInventoryIds.reduce((sum, id) => {
      const bag = availableInventory.find((x: any) => x.inventory_id === id);
      return sum + (bag?.volume_ml || 0);
    }, 0);

    if (selectedVolume < requiredVolume) {
      toast.error(`Tổng thể tích đã chọn (${selectedVolume}ml) chưa đủ yêu cầu (${requiredVolume}ml)!`);
      return;
    }

    try {
      setSubmitting(true);
      // In the frontend API service, ensure approveTransfer accepts an object or updates correctly.
      // Assuming adminTransferService.approveTransfer passes the second argument as payload: { inventory_ids: selectedInventoryIds }
      // Wait, let's just pass selectedInventoryIds array.
      const res = await adminTransferService.approveTransfer(approveItem.transfer_id, { inventory_ids: selectedInventoryIds });
      toast.success((res as any)?.message || (res as any)?.data?.message || 'Đã duyệt phiếu!');
      setIsApproveOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi duyệt');
    } finally {
      setSubmitting(false);
    }
  };

  const handleShip = async (id: number) => {
    if (!confirm('Xác nhận xuất kho túi máu này?')) return;
    try {
      const res = await adminTransferService.shipTransfer(id);
      toast.success((res as any)?.message || (res as any)?.data?.message || 'Đã xuất kho!');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi xuất kho');
    }
  };

  const handleReceive = async (id: number) => {
    if (!confirm('Xác nhận đã nhận túi máu?')) return;
    try {
      const res = await adminTransferService.receiveTransfer(id);
      toast.success((res as any)?.message || (res as any)?.data?.message || 'Đã nhận kho thành công!');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi nhận kho');
    }
  };

  const handleReject = async () => {
    if (!rejectItem) return;
    try {
      setSubmitting(true);
      const res = await adminTransferService.rejectTransfer(rejectItem.transfer_id, rejectReason);
      toast.success((res as any)?.message || (res as any)?.data?.message || 'Đã từ chối!');
      setIsRejectOpen(false);
      setRejectReason('');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi từ chối');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm('Xác nhận hủy phiếu chuyển máu này?')) return;
    try {
      const res = await adminTransferService.cancelTransfer(id);
      toast.success((res as any)?.message || (res as any)?.data?.message || 'Đã hủy!');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi hủy');
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'transfer_code',
      title: 'Mã phiếu',
      render: (item) => <span className="font-mono font-medium text-slate-800">{item.transfer_code}</span>
    },
    {
      key: 'route',
      title: 'Từ → Đến',
      render: (item) => (
        <div className="text-xs">
          <div className="font-semibold text-slate-800 truncate max-w-[160px]" title={item.from_facility?.facility_name}>
            {item.from_facility?.short_name || item.from_facility?.facility_name || '---'}
          </div>
          <div className="flex items-center gap-1 text-blood my-0.5">
            <ArrowRightLeft className="w-3 h-3" />
            <span className="font-medium">→</span>
          </div>
          <div className="font-semibold text-navy truncate max-w-[160px]" title={item.to_facility?.facility_name}>
            {item.to_facility?.short_name || item.to_facility?.facility_name || '---'}
          </div>
        </div>
      )
    },
    {
      key: 'blood_info',
      title: 'Nhóm máu / TP',
      render: (item) => (
        <div>
          <div className="text-blood font-bold">{item.blood_type?.blood_type_code}</div>
          <div className="text-xs text-slate-500">{item.component?.component_name}</div>
        </div>
      )
    },
    {
      key: 'inventory',
      title: 'Túi máu',
      render: (item) => {
        let text = item.inventory?.bag_code || '(Chưa chọn)';
        if (item.inventory_ids) {
          try {
            const parsed = JSON.parse(item.inventory_ids);
            if (parsed && parsed.length > 0) {
              if (typeof parsed[0] === 'object') {
                text = `[${parsed.length} túi]`;
              } else {
                text = `[${parsed.length} túi]`;
              }
            }
          } catch (e) {}
        }
        return (
          <span className="font-mono text-xs text-slate-700">
            {text}
          </span>
        );
      }
    },
    {
      key: 'status',
      title: 'Trạng thái',
      render: (item) => {
        const s = STATUS_MAP[item.status] || { label: item.status, color: 'bg-slate-50 text-slate-500 border-slate-200' };
        return (
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${s.color}`}>
            {s.label}
          </span>
        );
      }
    },
    {
      key: 'dates',
      title: 'Ngày tạo',
      render: (item) => (
        <div className="text-xs text-slate-500">
          {item.created_at ? format(new Date(item.created_at), 'dd/MM/yyyy HH:mm') : '---'}
        </div>
      )
    },
  ];

  const getRowActions = (item: any): ActionItem[] => {
    const actions: ActionItem[] = [
      {
        label: 'Xem chi tiết',
        icon: <Eye className="w-4 h-4 text-slate-500" />,
        onClick: () => { setSelectedItem(item); setIsDetailOpen(true); }
      },
    ];

    const isAdmin = currentUser?.role?.role_code === 'ADMIN' || currentUser?.role === 'ADMIN';
    const isSender = isAdmin || (currentUser?.facility_id === item.from_facility_id);
    const isReceiver = isAdmin || (currentUser?.facility_id === item.to_facility_id);

    if (item.status === 'PENDING') {
      if (isSender) {
        actions.push(
          {
            label: 'Duyệt & Chọn túi máu',
            icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
            onClick: () => handleOpenApprove(item)
          },
          {
            label: 'Từ chối',
            icon: <XCircle className="w-4 h-4 text-red-600" />,
            onClick: () => { setRejectItem(item); setRejectReason(''); setIsRejectOpen(true); }
          }
        );
      }
      if (isReceiver || isSender) {
        actions.push({
          label: 'Hủy',
          icon: <Ban className="w-4 h-4 text-slate-500" />,
          onClick: () => handleCancel(item.transfer_id)
        });
      }
    }

    if (item.status === 'APPROVED' && isSender) {
      actions.push(
        {
          label: 'Xuất kho (Vận chuyển)',
          icon: <Truck className="w-4 h-4 text-purple-600" />,
          onClick: () => handleShip(item.transfer_id)
        },
        {
          label: 'Hủy',
          icon: <Ban className="w-4 h-4 text-slate-500" />,
          onClick: () => handleCancel(item.transfer_id)
        }
      );
    }

    if (item.status === 'IN_TRANSIT' && isReceiver) {
      actions.push({
        label: 'Xác nhận nhận kho',
        icon: <PackageCheck className="w-4 h-4 text-emerald-600" />,
        onClick: () => handleReceive(item.transfer_id)
      });
    }

    return actions;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Phiếu Chuyển Máu Giữa Các Cơ Sở"
        description={`${meta?.total || 0} phiếu chuyển trong hệ thống`}
        action={
          <Button onClick={() => {
            setIsCreateOpen(true);
            if (isStaff && currentUser?.facility_id) {
              setCreateData(prev => ({ ...prev, to_facility_id: currentUser.facility_id!.toString() }));
            }
          }} className="bg-blood hover:bg-blood-deep text-white shadow-none rounded-md px-4">
            <Plus className="w-4 h-4 mr-2" /> Tạo phiếu yêu cầu chuyển máu
          </Button>
        }
      />

      {/* Global Constant Note */}
      <div className="text-xs font-medium text-slate-500 mb-2">Quy định hệ thống: 1 Đơn vị máu = 250 ML</div>

      {/* Flow Guide */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <p className="text-xs font-bold text-slate-700 mb-2">Quy trình chuyển máu chuẩn:</p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold">1. Chờ duyệt</span>
          <span className="text-slate-400">→</span>
          <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">2. Đã duyệt (Chọn túi máu)</span>
          <span className="text-slate-400">→</span>
          <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-semibold">3. Đang vận chuyển (Xuất kho)</span>
          <span className="text-slate-400">→</span>
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">4. Đã nhận (Nhập kho)</span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <DataTable
          data={data}
          columns={columns}
          totalRecords={meta?.total || 0}
          loading={loading}
          page={page}
          pageSize={pageSize}
          keyword={keyword}
          itemName="phiếu chuyển"
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSearch={handleSearch}
          rowActions={getRowActions}
          toolbarFilters={
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-[180px]">
                <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setPage(1); }}>
                  <SelectTrigger className="bg-white border-slate-200 text-slate-800">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-slate-500" />
                      <SelectValue placeholder="Trạng thái">
                        {filterStatus === 'ALL' ? 'Tất cả trạng thái' : (STATUS_MAP[filterStatus]?.label || filterStatus)}
                      </SelectValue>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                    <SelectItem value="PENDING">Chờ duyệt</SelectItem>
                    <SelectItem value="APPROVED">Đã duyệt</SelectItem>
                    <SelectItem value="IN_TRANSIT">Đang vận chuyển</SelectItem>
                    <SelectItem value="RECEIVED">Đã nhận</SelectItem>
                    <SelectItem value="REJECTED">Từ chối</SelectItem>
                    <SelectItem value="CANCELLED">Đã hủy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          }
        />
      </div>

      {/* Create Transfer Modal */}
      <BaseModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        title="Tạo phiếu yêu cầu chuyển máu"
        size="4xl"
        hideFooter
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nhóm máu cần chuyển <span className="text-red-500">*</span></label>
              <SearchableSelect
                value={createData.blood_type_id}
                onValueChange={v => setCreateData({ ...createData, blood_type_id: v, from_facility_id: '' })}
                options={bloodTypes.map(bt => ({ value: bt.blood_type_id.toString(), label: bt.blood_type_code }))}
                placeholder="Chọn nhóm máu"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Thành phần máu <span className="text-red-500">*</span></label>
              <SearchableSelect
                value={createData.component_id}
                onValueChange={v => setCreateData({ ...createData, component_id: v, from_facility_id: '' })}
                options={bloodComponents.map(c => ({ value: c.component_id.toString(), label: c.component_name }))}
                placeholder="Chọn thành phần"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cơ sở có máu (Xuất kho) <span className="text-red-500">*</span></label>
              <SearchableSelect
                disabled={!createData.blood_type_id || !createData.component_id}
                value={createData.from_facility_id}
                onValueChange={v => setCreateData({ ...createData, from_facility_id: v })}
                options={facilities
                  .filter(f => inventoryStats.some(s => 
                    s.facility_id === f.facility_id && 
                    s.blood_type_id === Number(createData.blood_type_id) && 
                    s.component_id === Number(createData.component_id) && 
                    s._count?.inventory_id > 0
                  ))
                  .map(f => ({ value: f.facility_id.toString(), label: f.facility_name }))}
                placeholder={(!createData.blood_type_id || !createData.component_id) ? "Vui lòng chọn nhóm máu và thành phần trước" : "Chọn cơ sở xuất..."}
              />
              {createData.blood_type_id && createData.component_id && (
                <p className="text-[10px] text-slate-500 mt-1">Chỉ hiển thị các cơ sở đang có sẵn túi máu này</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cơ sở cần máu (Nhận kho) <span className="text-red-500">*</span></label>
              <SearchableSelect
                disabled={isStaff}
                value={createData.to_facility_id}
                onValueChange={v => setCreateData({ ...createData, to_facility_id: v })}
                options={facilities.map(f => ({ value: f.facility_id.toString(), label: f.facility_name }))}
                placeholder="Chọn cơ sở nhận..."
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Số đơn vị (1 đơn vị = 250ml) <span className="text-red-500">*</span></label>
              <Input type="number" min="1" max="20" value={createData.units_requested} onChange={e => setCreateData({ ...createData, units_requested: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Lý do chuyển máu</label>
            <Textarea value={createData.reason} onChange={e => setCreateData({ ...createData, reason: e.target.value })} placeholder="VD: Bệnh viện Cần Thơ thiếu máu A- khẩn cấp..." rows={2} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú thêm</label>
            <Input value={createData.notes} onChange={e => setCreateData({ ...createData, notes: e.target.value })} placeholder="Ghi chú..." />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Hủy</Button>
            <Button type="submit" disabled={creating} className="bg-blood hover:bg-blood-deep text-white">
              {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Tạo phiếu chuyển
            </Button>
          </div>
        </form>
      </BaseModal>

      {/* Approve Modal - Chọn túi máu */}
      <BaseModal
        open={isApproveOpen}
        onOpenChange={setIsApproveOpen}
        title={`Duyệt phiếu ${approveItem?.transfer_code || ''}`}
        onSubmit={handleApprove}
        loading={submitting}
        submitText="Duyệt & Gán túi máu"
        cancelText="Hủy"
      >
        <div className="space-y-4">
          <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
            <p className="text-sm font-medium text-slate-700">Từ: <span className="font-bold text-navy">{approveItem?.from_facility?.facility_name}</span></p>
            <p className="text-sm font-medium text-slate-700 mt-1">Đến: <span className="font-bold text-blood">{approveItem?.to_facility?.facility_name}</span></p>
            <p className="text-sm font-medium text-slate-700 mt-1">Nhóm máu: <span className="font-bold text-blood">{approveItem?.blood_type?.blood_type_code}</span></p>
            {approveItem?.reason && (
              <p className="text-sm text-slate-600 mt-1">Lý do: <em>{approveItem.reason}</em></p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Chọn túi máu để chuyển <span className="text-red-500">*</span></label>
            {loadingInventory ? (
              <div className="flex items-center gap-2 py-4 text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" /> Đang tải kho máu...
              </div>
            ) : availableInventory.length === 0 ? (
              <div className="py-3 text-sm text-red-600 font-medium">
                Không tìm thấy túi máu phù hợp trong kho cơ sở xuất.
              </div>
            ) : (
              <>
                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-md p-2 space-y-1 custom-scrollbar">
                  {availableInventory.map(inv => (
                    <label key={inv.inventory_id} className={`flex items-center gap-3 p-2 cursor-pointer rounded-md border ${selectedInventoryIds.includes(inv.inventory_id) ? 'bg-red-50 border-blood/20' : 'hover:bg-slate-50 border-transparent hover:border-slate-100'}`}>
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 text-blood focus:ring-blood rounded border-gray-300"
                        checked={selectedInventoryIds.includes(inv.inventory_id)}
                        onChange={() => {
                          setSelectedInventoryIds(prev => 
                            prev.includes(inv.inventory_id) ? prev.filter(x => x !== inv.inventory_id) : [...prev, inv.inventory_id]
                          );
                        }}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-800">{inv.bag_code}</p>
                        <p className="text-xs text-slate-500">{inv.volume_ml}ml — HSD: {inv.expiry_date ? format(new Date(inv.expiry_date), 'dd/MM/yyyy') : '---'}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="mt-2 flex justify-between items-center text-sm">
                  <span className="text-slate-600">Đã chọn: <span className="font-bold text-blood">{selectedInventoryIds.length}</span> túi</span>
                  <span className="text-slate-600">Yêu cầu: <span className="font-bold text-blood">{approveItem?.units_requested}</span> đơn vị</span>
                </div>
              </>
            )}
          </div>
        </div>
      </BaseModal>

      {/* Reject Modal */}
      <BaseModal
        open={isRejectOpen}
        onOpenChange={setIsRejectOpen}
        title={`Từ chối phiếu ${rejectItem?.transfer_code || ''}`}
        onSubmit={handleReject}
        loading={submitting}
        submitText="Xác nhận từ chối"
        cancelText="Hủy"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Lý do từ chối</label>
            <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Nhập lý do từ chối..." rows={3} />
          </div>
        </div>
      </BaseModal>

      {/* Detail Modal */}
      <BaseModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        title={`Chi tiết phiếu ${selectedItem?.transfer_code || ''}`}
        size="2xl"
        hideFooter
      >
        {selectedItem && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3 rounded-md border">
                <p className="text-xs text-slate-500">Cơ sở xuất (có máu)</p>
                <p className="font-bold text-slate-800">{selectedItem.from_facility?.facility_name}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-md border">
                <p className="text-xs text-slate-500">Cơ sở nhận (cần máu)</p>
                <p className="font-bold text-navy">{selectedItem.to_facility?.facility_name}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-slate-500">Nhóm máu</p>
                <p className="font-bold text-blood">{selectedItem.blood_type?.blood_type_code}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Thành phần</p>
                <p className="font-medium text-slate-800">{selectedItem.component?.component_name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Trạng thái</p>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_MAP[selectedItem.status]?.color || 'bg-slate-50 text-slate-500'}`}>
                  {STATUS_MAP[selectedItem.status]?.label || selectedItem.status}
                </span>
              </div>
            </div>
            {(() => {
              let hasBags = false;
              let parsed: any[] = [];
              if (selectedItem.inventory_ids) {
                try {
                  parsed = JSON.parse(selectedItem.inventory_ids);
                  if (parsed && parsed.length > 0) hasBags = true;
                } catch (e) {}
              }
              if (!hasBags && selectedItem.inventory?.bag_code) hasBags = true;

              if (!hasBags) return null;

              return (
                <div className={`p-3 rounded-md border ${selectedItem.status === 'CANCELLED' ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200'}`}>
                  <p className={`text-xs font-medium ${selectedItem.status === 'CANCELLED' ? 'text-gray-500' : 'text-blue-600'}`}>
                    {selectedItem.status === 'CANCELLED' ? 'Túi máu từng được chọn (Đã hoàn kho)' : 'Túi máu được chọn'}
                  </p>
                  <p className={`font-bold ${selectedItem.status === 'CANCELLED' ? 'text-gray-700' : 'text-blue-800'}`}>
                    {parsed.length > 0 ? (
                      typeof parsed[0] === 'object'
                        ? `Đã chọn ${parsed.length} túi máu: ${parsed.map((x: any) => `${x.code} (${x.volume}ml)`).join(', ')}`
                        : `Đã chọn ${parsed.length} túi máu`
                    ) : (
                      <span className="font-mono">{selectedItem.inventory?.bag_code} — {selectedItem.inventory?.volume_ml}ml</span>
                    )}
                  </p>
                </div>
              );
            })()}
            {selectedItem.reason && (
              <div>
                <p className="text-xs text-slate-500">Lý do</p>
                <p className="text-sm text-slate-800">{selectedItem.reason}</p>
              </div>
            )}
            {selectedItem.reject_reason && (
              <div className="bg-red-50 p-3 rounded-md border border-red-200">
                <p className="text-xs text-red-600 font-medium">Lý do từ chối</p>
                <p className="text-sm text-red-800">{selectedItem.reject_reason}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100 text-xs text-slate-500">
              <p>Người yêu cầu: <strong className="text-slate-700">{selectedItem.requester?.full_name || '---'}</strong></p>
              <p>Người duyệt: <strong className="text-slate-700">{selectedItem.approver?.full_name || '---'}</strong></p>
              <p>Ngày duyệt: {selectedItem.approved_at ? format(new Date(selectedItem.approved_at), 'dd/MM/yyyy HH:mm') : '---'}</p>
              <p>Ngày xuất kho: {selectedItem.shipped_at ? format(new Date(selectedItem.shipped_at), 'dd/MM/yyyy HH:mm') : '---'}</p>
              <p>Ngày nhận: {selectedItem.received_at ? format(new Date(selectedItem.received_at), 'dd/MM/yyyy HH:mm') : '---'}</p>
              <p>Ngày tạo: {selectedItem.created_at ? format(new Date(selectedItem.created_at), 'dd/MM/yyyy HH:mm') : '---'}</p>
            </div>
          </div>
        )}
      </BaseModal>
    </div>
  );
}
