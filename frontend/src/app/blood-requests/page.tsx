'use client';
import { useEffect, useState } from 'react';
import { bloodRequestService } from '@/lib/services/bloodRequest';
import { BloodRequest } from '@/types';
import { MainLayout } from '@/components/layout/MainLayout';
import { BaseModal } from '@/components/ui/BaseModal';
import { MapPin, Clock, Heart, Filter, ArrowRight, Activity, Droplet, UserPlus, User, Map as MapIcon, Plus, X } from 'lucide-react';
import Link from 'next/link';

export default function BloodRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [selectedUrgencies, setSelectedUrgencies] = useState<string[]>([]);
  const [selectedBloodTypes, setSelectedBloodTypes] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('urgentFirst');

  // Detail Modal States
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res: any = await bloodRequestService.getAllRequests();
      let fetchedRequests = [];
      if (res && Array.isArray(res.data)) fetchedRequests = res.data;
      else if (res && res.data && Array.isArray(res.data.data)) fetchedRequests = res.data.data;
      else if (Array.isArray(res)) fetchedRequests = res;
      
      setRequests(fetchedRequests);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const getUrgencyStyle = (code?: string) => {
    if (!code) return { bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-200', dot: 'bg-slate-400', label: 'Chưa rõ' };
    const c = code.toUpperCase();
    if (c === 'CRITICAL') return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500', label: 'Tối khẩn' };
    if (c === 'HIGH' || c === 'URGENT') return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500', label: 'Khẩn cấp' };
    return { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', dot: 'bg-blue-500', label: 'Bình thường' };
  };

  const toggleUrgency = (level: string) => {
    setSelectedUrgencies(prev => 
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    );
  };

  const toggleBloodType = (bt: string) => {
    setSelectedBloodTypes(prev => 
      prev.includes(bt) ? prev.filter(b => b !== bt) : [...prev, bt]
    );
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const bloodTypesList = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

  const filteredRequests = requests.filter(req => {
    const matchUrgency = selectedUrgencies.length === 0 || selectedUrgencies.includes(req.urgency?.urgency_code);
    const btStr = req.blood_type ? `${req.blood_type.abo}${req.blood_type.rh_factor}`.replace(/\s+/g, '') : '';
    const matchBloodType = selectedBloodTypes.length === 0 || selectedBloodTypes.includes(btStr);
    return matchUrgency && matchBloodType;
  }).sort((a, b) => {
    if (sortBy === 'urgentFirst') {
      const uMap: any = { 'CRITICAL': 3, 'HIGH': 2, 'URGENT': 2, 'NORMAL': 1 };
      return (uMap[b.urgency?.urgency_code] || 0) - (uMap[a.urgency?.urgency_code] || 0);
    } else {
      const timeA = a.required_before ? new Date(a.required_before).getTime() : Number.MAX_SAFE_INTEGER;
      const timeB = b.required_before ? new Date(b.required_before).getTime() : Number.MAX_SAFE_INTEGER;
      return timeA - timeB;
    }
  });

  const activeFilters = selectedUrgencies.length + selectedBloodTypes.length;

  return (
    <MainLayout>
      <div className="bg-[#f0f2f5] min-h-screen">
        {/* Header */}
        <div className="bg-[#1a2332] text-white">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between py-6 gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-9 h-9 bg-white/10 rounded-sm flex items-center justify-center">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold tracking-tight">YÊU CẦU MÁU KHẨN CẤP</h1>
                    <p className="text-white/40 text-xs font-medium tracking-wide">EMERGENCY BLOOD REQUESTS</p>
                  </div>
                </div>
                <p className="text-white/50 text-sm mt-2 max-w-lg">
                  Hàng ngàn bệnh nhân đang chờ giọt máu quý giá từ bạn. Mỗi đơn vị máu có thể cứu sống một mạng người.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/blood-requests/map"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 text-white font-semibold rounded-sm hover:bg-white/20 transition-colors text-xs border border-white/10"
                >
                  <MapIcon className="h-3.5 w-3.5" />
                  Bản đồ
                </Link>
                <Link
                  href="/blood-requests/create"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-[#1a2332] font-bold rounded-sm hover:bg-slate-100 transition-colors text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Tạo yêu cầu
                </Link>
                <Link
                  href="/donor/book"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blood text-white font-bold rounded-sm hover:bg-red-700 transition-colors text-xs"
                >
                  <Heart className="h-3.5 w-3.5" />
                  Hiến máu
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="bg-white border-b border-slate-200">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-6 text-xs">
                <div className="flex items-center gap-1.5">
                  <Droplet className="w-3.5 h-3.5 text-blood" />
                  <span className="text-slate-500">Tổng: <strong className="text-[#1a2332]">{requests.length}</strong> yêu cầu</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-slate-500">Tối khẩn: <strong className="text-red-600">{requests.filter(r => r.urgency?.urgency_code === 'CRITICAL').length}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-slate-500">Khẩn cấp: <strong className="text-amber-600">{requests.filter(r => r.urgency?.urgency_code === 'HIGH' || r.urgency?.urgency_code === 'URGENT').length}</strong></span>
                </div>
              </div>
              {activeFilters > 0 && (
                <button
                  onClick={() => { setSelectedUrgencies([]); setSelectedBloodTypes([]); }}
                  className="text-xs text-blood font-semibold hover:underline flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Xóa {activeFilters} bộ lọc
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 max-w-6xl py-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Main Content */}
            <div className="lg:col-span-9 space-y-3">
              {/* Sort Bar */}
              <div className="bg-white border border-slate-200 rounded-sm px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  Hiển thị <span className="font-bold text-[#1a2332]">{filteredRequests.length}</span> / {requests.length} yêu cầu
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Sắp xếp:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer group">
                    <input 
                      type="radio" 
                      name="sort" 
                      checked={sortBy === 'urgentFirst'} 
                      onChange={() => setSortBy('urgentFirst')} 
                      className="w-3.5 h-3.5 text-[#1a2332] border-slate-300 focus:ring-[#1a2332]" 
                    />
                    <span className="text-slate-600 group-hover:text-[#1a2332] transition-colors font-medium">Khẩn cấp nhất</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer group">
                    <input 
                      type="radio" 
                      name="sort" 
                      checked={sortBy === 'nearest'} 
                      onChange={() => setSortBy('nearest')} 
                      className="w-3.5 h-3.5 text-[#1a2332] border-slate-300 focus:ring-[#1a2332]" 
                    />
                    <span className="text-slate-600 group-hover:text-[#1a2332] transition-colors font-medium">Hạn gần nhất</span>
                  </label>
                </div>
              </div>

              {/* List */}
              <div className="space-y-2">
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <div key={i} className="animate-pulse bg-white border border-slate-200 rounded-sm h-28" />
                  ))
                ) : filteredRequests.length > 0 ? (
                  filteredRequests.map(req => {
                    const urgStyle = getUrgencyStyle(req.urgency?.urgency_code);
                    const btStr = req.blood_type ? (req.blood_type.abo + req.blood_type.rh_factor).replace(/\s+/g, '') : '';
                    const donorsCount = req.registered_donors_count || 0;
                    return (
                      <div 
                        key={req.request_id} 
                        className="bg-white border border-slate-200 rounded-sm hover:border-slate-300 transition-all group relative overflow-hidden"
                      >
                        {/* Urgency left bar */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${urgStyle.dot}`} />
                        
                        <div className="flex flex-col md:flex-row md:items-center gap-4 p-4 pl-5">
                          {/* Blood type badge */}
                          <div className="hidden md:flex shrink-0 w-14 h-14 bg-red-50 border border-red-100 rounded-sm items-center justify-center flex-col">
                            <span className="text-blood font-black text-base leading-none">{btStr || '?'}</span>
                            <span className="text-[9px] text-red-400 font-semibold mt-0.5">{req.units_needed} ĐV</span>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm border ${urgStyle.bg} ${urgStyle.text} ${urgStyle.border}`}>
                                {req.urgency?.urgency_name || urgStyle.label}
                              </span>
                              {req.component && (
                                <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-sm font-medium">
                                  {req.component.component_name}
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {req.required_before ? formatDate(req.required_before) : '—'}
                              </span>
                            </div>
                            
                            <h3 className="text-sm font-bold text-[#1a2332] mb-1 group-hover:text-blood transition-colors truncate">
                              Cần {req.units_needed} đơn vị máu {btStr} — {req.patient_name}
                            </h3>
                            
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                              <div className="flex items-center gap-1 truncate">
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">{req.facility?.facility_name || req.hospital_name || '—'}</span>
                              </div>
                              {req.ward_room && (
                                <div className="hidden sm:flex items-center gap-1 truncate">
                                  <span className="text-slate-300">|</span>
                                  <span className="truncate">{req.ward_room}</span>
                                </div>
                              )}
                              {donorsCount > 0 && (
                                <div className="flex items-center gap-1 truncate text-blood font-semibold ml-2 bg-red-50 px-2 py-0.5 rounded-sm">
                                  <span>Đã có {donorsCount} người đăng ký</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 border-slate-100 pt-3 md:pt-0">
                            <button 
                              onClick={() => { setSelectedRequest(req); setIsDetailOpen(true); }}
                              className="px-3 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 font-semibold rounded-sm transition-colors text-xs"
                            >
                              Chi tiết
                            </button>
                            {(() => {
                              const isFull = donorsCount >= 3;
                              return isFull ? (
                                <button
                                  disabled
                                  className="px-4 py-2 bg-slate-200 text-slate-500 font-bold rounded-sm text-xs flex items-center cursor-not-allowed"
                                >
                                  Đã đủ người hiến
                                </button>
                              ) : (
                                <Link
                                  href={`/donor/book?request=${req.request_id}&facility=${req.facility_id}`}
                                  className="px-4 py-2 bg-blood text-white hover:bg-red-700 font-bold rounded-sm transition-colors text-xs flex items-center gap-1.5"
                                >
                                  Hiến ngay <ArrowRight className="w-3 h-3" />
                                </Link>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-16 bg-white rounded-sm border border-dashed border-slate-200">
                    <Droplet className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-[#1a2332] mb-1">Không tìm thấy yêu cầu phù hợp</h3>
                    <p className="text-xs text-slate-400 mb-4">Thử thay đổi hoặc xóa bộ lọc để xem thêm kết quả.</p>
                    <button 
                      onClick={() => { setSelectedUrgencies([]); setSelectedBloodTypes([]); }}
                      className="px-4 py-2 text-xs text-blood font-semibold hover:bg-red-50 rounded-sm transition-colors"
                    >
                      Xóa tất cả bộ lọc
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-white border border-slate-200 rounded-sm overflow-hidden sticky top-20">
                {/* Filter header */}
                <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#1a2332] uppercase tracking-wider flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    Bộ lọc
                  </h3>
                  {activeFilters > 0 && (
                    <button 
                      onClick={() => { setSelectedUrgencies([]); setSelectedBloodTypes([]); }}
                      className="text-[10px] text-blood hover:underline font-semibold"
                    >
                      Xóa tất cả
                    </button>
                  )}
                </div>

                <div className="p-4">
                  {/* Urgency Filter */}
                  <div className="mb-5">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Mức độ khẩn cấp</h4>
                    <div className="space-y-2">
                      {[
                        { id: 'CRITICAL', label: 'Tối khẩn', dot: 'bg-red-500', count: requests.filter(r => r.urgency?.urgency_code === 'CRITICAL').length },
                        { id: 'HIGH', label: 'Khẩn cấp', dot: 'bg-amber-500', count: requests.filter(r => r.urgency?.urgency_code === 'HIGH' || r.urgency?.urgency_code === 'URGENT').length },
                        { id: 'NORMAL', label: 'Bình thường', dot: 'bg-blue-500', count: requests.filter(r => r.urgency?.urgency_code === 'NORMAL').length }
                      ].map(item => {
                        const isActive = selectedUrgencies.includes(item.id);
                        return (
                          <label 
                            key={item.id} 
                            className={`flex items-center justify-between cursor-pointer px-3 py-2 rounded-sm border transition-all ${
                              isActive 
                                ? 'bg-[#1a2332] border-[#1a2332] text-white' 
                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input 
                                type="checkbox" 
                                className="hidden"
                                checked={isActive}
                                onChange={() => toggleUrgency(item.id)}
                              />
                              <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : item.dot}`} />
                              <span className="text-xs font-semibold">{item.label}</span>
                            </div>
                            <span className={`text-[10px] font-bold ${isActive ? 'text-white/60' : 'text-slate-400'}`}>{item.count}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Blood Type Filter */}
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Nhóm máu</h4>
                    <div className="grid grid-cols-4 gap-1.5">
                      {bloodTypesList.map(bt => {
                        const count = requests.filter(r => r.blood_type && (r.blood_type.abo + r.blood_type.rh_factor).replace(/\s+/g, '') === bt).length;
                        const isSelected = selectedBloodTypes.includes(bt);
                        return (
                          <label 
                            key={bt} 
                            className={`flex flex-col items-center justify-center py-2 rounded-sm border cursor-pointer transition-all ${
                              isSelected 
                                ? 'bg-blood border-blood text-white' 
                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            <input type="checkbox" className="hidden" checked={isSelected} onChange={() => toggleBloodType(bt)} />
                            <span className="text-xs font-bold">{bt}</span>
                            <span className={`text-[9px] mt-0.5 ${isSelected ? 'text-white/60' : 'text-slate-400'}`}>{count}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Quick links */}
                <div className="border-t border-slate-200 p-4 space-y-2">
                  <Link
                    href="/blood-requests/map"
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1a2332] text-white font-bold rounded-sm hover:bg-[#253344] transition-colors text-xs"
                  >
                    <MapIcon className="w-3.5 h-3.5" />
                    Xem trên Bản đồ
                  </Link>
                  <Link
                    href="/donor/book"
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blood text-white font-bold rounded-sm hover:bg-red-700 transition-colors text-xs"
                  >
                    <Heart className="w-3.5 h-3.5" />
                    Đăng ký hiến máu
                  </Link>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>

      <BaseModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        title="Chi tiết Yêu cầu máu"
        size="md"
        hideFooter
      >
        {selectedRequest && (() => {
          const urgStyle = getUrgencyStyle(selectedRequest.urgency?.urgency_code);
          const btStr = selectedRequest.blood_type ? (selectedRequest.blood_type.abo + selectedRequest.blood_type.rh_factor).replace(/\s+/g, '') : '';
          return (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-[#1a2332] text-lg leading-tight">
                    Cần {selectedRequest.units_needed} đơn vị máu {btStr}
                  </h3>
                  <span className={`inline-block px-2 py-0.5 mt-2 text-[10px] font-bold uppercase rounded-sm border ${urgStyle.bg} ${urgStyle.text} ${urgStyle.border}`}>
                    {selectedRequest.urgency?.urgency_name || urgStyle.label}
                  </span>
                </div>
                {btStr && (
                  <div className="flex items-center gap-1.5 bg-red-50 text-blood px-3 py-2 rounded-sm border border-red-100 font-black text-lg shrink-0">
                    {btStr}
                  </div>
                )}
              </div>

              {/* Info grid */}
              <div className="bg-slate-50 rounded-sm border border-slate-100 divide-y divide-slate-100">
                <div className="flex items-start gap-3 p-3.5">
                  <User className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Bệnh nhân</div>
                    <div className="text-sm font-semibold text-[#1a2332] mt-0.5">{selectedRequest.patient_name}</div>
                    {selectedRequest.patient_phone && <div className="text-xs text-slate-500 mt-0.5">SĐT: {selectedRequest.patient_phone}</div>}
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3.5">
                  <MapPin className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Nơi điều trị</div>
                    <div className="text-sm font-semibold text-[#1a2332] mt-0.5">{selectedRequest.hospital_name || selectedRequest.facility?.facility_name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{selectedRequest.ward_room || '—'}</div>
                    <div className="text-xs text-slate-500">{selectedRequest.address || selectedRequest.facility?.address || '—'}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 divide-x divide-slate-100">
                  <div className="flex items-start gap-3 p-3.5">
                    <Clock className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                    <div>
                      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Cần trước</div>
                      <div className="text-sm font-semibold text-[#1a2332] mt-0.5">{selectedRequest.required_before ? formatDate(selectedRequest.required_before) : '—'}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3.5">
                    <Droplet className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                    <div>
                      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Chế phẩm</div>
                      <div className="text-sm font-semibold text-[#1a2332] mt-0.5">{selectedRequest.component?.component_name || '—'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {selectedRequest.clinical_notes && (
                <div className="bg-amber-50 border border-amber-200 rounded-sm p-3.5">
                  <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">Ghi chú lâm sàng</div>
                  <div className="text-xs text-amber-800 leading-relaxed whitespace-pre-wrap">{selectedRequest.clinical_notes}</div>
                </div>
              )}

              <div className="pt-3 flex gap-2 justify-end border-t border-slate-100">
                <button onClick={() => setIsDetailOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-sm transition-colors">Đóng</button>
                {(() => {
                  const matchCount = selectedRequest.blood_request_donor_matches?.filter((m: any) => m.match_status === 'ACCEPTED').length || 0;
                  const isFull = matchCount >= 3;
                  return isFull ? (
                    <button disabled className="px-5 py-2 text-xs font-bold text-slate-500 bg-slate-200 rounded-sm cursor-not-allowed flex items-center">
                      Đã đủ người hiến
                    </button>
                  ) : (
                    <Link href={`/donor/book?request=${selectedRequest.request_id}&facility=${selectedRequest.facility_id}`} className="px-5 py-2 text-xs font-bold text-white bg-blood hover:bg-red-700 rounded-sm transition-colors flex items-center gap-1.5">
                      Hiến ngay <ArrowRight className="w-3 h-3" />
                    </Link>
                  );
                })()}
              </div>
            </div>
          );
        })()}
      </BaseModal>

    </MainLayout>
  );
}
