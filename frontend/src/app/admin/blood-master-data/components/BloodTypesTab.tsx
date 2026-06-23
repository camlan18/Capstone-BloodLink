'use client';
import { useState, useEffect } from 'react';
import { adminMasterDataService } from '@/lib/services/admin-master-data';
import { DataTable, Column, ActionItem } from '@/components/ui/DataTable';
import { BaseModal } from '@/components/ui/BaseModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { toast } from 'sonner';
import { Loader2, Plus, Edit, Trash2, Eye } from 'lucide-react';

export default function BloodTypesTab() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({});
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [keyword, setKeyword] = useState('');
  const [sortBy, setSortBy] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({ blood_group: '', rh_factor: '+', display_order: 0, is_active: true });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await adminMasterDataService.getBloodTypes({ page, limit: pageSize, search: keyword });
      if (res && res.data) {
        setData(res.data);
        setMeta((res as any).meta || {});
      } else if (Array.isArray(res)) {
        setData(res);
      }
    } catch (error) {
      toast.error('Lỗi khi tải dữ liệu nhóm máu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(fetchData, 300);
    return () => clearTimeout(delay);
  }, [page, pageSize, keyword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.blood_group || !formData.rh_factor) {
      return toast.error('Vui lòng điền đủ thông tin');
    }
    setSubmitting(true);
    try {
      if (selectedItem) {
        await adminMasterDataService.updateBloodType(selectedItem.blood_type_id, formData);
        toast.success('Cập nhật nhóm máu thành công');
      } else {
        await adminMasterDataService.createBloodType(formData);
        toast.success('Thêm nhóm máu thành công');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (item: any) => {
    const newStatus = !item.is_active;
    const actionText = newStatus ? 'mở lại hoạt động' : 'vô hiệu hóa';
    if (!confirm(`Bạn có chắc chắn muốn ${actionText} nhóm máu này?`)) return;
    try {
      await adminMasterDataService.updateBloodType(item.blood_type_id, {
        blood_group: item.abo,
        rh_factor: item.rh_factor,
        is_active: newStatus 
      });
      toast.success(`Thành công`);
      fetchData();
    } catch (error) {
      toast.error('Lỗi khi thao tác');
    }
  };

  const columns: Column<any>[] = [
    { key: 'blood_type_code', label: 'Mã Hệ Thống', sortable: true },
    { key: 'abo', label: 'Nhóm ABO', sortable: true },
    { key: 'rh_factor', label: 'Yếu Tố Rh' },
    { key: 'display_order', label: 'Thứ tự', sortable: true },
    { 
      key: 'is_active', 
      label: 'Trạng Thái',
      render: (item) => item.is_active ? <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-xs font-semibold">Hoạt động</span> 
                           : <span className="text-slate-500 bg-slate-100 px-2 py-1 rounded text-xs font-semibold">Đã ẩn</span>
    }
  ];

  const getRowActions = (item: any): ActionItem[] => [
    {
      label: 'Xem chi tiết',
      icon: <Eye className="w-4 h-4 text-slate-500" />,
      onClick: () => { setSelectedItem(item); setIsDetailOpen(true); }
    },
    {
      label: 'Sửa nhóm máu',
      icon: <Edit className="w-4 h-4 text-blue-500" />,
      onClick: () => { 
        setSelectedItem(item); 
        setFormData({
          blood_group: item.abo,
          rh_factor: item.rh_factor,
          display_order: item.display_order,
          is_active: item.is_active
        });
        setIsModalOpen(true); 
      }
    },
    {
      label: item.is_active ? 'Vô hiệu hóa' : 'Mở lại hoạt động',
      icon: item.is_active ? <Trash2 className="w-4 h-4 text-red-500" /> : <Loader2 className="w-4 h-4 text-emerald-500" />,
      className: item.is_active ? 'text-red-500' : 'text-emerald-500',
      onClick: () => handleToggleStatus(item)
    }
  ];

  const sortedData = [...data].sort((a, b) => {
    if (!sortBy) return 0;
    let aVal = a[sortBy];
    let bVal = b[sortBy];
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="p-6">
      <DataTable 
        data={sortedData}
        columns={columns}
        loading={loading}
        rowActions={getRowActions}
        page={page}
        pageSize={pageSize}
        totalRecords={meta.total || data.length}
        keyword={keyword}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSearch={(k) => { setKeyword(k); setPage(1); }}
        onSort={(key, dir) => {
          setSortBy(key);
          setSortDirection(dir || 'asc');
        }}
        toolbarFilters={
          <Button onClick={() => { setSelectedItem(null); setFormData({ blood_group: '', rh_factor: '+', display_order: 0, is_active: true }); setIsModalOpen(true); }} className="bg-blood hover:bg-blood-deep">
            <Plus className="w-4 h-4 mr-2" /> Thêm nhóm máu
          </Button>
        }
      />

      <BaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedItem ? "Sửa nhóm máu" : "Thêm nhóm máu"}
        size="md"
        hideFooter
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nhóm ABO <span className="text-red-500">*</span></label>
            <SearchableSelect 
              options={[
                { value: 'A', label: 'Nhóm máu A' },
                { value: 'B', label: 'Nhóm máu B' },
                { value: 'AB', label: 'Nhóm máu AB' },
                { value: 'O', label: 'Nhóm máu O' },
              ]}
              value={formData.blood_group}
              onValueChange={(v) => setFormData({...formData, blood_group: v})}
              placeholder="Chọn nhóm ABO..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Yếu tố Rh <span className="text-red-500">*</span></label>
            <SearchableSelect 
              options={[
                { value: '+', label: 'Rh(D) Dương tính (+)' },
                { value: '-', label: 'Rh(D) Âm tính (-)' },
              ]}
              value={formData.rh_factor}
              onValueChange={(v) => setFormData({...formData, rh_factor: v})}
              placeholder="Chọn yếu tố Rh..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Thứ tự hiển thị</label>
            <Input 
              type="number" 
              value={formData.display_order} 
              onChange={e => setFormData({...formData, display_order: parseInt(e.target.value) || 0})}
            />
          </div>
          {selectedItem && (
            <div className="flex items-center gap-2">
              <input type="checkbox" id="bt_active" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="rounded text-blood focus:ring-blood" />
              <label htmlFor="bt_active" className="text-sm font-medium text-slate-700">Đang hoạt động</label>
            </div>
          )}
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {selectedItem ? "Cập nhật" : "Thêm mới"}
            </Button>
          </div>
        </form>
      </BaseModal>

      <BaseModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Chi tiết nhóm máu"
        size="lg"
        hideFooter
      >
        {selectedItem && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
              <div>
                <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Mã hệ thống</span>
                <span className="font-medium text-slate-800 text-base">{selectedItem.blood_type_code}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Nhóm ABO</span>
                <span className="font-medium text-slate-800 text-base">{selectedItem.abo}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Yếu tố Rh</span>
                <span className="font-medium text-slate-800 text-base">{selectedItem.rh_factor}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Trạng thái</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-block ${selectedItem.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                  {selectedItem.is_active ? 'Hoạt động' : 'Đã vô hiệu hóa'}
                </span>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={() => setIsDetailOpen(false)} variant="outline">Đóng</Button>
            </div>
          </div>
        )}
      </BaseModal>
    </div>
  );
}
