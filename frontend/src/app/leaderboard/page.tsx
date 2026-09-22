'use client';
import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Search, ChevronRight, ChevronLeft } from 'lucide-react';
import apiClient from '@/lib/services/apiClient';

export default function LeaderboardPage() {
  const [data, setData] = useState<any[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('donations');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchLeaderboard(meta?.page || 1, searchTerm, sortBy, sortOrder);
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [meta?.page, searchTerm, sortBy, sortOrder]);

  const fetchLeaderboard = async (page: number, search: string, sort: string, order: string) => {
    try {
      setLoading(true);
      const res = await apiClient.get<any, any>(`/donor/public/leaderboard`, {
        params: { page, limit: 10, search, sortBy: sort, sortOrder: order }
      });
      if (res && res.data && Array.isArray(res.data)) {
        setData(res.data);
        if (res.meta) setMeta(res.meta);
      } else if (res && res.data && res.data.data) {
        setData(res.data.data);
        if (res.data.meta) setMeta(res.data.meta);
      } else if (res && Array.isArray(res)) {
        setData(res);
      }
    } catch (error) {
      console.error('Lỗi khi tải bảng xếp hạng:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';
  };

  return (
    <MainLayout>
      <div className="bg-slate-50 min-h-screen pb-24 font-sans">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          
          <div className="mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
              Bảng Xếp Hạng Người Hiến Máu
            </h1>
            <p className="text-slate-500 text-base">
              Vinh danh những cá nhân xuất sắc đã đồng hành cùng cộng đồng.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            
            {/* Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
              <div className="relative w-full md:w-[400px]">
                <input
                  type="text"
                  placeholder="Tìm kiếm thành viên..."
                  className="pl-10 pr-4 py-2 w-full border-b border-slate-300 bg-transparent text-base focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-400"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setMeta({...meta, page: 1}); }}
                />
                <Search className="w-5 h-5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center border-b border-slate-300">
                  <select 
                    className="bg-transparent font-medium text-slate-700 text-base outline-none cursor-pointer py-2 pr-6 hover:text-slate-900"
                    value={sortBy}
                    onChange={(e) => { setSortBy(e.target.value); setMeta({...meta, page: 1}); }}
                  >
                    <option value="donations">Sắp xếp: Lượt hiến máu</option>
                    <option value="volume">Sắp xếp: Tổng thể tích</option>
                    <option value="badges">Sắp xếp: Số huy hiệu</option>
                  </select>
                </div>
                <div className="flex items-center border-b border-slate-300">
                  <select 
                    className="bg-transparent font-medium text-slate-700 text-base outline-none cursor-pointer py-2 pr-6 hover:text-slate-900"
                    value={sortOrder}
                    onChange={(e) => { setSortOrder(e.target.value); setMeta({...meta, page: 1}); }}
                  >
                    <option value="desc">Từ cao đến thấp</option>
                    <option value="asc">Từ thấp đến cao</option>
                  </select>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : data.length === 0 ? (
              <div className="text-center py-20 text-slate-500">
                Chưa có dữ liệu.
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <div className="min-w-[800px]">
                  
                  {/* Table Headers */}
                  <div className="flex items-center py-4 px-2 border-t border-slate-100 text-sm font-semibold text-slate-500">
                    <div className="w-8 shrink-0"></div>
                    <div className="w-16 shrink-0 text-center">Hạng</div>
                    <div className="flex-1 px-4">Thành viên</div>
                    <div className="w-32 shrink-0 text-center">Nhóm máu</div>
                    <div className="w-32 shrink-0 text-center">Huy hiệu</div>
                    <div className="w-32 shrink-0 text-center">Thể tích (ml)</div>
                    <div className="w-32 shrink-0 text-center text-blue-600">Lượt hiến</div>
                  </div>

                  {/* List Rows */}
                  <div className="flex flex-col">
                    {data.map((user, index) => {
                      const rank = (meta.page - 1) * meta.limit + index + 1;

                      return (
                        <div key={user.userId} className="flex items-center py-6 px-2 border-t border-slate-200 hover:bg-slate-50 transition-colors group cursor-pointer">
                          <div className="w-8 shrink-0 flex justify-center text-slate-300 group-hover:text-slate-500 transition-colors">
                            <ChevronRight className="w-4 h-4" />
                          </div>
                          <div className="w-16 shrink-0 text-center font-bold text-slate-800 text-lg">
                            {rank}
                          </div>
                          
                          <div className="flex-1 flex items-center gap-6 px-4">
                            <div className="w-12 h-12 bg-white border border-slate-200 rounded overflow-hidden flex items-center justify-center font-bold text-slate-400 shrink-0 shadow-sm">
                              {user.avatar ? (
                                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover p-1" />
                              ) : (
                                <span>{getInitials(user.name)}</span>
                              )}
                            </div>
                            <span className="font-semibold text-slate-800 text-base">{user.name}</span>
                          </div>
                          
                          <div className="w-32 shrink-0 text-center text-slate-600 font-medium">
                            {user.bloodType || '-'}
                          </div>
                          
                          <div className="w-32 shrink-0 text-center text-slate-600 font-medium">
                            {user.badgeCount}
                          </div>
                          
                          <div className="w-32 shrink-0 text-center text-slate-600 font-medium">
                            {user.totalVolume}
                          </div>
                          
                          <div className="w-32 shrink-0 text-center text-blue-600 font-bold text-lg">
                            {user.totalDonations}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Pagination */}
                {meta.totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-200 pt-6 mt-2">
                    <span className="text-sm text-slate-500">
                      Hiển thị {(meta.page - 1) * meta.limit + 1} đến {Math.min(meta.page * meta.limit, meta.total)} trong {meta.total} kết quả
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        disabled={meta.page <= 1}
                        onClick={() => setMeta({ ...meta, page: meta.page - 1 })}
                        className="p-2 rounded hover:bg-slate-100 disabled:opacity-50 text-slate-600 transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <span className="text-sm font-medium text-slate-700 px-2">
                        {meta.page} / {meta.totalPages}
                      </span>
                      <button
                        disabled={meta.page >= meta.totalPages}
                        onClick={() => setMeta({ ...meta, page: meta.page + 1 })}
                        className="p-2 rounded hover:bg-slate-100 disabled:opacity-50 text-slate-600 transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
