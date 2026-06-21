import { useEffect, useState } from 'react';
import { adminBlogService } from '@/lib/services/admin-blog';
import { blogService } from '@/lib/services/blog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Plus, Edit, Eye, Trash2, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { DataTable, Column, ActionItem } from '@/components/ui/DataTable';
import { BaseModal } from '@/components/ui/BaseModal';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';
import Image from 'next/image';
import { uploadImage } from '@/lib/services/apiClient';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

const generateSlug = (text: string) => {
  return text.toString().toLowerCase()
    .replace(/á|à|ả|ạ|ã|ă|ắ|ằ|ẳ|ẵ|ặ|â|ấ|ầ|ẩ|ẫ|ậ/gi, 'a')
    .replace(/é|è|ẻ|ẽ|ẹ|ê|ế|ề|ể|ễ|ệ/gi, 'e')
    .replace(/i|í|ì|ỉ|ĩ|ị/gi, 'i')
    .replace(/ó|ò|ỏ|õ|ọ|ô|ố|ồ|ổ|ỗ|ộ|ơ|ớ|ờ|ở|ỡ|ợ/gi, 'o')
    .replace(/ú|ù|ủ|ũ|ụ|ư|ứ|ừ|ử|ữ|ự/gi, 'u')
    .replace(/ý|ỳ|ỷ|ỹ|ỵ/gi, 'y')
    .replace(/đ/gi, 'd')
    .replace(/\s+/g, '-') 
    .replace(/[^\w\-]+/g, '') 
    .replace(/\-\-+/g, '-') 
    .replace(/^-+/, '') 
    .replace(/-+$/, '');
};

