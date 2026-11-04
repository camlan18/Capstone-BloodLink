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

export default function IntervalRulesTab() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({});
  
  const [bloodComponents, setBloodComponents] = useState<any[]>([]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [keyword, setKeyword] = useState('');
  const [sortBy, setSortBy] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({ component_id: '', min_interval_days: 84, max_donations_per_year: 4, description: '', is_active: true });
  const [submitting, setSubmitting] = useState(false);

  const fetchOptions = async () => {
    try {
      const compRes = await adminMasterDataService.getBloodComponentsPaginated({ limit: 100 });
      if (compRes) setBloodComponents(Array.isArray(compRes.data) ? compRes.data : Array.isArray(compRes) ? compRes : []);
    } catch (e) {}
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await adminMasterDataService.getDonationIntervalRules({ page, limit: pageSize, search: keyword });
      if (res && res.data) {
        setData(res.data);
        setMeta((res as any).meta || {});
      } else if (Array.isArray(res)) {
        setData(res);
      }
    } catch (error) {
      toast.error('Lỗi khi tải dữ liệu quy tắc hiến máu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    const delay = setTimeout(fetchData, 300);
    return () => clearTimeout(delay);
  }, [page, pageSize, keyword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.component_id || !formData.min_interval_days) {
      return toast.error('Vui lòng chọn thành phần máu và khoảng cách tối thiểu');
    }
    
    if (formData.min_interval_days > 365) {
      return toast.error('Khoảng cách tối thiểu không được vượt quá 365 ngày (1 năm)');
    }

    const maxCalculated = Math.floor(365 / formData.min_interval_days);
    if (formData.max_donations_per_year > maxCalculated) {
      return toast.error(`Với khoảng cách ${formData.min_interval_days} ngày, số lần hiến tối đa/năm chỉ có thể là ${maxCalculated}`);
    }

    setSubmitting(true);
    try {
      if (selectedItem) {
        await adminMasterDataService.updateDonationIntervalRule(selectedItem.rule_id, formData);
        toast.success('Cập nhật thành công');
      } else {
        await adminMasterDataService.createDonationIntervalRule(formData);
        toast.success('Thêm quy tắc mới thành công');
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
    if (!confirm(`Bạn có chắc chắn muốn ${actionText} quy tắc này?`)) return;
    try {
      await adminMasterDataService.updateDonationIntervalRule(item.rule_id, {
        component_id: item.component_id,
        min_interval_days: item.min_interval_days,
        is_active: newStatus
      });
      toast.success(`Thành công`);
      fetchData();
    } catch (error) {
      toast.error('Lỗi khi thao tác');
    }
  };

  const columns: Column<any>[] = [
    { 
      key: 'component_id', 
      label: 'Thành phần máu',
      render: (item) => <span className="font-semibold text-blood">{item.component?.component_name || `ID: ${item.component_id}`}</span>
    },
    { 
      key: 'min_interval_days', 
      label: 'Khoảng cách hiến (Ngày)',
      sortable: true,
      render: (item) => <span className="font-medium text-slate-800">{item.min_interval_days} ngày</span>
    },
    { 
      key: 'max_donations_per_year', 
      label: 'Tối đa lần/năm',
      render: (item) => item.max_donations_per_year ? <span className="font-medium text-slate-800">{item.max_donations_per_year} lần</span> : '-'
    },
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
      label: 'Sửa thông tin',
      icon: <Edit className="w-4 h-4 text-blue-500" />,
      onClick: () => { 
        setSelectedItem(item); 
        setFormData({
          component_id: item.component_id,
          min_interval_days: item.min_interval_days,
          max_donations_per_year: item.max_donations_per_year || '',
          description: item.description || '',
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

  const compOptions = bloodComponents.map(c => ({ value: String(c.component_id), label: c.component_name }));

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
          <Button onClick={() => { setSelectedItem(null); setFormData({ component_id: '', min_interval_days: 84, max_donations_per_year: 4, description: '', is_active: true }); setIsModalOpen(true); }} className="bg-blood hover:bg-blood-deep">
            <Plus className="w-4 h-4 mr-2" /> Thêm quy tắc
          </Button>
        }
      />

      <BaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedItem ? "Sửa quy tắc hiến máu" : "Thêm quy tắc hiến máu"}
        size="md"
        hideFooter
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Thành phần máu <span className="text-red-500">*</span></label>
            <SearchableSelect 
              options={compOptions}
              value={formData.component_id ? String(formData.component_id) : ''}
              onValueChange={(v) => setFormData({...formData, component_id: Number(v)})}
              placeholder="Chọn thành phần máu..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Khoảng cách tối thiểu (Ngày) <span className="text-red-500">*</span></label>
              <Input 
                type="number"
                min={1}
                max={365}
                value={formData.min_interval_days}
                onChange={e => {
                  const val = Number(e.target.value);
                  setFormData({...formData, min_interval_days: val});
                }}
              />
              <p className="text-[10px] text-slate-500 mt-1">Tối đa 365 ngày</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Số lần tối đa/năm</label>
              <Input 
                type="number"
                min={1}
                max={formData.min_interval_days ? Math.floor(365 / formData.min_interval_days) : undefined}
                value={formData.max_donations_per_year}
                onChange={e => setFormData({...formData, max_donations_per_year: Number(e.target.value)})}
              />
              <p className="text-[10px] text-slate-500 mt-1">
                {formData.min_interval_days 
                  ? `Hợp lệ: 1 - ${Math.floor(365 / formData.min_interval_days)} lần` 
                  : 'Phụ thuộc khoảng cách tối thiểu'}
              </p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú / Mô tả y tế</label>
            <textarea 
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blood focus:outline-none focus:ring-1 focus:ring-blood resize-none"
              rows={3}
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              placeholder="Nhập ghi chú..."
            />
          </div>
          {selectedItem && (
            <div className="flex items-center gap-2 pt-2">
              <input type="checkbox" id="rule_active" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="rounded text-blood focus:ring-blood" />
              <label htmlFor="rule_active" className="text-sm font-medium text-slate-700">Đang hoạt động</label>
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
        title="Chi tiết quy tắc khoảng cách hiến"
        size="lg"
        hideFooter
      >
        {selectedItem && (
          <div className="space-y-4 text-sm">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-4">
              <div>
                <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Thành phần máu áp dụng</span>
                <span className="font-bold text-blood text-xl">{selectedItem.component?.component_name}</span>
                <span className="text-slate-500 ml-2">({selectedItem.component?.component_code})</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded border border-slate-200">
                  <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Khoảng cách an toàn tối thiểu</span>
                  <span className="font-bold text-slate-800 text-xl">{selectedItem.min_interval_days}</span>
                  <span className="text-slate-500 ml-1">ngày / lần</span>
                </div>
                <div className="bg-white p-3 rounded border border-slate-200">
                  <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Giới hạn trong 1 năm</span>
                  <span className="font-bold text-slate-800 text-xl">{selectedItem.max_donations_per_year || 'Không giới hạn'}</span>
                  {selectedItem.max_donations_per_year && <span className="text-slate-500 ml-1">lần</span>}
                </div>
              </div>
              <div>
                <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Trạng thái</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-block ${selectedItem.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                  {selectedItem.is_active ? 'Hoạt động' : 'Đã vô hiệu hóa'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Ghi chú y khoa</span>
                <span className="font-medium text-slate-800">{selectedItem.description || '-'}</span>
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
