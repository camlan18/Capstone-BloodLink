'use client';
import { useEffect, useState } from 'react';
import { adminSettingsService } from '@/lib/services/admin-settings';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Settings, Plus, Trash2, Edit2, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { DataTable, Column, ActionItem } from '@/components/ui/DataTable';
import { BaseModal } from '@/components/ui/BaseModal';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({});
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [keyword, setKeyword] = useState('');
  
  // Create/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Detail Modal
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const [formData, setFormData] = useState({
    setting_key: '',
    setting_value: '',
    description: ''
  });

  useEffect(() => {
    fetchData();
  }, [page, pageSize, keyword]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await adminSettingsService.getSettings({ page, limit: pageSize, search: keyword || undefined });
      if (res) {
        setData(Array.isArray(res.data) ? res.data : []);
        setMeta((res as any).meta || {});
      }
    } catch (error) {
      toast.error('Lỗi khi tải danh sách cấu hình');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('CẢNH BÁO: Xóa cấu hình hệ thống có thể gây ảnh hưởng nghiêm trọng tới hoạt động của ứng dụng. Bạn chắc chắn muốn xóa?')) return;
    try {
      await adminSettingsService.deleteSetting(id);
      toast.success('Xóa cấu hình thành công');
      fetchData();
    } catch (error) {
      toast.error('Lỗi khi xóa cấu hình');
    }
  };

  const handleEdit = (item: any) => {
    setFormData({
      setting_key: item.setting_key,
      setting_value: item.setting_value,
      description: item.description || ''
    });
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setFormData({ setting_key: '', setting_value: '', description: '' });
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.setting_key || !formData.setting_value) {
      toast.error('Vui lòng nhập Key và Value');
      return;
    }
    
    try {
      setSaving(true);
      await adminSettingsService.upsertSetting(formData);
      toast.success(isEditMode ? 'Cập nhật cấu hình thành công' : 'Thêm cấu hình thành công');
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi lưu cấu hình');
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'key',
      title: 'Setting Key',
      render: (item) => (
        <span className="font-mono text-sm font-semibold text-blood bg-red-50 px-2 py-1 rounded">
          {item.setting_key}
        </span>
      )
    },
    {
      key: 'value',
      title: 'Value',
      render: (item) => (
        <div className="max-w-xs font-mono text-xs text-slate-700 bg-slate-100 p-2 rounded line-clamp-2">
          {item.setting_value}
        </div>
      )
    },
    {
      key: 'desc',
      title: 'Mô tả',
      render: (item) => (
        <div className="text-sm text-slate-500 max-w-sm line-clamp-2">
          {item.description || '-'}
        </div>
      )
    },
    {
      key: 'updated_at',
      title: 'Lần cập nhật cuối',
      render: (item) => (
        <div className="text-sm text-slate-600">
          {format(new Date(item.updated_at), 'dd/MM/yyyy HH:mm')}
        </div>
      )
    }
  ];

  const getRowActions = (item: any): ActionItem[] => [
    {
      label: 'Xem chi tiết',
      icon: <Eye className="w-4 h-4 text-emerald-600" />,
      onClick: () => { setSelectedItem(item); setIsDetailOpen(true); }
    },
    {
      label: 'Sửa',
      icon: <Edit2 className="w-4 h-4 text-blue-600" />,
      onClick: () => handleEdit(item)
    },
    {
      label: 'Xóa',
      icon: <Trash2 className="w-4 h-4 text-red-600" />,
      onClick: () => handleDelete(item.setting_id)
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-slate-700" /> Cài đặt Hệ thống
          </h1>
          <p className="text-sm text-slate-500 mt-1">Quản lý các biến số cấu hình quan trọng của hệ thống</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleCreate} className="bg-slate-800 hover:bg-slate-900 text-white shadow-none rounded-md px-4">
            <Plus className="w-4 h-4 mr-2" /> Thêm biến cấu hình
          </Button>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
        <strong>Lưu ý:</strong> Việc thay đổi các khóa cài đặt (Setting Key) hoặc giá trị (Value) không đúng có thể làm ứng dụng gặp lỗi. Vui lòng chỉ thay đổi khi bạn nắm rõ tác dụng của biến hệ thống đó.
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
          itemName="cấu hình"
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSearch={v => {setKeyword(v); setPage(1);}}
          rowActions={getRowActions}
        />
      </div>

      <BaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditMode ? "Cập nhật cấu hình" : "Thêm cấu hình hệ thống"}
        size="lg"
        hideFooter
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Setting Key <span className="text-red-500">*</span>
            </label>
            <Input 
              value={formData.setting_key} 
              onChange={e => setFormData({...formData, setting_key: e.target.value.toUpperCase().replace(/\s+/g, '_')})} 
              placeholder="VD: MAINTENANCE_MODE, MAX_FILE_SIZE..."
              required
              className="font-mono"
              disabled={isEditMode}
            />
            {isEditMode && <p className="text-xs text-slate-500 mt-1">Không thể thay đổi Key khi cập nhật. Nếu muốn đổi, hãy xóa và tạo mới.</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Setting Value <span className="text-red-500">*</span>
            </label>
            <Textarea 
              value={formData.setting_value} 
              onChange={e => setFormData({...formData, setting_value: e.target.value})} 
              placeholder="Nhập giá trị cho biến này..."
              rows={4}
              required
              className="font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả chi tiết</label>
            <Input 
              value={formData.description} 
              onChange={e => setFormData({...formData, description: e.target.value})} 
              placeholder="Tác dụng của biến này là gì?"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Hủy bỏ</Button>
            <Button type="submit" className="bg-slate-800 hover:bg-slate-900 text-white" disabled={saving}>
              {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
            </Button>
          </div>
        </form>
      </BaseModal>

      <BaseModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Chi tiết cấu hình hệ thống"
        size="4xl"
        hideFooter
      >
        {selectedItem && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold font-mono text-blood bg-red-50 inline-block px-3 py-1.5 rounded-lg border border-red-100">
                {selectedItem.setting_key}
              </h2>
              <div className="text-sm text-slate-500 mt-2">
                Cập nhật lần cuối: {format(new Date(selectedItem.updated_at), 'dd/MM/yyyy HH:mm:ss')}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Giá trị (Value)</div>
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 font-mono text-slate-800 whitespace-pre-wrap">
                  {selectedItem.setting_value}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Mô tả</div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 text-slate-700">
                  {selectedItem.description || 'Chưa có mô tả cho cấu hình này.'}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Đóng</Button>
            </div>
          </div>
        )}
      </BaseModal>
    </div>
  );
}
