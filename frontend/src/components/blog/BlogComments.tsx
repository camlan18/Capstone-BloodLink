'use client';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/stores';
import { blogService } from '@/lib/services/blog';
import { BlogComment } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { MessageSquare, Send, User, CornerDownRight } from 'lucide-react';
import { toast } from 'sonner';

interface BlogCommentsProps {
  postId: number;
}

export function BlogComments({ postId }: BlogCommentsProps) {
  const { user, isAuthenticated } = useAuthStore();
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [content, setContent] = useState('');
  const [guestName, setGuestName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reply states
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [replyGuestName, setReplyGuestName] = useState('');

  const fetchComments = async () => {
    try {
      const res = await blogService.getComments(postId);
      if (res && res.data) {
        setComments(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch comments', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent, parentId?: number) => {
    e.preventDefault();
    const commentContent = parentId ? replyContent : content;
    const name = parentId ? replyGuestName : guestName;

    if (!commentContent.trim()) {
      toast.error('Vui lòng nhập nội dung bình luận');
      return;
    }

    if (!isAuthenticated && !name.trim()) {
      toast.error('Vui lòng nhập tên của bạn');
      return;
    }

    try {
      setSubmitting(true);
      await blogService.addComment(postId, commentContent, isAuthenticated ? undefined : name, parentId);
      toast.success('Bình luận của bạn đã được đăng thành công!');
      
      // Reset forms
      if (parentId) {
        setReplyingTo(null);
        setReplyContent('');
        setReplyGuestName('');
      } else {
        setContent('');
        setGuestName('');
      }
      
      fetchComments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi gửi bình luận');
    } finally {
      setSubmitting(false);
    }
  };

  const renderComment = (comment: BlogComment, isReply = false) => {
    return (
      <div key={comment.comment_id} className={`flex gap-4 ${isReply ? 'mt-4 ml-12' : 'mt-6'}`}>
        <div className="w-10 h-10 shrink-0 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 shadow-inner">
          {comment.user?.avatar_url ? (
            <img src={comment.user.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <User className="w-5 h-5 text-slate-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="bg-slate-50 p-4 rounded-2xl rounded-tl-sm border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="font-bold text-navy text-sm">
                  {comment.user?.full_name || comment.guest_name || 'Khách'}
                </span>
                {!comment.user_id && (
                  <span className="ml-2 text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded-sm">Guest</span>
                )}
              </div>
              <span className="text-xs text-slate-400 font-medium">
                {new Date(comment.created_at).toLocaleDateString('vi-VN', { year: 'numeric', month: 'short', day: 'numeric' })}
              </span>
            </div>
            <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">{comment.content}</p>
          </div>
          
          {!isReply && (
            <div className="mt-2 ml-2">
              <button 
                onClick={() => setReplyingTo(replyingTo === comment.comment_id ? null : comment.comment_id)}
                className="text-xs font-semibold text-slate-500 hover:text-blood transition-colors flex items-center gap-1"
              >
                <CornerDownRight className="w-3 h-3" />
                Trả lời
              </button>
            </div>
          )}

          {/* Reply Form */}
          {replyingTo === comment.comment_id && (
            <div className="mt-4 mb-2 bg-white p-4 rounded-xl border border-blood/10 shadow-lg shadow-blood/5">
              <form onSubmit={(e) => handleSubmit(e, comment.comment_id)} className="space-y-3">
                {!isAuthenticated && (
                  <Input 
                    placeholder="Tên của bạn *" 
                    value={replyGuestName}
                    onChange={(e) => setReplyGuestName(e.target.value)}
                    className="h-10 text-sm bg-slate-50/50"
                  />
                )}
                <Textarea 
                  placeholder={`Trả lời ${comment.user?.full_name || comment.guest_name || 'khách'}...`}
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  className="min-h-[80px] text-sm resize-none bg-slate-50/50"
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setReplyingTo(null)} className="h-8">Hủy</Button>
                  <Button type="submit" size="sm" disabled={submitting} className="h-8 bg-blood hover:bg-blood-dark text-white">
                    Gửi phản hồi
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Render Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="space-y-2">
              {comment.replies.map(reply => renderComment(reply, true))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="mt-16 pt-10 border-t border-slate-100">
      <h3 className="text-2xl font-extrabold text-navy mb-8 flex items-center gap-3">
        <MessageSquare className="w-6 h-6 text-blood" />
        Bình luận ({comments.length})
      </h3>

      {/* Main Comment Form */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 mb-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blood/5 rounded-full filter blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <form onSubmit={(e) => handleSubmit(e)} className="space-y-4 relative z-10">
          {!isAuthenticated && (
            <div>
              <Input 
                placeholder="Nhập tên của bạn *" 
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="max-w-xs h-11 border-slate-200 focus:border-blood focus:ring-blood/20"
              />
            </div>
          )}
          <Textarea 
            placeholder="Chia sẻ suy nghĩ của bạn về bài viết này..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[120px] resize-y border-slate-200 focus:border-blood focus:ring-blood/20 rounded-xl p-4 text-base"
          />
          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={submitting}
              className="h-11 px-6 bg-navy hover:bg-navy/90 text-white rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 font-medium"
            >
              {submitting ? 'Đang gửi...' : (
                <>
                  <Send className="w-4 h-4" />
                  Gửi bình luận
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Comments List */}
      <div className="space-y-2">
        {loading ? (
          <div className="animate-pulse flex gap-4 mt-6">
            <div className="w-10 h-10 rounded-full bg-slate-200"></div>
            <div className="flex-1 space-y-3">
              <div className="h-4 bg-slate-200 rounded w-1/4"></div>
              <div className="h-16 bg-slate-200 rounded w-full"></div>
            </div>
          </div>
        ) : comments.length > 0 ? (
          comments.map(comment => renderComment(comment))
        ) : (
          <div className="text-center py-12 px-4 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-navy font-semibold mb-1">Chưa có bình luận nào</h4>
            <p className="text-slate-500 text-sm">Hãy là người đầu tiên chia sẻ suy nghĩ của bạn!</p>
          </div>
        )}
      </div>
    </div>
  );
}
