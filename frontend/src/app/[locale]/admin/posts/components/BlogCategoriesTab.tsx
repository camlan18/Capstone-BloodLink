import { useState, useEffect } from 'react';
import { adminBlogService } from '@/lib/services/admin-blog';
import { blogService } from '@/lib/services/blog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { DataTable, Column, ActionItem } from '@/components/ui/DataTable';
import { BaseModal } from '@/components/ui/BaseModal';
import { Input } from '@/components/ui/input';

export default function BlogCategoriesTab() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  
  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    category_name: '',
    slug: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await blogService.getCategories();
      if (res) {
        setData(Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []));
      }
    } catch (error) {
      toast.error('Lỗi khi tải danh sách danh mục');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({ category_name: '', slug: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      category_name: item.category_name || '',
      slug: item.slug || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (item: any) => {
    if (!confirm('Bạn có chắc chắn muốn xóa danh mục này? Không thể xóa nếu danh mục đang có bài viết.')) return;
    try {
      await adminBlogService.deleteCategory(item.blog_category_id);
      toast.success('Đã xóa danh mục thành công');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi xóa danh mục');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await adminBlogService.updateCategory(editingItem.blog_category_id, formData);
        toast.success('Cập nhật danh mục thành công');
      } else {
        await adminBlogService.createCategory(formData);
        toast.success('Thêm danh mục thành công');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Thao tác thất bại');
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'category_name',
      title: 'Tên danh mục',
      render: (item) => <span className="font-semibold text-slate-800">{item.category_name}</span>
    },
    {
      key: 'slug',
      title: 'Đường dẫn (Slug)',
      render: (item) => <span className="text-slate-500 italic">/{item.slug}</span>
    }
  ];

  const getRowActions = (item: any): ActionItem[] => [
    {
      label: 'Chỉnh sửa',
      icon: <Edit className="w-4 h-4 text-blue-600" />,
      onClick: () => handleOpenEdit(item)
    },
    {
      label: 'Xóa',
      icon: <Trash2 className="w-4 h-4 text-red-600" />,
      className: 'text-red-600 hover:text-red-700 hover:bg-red-50',
      onClick: () => handleDelete(item)
    }
  ];

  return (
    <div className="p-6">
      <DataTable
        data={data}
        columns={columns}
        loading={loading}
        itemName="danh mục"
        rowActions={getRowActions}
        page={1}
        pageSize={data.length > 0 ? data.length : 10}
        totalRecords={data.length}
        keyword=""
        onPageChange={() => {}}
        onPageSizeChange={() => {}}
        onSearch={() => {}}
        toolbarFilters={
          <Button onClick={handleOpenCreate} className="bg-blood hover:bg-blood-deep text-white">
            <Plus className="w-4 h-4 mr-2" /> Thêm danh mục
          </Button>
        }
      />

      <BaseModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        title={editingItem ? "Chỉnh sửa danh mục" : "Thêm danh mục mới"}
        size="md"
        hideFooter
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tên danh mục <span className="text-red-500">*</span></label>
            <Input 
              type="text" 
              value={formData.category_name} 
              onChange={e => setFormData({...formData, category_name: e.target.value})} 
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Đường dẫn (Slug) <span className="text-red-500">*</span></label>
            <Input 
              type="text" 
              value={formData.slug} 
              onChange={e => setFormData({...formData, slug: e.target.value})} 
              placeholder="VD: tin-tuc"
              required
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
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
