'use client';
import { useEffect, useState } from 'react';
import { adminNotificationsService } from '@/lib/services/admin-notifications';
import { adminUserService } from '@/lib/services/admin-users';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Bell, Plus, Trash2, Eye, Search, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { DataTable, Column, ActionItem } from '@/components/ui/DataTable';
import { BaseModal } from '@/components/ui/BaseModal';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AdminNotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({});
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [keyword, setKeyword] = useState('');
  
  const [users, setUsers] = useState<any[]>([]);
  
  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sendToAll, setSendToAll] = useState(true);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [userSearch, setUserSearch] = useState('');

  // Detail Modal
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const [createData, setCreateData] = useState({
    title: '',
    message: '',
    notification_type: 'INFO'
  });

  useEffect(() => {
    fetchData();
    fetchUsers();
  }, [page, pageSize, keyword]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await adminNotificationsService.getNotifications({ page, limit: pageSize, search: keyword || undefined });
      if (res) {
        setData(Array.isArray(res.data) ? res.data : []);
        setMeta((res as any).meta || {});
      }
    } catch (error) {
      toast.error('Lỗi khi tải danh sách thông báo');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await adminUserService.getUsers({ limit: 1000 });
      if (res && res.data) setUsers(res.data);
    } catch (error) {
      console.error('Lỗi lấy user', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa thông báo này?')) return;
    try {
      await adminNotificationsService.deleteNotification(id);
      toast.success('Xóa thông báo thành công');
      fetchData();
    } catch (error) {
      toast.error('Lỗi khi xóa thông báo');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sendToAll && selectedUserIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất một người nhận');
      return;
    }
    
    try {
      setCreating(true);
      const payload = {
        title: createData.title,
        message: createData.message,
        notification_type: createData.notification_type,
        user_ids: sendToAll ? users.map(u => u.user_id) : selectedUserIds
      };

      const res: any = await adminNotificationsService.createNotification(payload);
      toast.success(res?.message || 'Gửi thông báo thành công');
      setIsCreateOpen(false);
      setCreateData({ title: '', message: '', notification_type: 'INFO' });
      setSelectedUserIds([]);
      setSendToAll(true);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi gửi thông báo');
    } finally {
      setCreating(false);
    }
  };

  const toggleUserSelection = (id: number) => {
    if (selectedUserIds.includes(id)) {
      setSelectedUserIds(prev => prev.filter(uid => uid !== id));
    } else {
      setSelectedUserIds(prev => [...prev, id]);
    }
  };

  const getTypeColor = (type: string) => {
    const t = type.toUpperCase();
    if (t === 'SYSTEM') return 'bg-slate-100 text-slate-700';
    if (t === 'WARNING') return 'bg-amber-100 text-amber-700';
    if (t === 'ALERT') return 'bg-red-100 text-red-700';
    return 'bg-blue-100 text-blue-700'; // INFO
  };

  const columns: Column<any>[] = [
    {
      key: 'title',
      title: 'Tiêu đề & Nội dung',
      render: (item) => (
        <div className="max-w-md">
          <div className="font-semibold text-slate-800 line-clamp-1">{item.title}</div>
          <div className="text-sm text-slate-500 line-clamp-1 mt-0.5">{item.message}</div>
        </div>
      )
    },
    {
      key: 'type',
      title: 'Phân loại',
      render: (item) => (
        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${getTypeColor(item.notification_type)}`}>
          {item.notification_type}
        </span>
      )
    },
    {
      key: 'user',
      title: 'Người nhận',
      render: (item) => (
        <div>
          <div className="font-medium text-slate-800 text-sm">{item.user?.full_name || `User ID: ${item.user_id}`}</div>
          <div className="text-xs text-slate-500">{item.user?.email}</div>
        </div>
      )
    },
    {
      key: 'status',
      title: 'Trạng thái',
      render: (item) => (
        item.is_read ? 
          <span className="text-emerald-600 font-medium text-xs flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5"/> Đã xem</span> : 
          <span className="text-slate-500 font-medium text-xs bg-slate-100 px-2 py-0.5 rounded-full">Chưa xem</span>
      )
    },
    {
      key: 'created_at',
      title: 'Ngày gửi',
      render: (item) => (
        <div className="text-sm text-slate-600">
          {format(new Date(item.created_at), 'dd/MM/yyyy HH:mm')}
        </div>
      )
    }
  ];

  const getRowActions = (item: any): ActionItem[] => [
    {
      label: 'Xem chi tiết',
      icon: <Eye className="w-4 h-4 text-blue-600" />,
      onClick: () => { setSelectedItem(item); setIsDetailOpen(true); }
    },
    {
      label: 'Xóa',
      icon: <Trash2 className="w-4 h-4 text-red-600" />,
      onClick: () => handleDelete(item.notification_id)
    }
  ];

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) || 
    u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.phone?.includes(userSearch)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-blood" /> Quản lý Thông báo
          </h1>
          <p className="text-sm text-slate-500 mt-1">Gửi và theo dõi các thông báo đẩy trong hệ thống</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setIsCreateOpen(true)} className="bg-blood hover:bg-blood-deep text-white shadow-none rounded-md px-4">
            <Plus className="w-4 h-4 mr-2" /> Soạn thông báo mới
          </Button>
        </div>
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
          itemName="thông báo"
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSearch={v => {setKeyword(v); setPage(1);}}
          rowActions={getRowActions}
        />
      </div>

      <BaseModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Soạn thông báo mới"
        size="4xl"
        hideFooter
      >
        <form onSubmit={handleCreateSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-800 border-b pb-2">Nội dung thông báo</h3>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Loại thông báo</label>
                <Select value={createData.notification_type} onValueChange={v => setCreateData({...createData, notification_type: v || 'INFO'})}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn loại thông báo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INFO">Thông tin (INFO)</SelectItem>
                    <SelectItem value="WARNING">Cảnh báo (WARNING)</SelectItem>
                    <SelectItem value="ALERT">Khẩn cấp (ALERT)</SelectItem>
                    <SelectItem value="SYSTEM">Hệ thống (SYSTEM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tiêu đề</label>
                <Input 
                  value={createData.title} 
                  onChange={e => setCreateData({...createData, title: e.target.value})} 
                  placeholder="Nhập tiêu đề..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nội dung</label>
                <Textarea 
                  value={createData.message} 
                  onChange={e => setCreateData({...createData, message: e.target.value})} 
                  placeholder="Nhập nội dung chi tiết..."
                  rows={5}
                  required
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-slate-800 border-b pb-2 flex items-center justify-between">
                <span>Người nhận</span>
                <div className="flex items-center gap-2 text-sm font-normal">
                  <input 
                    type="checkbox" 
                    id="sendAll" 
                    checked={sendToAll} 
                    onChange={e => {
                      setSendToAll(e.target.checked);
                      if (e.target.checked) setSelectedUserIds([]);
                    }}
                    className="rounded text-blood focus:ring-blood accent-blood"
                  />
                  <label htmlFor="sendAll" className="cursor-pointer">Gửi tất cả mọi người</label>
                </div>
              </h3>

              {!sendToAll && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <Input 
                      placeholder="Tìm theo tên, email, SĐT..." 
                      className="pl-9 bg-slate-50"
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                    />
                  </div>
                  
                  <div className="border border-slate-200 rounded-md overflow-hidden h-[250px] overflow-y-auto">
                    {filteredUsers.length === 0 ? (
                      <div className="p-4 text-center text-sm text-slate-500">Không tìm thấy người dùng</div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {filteredUsers.map(u => (
                          <label key={u.user_id} className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer transition-colors">
                            <input 
                              type="checkbox" 
                              className="rounded border-slate-300 text-blood focus:ring-blood accent-blood"
                              checked={selectedUserIds.includes(u.user_id)}
                              onChange={() => toggleUserSelection(u.user_id)}
                            />
                            <div>
                              <div className="font-medium text-sm text-slate-800">{u.full_name}</div>
                              <div className="text-xs text-slate-500">{u.email} • {u.phone || 'Chưa có SĐT'}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-xs font-medium text-blood bg-red-50 p-2 rounded-md">
                    Đã chọn: {selectedUserIds.length} người
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Hủy</Button>
            <Button type="submit" className="bg-blood hover:bg-blood-deep text-white" disabled={creating}>
              {creating ? 'Đang gửi...' : 'Gửi thông báo'}
            </Button>
          </div>
        </form>
      </BaseModal>

      <BaseModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Chi tiết Thông báo"
        size="4xl"
        hideFooter
      >
        {selectedItem && (
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{selectedItem.title}</h2>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${getTypeColor(selectedItem.notification_type)}`}>
                    {selectedItem.notification_type}
                  </span>
                  <span className="text-sm text-slate-500">
                    Gửi lúc: {format(new Date(selectedItem.created_at), 'dd/MM/yyyy HH:mm:ss')}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
              <p className="text-slate-700 whitespace-pre-wrap">{selectedItem.message}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-6">
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Người nhận</div>
                <div className="font-medium text-slate-800">{selectedItem.user?.full_name}</div>
                <div className="text-sm text-slate-500">{selectedItem.user?.email}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Trạng thái đọc</div>
                {selectedItem.is_read ? (
                  <div>
                    <div className="font-medium text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> Đã xem</div>
                    {selectedItem.read_at && <div className="text-sm text-slate-500 mt-0.5">{format(new Date(selectedItem.read_at), 'dd/MM/yyyy HH:mm:ss')}</div>}
                  </div>
                ) : (
                  <div className="font-medium text-slate-500">Chưa xem</div>
                )}
              </div>
            </div>
          </div>
        )}
      </BaseModal>
    </div>
  );
}
