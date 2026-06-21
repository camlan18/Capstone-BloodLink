'use client';

import { useState, useEffect } from 'react';
import { notificationService } from '@/lib/services/notification';
import { Bell, CheckCircle, Search, Clock, MailOpen, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function UserNotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await notificationService.getMyNotifications({
        page,
        limit,
        search,
      });
      if (res && res.data) {
        let filteredData = res.data;
        if (filter === 'unread') filteredData = filteredData.filter((n: any) => !n.is_read);
        if (filter === 'read') filteredData = filteredData.filter((n: any) => n.is_read);
        
        setNotifications(filteredData);
        if ((res as any).meta) {
          setTotalPages((res as any).meta.totalPages);
        }
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      toast.error('Không thể tải thông báo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [page, search, filter]);

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(notifications.map(n => 
        n.notification_id === id ? { ...n, is_read: true, read_at: new Date() } : n
      ));
    } catch (error) {
      toast.error('Có lỗi xảy ra khi cập nhật');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      toast.success('Đã đánh dấu tất cả đã đọc');
      fetchNotifications();
    } catch (error) {
      toast.error('Có lỗi xảy ra');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-navy flex items-center gap-3">
            <Bell className="w-8 h-8 text-blood" />
            Thông báo của tôi
          </h1>
          <p className="text-slate-500 mt-2">Quản lý và theo dõi các thông báo từ hệ thống</p>
        </div>
        <button
          onClick={handleMarkAllAsRead}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-medium text-sm"
        >
          <CheckCircle className="w-4 h-4" />
          Đánh dấu tất cả đã đọc
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => { setFilter('all'); setPage(1); }}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${filter === 'all' ? 'bg-white text-navy shadow-sm' : 'text-slate-500 hover:text-navy'}`}
            >
              Tất cả
            </button>
            <button
              onClick={() => { setFilter('unread'); setPage(1); }}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${filter === 'unread' ? 'bg-white text-blood shadow-sm' : 'text-slate-500 hover:text-navy'}`}
            >
              Chưa đọc
            </button>
            <button
              onClick={() => { setFilter('read'); setPage(1); }}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${filter === 'read' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-navy'}`}
            >
              Đã đọc
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Tìm kiếm thông báo..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blood/20 focus:border-blood outline-none transition-all text-sm"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-slate-500">Đang tải thông báo...</div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-500">Không có thông báo nào</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div 
                key={notif.notification_id}
                onClick={() => !notif.is_read && handleMarkAsRead(notif.notification_id)}
                className={`p-5 rounded-xl border transition-all cursor-pointer ${
                  notif.is_read 
                    ? 'bg-white border-slate-100 hover:border-slate-200 opacity-70' 
                    : 'bg-red-50/30 border-red-100 hover:bg-red-50/50'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`mt-1 flex-shrink-0 ${notif.is_read ? 'text-slate-400' : 'text-blood'}`}>
                    {notif.is_read ? <MailOpen className="w-5 h-5" /> : <Mail className="w-5 h-5 fill-blood/10" />}
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-base mb-1 ${notif.is_read ? 'font-medium text-slate-700' : 'font-bold text-navy'}`}>
                      {notif.title}
                    </h3>
                    <p className={`text-sm mb-3 ${notif.is_read ? 'text-slate-500' : 'text-slate-700'}`}>
                      {notif.message}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(notif.created_at).toLocaleString('vi-VN')}
                    </div>
                  </div>
                  {!notif.is_read && (
                    <div className="flex-shrink-0 w-2.5 h-2.5 bg-blood rounded-full mt-2 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8 pt-6 border-t border-slate-100">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-slate-50 transition-colors text-sm font-medium text-slate-600"
            >
              Trước
            </button>
            <span className="text-sm text-slate-600 font-medium px-4">
              Trang {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-slate-50 transition-colors text-sm font-medium text-slate-600"
            >
              Sau
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
