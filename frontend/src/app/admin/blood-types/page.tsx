'use client';
import { useEffect, useState } from 'react';
import { adminMasterDataService } from '@/lib/services/admin-master-data';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Plus, Edit } from 'lucide-react';
import { DataTable, Column, ActionItem } from '@/components/ui/DataTable';
import { BaseModal } from '@/components/ui/BaseModal';
import { Input } from '@/components/ui/input';

export default function AdminBloodTypesPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({});
  
  // DataTable state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [keyword, setKeyword] = useState('');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    blood_type_code: '',
    description: '',
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
      const res = await adminMasterDataService.getBloodTypes({ page, limit: pageSize, search: keyword });
      if (res) {
        setData(Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []));
        setMeta((res as any).meta || {});
      }
    } catch (error) {
      toast.error('Lỗi khi tải danh sách nhóm máu');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({ blood_type_code: '', description: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      blood_type_code: item.blood_type_code || '',
      description: item.description || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await adminMasterDataService.updateBloodType(editingItem.blood_type_id, formData);
        toast.success('Cập nhật nhóm máu thành công');
      } else {
        await adminMasterDataService.createBloodType(formData);
        toast.success('Thêm nhóm máu thành công');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Thao tác thất bại');
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'blood_type_code',
      title: 'Mã nhóm máu',
      render: (item) => <span className="font-bold text-blood text-lg">{item.blood_type_code}</span>
    },
    {
      key: 'description',
      title: 'Mô tả chi tiết',
      render: (item) => <span className="text-slate-600">{item.description || '-'}</span>
    }
  ];

  const getRowActions = (item: any): ActionItem[] => [
    {
      label: 'Chỉnh sửa',
      icon: <Edit className="w-4 h-4 text-blue-600" />,
      onClick: () => handleOpenEdit(item)
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Quản lý Nhóm máu</h1>
        <Button onClick={handleOpenCreate} className="bg-blood hover:bg-blood-deep text-white shadow-md">
          <Plus className="w-4 h-4 mr-2" /> Thêm nhóm máu
        </Button>
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
          itemName="nhóm máu"
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSearch={handleSearch}
          rowActions={getRowActions}
        />
      </div>

      <BaseModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        title={editingItem ? "Chỉnh sửa nhóm máu" : "Thêm nhóm máu mới"}
        size="md"
        hideFooter
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mã nhóm máu (VD: A+, O-)</label>
            <Input 
              type="text" 
              value={formData.blood_type_code} 
              onChange={e => setFormData({...formData, blood_type_code: e.target.value})} 
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả (không bắt buộc)</label>
            <Input 
              type="text" 
              value={formData.description} 
              onChange={e => setFormData({...formData, description: e.target.value})} 
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button type="submit" className="bg-blood hover:bg-blood-deep text-white">
              {editingItem ? 'Lưu thay đổi' : 'Thêm mới'}
            </Button>
          </div>
        </form>
      </BaseModal>
    </div>
  );
}
