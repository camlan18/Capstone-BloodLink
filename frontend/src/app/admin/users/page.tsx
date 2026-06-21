'use client';
import { useEffect, useState } from 'react';
import { adminUserService } from '@/lib/services/admin-users';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Plus, Edit, Lock, Unlock, Eye, Loader2, User, Activity, History } from 'lucide-react';
import { format } from 'date-fns';
import { DataTable, Column, ActionItem } from '@/components/ui/DataTable';
import { BaseModal } from '@/components/ui/BaseModal';
import { ExcelImportModal } from '@/components/ui/ExcelImportModal';
import { ExportImportDropdown } from '@/components/ui/ExportImportDropdown';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore } from '@/lib/stores';
import { adminMasterDataService } from '@/lib/services/admin-master-data';

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({});
  
  // DataTable state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [keyword, setKeyword] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  
  // Detail Modal State
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedUserDetail, setSelectedUserDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'info'|'donor'|'history'>('info');

  const [bloodTypes, setBloodTypes] = useState<any[]>([]);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [modalTab, setModalTab] = useState<'info'|'donor'>('info');

  const [formData, setFormData] = useState({
    email: '', password: '', username: '', full_name: '', phone: '',
    date_of_birth: '', gender: '', identity_card: '', address: '',
    province_id: '', district_id: '', ward_id: '', role_id: '',
    is_active: true, is_email_verified: false,
    is_donor_registered: false, is_available_for_donation: false,
    
    blood_type_id: '', weight_kg: '', height_cm: '',
    first_donation_date: '', total_donations: '', last_donation_date: '',
    next_eligible_date: '', health_notes: '',
    emergency_contact_name: '', emergency_contact_phone: '',
    dp_is_active: true
  });

  useEffect(() => {
    fetchData();
    fetchBloodTypes();
    fetchProvinces();
    fetchRoles();
  }, [page, pageSize, keyword]);

  const fetchRoles = async () => {
    try {
      const res = await adminMasterDataService.getRoles();
      if (res && res.data) setRoles(res.data);
    } catch (error) {}
  };

  const fetchBloodTypes = async () => {
    try {
      const res = await adminMasterDataService.getBloodTypes({ limit: 100 });
      if (res && res.data) setBloodTypes(res.data);
    } catch (error) {}
  };

  const fetchProvinces = async () => {
    try {
      const res = await adminMasterDataService.getProvinces();
      if (res && res.data) setProvinces(res.data);
    } catch (error) {}
  };

  useEffect(() => {
    if (formData.province_id) {
      adminMasterDataService.getDistricts(Number(formData.province_id)).then(res => {
        if (res && res.data) setDistricts(res.data);
      });
    } else setDistricts([]);
  }, [formData.province_id]);

  useEffect(() => {
    if (formData.district_id) {
      adminMasterDataService.getWards(Number(formData.district_id)).then(res => {
        if (res && res.data) setWards(res.data);
      });
    } else setWards([]);
  }, [formData.district_id]);

  const handleSearch = (val: string) => {
    setKeyword(val);
    setPage(1);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await adminUserService.getUsers({ page, limit: pageSize, search: keyword });
      if (res) {
        setData(Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []));
        setMeta((res as any).meta || {});
      }
    } catch (error) {
      toast.error('Lỗi khi tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLock = async (id: number) => {
    try {
      await adminUserService.toggleLock(id);
      toast.success('Đã cập nhật trạng thái khóa tài khoản');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi khóa tài khoản');
    }
  };

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData({
      email: '', password: '', username: '', full_name: '', phone: '',
      date_of_birth: '', gender: '', identity_card: '', address: '',
      province_id: '', district_id: '', ward_id: '', role_id: '',
      is_active: true, is_email_verified: false,
      is_donor_registered: false, is_available_for_donation: false,
      
      blood_type_id: '', weight_kg: '', height_cm: '',
      first_donation_date: '', total_donations: '', last_donation_date: '',
      next_eligible_date: '', health_notes: '',
      emergency_contact_name: '', emergency_contact_phone: '', dp_is_active: true
    });
    setModalTab('info');
    setIsModalOpen(true);
  };

  const handleOpenDetail = async (user: any) => {
    setIsDetailOpen(true);
    setActiveTab('info');
    try {
      setDetailLoading(true);
      const res = await adminUserService.getUserById(user.user_id);
      setSelectedUserDetail(res.data || res);
    } catch (error) {
      toast.error('Lỗi khi tải thông tin chi tiết');
      setIsDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenEdit = async (user: any) => {
    setEditingUser(user);
    setIsModalOpen(true);
    setModalTab('info');
    setDetailLoading(true);
    try {
      const res = await adminUserService.getUserById(user.user_id);
      const fullUser = res.data || res;
      setFormData({
        email: fullUser.email || '',
        password: '',
        username: fullUser.username || '',
        full_name: fullUser.full_name || '',
        phone: fullUser.phone || '',
        date_of_birth: fullUser.date_of_birth ? fullUser.date_of_birth.split('T')[0] : '',
        gender: fullUser.gender || '',
        identity_card: fullUser.identity_card || '',
        address: fullUser.address || '',
        province_id: fullUser.province_id?.toString() || '',
        district_id: fullUser.district_id?.toString() || '',
        ward_id: fullUser.ward_id?.toString() || '',
        role_id: fullUser.role_id?.toString() || '',
        is_active: fullUser.is_active ?? true,
        is_email_verified: fullUser.is_email_verified ?? false,
        is_donor_registered: fullUser.is_donor_registered ?? false,
        is_available_for_donation: fullUser.is_available_for_donation ?? false,

        blood_type_id: fullUser.donor_profile?.blood_type_id?.toString() || '',
        weight_kg: fullUser.donor_profile?.weight_kg?.toString() || '',
        height_cm: fullUser.donor_profile?.height_cm?.toString() || '',
        first_donation_date: fullUser.donor_profile?.first_donation_date ? fullUser.donor_profile.first_donation_date.split('T')[0] : '',
        total_donations: fullUser.donor_profile?.total_donations?.toString() || '',
        last_donation_date: fullUser.donor_profile?.last_donation_date ? fullUser.donor_profile.last_donation_date.split('T')[0] : '',
        next_eligible_date: fullUser.donor_profile?.next_eligible_date ? fullUser.donor_profile.next_eligible_date.split('T')[0] : '',
        health_notes: fullUser.donor_profile?.health_notes || '',
        emergency_contact_name: fullUser.donor_profile?.emergency_contact_name || '',
        emergency_contact_phone: fullUser.donor_profile?.emergency_contact_phone || '',
        dp_is_active: fullUser.donor_profile?.is_active ?? true
      });
    } catch (err) {
      toast.error('Lỗi khi tải thông tin người dùng');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = { 
        email: formData.email,
        full_name: formData.full_name,
        role_id: Number(formData.role_id),
        is_active: formData.is_active,
        is_email_verified: formData.is_email_verified,
        is_donor_registered: formData.is_donor_registered,
        is_available_for_donation: formData.is_available_for_donation
      };

      if (formData.password) payload.password = formData.password;
      if (formData.username) payload.username = formData.username;
      if (formData.phone) payload.phone = formData.phone;
      if (formData.date_of_birth) payload.date_of_birth = formData.date_of_birth;
      if (formData.gender) payload.gender = formData.gender;
      if (formData.identity_card) payload.identity_card = formData.identity_card;
      if (formData.address) payload.address = formData.address;
      if (formData.province_id) payload.province_id = Number(formData.province_id);
      if (formData.district_id) payload.district_id = Number(formData.district_id);
      if (formData.ward_id) payload.ward_id = Number(formData.ward_id);

      // Map donor_profile fields
      if (formData.blood_type_id || formData.weight_kg || formData.height_cm || formData.health_notes || formData.total_donations) {
        payload.donor_profile = {
          is_active: formData.dp_is_active
        };
        if (formData.blood_type_id) payload.donor_profile.blood_type_id = Number(formData.blood_type_id);
        if (formData.weight_kg) payload.donor_profile.weight_kg = Number(formData.weight_kg);
        if (formData.height_cm) payload.donor_profile.height_cm = Number(formData.height_cm);
        if (formData.first_donation_date) payload.donor_profile.first_donation_date = formData.first_donation_date;
        if (formData.total_donations) payload.donor_profile.total_donations = Number(formData.total_donations);
        if (formData.last_donation_date) payload.donor_profile.last_donation_date = formData.last_donation_date;
        if (formData.next_eligible_date) payload.donor_profile.next_eligible_date = formData.next_eligible_date;
        if (formData.health_notes) payload.donor_profile.health_notes = formData.health_notes;
        if (formData.emergency_contact_name) payload.donor_profile.emergency_contact_name = formData.emergency_contact_name;
        if (formData.emergency_contact_phone) payload.donor_profile.emergency_contact_phone = formData.emergency_contact_phone;
      }

      if (editingUser) {
        await adminUserService.updateUser(editingUser.user_id, payload);
        toast.success('Cập nhật người dùng thành công');
      } else {
        await adminUserService.createUser(payload);
        toast.success('Thêm người dùng thành công');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleExport = async () => {
    try {
      await adminUserService.exportExcel({
        search: keyword || undefined,
      });
    } catch (error) {
      toast.error('Lỗi khi xuất file Excel');
    }
  };

  const handleImport = async (file: File) => {
    try {
      const res = await adminUserService.importExcel(file);
      toast.success(res?.data?.message || 'Nhập dữ liệu thành công');
      setIsImportOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi nhập dữ liệu');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await adminUserService.downloadTemplate();
    } catch (error) {
      toast.error('Lỗi khi tải file mẫu');
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'user',
      title: 'Họ tên',
      render: (user) => (
        <div>
          <div className="font-medium text-slate-800">{user.full_name || 'Chưa cập nhật'}</div>
          <div className="text-xs text-slate-500">{user.email}</div>
        </div>
      )
    },
    {
      key: 'phone',
      title: 'Số điện thoại',
      render: (user) => <span className="text-slate-800">{user.phone || '-'}</span>
    },
    {
      key: 'role',
      title: 'Vai trò',
      render: (user) => {
        const isStaff = user.role?.role_code === 'STAFF' || user.role?.role_code === 'HOSPITAL_STAFF';
        const isAdmin = user.role?.role_code === 'ADMIN';
        return (
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold
            ${isAdmin ? 'bg-purple-50 text-purple-600 border border-purple-200' : 
              isStaff ? 'bg-blue-50 text-blue-600 border border-blue-200' : 
              'bg-slate-50 text-slate-600 border border-slate-200'}
          `}>
            {user.role?.role_name || user.role_id}
          </span>
        );
      }
    },
    {
      key: 'status',
      title: 'Trạng thái',
      render: (user) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold
          ${user.is_active ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}
        `}>
          {user.is_active ? 'Hoạt động' : 'Bị khóa'}
        </span>
      )
    },
    {
      key: 'created_at',
      title: 'Ngày tham gia',
      render: (user) => <span className="text-slate-500 text-sm">{format(new Date(user.created_at), 'dd/MM/yyyy')}</span>
    }
  ];

  const getRowActions = (user: any): ActionItem[] => {
    const currentUser = useAuthStore.getState().user;
    
    // Prevent the currently logged in admin from locking or altering their own account from this list
    if (currentUser && Number(user.user_id) === Number(currentUser.user_id)) {
      return [];
    }

    const actions: ActionItem[] = [
      {
        label: 'Xem chi tiết',
        icon: <Eye className="w-4 h-4 text-slate-500" />,
        onClick: () => handleOpenDetail(user)
      },
      {
        label: 'Chỉnh sửa',
        icon: <Edit className="w-4 h-4 text-blue-600" />,
        onClick: () => handleOpenEdit(user)
      }
    ];

    // Prevent locking ANY Admin account (role_id === 1 or role_code === 'admin')
    const isAdmin = user.role_id === 1 || user.role?.role_code?.toLowerCase() === 'admin';
    if (!isAdmin) {
      actions.push({
        label: user.is_active ? 'Khóa tài khoản' : 'Mở khóa',
        icon: user.is_active ? <Lock className="w-4 h-4 text-red-600" /> : <Unlock className="w-4 h-4 text-emerald-600" />,
        className: user.is_active ? 'text-red-600' : 'text-emerald-600',
        onClick: () => handleToggleLock(user.user_id)
      });
    }

    return actions;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Quản lý Người dùng</h1>
          <p className="text-sm text-slate-500 mt-1">{meta?.total || 0} tài khoản trong hệ thống</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportImportDropdown 
            onImportClick={() => setIsImportOpen(true)}
            onExportClick={handleExport}
            onDownloadTemplateClick={handleDownloadTemplate}
          />
          <Button onClick={handleOpenCreate} className="bg-blood hover:bg-blood-deep text-white shadow-none rounded-md px-4">
            <Plus className="w-4 h-4 mr-2" /> Thêm mới
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
          itemName="người dùng"
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSearch={handleSearch}
          rowActions={getRowActions}
        />
      </div>

      <BaseModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        title={editingUser ? "Chỉnh sửa người dùng" : "Thêm người dùng mới"}
        size="7xl"
        hideFooter
      >
        <div className="flex border-b border-slate-200 mb-6">
          <button 
            type="button"
            onClick={() => setModalTab('info')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${modalTab === 'info' ? 'border-blood text-blood' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Thông tin chung
          </button>
          <button 
            type="button"
            onClick={() => setModalTab('donor')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${modalTab === 'donor' ? 'border-blood text-blood' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Hồ sơ hiến máu
          </button>
        </div>

        {detailLoading && isModalOpen ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blood" />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className={`grid grid-cols-2 gap-8 ${modalTab === 'info' ? 'block' : 'hidden'}`}>
              <div className="space-y-4">
                <h3 className="font-semibold text-blood border-b pb-2 mb-4">Thông tin Tài khoản</h3>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email <span className="text-red-500">*</span></label>
                  <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required={modalTab === 'info'} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                  <Input type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu {editingUser && <span className="text-slate-400 font-normal">(Bỏ trống nếu không đổi)</span>}</label>
                  <Input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required={!editingUser && modalTab === 'info'} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Vai trò</label>
                  <Select value={formData.role_id} onValueChange={v => setFormData({...formData, role_id: v || ''})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn vai trò">
                        {roles.find(r => r.role_id.toString() === formData.role_id)?.role_name || 'Chọn vai trò'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r.role_id} value={r.role_id.toString()}>
                          {r.role_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="w-4 h-4 text-blood rounded border-gray-300 focus:ring-blood" />
                    <span className="text-sm font-medium text-slate-700">Tài khoản hoạt động</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.is_email_verified} onChange={e => setFormData({...formData, is_email_verified: e.target.checked})} className="w-4 h-4 text-blood rounded border-gray-300 focus:ring-blood" />
                    <span className="text-sm font-medium text-slate-700">Đã xác minh Email</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.is_donor_registered} onChange={e => setFormData({...formData, is_donor_registered: e.target.checked})} className="w-4 h-4 text-blood rounded border-gray-300 focus:ring-blood" />
                    <span className="text-sm font-medium text-slate-700">Đã đ.ký hiến máu</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.is_available_for_donation} onChange={e => setFormData({...formData, is_available_for_donation: e.target.checked})} className="w-4 h-4 text-blood rounded border-gray-300 focus:ring-blood" />
                    <span className="text-sm font-medium text-slate-700">Sẵn sàng hiến máu</span>
                  </label>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-semibold text-blood border-b pb-2 mb-4">Thông tin Cá nhân</h3>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Họ và tên <span className="text-red-500">*</span></label>
                  <Input type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} required={modalTab === 'info'} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Số điện thoại</label>
                    <Input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">CCCD/CMND</label>
                    <Input type="text" value={formData.identity_card} onChange={e => setFormData({...formData, identity_card: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Ngày sinh</label>
                    <Input type="date" value={formData.date_of_birth} onChange={e => setFormData({...formData, date_of_birth: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Giới tính</label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
                      <option value="">Chưa chọn</option>
                      <option value="M">Nam</option>
                      <option value="F">Nữ</option>
                      <option value="O">Khác</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tỉnh/Thành phố</label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" value={formData.province_id} onChange={e => setFormData({...formData, province_id: e.target.value, district_id: '', ward_id: ''})}>
                      <option value="">Chọn tỉnh</option>
                      {provinces.map(p => <option key={p.province_id} value={p.province_id}>{p.province_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Quận/Huyện</label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" value={formData.district_id} onChange={e => setFormData({...formData, district_id: e.target.value, ward_id: ''})} disabled={!formData.province_id}>
                      <option value="">Chọn huyện</option>
                      {districts.map(d => <option key={d.district_id} value={d.district_id}>{d.district_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phường/Xã</label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" value={formData.ward_id} onChange={e => setFormData({...formData, ward_id: e.target.value})} disabled={!formData.district_id}>
                      <option value="">Chọn xã</option>
                      {wards.map(w => <option key={w.ward_id} value={w.ward_id}>{w.ward_name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Địa chỉ chi tiết</label>
                  <Input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Số nhà, tên đường..." />
                </div>
              </div>
            </div>

            <div className={`grid grid-cols-2 gap-8 ${modalTab === 'donor' ? 'block' : 'hidden'}`}>
              <div className="space-y-4">
                <h3 className="font-semibold text-blood border-b pb-2 mb-4">Chỉ số Cơ thể</h3>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nhóm máu</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.blood_type_id}
                    onChange={e => setFormData({...formData, blood_type_id: e.target.value})}
                  >
                    <option value="">Chưa cập nhật</option>
                    {bloodTypes.map(bt => (
                      <option key={bt.blood_type_id} value={bt.blood_type_id}>{bt.blood_type_code}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Cân nặng (kg)</label>
                    <Input type="number" value={formData.weight_kg} onChange={e => setFormData({...formData, weight_kg: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Chiều cao (cm)</label>
                    <Input type="number" value={formData.height_cm} onChange={e => setFormData({...formData, height_cm: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú y tế</label>
                  <textarea 
                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.health_notes} 
                    onChange={e => setFormData({...formData, health_notes: e.target.value})} 
                    placeholder="Tiền sử bệnh lý, lưu ý khi hiến máu..."
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-semibold text-blood border-b pb-2 mb-4">Lịch sử & Khẩn cấp</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Lần hiến đầu tiên</label>
                    <Input type="date" value={formData.first_donation_date} onChange={e => setFormData({...formData, first_donation_date: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tổng số lần hiến</label>
                    <Input type="number" value={formData.total_donations} onChange={e => setFormData({...formData, total_donations: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Lần hiến gần nhất</label>
                    <Input type="date" value={formData.last_donation_date} onChange={e => setFormData({...formData, last_donation_date: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Ngày có thể hiến tiếp</label>
                    <Input type="date" value={formData.next_eligible_date} onChange={e => setFormData({...formData, next_eligible_date: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tên liên hệ khẩn cấp</label>
                    <Input type="text" value={formData.emergency_contact_name} onChange={e => setFormData({...formData, emergency_contact_name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">SĐT liên hệ khẩn cấp</label>
                    <Input type="text" value={formData.emergency_contact_phone} onChange={e => setFormData({...formData, emergency_contact_phone: e.target.value})} />
                  </div>
                </div>
                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.dp_is_active} onChange={e => setFormData({...formData, dp_is_active: e.target.checked})} className="w-4 h-4 text-blood rounded border-gray-300 focus:ring-blood" />
                    <span className="text-sm font-medium text-slate-700">Hồ sơ hiến máu Đang hoạt động</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-6 flex justify-end gap-3 border-t border-slate-100 mt-8">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Hủy</Button>
              <Button type="submit" className="bg-blood hover:bg-blood-deep text-white px-8">
                {editingUser ? 'Lưu thay đổi' : 'Thêm người dùng mới'}
              </Button>
            </div>
          </form>
        )}
      </BaseModal>

      <BaseModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        title="Chi tiết Người dùng"
        size="2xl"
        hideFooter
      >
        {detailLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blood" />
          </div>
        ) : selectedUserDetail ? (
          <div className="space-y-4">
            <div className="flex border-b border-slate-200">
              <button 
                onClick={() => setActiveTab('info')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'info' ? 'border-blood text-blood' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
              >
                <User className="w-4 h-4" /> Thông tin cá nhân
              </button>
              <button 
                onClick={() => setActiveTab('donor')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'donor' ? 'border-blood text-blood' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
              >
                <Activity className="w-4 h-4" /> Hồ sơ hiến máu
              </button>
              <button 
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'history' ? 'border-blood text-blood' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
              >
                <History className="w-4 h-4" /> Lịch sử hiến
              </button>
            </div>

            <div className="pt-2 min-h-[300px]">
              {activeTab === 'info' && (
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm">
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Họ tên</span>
                    <span className="font-bold text-slate-800 text-base">{selectedUserDetail.full_name || '-'}</span>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Vai trò</span>
                    <span className="font-semibold text-slate-800">{selectedUserDetail.role?.role_name || '-'}</span>
                  </div>
                  
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Email</span>
                    <span className="font-medium text-slate-800">{selectedUserDetail.email}</span>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Số điện thoại</span>
                    <span className="font-medium text-slate-800">{selectedUserDetail.phone || '-'}</span>
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Ngày sinh</span>
                    <span className="font-medium text-slate-800">{selectedUserDetail.date_of_birth ? format(new Date(selectedUserDetail.date_of_birth), 'dd/MM/yyyy') : '-'}</span>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Giới tính</span>
                    <span className="font-medium text-slate-800">
                      {selectedUserDetail.gender === 'M' ? 'Nam' : selectedUserDetail.gender === 'F' ? 'Nữ' : '-'}
                    </span>
                  </div>

                  <div className="col-span-2">
                    <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Địa chỉ</span>
                    <span className="font-medium text-slate-800">
                      {[selectedUserDetail.address, selectedUserDetail.ward?.ward_name, selectedUserDetail.district?.district_name, selectedUserDetail.province?.province_name].filter(Boolean).join(', ') || '-'}
                    </span>
                  </div>
                </div>
              )}

              {activeTab === 'donor' && (
                <div className="grid grid-cols-2 gap-4 bg-blue-50/50 p-4 rounded-lg border border-blue-100 text-sm">
                  {selectedUserDetail.donor_profile ? (
                    <>
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Nhóm máu</span>
                        <span className="font-bold text-blood text-xl">{selectedUserDetail.donor_profile.blood_type?.blood_type_code || '-'}</span>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Tổng số lần hiến</span>
                        <span className="font-bold text-blue-600 text-xl">{selectedUserDetail.donor_profile.total_donations || 0}</span>
                      </div>
                      
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Chiều cao</span>
                        <span className="font-medium text-slate-800">{selectedUserDetail.donor_profile.height_cm ? `${selectedUserDetail.donor_profile.height_cm} cm` : '-'}</span>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Cân nặng</span>
                        <span className="font-medium text-slate-800">{selectedUserDetail.donor_profile.weight_kg ? `${selectedUserDetail.donor_profile.weight_kg} kg` : '-'}</span>
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Lần hiến đầu tiên</span>
                        <span className="font-medium text-slate-800">{selectedUserDetail.donor_profile.first_donation_date ? format(new Date(selectedUserDetail.donor_profile.first_donation_date), 'dd/MM/yyyy') : '-'}</span>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Lần hiến gần nhất</span>
                        <span className="font-medium text-slate-800">{selectedUserDetail.donor_profile.last_donation_date ? format(new Date(selectedUserDetail.donor_profile.last_donation_date), 'dd/MM/yyyy') : '-'}</span>
                      </div>

                      <div className="col-span-2">
                        <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Ghi chú y tế</span>
                        <div className="font-medium text-slate-800 p-3 bg-white border border-slate-200 rounded min-h-[60px]">
                          {selectedUserDetail.donor_profile.health_notes || '-'}
                        </div>
                      </div>
                      
                      <div className="col-span-2 sm:col-span-1 border-t border-blue-100 pt-4 mt-2">
                        <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Liên hệ khẩn cấp</span>
                        <span className="font-medium text-slate-800">{selectedUserDetail.donor_profile.emergency_contact_name || '-'}</span>
                      </div>
                      <div className="col-span-2 sm:col-span-1 border-t border-blue-100 pt-4 mt-2">
                        <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">SĐT khẩn cấp</span>
                        <span className="font-medium text-slate-800">{selectedUserDetail.donor_profile.emergency_contact_phone || '-'}</span>
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Ngày có thể hiến tiếp</span>
                        <span className="font-medium text-slate-800">{selectedUserDetail.donor_profile.next_eligible_date ? format(new Date(selectedUserDetail.donor_profile.next_eligible_date), 'dd/MM/yyyy') : '-'}</span>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-slate-500 block mb-1 text-xs uppercase tracking-wider font-semibold">Trạng thái hồ sơ</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold w-fit
                          ${selectedUserDetail.donor_profile.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}
                        `}>
                          {selectedUserDetail.donor_profile.is_active ? 'Đang hoạt động' : 'Tạm khóa'}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="col-span-2 py-8 text-center text-slate-500">
                      Chưa có hồ sơ hiến máu
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'history' && (
                <div>
                  {selectedUserDetail.donations_donor && selectedUserDetail.donations_donor.length > 0 ? (
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-3">Ngày hiến</th>
                            <th className="px-4 py-3">Lượng máu</th>
                            <th className="px-4 py-3">Cơ sở / Sự kiện</th>
                            <th className="px-4 py-3">Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedUserDetail.donations_donor.map((d: any) => (
                            <tr key={d.donation_id} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3 font-medium text-slate-800">
                                {d.donation_date ? format(new Date(d.donation_date), 'dd/MM/yyyy') : '-'}
                              </td>
                              <td className="px-4 py-3">
                                {d.volume_ml ? `${d.volume_ml} ml` : '-'}
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                {d.facility?.facility_name || '-'}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded text-xs font-semibold
                                  ${d.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                                    d.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                                    'bg-amber-100 text-amber-700'}`}>
                                  {d.status === 'COMPLETED' ? 'Thành công' : d.status === 'FAILED' ? 'Thất bại' : 'Chờ xử lý'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-lg border border-slate-100 border-dashed">
                      Chưa có lịch sử hiến máu nào được ghi nhận.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button onClick={() => setIsDetailOpen(false)} variant="outline">Đóng</Button>
            </div>
          </div>
        ) : null}
      </BaseModal>

      <ExcelImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Nhập dữ liệu Người dùng"
        onImport={handleImport}
        onDownloadTemplate={handleDownloadTemplate}
      />
    </div>
  );
}
