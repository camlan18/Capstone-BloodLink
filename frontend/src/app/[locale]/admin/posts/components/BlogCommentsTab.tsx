import { useEffect, useState } from 'react';
import { adminBlogService } from '@/lib/services/admin-blog';
import { toast } from 'sonner';
import { Check, X, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { DataTable, Column, ActionItem } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/button';
import { BaseModal } from '@/components/ui/BaseModal';
import { blogService } from '@/lib/services/blog';

export default function BlogCommentsTab() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({});
  
  // DataTable state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<'ALL' | 'PENDING' | 'APPROVED'>('PENDING');

  // Post Detail Modal
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailPost, setDetailPost] = useState<any | null>(null);

  useEffect(() => {
    fetchData();
  }, [page, pageSize, keyword, status]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await adminBlogService.getAdminComments({ page, limit: pageSize, status });
      if (res) {
        setData(Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []));
        setMeta((res as any).meta || {});
      }
    } catch (error) {
      toast.error('Lỗi khi tải bình luận chờ duyệt');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (val: string) => {
    setKeyword(val);
    setPage(1);
  };

  const handleApprove = async (id: number, isApproved: boolean) => {
    try {
      await adminBlogService.approveComment(id, isApproved);
      toast.success(isApproved ? 'Đã duyệt bình luận' : 'Đã hủy duyệt bình luận');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi thao tác');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa vĩnh viễn bình luận này?')) return;
    try {
      await adminBlogService.deleteComment(id);
      toast.success('Đã xóa bình luận');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi xóa bình luận');
    }
  };

  const handleOpenPostDetail = async (slug: string) => {
    try {
      const res = await blogService.getPostBySlug(slug);
      if (res && res.data) {
        setDetailPost(res.data);
        setIsDetailOpen(true);
      }
    } catch (e) {
      toast.error('Không thể tải chi tiết bài viết');
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'user',
      title: 'Người đăng',
      render: (comment) => (
        <div>
          <div className="font-medium text-slate-900">{comment.user ? comment.user.full_name : (comment.guest_name || 'Khách')}</div>
          {comment.user && <div className="text-xs text-slate-500">{comment.user.email}</div>}
        </div>
      )
    },
    {
      key: 'content',
      title: 'Nội dung',
      render: (comment) => <span className="text-slate-700 whitespace-normal min-w-[250px] block">{comment.content}</span>
    },
    {
      key: 'post',
      title: 'Bài viết',
      render: (comment) => (
        <div 
          className="text-xs text-blood font-medium line-clamp-2 cursor-pointer hover:underline max-w-[200px]"
          onClick={() => comment.post?.slug && handleOpenPostDetail(comment.post.slug)}
        >
          {comment.post?.title}
        </div>
      )
    },
    {
      key: 'status',
      title: 'Trạng thái',
      render: (comment) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold
          ${comment.is_approved ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}
        `}>
          {comment.is_approved ? 'Đã duyệt' : 'Chờ duyệt'}
        </span>
      )
    },
    {
      key: 'created_at',
      title: 'Ngày gửi',
      render: (comment) => <span className="text-slate-500 text-sm">{format(new Date(comment.created_at), 'dd/MM/yyyy HH:mm')}</span>
    }
  ];

  const getRowActions = (comment: any): ActionItem[] => {
    const actions: ActionItem[] = [];
    if (comment.is_approved) {
      actions.push({
        label: 'Hủy duyệt',
        icon: <X className="w-4 h-4 text-amber-600" />,
        onClick: () => handleApprove(comment.comment_id, false)
      });
    } else {
      actions.push({
        label: 'Duyệt',
        icon: <Check className="w-4 h-4 text-emerald-600" />,
        onClick: () => handleApprove(comment.comment_id, true)
      });
    }
    
    actions.push({
      label: 'Xóa vĩnh viễn',
      icon: <Trash2 className="w-4 h-4 text-red-600" />,
      className: 'text-red-600 hover:text-red-700 hover:bg-red-50',
      onClick: () => handleDelete(comment.comment_id)
    });

    return actions;
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex gap-2">
        <Button 
          variant={status === 'ALL' ? 'default' : 'outline'}
          className={status === 'ALL' ? 'bg-slate-800 hover:bg-slate-900 text-white' : ''}
          onClick={() => { setStatus('ALL'); setPage(1); }}
        >
          Tất cả
        </Button>
        <Button 
          variant={status === 'PENDING' ? 'default' : 'outline'} 
          className={status === 'PENDING' ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}
          onClick={() => { setStatus('PENDING'); setPage(1); }}
        >
          Chờ duyệt
        </Button>
        <Button 
          variant={status === 'APPROVED' ? 'default' : 'outline'}
          className={status === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
          onClick={() => { setStatus('APPROVED'); setPage(1); }}
        >
          Đã duyệt
        </Button>
      </div>

      <DataTable
        data={data}
        columns={columns}
        totalRecords={meta?.total || 0}
        loading={loading}
        page={page}
        pageSize={pageSize}
        keyword={keyword}
        itemName="bình luận"
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSearch={handleSearch}
        rowActions={getRowActions}
      />

      {/* DETAIL MODAL */}
      <BaseModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        title="Chi tiết Bài viết"
        size="4xl"
        hideFooter
      >
        {detailPost && (
          <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
            <div className="border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2 mb-3 text-sm">
                <span className="bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded uppercase text-[10px] tracking-wider">
                  {detailPost.category?.category_name || 'Blog'}
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-500">{format(new Date(detailPost.created_at), 'dd/MM/yyyy HH:mm')}</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-500">{detailPost.view_count} lượt xem</span>
              </div>
              <h1 className="text-3xl font-bold text-slate-900 leading-tight mb-4">
                {detailPost.title}
              </h1>
              {detailPost.summary && (
                <p className="text-lg text-slate-600 italic border-l-4 border-slate-300 pl-4 mb-4">
                  {detailPost.summary}
                </p>
              )}
            </div>

            {detailPost.thumbnail_url && (
              <div className="w-full h-[400px] rounded-xl overflow-hidden relative mb-6 bg-slate-100">
                <img src={detailPost.thumbnail_url} alt="thumbnail" className="w-full h-full object-contain" />
              </div>
            )}

            <div className="prose prose-slate max-w-none mb-10" dangerouslySetInnerHTML={{ __html: detailPost.content_html || '' }} />

            <div className="pt-6 border-t border-slate-100 flex justify-end">
              <Button onClick={() => setIsDetailOpen(false)} variant="outline">Đóng lại</Button>
            </div>
          </div>
        )}
      </BaseModal>
    </div>
  );
}
