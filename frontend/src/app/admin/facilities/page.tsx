'use client';
import { useEffect, useState } from 'react';
import { adminMasterDataService } from '@/lib/services/admin-master-data';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Plus, Edit, Eye, Loader2, PowerOff } from 'lucide-react';
import { DataTable, Column, ActionItem } from '@/components/ui/DataTable';
import { BaseModal } from '@/components/ui/BaseModal';
import { Input } from '@/components/ui/input';
import { ExportImportDropdown } from '@/components/ui/ExportImportDropdown';
import { ExcelImportModal } from '@/components/ui/ExcelImportModal';

export default function AdminFacilitiesPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({});
  
  // DataTable state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [keyword, setKeyword] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  
  // Detail Modal
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [formData, setFormData] = useState({
    facility_code: '',
    facility_name: '',
    short_name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    latitude: '',
    longitude: '',
    logo_url: '',
    province_id: '',
    district_id: '',
    ward_id: '',
    is_primary: false,
    is_active: true
  });

  useEffect(() => {
    fetchData();
  }, [page, pageSize, keyword]);

  const handleSearch = (val: string) => {
    setKeyword(val);
    setPage(1);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await adminMasterDataService.getFacilities({ page, limit: pageSize, search: keyword });
      if (res) {
        setData(Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []));
        setMeta((res as any).meta || {});
      }
    } catch (error) {
      toast.error('Lỗi khi tải danh sách cơ sở y tế');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = async (item: any) => {
    setIsDetailOpen(true);
    setDetailLoading(true);
    try {
      const res = await adminMasterDataService.getFacilityById(item.facility_id);
      setDetailItem(res.data || res);
    } catch (error) {
      toast.error('Lỗi khi lấy thông tin chi tiết');
      setIsDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      facility_code: '', facility_name: '', short_name: '', address: '', phone: '', email: '', website: '',
      latitude: '', longitude: '', logo_url: '', province_id: '', district_id: '', ward_id: '', is_primary: false, is_active: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      facility_code: item.facility_code || '',
      facility_name: item.facility_name || '',
      short_name: item.short_name || '',
      address: item.address || '',
      phone: item.phone || '',
      email: item.email || '',
      website: item.website || '',
      latitude: item.latitude?.toString() || '',
      longitude: item.longitude?.toString() || '',
      logo_url: item.logo_url || '',
      province_id: item.province_id?.toString() || '',
      district_id: item.district_id?.toString() || '',
      ward_id: item.ward_id?.toString() || '',
      is_primary: item.is_primary || false,
      is_active: item.is_active !== false,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (item: any) => {
    if (!confirm('Bạn có chắc chắn muốn ngừng hoạt động cơ sở này?')) return;
    try {
      await adminMasterDataService.deleteFacility(item.facility_id);
      toast.success('Đã ngừng hoạt động cơ sở y tế');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi ngừng hoạt động');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        province_id: formData.province_id ? Number(formData.province_id) : undefined,
        district_id: formData.district_id ? Number(formData.district_id) : undefined,
        ward_id: formData.ward_id ? Number(formData.ward_id) : undefined,
        latitude: formData.latitude ? Number(formData.latitude) : undefined,
        longitude: formData.longitude ? Number(formData.longitude) : undefined,
      };

      // Remove empty strings
      Object.keys(payload).forEach(key => {
        if ((payload as any)[key] === '') delete (payload as any)[key];
      });

      if (editingItem) {
        await adminMasterDataService.updateFacility(editingItem.facility_id, payload);
        toast.success('Cập nhật cơ sở y tế thành công');
      } else {
        await adminMasterDataService.createFacility(payload);
        toast.success('Thêm cơ sở y tế thành công');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Thao tác thất bại');
    }
  };

  const handleExport = async () => {
    try {
      await adminMasterDataService.exportFacilitiesExcel({ search: keyword || undefined });
    } catch (error) {
      toast.error('Lỗi khi xuất file Excel');
    }
  };

  const handleImport = async (file: File) => {
    try {
      const res = await adminMasterDataService.importFacilitiesExcel(file);
      toast.success(res?.data?.message || 'Nhập dữ liệu thành công');
      setIsImportOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi nhập dữ liệu');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await adminMasterDataService.downloadFacilitiesTemplate();
    } catch (error) {
      toast.error('Lỗi khi tải file mẫu');
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'facility_code',
      title: 'Mã cơ sở',
      render: (item) => <span className="font-semibold text-blood">{item.facility_code}</span>
    },
    {
      key: 'facility_name',
      title: 'Tên Cơ sở / Bệnh viện',
      render: (item) => (
        <div>
          <div className="font-bold text-slate-800 flex items-center gap-2">
            {item.facility_name}
            {item.is_primary && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">CHÍNH</span>}
          </div>
          <div className="text-xs text-slate-500">{item.short_name || 'Chưa cập nhật tên viết tắt'}</div>
        </div>
      )
    },
    {
      key: 'address',
      title: 'Địa chỉ',
      render: (item) => <span className="text-slate-600 block max-w-[250px] truncate" title={item.address}>{item.address || '-'}</span>
    },
    {
      key: 'phone',
      title: 'Liên hệ',
      render: (item) => (
        <div className="text-sm text-slate-600">
          <div>{item.phone || '-'}</div>
          <div className="text-xs">{item.email || ''}</div>
        </div>
      )
    },
    {
      key: 'status',
      title: 'Trạng thái',
      render: (item) => (
        <span className={`px-2 py-1 rounded text-xs font-semibold ${item.is_active ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
          {item.is_active ? 'Hoạt động' : 'Đã đóng'}
        </span>
      )
    }
  ];

  const getRowActions = (item: any): ActionItem[] => [
    {
      label: 'Xem chi tiết',
      icon: <Eye className="w-4 h-4 text-slate-500" />,
      onClick: () => handleOpenDetail(item)
    },
    {
      label: 'Chỉnh sửa',
      icon: <Edit className="w-4 h-4 text-blue-600" />,
      onClick: () => handleOpenEdit(item)
    },
    {
      label: 'Ngừng hoạt động',
      icon: <PowerOff className="w-4 h-4 text-red-600" />,
      className: 'text-red-600',
      onClick: () => handleDelete(item)
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Quản lý Cơ sở y tế</h1>
          <p className="text-sm text-slate-500 mt-1">{meta?.total || 0} cơ sở trong hệ thống</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportImportDropdown 
            onImportClick={() => setIsImportOpen(true)}
            onExportClick={handleExport}
            onDownloadTemplateClick={handleDownloadTemplate}
          />
          <Button onClick={handleOpenCreate} className="bg-blood hover:bg-blood-deep text-white shadow-none rounded-md px-4">
            <Plus className="w-4 h-4 mr-2" /> Thêm cơ sở
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
          itemName="cơ sở"
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSearch={handleSearch}
          rowActions={getRowActions}
        />
      </div>

      <BaseModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        title={editingItem ? "Chỉnh sửa cơ sở y tế" : "Thêm cơ sở mới"}
        size="4xl"
        hideFooter
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mã cơ sở (Để trống sẽ tự sinh)</label>
              <Input type="text" value={formData.facility_code} onChange={e => setFormData({...formData, facility_code: e.target.value})} placeholder="VD: BVCR" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tên viết tắt</label>
              <Input type="text" value={formData.short_name} onChange={e => setFormData({...formData, short_name: e.target.value})} placeholder="VD: Chợ Rẫy" />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Tên Cơ sở / Bệnh viện <span className="text-red-500">*</span></label>
              <Input type="text" value={formData.facility_name} onChange={e => setFormData({...formData, facility_name: e.target.value})} required />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Địa chỉ chi tiết <span className="text-red-500">*</span></label>
              <Input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} required />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Số điện thoại</label>
              <Input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email liên hệ</label>
              <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
              <Input type="text" value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})} placeholder="https://" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Logo URL</label>
              <Input type="text" value={formData.logo_url} onChange={e => setFormData({...formData, logo_url: e.target.value})} placeholder="https://" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Vĩ độ (Latitude)</label>
              <Input type="number" step="any" value={formData.latitude} onChange={e => setFormData({...formData, latitude: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Kinh độ (Longitude)</label>
              <Input type="number" step="any" value={formData.longitude} onChange={e => setFormData({...formData, longitude: e.target.value})} />
            </div>

            <div className="col-span-2 flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                <input type="checkbox" checked={formData.is_primary} onChange={e => setFormData({...formData, is_primary: e.target.checked})} className="rounded border-slate-300 text-blood focus:ring-blood" />
                Đánh dấu là Cơ sở quản lý chính
              </label>

              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-600" />
                Đang hoạt động
              </label>
            </div>
          </div>

          <div className="pt-6 flex justify-end gap-3 border-t border-slate-100 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button type="submit" className="bg-blood hover:bg-blood-deep text-white">
              {editingItem ? 'Lưu thay đổi' : 'Thêm mới'}
            </Button>
          </div>
        </form>
      </BaseModal>

      <BaseModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        title="Chi tiết Cơ sở y tế"
        size="lg"
        hideFooter
      >
        {detailLoading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="w-8 h-8 animate-spin text-blood" />
          </div>
        ) : detailItem ? (
          <div className="space-y-4 text-sm text-slate-800">
            <div className="grid grid-cols-2 gap-y-4 gap-x-6 p-4 bg-slate-50 rounded-lg border border-slate-100">
              <div className="col-span-2">
                <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Tên cơ sở</span>
                <span className="font-bold text-lg text-slate-900 flex items-center gap-2">
                  {detailItem.facility_name}
                  {detailItem.is_primary && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Cơ sở chính</span>}
                </span>
              </div>
              
              <div>
                <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Mã cơ sở</span>
                <span className="font-semibold text-blood">{detailItem.facility_code}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Tên viết tắt</span>
                <span className="font-medium">{detailItem.short_name || '-'}</span>
              </div>

              <div className="col-span-2">
                <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Địa chỉ</span>
                <span className="font-medium">{detailItem.address}</span>
              </div>

              <div>
                <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Số điện thoại</span>
                <span className="font-medium">{detailItem.phone || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Email</span>
                <span className="font-medium">{detailItem.email || '-'}</span>
              </div>

              <div>
                <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Website</span>
                <span className="font-medium">{detailItem.website ? <a href={detailItem.website} target="_blank" className="text-blue-600 hover:underline">{detailItem.website}</a> : '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Trạng thái</span>
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${detailItem.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {detailItem.is_active ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Tọa độ Bản đồ</span>
                <span className="font-medium text-xs text-slate-500">{detailItem.latitude && detailItem.longitude ? `${detailItem.latitude}, ${detailItem.longitude}` : 'Chưa cập nhật'}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setIsDetailOpen(false)} variant="outline">Đóng</Button>
            </div>
          </div>
        ) : null}
      </BaseModal>

      <ExcelImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Nhập dữ liệu Cơ sở y tế"
        onImport={handleImport}
        onDownloadTemplate={handleDownloadTemplate}
      />
    </div>
  );
}
