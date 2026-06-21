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

export default function BloodCompatibilityTab() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({});
  
  const [bloodTypes, setBloodTypes] = useState<any[]>([]);
  const [bloodComponents, setBloodComponents] = useState<any[]>([]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [keyword, setKeyword] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({ component_id: '', donor_blood_type_id: '', recipient_blood_type_id: '', recipient_blood_type_ids: [], is_compatible: true, notes: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchOptions = async () => {
    try {
      const [btRes, compRes] = await Promise.all([
        adminMasterDataService.getBloodTypes({ limit: 100 }),
        adminMasterDataService.getBloodComponentsPaginated({ limit: 100 })
      ]);
      if (btRes) setBloodTypes(Array.isArray(btRes.data) ? btRes.data : Array.isArray(btRes) ? btRes : []);
      if (compRes) setBloodComponents(Array.isArray(compRes.data) ? compRes.data : Array.isArray(compRes) ? compRes : []);
    } catch (e) {}
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await adminMasterDataService.getBloodCompatibilities({ page, limit: pageSize, search: keyword });
      if (res && (res as any).data) {
        setData((res as any).data);
        setMeta((res as any).meta || {});
      } else if (Array.isArray(res)) {
        setData(res);
      }
    } catch (error) {
      toast.error('Lỗi khi tải dữ liệu độ tương thích');
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
    if (!formData.component_id || !formData.donor_blood_type_id) {
      return toast.error('Vui lòng chọn đầy đủ Thành phần và Nhóm người hiến');
    }
    if (selectedItem && !formData.recipient_blood_type_id) {
      return toast.error('Vui lòng chọn Nhóm người nhận');
    }
    if (!selectedItem && (!formData.recipient_blood_type_ids || formData.recipient_blood_type_ids.length === 0)) {
      return toast.error('Vui lòng chọn ít nhất một Nhóm người nhận');
    }

    setSubmitting(true);
    try {
      if (selectedItem) {
        await adminMasterDataService.updateBloodCompatibility(selectedItem.compatibility_id, formData);
        toast.success('Cập nhật thành công');
      } else {
        await Promise.all(
          formData.recipient_blood_type_ids.map((recipientId: number) => 
            adminMasterDataService.createBloodCompatibility({
              component_id: formData.component_id,
              donor_blood_type_id: formData.donor_blood_type_id,
              recipient_blood_type_id: recipientId,
              is_compatible: formData.is_compatible,
              notes: formData.notes
            })
          )
        );
        toast.success(`Đã thêm ${formData.recipient_blood_type_ids.length} quy tắc tương thích thành công`);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa quy tắc này? Hành động này không thể hoàn tác.')) return;
    try {
      await adminMasterDataService.deleteBloodCompatibility(id);
      toast.success('Xóa thành công');
      fetchData();
    } catch (error) {
      toast.error('Lỗi khi xóa');
    }
  };

  const columns: Column<any>[] = [
    { 
      key: 'component_id', 
      label: 'Thành phần máu',
      render: (item) => item.component?.component_name || `ID: ${item.component_id}`
    },
    { 
      key: 'donor_blood_type_id', 
      label: 'Nhóm người hiến',
      render: (item) => item.donor_blood_type ? <span className="font-semibold text-blood">{item.donor_blood_type.blood_type_code}</span> : item.donor_blood_type_id
    },
    { 
      key: 'recipient_blood_type_id', 
      label: 'Nhóm người nhận',
      render: (item) => item.recipient_blood_type ? <span className="font-semibold text-blue-600">{item.recipient_blood_type.blood_type_code}</span> : item.recipient_blood_type_id
    },
    { 
      key: 'is_compatible', 
      label: 'Cho phép truyền?',
      render: (item) => item.is_compatible ? <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-xs font-semibold">Tương thích</span> 
                           : <span className="text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-semibold">Chống chỉ định</span>
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
          donor_blood_type_id: item.donor_blood_type_id,
          recipient_blood_type_id: item.recipient_blood_type_id,
          recipient_blood_type_ids: [],
          is_compatible: item.is_compatible,
          notes: item.notes || ''
        });
        setIsModalOpen(true); 
      }
    },
    {
      label: 'Xóa',
      icon: <Trash2 className="w-4 h-4 text-red-500" />,
      onClick: () => handleDelete(item.compatibility_id)
    }
  ];

  const btOptions = bloodTypes.map(bt => ({ value: String(bt.blood_type_id), label: bt.blood_type_code }));
  const compOptions = bloodComponents.map(c => ({ value: String(c.component_id), label: c.component_name }));

  return (
    <div className="p-6">
      <DataTable 
        data={data}
        columns={columns}
        loading={loading}
        rowActions={getRowActions}
        page={page}
        pageSize={pageSize}
        totalRecords={meta.total || data.length}
        keyword={keyword}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSearch={(k) => { setKeyword(k); setPage(1); }}
        toolbarFilters={
          <Button onClick={() => { setSelectedItem(null); setFormData({ component_id: '', donor_blood_type_id: '', recipient_blood_type_id: '', recipient_blood_type_ids: [], is_compatible: true, notes: '' }); setIsModalOpen(true); }} className="bg-blood hover:bg-blood-deep">
            <Plus className="w-4 h-4 mr-2" /> Thêm quy tắc tương thích
          </Button>
        }
      />

      <BaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedItem ? "Sửa quy tắc tương thích" : "Thêm quy tắc tương thích"}
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Nhóm người hiến <span className="text-red-500">*</span></label>
              <SearchableSelect 
                options={btOptions}
                value={formData.donor_blood_type_id ? String(formData.donor_blood_type_id) : ''}
                onValueChange={(v) => setFormData({...formData, donor_blood_type_id: Number(v)})}
                placeholder="Chọn nhóm máu..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Nhóm người nhận <span className="text-red-500">*</span></label>
              {selectedItem ? (
                <SearchableSelect 
                  options={btOptions}
                  value={formData.recipient_blood_type_id ? String(formData.recipient_blood_type_id) : ''}
                  onValueChange={(v) => setFormData({...formData, recipient_blood_type_id: Number(v)})}
                  placeholder="Chọn nhóm máu..."
                />
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {bloodTypes.map(bt => {
                    const isChecked = formData.recipient_blood_type_ids?.includes(bt.blood_type_id);
                    return (
                      <label key={bt.blood_type_id} className={`flex items-center justify-center p-2 border rounded cursor-pointer transition-colors ${isChecked ? 'bg-blood/10 border-blood text-blood font-bold' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                        <input 
                          type="checkbox" 
                          className="hidden"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({...formData, recipient_blood_type_ids: [...(formData.recipient_blood_type_ids || []), bt.blood_type_id]});
                            } else {
                              setFormData({...formData, recipient_blood_type_ids: formData.recipient_blood_type_ids.filter((id: number) => id !== bt.blood_type_id)});
                            }
                          }}
                        />
                        {bt.blood_type_code}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input type="checkbox" id="comp_compat" checked={formData.is_compatible} onChange={e => setFormData({...formData, is_compatible: e.target.checked})} className="rounded text-blood focus:ring-blood" />
            <label htmlFor="comp_compat" className="text-sm font-medium text-slate-700">Tương thích (Cho phép truyền)</label>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú lâm sàng</label>
            <textarea 
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blood focus:outline-none focus:ring-1 focus:ring-blood resize-none"
              rows={3}
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
              placeholder="Nhập ghi chú..."
            />
          </div>
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
        title="Chi tiết độ tương thích"
        size="lg"
        hideFooter
      >
        {selectedItem && (
          <div className="space-y-4 text-sm">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-4">
              <div>
                <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Thành phần máu</span>
                <span className="font-medium text-slate-800 text-base">{selectedItem.component?.component_name} ({selectedItem.component?.component_code})</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded border border-slate-200">
                  <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Người hiến (Donor)</span>
                  <span className="font-bold text-blood text-xl">{selectedItem.donor_blood_type?.blood_type_code}</span>
                </div>
                <div className="bg-white p-3 rounded border border-slate-200">
                  <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Người nhận (Recipient)</span>
                  <span className="font-bold text-blue-600 text-xl">{selectedItem.recipient_blood_type?.blood_type_code}</span>
                </div>
              </div>
              <div>
                <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Chỉ định truyền máu</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-block ${selectedItem.is_compatible ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {selectedItem.is_compatible ? 'Cho phép truyền' : 'Chống chỉ định (Không được truyền)'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Ghi chú lâm sàng</span>
                <span className="font-medium text-slate-800">{selectedItem.notes || '-'}</span>
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
