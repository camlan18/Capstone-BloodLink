'use client';
import { useEffect, useState } from 'react';
import { adminInventoryService } from '@/lib/services/admin-inventory';
import { adminMasterDataService } from '@/lib/services/admin-master-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Filter, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { DataTable, Column, ActionItem } from '@/components/ui/DataTable';
import { BaseModal } from '@/components/ui/BaseModal';
import { ExcelImportModal } from '@/components/ui/ExcelImportModal';
import { ExportImportDropdown } from '@/components/ui/ExportImportDropdown';

export default function AdminInventoryPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({});
  
  // Filters
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [statusCode, setStatusCode] = useState<string>('AVAILABLE');
  const [bagCode, setBagCode] = useState('');
  const [filterBloodType, setFilterBloodType] = useState<string>('ALL');
  const [filterFacility, setFilterFacility] = useState<string>('ALL');

  // Master Data for Selects
  const [facilities, setFacilities] = useState<any[]>([]);
  const [bloodTypes, setBloodTypes] = useState<any[]>([]);
  const [bloodComponents, setBloodComponents] = useState<any[]>([]);

  // Modal Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  
  // Import Modal State
  const [isImportOpen, setIsImportOpen] = useState(false);

  const generateBagCode = () => `BAG-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const [formData, setFormData] = useState({
    facility_id: '',
    blood_type_id: '',
    component_id: '1',
    bag_code: generateBagCode(),
    volume_ml: '350',
    collection_date: format(new Date(), 'yyyy-MM-dd'),
    expiry_date: format(new Date(Date.now() + 35 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
  });

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({
      facility_id: '',
      blood_type_id: '',
      component_id: bloodComponents.length > 0 ? bloodComponents[0].component_id.toString() : '9',
      bag_code: generateBagCode(),
      volume_ml: '350',
      collection_date: format(new Date(), 'yyyy-MM-dd'),
      expiry_date: format(new Date(Date.now() + 35 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: any) => {
    console.log("handleOpenEditModal item:", item);
    setEditingItem(item);
    setFormData({
      facility_id: item.facility_id?.toString() || '',
      blood_type_id: item.blood_type_id?.toString() || '',
      component_id: item.component_id?.toString() || (bloodComponents.length > 0 ? bloodComponents[0].component_id.toString() : '9'),
      bag_code: item.bag_code,
      volume_ml: item.volume_ml?.toString() || '350',
      collection_date: format(new Date(item.collection_date), 'yyyy-MM-dd'),
      expiry_date: format(new Date(item.expiry_date), 'yyyy-MM-dd')
    });
    setIsModalOpen(true);
  };

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    fetchData();
  }, [page, pageSize, statusCode, bagCode, filterBloodType, filterFacility]);

  const fetchMasterData = async () => {
    try {
      const [facRes, btRes, compRes] = await Promise.all([
        adminMasterDataService.getFacilities({ limit: 100 }),
        adminMasterDataService.getBloodTypes({ limit: 100 }),
        adminMasterDataService.getBloodComponents()
      ]);
      if (facRes) setFacilities(Array.isArray(facRes.data) ? facRes.data : (Array.isArray(facRes) ? facRes : []));
      if (btRes) setBloodTypes(Array.isArray(btRes.data) ? btRes.data : (Array.isArray(btRes) ? btRes : []));
      if (compRes) setBloodComponents(Array.isArray(compRes.data) ? compRes.data : (Array.isArray(compRes) ? compRes : []));
    } catch (error) {
      console.error('Failed to load master data');
    }
  };

  const handleSearch = (val: string) => {
    setBagCode(val);
    setPage(1);
  };

  const handleStatusChange = (val: string | null) => {
    setStatusCode(val || 'AVAILABLE');
    setPage(1);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await adminInventoryService.getInventoryList({
        page,
        limit: pageSize,
        status_code: statusCode === 'ALL' ? undefined : statusCode,
        bag_code: bagCode || undefined,
        blood_type_id: filterBloodType === 'ALL' ? undefined : filterBloodType,
        facility_id: filterFacility === 'ALL' ? undefined : filterFacility
      });
      if (res) {
        setData(Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []));
        setMeta((res as any).meta || {});
      }
    } catch (error) {
      toast.error('Lỗi khi tải dữ liệu kho máu');
    } finally {
      setLoading(false);
    }
  };

  const handleDiscard = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn tiêu hủy túi máu này? Hành động này không thể hoàn tác.')) return;
    
    try {
      await adminInventoryService.discardBlood(id, 'Tiêu hủy thủ công');
      toast.success('Đã tiêu hủy túi máu');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Tiêu hủy thất bại');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        facility_id: Number(formData.facility_id),
        donor_user_id: 1, // Placeholder
        blood_type_id: Number(formData.blood_type_id),
        component_id: Number(formData.component_id),
        bag_code: formData.bag_code,
        volume_ml: Number(formData.volume_ml),
        collection_date: new Date(formData.collection_date).toISOString(),
        expiry_date: new Date(formData.expiry_date).toISOString(),
      };

      if (editingItem) {
        await adminInventoryService.updateBlood(editingItem.inventory_id, payload);
        toast.success('Cập nhật thành công');
      } else {
        await adminInventoryService.receiveBlood(payload);
        toast.success('Nhập máu thành công');
      }
      setIsModalOpen(false);
      setEditingItem(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi cập nhật túi máu');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = async () => {
    try {
      await adminInventoryService.exportExcel({
        bag_code: bagCode || undefined,
        status_code: statusCode === 'ALL' ? undefined : statusCode,
        blood_type_id: filterBloodType === 'ALL' ? undefined : filterBloodType,
        facility_id: filterFacility === 'ALL' ? undefined : filterFacility
      });
    } catch (error) {
      toast.error('Lỗi khi xuất file Excel');
    }
  };

  const handleImport = async (file: File) => {
    try {
      const res = await adminInventoryService.importExcel(file);
      toast.success(res?.data?.message || 'Nhập dữ liệu thành công');
      setIsImportOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi nhập dữ liệu');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await adminInventoryService.downloadTemplate();
    } catch (error) {
      toast.error('Lỗi khi tải file mẫu');
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'bag_code',
      title: 'Mã túi máu',
      render: (item) => <span className="font-mono font-medium text-slate-800">{item.bag_code}</span>
    },
    {
      key: 'blood_type',
      title: 'Nhóm máu',
      render: (item) => <span className="text-blood font-bold">{item.blood_type?.blood_type_code}</span>
    },
    {
      key: 'component',
      title: 'Thành phần',
      render: (item) => <span className="text-slate-800">{item.component?.component_name}</span>
    },
    {
      key: 'volume',
      title: 'Thể tích (ml)',
      render: (item) => <span className="text-slate-800">{item.volume_ml}</span>
    },
    {
      key: 'dates',
      title: 'Ngày lấy / Hết hạn',
      render: (item) => (
        <div>
          <div className="text-slate-800">{format(new Date(item.collection_date), 'dd/MM/yyyy')}</div>
          <div className="text-xs text-slate-500">HSD: {format(new Date(item.expiry_date), 'dd/MM/yyyy')}</div>
        </div>
      )
    },
    {
      key: 'status',
      title: 'Trạng thái',
      render: (item) => {
        const isAvailable = item.status_code === 'AVAILABLE';
        const isAllocated = item.status_code === 'ALLOCATED';
        return (
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold
            ${isAvailable ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 
              isAllocated ? 'bg-blue-50 text-blue-600 border border-blue-200' : 
              'bg-slate-50 text-slate-500 border border-slate-200'}
          `}>
            {item.status_code}
          </span>
        );
      }
    }
  ];

  const getRowActions = (item: any): ActionItem[] => [
    {
      label: 'Chỉnh sửa',
      icon: <Edit className="w-4 h-4 text-blue-600" />,
      onClick: () => handleOpenEditModal(item)
    },
    {
      label: 'Tiêu hủy',
      icon: <Trash2 className="w-4 h-4 text-red-600" />,
      className: 'text-red-600',
      hidden: item.status_code !== 'AVAILABLE',
      onClick: () => handleDiscard(item.inventory_id)
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Kho máu</h1>
          <p className="text-sm text-slate-500 mt-1">{meta?.total || 0} túi máu trong hệ thống kho</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportImportDropdown 
            onImportClick={() => setIsImportOpen(true)}
            onExportClick={handleExport}
            onDownloadTemplateClick={handleDownloadTemplate}
          />
          <Button onClick={handleOpenAddModal} className="bg-blood hover:bg-blood-deep text-white shadow-none rounded-md px-4">
            <Plus className="w-4 h-4 mr-2" /> Nhập máu thủ công
          </Button>
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
          keyword={bagCode}
          itemName="túi máu"
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSearch={handleSearch}
          rowActions={getRowActions}
          toolbarFilters={
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-[160px]">
                <Select value={statusCode} onValueChange={handleStatusChange}>
                  <SelectTrigger className="bg-white border-slate-200 text-slate-800">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-slate-500" />
                      <SelectValue placeholder="Trạng thái">
                        {statusCode === 'ALL' ? 'Tất cả trạng thái' :
                         statusCode === 'AVAILABLE' ? 'Có sẵn' :
                         statusCode === 'ALLOCATED' ? 'Đã phân bổ' :
                         statusCode === 'DISCARDED' ? 'Đã hủy' : 'Trạng thái'}
                      </SelectValue>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                    <SelectItem value="AVAILABLE">Có sẵn</SelectItem>
                    <SelectItem value="ALLOCATED">Đã phân bổ</SelectItem>
                    <SelectItem value="DISCARDED">Đã hủy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[160px]">
                <SearchableSelect
                  value={filterBloodType}
                  onValueChange={v => { setFilterBloodType(v); setPage(1); }}
                  options={[
                    { value: 'ALL', label: 'Tất cả nhóm máu' },
                    ...bloodTypes.map(bt => ({ value: bt.blood_type_id.toString(), label: bt.blood_type_code }))
                  ]}
                  triggerClassName="bg-white border-slate-200 text-slate-800"
                  placeholder="Nhóm máu"
                />
              </div>
              <div className="w-[200px]">
                <SearchableSelect
                  value={filterFacility}
                  onValueChange={v => { setFilterFacility(v); setPage(1); }}
                  options={[
                    { value: 'ALL', label: 'Tất cả cơ sở' },
                    ...facilities.map(f => ({ value: f.facility_id.toString(), label: f.facility_name }))
                  ]}
                  triggerClassName="bg-white border-slate-200 text-slate-800"
                  placeholder="Cơ sở"
                />
              </div>
            </div>
          }
        />
      </div>

      <BaseModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        title={editingItem ? "Chỉnh sửa túi máu" : "Nhập máu thủ công vào kho"}
        size="4xl"
        hideFooter
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nhóm máu</label>
              <SearchableSelect
                value={formData.blood_type_id}
                onValueChange={v => setFormData({...formData, blood_type_id: v})}
                options={bloodTypes.map(bt => ({ value: bt.blood_type_id.toString(), label: bt.blood_type_code }))}
                placeholder="Chọn nhóm máu"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Thành phần máu</label>
              <SearchableSelect
                value={formData.component_id}
                onValueChange={v => setFormData({...formData, component_id: v})}
                options={bloodComponents.map(c => ({ value: c.component_id.toString(), label: c.component_name }))}
                placeholder="Chọn thành phần"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Thể tích (ml)</label>
              <Input type="number" value={formData.volume_ml} onChange={e => setFormData({...formData, volume_ml: e.target.value})} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cơ sở thu nhận</label>
              <SearchableSelect
                value={formData.facility_id}
                onValueChange={v => setFormData({...formData, facility_id: v})}
                options={facilities.map(f => ({ value: f.facility_id.toString(), label: f.facility_name }))}
                placeholder="Chọn cơ sở"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ngày lấy</label>
              <Input type="date" value={formData.collection_date} onChange={e => setFormData({...formData, collection_date: e.target.value})} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ngày hết hạn</label>
              <Input type="date" value={formData.expiry_date} onChange={e => setFormData({...formData, expiry_date: e.target.value})} required />
            </div>
          </div>
          
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {editingItem ? 'Lưu thay đổi' : 'Lưu vào kho'}
            </Button>
          </div>
        </form>
      </BaseModal>

      <ExcelImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Nhập dữ liệu Kho máu"
        onImport={handleImport}
        onDownloadTemplate={handleDownloadTemplate}
      />
    </div>
  );
}