export default function BlogPostsTab() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({});
  const [categories, setCategories] = useState<any[]>([]);
  
  // DataTable state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [keyword, setKeyword] = useState('');

  // Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  
  // Detail Modal
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    category_id: '',
    content: '',
    thumbnail_url: '',
    summary: '',
    is_published: 'true',
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchData();
  }, [page, pageSize, keyword]);

  const handleSearch = (val: string) => {
    setKeyword(val);
    setPage(1);
  };

  const fetchCategories = async () => {
    try {
      const res = await blogService.getCategories();
      if (res) {
        const cats = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
        setCategories(cats);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await adminBlogService.getPosts({ page, limit: pageSize, search: keyword });
      if (res) {
        setData(Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []));
        setMeta((res as any).meta || {});
      }
    } catch (error) {
      toast.error('Lỗi khi tải danh sách bài viết');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = (item: any) => {
    setDetailItem(item);
    setIsDetailOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({ 
      title: '', slug: '', category_id: categories[0]?.blog_category_id?.toString() || '', 
      content: '', thumbnail_url: '', summary: '', is_published: 'true' 
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      title: item.title || '',
      slug: item.slug || '',
      category_id: item.blog_category_id?.toString() || '',
      content: item.content_html || '',
      thumbnail_url: item.thumbnail_url || '',
      summary: item.summary || '',
      is_published: item.is_published ? 'true' : 'false',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (item: any) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bài viết này vĩnh viễn?')) return;
    try {
      await adminBlogService.deletePost(item.post_id);
      toast.success('Xóa bài viết thành công');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Xóa bài viết thất bại');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        title: formData.title,
        slug: formData.slug,
        content: formData.content,
        summary: formData.summary,
        thumbnail_url: formData.thumbnail_url,
        blog_category_id: Number(formData.category_id),
        is_published: formData.is_published === 'true',
      };

      if (editingItem) {
        await adminBlogService.updatePost(editingItem.post_id, payload);
        toast.success('Cập nhật bài viết thành công');
      } else {
        await adminBlogService.createPost(payload);
        toast.success('Thêm bài viết thành công');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Thao tác thất bại');
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'title',
      title: 'Tiêu đề',
      render: (item) => (
        <div 
          className="flex items-start gap-3 cursor-pointer group"
          onClick={() => handleOpenDetail(item)}
        >
          {item.thumbnail_url ? (
            <div className="w-16 h-12 relative flex-shrink-0 rounded-md overflow-hidden bg-slate-100">
              <img src={item.thumbnail_url} alt="" className="object-cover w-full h-full group-hover:opacity-80 transition-opacity" />
            </div>
          ) : (
            <div className="w-16 h-12 bg-slate-100 rounded-md flex-shrink-0 flex items-center justify-center text-slate-400 text-xs group-hover:bg-slate-200 transition-colors">No img</div>
          )}
          <div>
            <div className="font-bold text-slate-800 line-clamp-1 max-w-[250px] group-hover:text-blood transition-colors">{item.title}</div>
            <div className="text-xs text-slate-500 line-clamp-1 max-w-[250px]">{item.summary || `/${item.slug}`}</div>
          </div>
        </div>
      )
    },
    {
      key: 'category',
      title: 'Chuyên mục',
      render: (item) => <span className="text-slate-600 font-medium">{item.category?.category_name || '-'}</span>
    },
    {
      key: 'author',
      title: 'Tác giả',
      render: (item) => <span className="text-slate-600">{item.author?.full_name || 'Admin'}</span>
    },
    {
      key: 'views',
      title: 'Lượt xem',
      render: (item) => <span className="text-slate-600 font-semibold">{item.view_count || 0}</span>
    },
    {
      key: 'status',
      title: 'Trạng thái',
      render: (item) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold
          ${item.is_published ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-50 text-slate-500 border border-slate-200'}
        `}>
          {item.is_published ? 'Đã xuất bản' : 'Bản nháp'}
        </span>
      )
    },
    {
      key: 'created_at',
      title: 'Ngày đăng',
      render: (item) => <span className="text-slate-500 text-sm">{format(new Date(item.created_at), 'dd/MM/yyyy')}</span>
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
      label: 'Xóa bài viết',
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
        totalRecords={meta?.total || 0}
        loading={loading}
        page={page}
        pageSize={pageSize}
        keyword={keyword}
        itemName="bài viết"
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSearch={handleSearch}
        rowActions={getRowActions}
        toolbarFilters={
          <Button onClick={handleOpenCreate} className="bg-blood hover:bg-blood-deep text-white shadow-md">
            <Plus className="w-4 h-4 mr-2" /> Viết bài mới
          </Button>
        }
      />

      <BaseModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        title={editingItem ? "Chỉnh sửa bài viết" : "Thêm bài viết mới"}
        size="5xl"
        hideFooter
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Tiêu đề bài viết <span className="text-red-500">*</span></label>
              <Input 
                type="text" 
                value={formData.title} 
                onChange={e => {
                  const newTitle = e.target.value;
                  setFormData({
                    ...formData, 
                    title: newTitle,
                    slug: !editingItem ? generateSlug(newTitle) : formData.slug
                  });
                }} 
                required 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Slug (Đường dẫn) <span className="text-red-500">*</span></label>
              <Input type="text" value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value})} required />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ảnh thu nhỏ</label>
              <div className="flex items-center gap-2">
                <Input 
                  type="text" 
                  value={formData.thumbnail_url} 
                  onChange={e => setFormData({...formData, thumbnail_url: e.target.value})} 
                  placeholder="Hoặc nhập URL..." 
                  className="flex-1"
                />
                <div className="relative">
                  <Button type="button" variant="outline" className="relative overflow-hidden cursor-pointer whitespace-nowrap">
                    <Upload className="w-4 h-4 mr-2 inline-block" /> Tải lên
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const toastId = toast.loading('Đang tải ảnh lên...');
                          try {
                            const url = await uploadImage(file);
                            setFormData(prev => ({...prev, thumbnail_url: url}));
                            toast.success('Tải ảnh thành công', { id: toastId });
                          } catch (err) {
                            toast.error('Lỗi khi tải ảnh', { id: toastId });
                          }
                        }
                      }} 
                    />
                  </Button>
                </div>
              </div>
              {formData.thumbnail_url && (
                <div className="mt-2 w-32 h-20 rounded-md overflow-hidden bg-slate-100 border border-slate-200 shadow-sm relative group">
                  <img src={formData.thumbnail_url} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center transition-all cursor-pointer" onClick={() => setFormData({...formData, thumbnail_url: ''})}>
                    <Trash2 className="w-5 h-5 text-white" />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Chuyên mục <span className="text-red-500">*</span></label>
              <Select value={formData.category_id} onValueChange={v => setFormData({...formData, category_id: v || ''})}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn chuyên mục">
                    {categories?.find(c => c.blog_category_id?.toString() === formData.category_id)?.category_name || 'Chọn chuyên mục'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(categories || []).map(cat => (
                    <SelectItem key={cat.blog_category_id} value={cat.blog_category_id?.toString()}>
                      {cat.category_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Trạng thái</label>
              <Select value={formData.is_published} onValueChange={v => setFormData({...formData, is_published: v || ''})}>
                <SelectTrigger>
                  <SelectValue placeholder="Trạng thái">
                    {formData.is_published === 'true' ? 'Xuất bản' : formData.is_published === 'false' ? 'Bản nháp' : 'Trạng thái'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Xuất bản</SelectItem>
                  <SelectItem value="false">Bản nháp</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Tóm tắt ngắn (Summary)</label>
              <Input type="text" value={formData.summary} onChange={e => setFormData({...formData, summary: e.target.value})} placeholder="Viết 1-2 câu tóm tắt bài viết..." />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Nội dung chi tiết <span className="text-red-500">*</span></label>
              <div className="bg-white border rounded-md">
                <ReactQuill 
                  theme="snow"
                  value={formData.content} 
                  onChange={val => setFormData({...formData, content: val})} 
                  className="h-[400px] mb-12"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button type="submit" className="bg-blood hover:bg-blood-deep text-white">
              {editingItem ? 'Lưu thay đổi' : 'Đăng bài'}
            </Button>
          </div>
        </form>
      </BaseModal>

      {/* DETAIL MODAL */}
      <BaseModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        title="Chi tiết Bài viết"
        size="4xl"
        hideFooter
      >
        {detailItem && (
          <div className="space-y-6">
            <div className="border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2 mb-3 text-sm">
                <span className="bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded uppercase text-[10px] tracking-wider">
                  {detailItem.category?.category_name}
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-500">{format(new Date(detailItem.created_at), 'dd/MM/yyyy HH:mm')}</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-500">{detailItem.view_count} lượt xem</span>
              </div>
              <h1 className="text-3xl font-bold text-slate-900 leading-tight mb-4">
                {detailItem.title}
              </h1>
              {detailItem.summary && (
                <p className="text-lg text-slate-600 italic border-l-4 border-slate-300 pl-4 mb-4">
                  {detailItem.summary}
                </p>
              )}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                  {detailItem.author?.avatar_url ? (
                    <img src={detailItem.author.avatar_url} alt="author" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold">
                      {detailItem.author?.full_name?.charAt(0) || 'A'}
                    </div>
                  )}
                </div>
                <div className="text-sm">
                  <div className="font-semibold text-slate-800">{detailItem.author?.full_name || 'Quản trị viên'}</div>
                  <div className="text-slate-500">Tác giả</div>
                </div>
              </div>
            </div>

            {detailItem.thumbnail_url && (
              <div className="w-full h-[400px] rounded-xl overflow-hidden relative mb-6 bg-slate-100">
                <img src={detailItem.thumbnail_url} alt="thumbnail" className="w-full h-full object-contain" />
              </div>
            )}

            <div className="prose prose-slate max-w-none mb-10" dangerouslySetInnerHTML={{ __html: detailItem.content_html || '' }} />

            <div className="pt-6 border-t border-slate-100 flex justify-end">
              <Button onClick={() => setIsDetailOpen(false)} variant="outline">Đóng lại</Button>
            </div>
          </div>
        )}
      </BaseModal>
    </div>
  );
}
