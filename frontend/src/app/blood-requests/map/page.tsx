'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { MainLayout } from '@/components/layout/MainLayout';
import { adminMasterDataService } from '@/lib/services/admin-master-data';
import { bloodRequestService } from '@/lib/services/bloodRequest';
import { MapPin, X, Clock, Heart, Droplet, User, Activity, ArrowRight, Building2, Phone, ChevronLeft, ChevronRight, Loader2, AlertTriangle, CheckCircle2, List, Map as MapIcon, Filter, Navigation, Locate } from 'lucide-react';
import Link from 'next/link';

// Dynamic import to avoid SSR issues with Leaflet
const BloodMap = dynamic(() => import('@/components/map/BloodMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-100 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
    </div>
  ),
});

interface FacilityOnMap {
  facility_id: number;
  facility_name: string;
  short_name?: string;
  address?: string;
  phone?: string;
  email?: string;
  latitude?: number;
  longitude?: number;
  is_primary?: boolean;
  logo_url?: string;
  pendingRequests: any[];
  distance_km?: number;
}

const getUrgencyStyle = (code?: string) => {
  if (!code) return { bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-200', dot: 'bg-slate-400' };
  const c = code.toUpperCase();
  if (c === 'CRITICAL') return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' };
  if (c === 'URGENT' || c === 'HIGH') return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' };
  return { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', dot: 'bg-blue-500' };
};

// Haversine formula to calculate distance between two coordinates in km
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function BloodMapPage() {
  const [facilities, setFacilities] = useState<FacilityOnMap[]>([]);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFacility, setSelectedFacility] = useState<FacilityOnMap | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [filterHasRequests, setFilterHasRequests] = useState(false);

  // Geolocation
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [sortByDistance, setSortByDistance] = useState(false);

  // Region / City & Blood Type Filters
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [selectedBloodType, setSelectedBloodType] = useState<string>('ALL');
  const [flyToCoords, setFlyToCoords] = useState<[number, number] | null>(null);
  const [flyToZoom, setFlyToZoom] = useState<number>(13);

  const REGIONS: Record<string, { label: string; coords: [number, number]; zoom: number; keywords: string[] }> = {
    ALL: { label: 'Tất cả khu vực', coords: [10.7769, 106.6953], zoom: 11, keywords: [] },
    HCM: { label: 'TP. Hồ Chí Minh', coords: [10.7769, 106.6953], zoom: 12, keywords: ['Hồ Chí Minh', 'TP.HCM', 'Sài Gòn'] },
    CAN_THO: { label: 'TP. Cần Thơ', coords: [10.0336, 105.7865], zoom: 13, keywords: ['Cần Thơ', 'Ninh Kiều'] },
    DA_NANG: { label: 'TP. Đà Nẵng', coords: [16.0544, 108.2022], zoom: 13, keywords: ['Đà Nẵng', 'Hải Châu'] },
    HA_NOI: { label: 'Thủ đô Hà Nội', coords: [21.0285, 105.8542], zoom: 12, keywords: ['Hà Nội', 'Cầu Giấy', 'Đống Đa'] },
  };

  const handleRegionChange = (regKey: string) => {
    setSelectedRegion(regKey);
    const reg = REGIONS[regKey];
    if (reg) {
      setFlyToCoords(reg.coords);
      setFlyToZoom(reg.zoom);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [facRes, reqRes] = await Promise.all([
        adminMasterDataService.getFacilities({ limit: 1000 }),
        bloodRequestService.getAllRequests({ limit: 1000 }),
      ]);

      let facilityList: any[] = [];
      if (facRes) {
        const data: any = (facRes as any).data;
        facilityList = Array.isArray(data) ? data : (data?.data || []);
      }

      let requestList: any[] = [];
      if (reqRes) {
        const data: any = (reqRes as any).data;
        if (Array.isArray(data)) requestList = data;
        else if (data?.data && Array.isArray(data.data)) requestList = data.data;
        else if (Array.isArray(reqRes)) requestList = reqRes as any;
      }

      setAllRequests(requestList);

      // Merge requests into facilities
      const merged: FacilityOnMap[] = facilityList.map((f: any) => ({
        ...f,
        pendingRequests: requestList.filter(
          (r: any) =>
            r.facility_id === f.facility_id &&
            (r.status?.status_code?.toUpperCase() === 'PENDING' || r.status?.status_code?.toUpperCase() === 'APPROVED')
        ),
      }));

      setFacilities(merged);
    } catch (error) {
      console.error('Error loading map data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate distances when user location is available
  const facilitiesWithDistance = useMemo(() => {
    if (!userLocation) return facilities;
    return facilities.map(f => {
      if (f.latitude && f.longitude) {
        return { ...f, distance_km: haversineDistance(userLocation[0], userLocation[1], f.latitude, f.longitude) };
      }
      return { ...f, distance_km: undefined };
    });
  }, [facilities, userLocation]);

  const nearestFacilityId = useMemo(() => {
    if (!userLocation) return null;
    const validFacilities = facilitiesWithDistance.filter(f => f.distance_km !== undefined);
    if (validFacilities.length === 0) return null;
    validFacilities.sort((a, b) => (a.distance_km || Infinity) - (b.distance_km || Infinity));
    return validFacilities[0].facility_id;
  }, [facilitiesWithDistance, userLocation]);

  const displayFacilities = useMemo(() => {
    let list = facilitiesWithDistance;

    // Filter by Region
    if (selectedRegion !== 'ALL') {
      const keywords = REGIONS[selectedRegion]?.keywords || [];
      list = list.filter(f =>
        keywords.some(kw =>
          (f.address && f.address.toLowerCase().includes(kw.toLowerCase())) ||
          (f.facility_name && f.facility_name.toLowerCase().includes(kw.toLowerCase()))
        )
      );
    }

    // Filter by Blood Type
    if (selectedBloodType !== 'ALL') {
      list = list.filter(f =>
        f.pendingRequests.some(r => {
          const btStr = r.blood_type ? (r.blood_type.abo + r.blood_type.rh_factor).replace(/\s+/g, '') : '';
          return btStr === selectedBloodType;
        })
      );
    }

    // Filter by has requests
    if (filterHasRequests) {
      list = list.filter(f => f.pendingRequests.length > 0);
    }

    if (sortByDistance && userLocation) {
      list = [...list].sort((a, b) => (a.distance_km || Infinity) - (b.distance_km || Infinity));
    }
    return list;
  }, [facilitiesWithDistance, selectedRegion, selectedBloodType, filterHasRequests, sortByDistance, userLocation]);

  const totalPending = useMemo(() => {
    return facilities.reduce((sum, f) => sum + f.pendingRequests.length, 0);
  }, [facilities]);

  const facilitiesWithRequests = useMemo(() => {
    return facilities.filter(f => f.pendingRequests.length > 0).length;
  }, [facilities]);

  const handleFacilitySelect = (facility: FacilityOnMap) => {
    setSelectedFacility(facility);
    setPanelOpen(true);
  };

  const handleLocateUser = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Trình duyệt không hỗ trợ định vị');
      return;
    }
    setLocatingUser(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation([position.coords.latitude, position.coords.longitude]);
        setSortByDistance(true);
        setLocatingUser(false);
      },
      (error) => {
        setLocationError('Không thể lấy vị trí. Vui lòng cho phép truy cập vị trí.');
        setLocatingUser(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <MainLayout hideFooter fullHeight>
      <div className="flex-1 flex flex-col bg-[#f0f2f5] overflow-hidden">
        {/* Top bar */}
        <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-4">
            <Link href="/blood-requests" className="text-sm text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1.5 transition-colors">
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Danh sách</span>
            </Link>
            <div className="h-5 w-px bg-slate-200" />
            <h1 className="text-sm font-bold text-[#1a2332] flex items-center gap-2">
              <MapIcon className="w-4 h-4 text-blood" />
              Bản đồ Cơ sở Y tế & Yêu cầu Máu
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Stats */}
            <div className="hidden md:flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-500">{facilities.length} cơ sở</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Droplet className="w-3.5 h-3.5 text-blood" />
                <span className="text-slate-500 font-semibold">{totalPending} yêu cầu chờ</span>
              </div>
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-slate-500">{facilitiesWithRequests} cơ sở có yêu cầu</span>
              </div>
            </div>
            <div className="h-5 w-px bg-slate-200 hidden md:block" />
            {/* Region select */}
            <select
              value={selectedRegion}
              onChange={(e) => handleRegionChange(e.target.value)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-sm border border-slate-300 bg-white text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-blood"
            >
              {Object.entries(REGIONS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>

            {/* Blood type select */}
            <select
              value={selectedBloodType}
              onChange={(e) => setSelectedBloodType(e.target.value)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-sm border border-slate-300 bg-white text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-blood hidden sm:block"
            >
              <option value="ALL">Mọi nhóm máu</option>
              {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bt => (
                <option key={bt} value={bt}>Cần {bt}</option>
              ))}
            </select>

            {/* Locate me button */}
            <button
              onClick={handleLocateUser}
              disabled={locatingUser}
              className={`text-xs font-semibold px-3 py-1.5 rounded-sm border transition-all flex items-center gap-1.5 ${
                userLocation
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300'
              }`}
            >
              {locatingUser ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Navigation className="w-3 h-3" />
              )}
              {userLocation ? 'Đã định vị' : 'Tìm BV gần tôi'}
            </button>
            {/* Filter toggle */}
            <button
              onClick={() => setFilterHasRequests(!filterHasRequests)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-sm border transition-colors flex items-center gap-1.5 ${
                filterHasRequests 
                  ? 'bg-blood text-white border-blood' 
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-3 h-3" />
              Chỉ hiện có yêu cầu
            </button>
          </div>
        </div>

        {/* Location error */}
        {locationError && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-700 flex items-center gap-2 shrink-0">
            <AlertTriangle className="w-3.5 h-3.5" />
            {locationError}
            <button onClick={() => setLocationError('')} className="ml-auto text-amber-500 hover:text-amber-700">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Map + Panel */}
        <div className="flex-1 flex relative overflow-hidden">
          {/* Map */}
          <div className="flex-1 relative">
            {loading ? (
              <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-10 h-10 animate-spin text-slate-300" />
                <span className="text-sm text-slate-400 font-medium">Đang tải bản đồ...</span>
              </div>
            ) : (
              <BloodMap
                facilities={displayFacilities}
                onFacilitySelect={handleFacilitySelect}
                selectedFacilityId={selectedFacility?.facility_id}
                userLocation={userLocation}
                nearestFacilityId={nearestFacilityId}
                flyToCoords={flyToCoords}
                flyToZoom={flyToZoom}
              />
            )}

            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-sm p-3 z-[1000] shadow-sm">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Chú thích</div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span>≥ 3 yêu cầu đang chờ</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span>1–2 yêu cầu đang chờ</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span>Không có yêu cầu</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-1 ring-amber-400/50" />
                  <span>Cơ sở chính (★)</span>
                </div>
                {userLocation && (
                  <>
                    <div className="flex items-center gap-2 text-xs text-blue-600">
                      <div className="w-3 h-3 rounded-full bg-blue-500 ring-2 ring-blue-200" />
                      <span>Vị trí của bạn</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-violet-600">
                      <div className="w-3 h-3 rounded-full bg-violet-500 animate-pulse" />
                      <span>Gần bạn nhất</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Toggle panel button (when closed) */}
            {!panelOpen && selectedFacility && (
              <button
                onClick={() => setPanelOpen(true)}
                className="absolute top-4 right-4 bg-white border border-slate-200 rounded-sm shadow-md px-3 py-2 z-[1000] flex items-center gap-2 text-xs font-semibold text-[#1a2332] hover:bg-slate-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Xem chi tiết
              </button>
            )}
          </div>

          {/* Side panel */}
          <div
            className={`absolute lg:relative right-0 top-0 bottom-0 bg-white border-l border-slate-200 z-[1001] transition-all duration-300 ease-in-out flex flex-col ${
              panelOpen ? 'w-full sm:w-[420px] translate-x-0' : 'w-0 translate-x-full lg:translate-x-0 overflow-hidden'
            }`}
          >
            {selectedFacility ? (
              <>
                {/* Panel header */}
                <div className="bg-[#1a2332] text-white px-5 py-4 shrink-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 mr-3">
                      <div className="flex items-center gap-2 mb-1">
                        {selectedFacility.is_primary && (
                          <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase">Cơ sở chính</span>
                        )}
                        {selectedFacility.facility_id === nearestFacilityId && (
                          <span className="bg-violet-500/20 text-violet-300 text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase animate-pulse">⭐ Gần nhất</span>
                        )}
                      </div>
                      <h2 className="text-base font-bold leading-tight truncate">{selectedFacility.facility_name}</h2>
                      {selectedFacility.short_name && (
                        <p className="text-white/50 text-xs mt-0.5">{selectedFacility.short_name}</p>
                      )}
                    </div>
                    <button
                      onClick={() => { setPanelOpen(false); }}
                      className="text-white/60 hover:text-white transition-colors p-1 shrink-0"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  {/* Facility info */}
                  <div className="mt-3 space-y-1.5 text-xs text-white/60">
                    {selectedFacility.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{selectedFacility.address}</span>
                      </div>
                    )}
                    {selectedFacility.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3 shrink-0" />
                        <span>{selectedFacility.phone}</span>
                      </div>
                    )}
                    {selectedFacility.distance_km !== undefined && (
                      <div className="flex items-center gap-2 text-blue-300 font-semibold">
                        <Navigation className="w-3 h-3 shrink-0" />
                        <span>{selectedFacility.distance_km.toFixed(1)} km từ vị trí của bạn</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats bar */}
                <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 grid grid-cols-3 gap-3 shrink-0">
                  <div className="text-center">
                    <div className="text-lg font-bold text-[#1a2332]">{selectedFacility.pendingRequests.length}</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Đang chờ</div>
                  </div>
                  <div className="text-center border-x border-slate-200">
                    <div className="text-lg font-bold text-blood">
                      {selectedFacility.pendingRequests.reduce((s: number, r: any) => s + (r.units_needed || 0), 0)}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Đơn vị cần</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-amber-600">
                      {selectedFacility.pendingRequests.filter((r: any) => r.urgency?.urgency_code === 'CRITICAL').length}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Nguy kịch</div>
                  </div>
                </div>

                {/* Requests list */}
                <div className="flex-1 overflow-y-auto">
                  {selectedFacility.pendingRequests.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {selectedFacility.pendingRequests.map((req: any) => {
                        const urgStyle = getUrgencyStyle(req.urgency?.urgency_code);
                        return (
                          <div
                            key={req.request_id}
                            className="px-5 py-4 hover:bg-slate-50/50 transition-colors"
                          >
                            {/* Top row: urgency + blood type */}
                            <div className="flex items-center justify-between mb-2.5">
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm border ${urgStyle.bg} ${urgStyle.text} ${urgStyle.border}`}>
                                {req.urgency?.urgency_name || 'Chưa rõ'}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {req.blood_type && (
                                  <span className="bg-red-50 text-blood text-xs font-bold px-2 py-0.5 rounded-sm border border-red-100">
                                    {(req.blood_type.abo + req.blood_type.rh_factor).replace(/\s+/g, '')}
                                  </span>
                                )}
                                <span className="text-xs text-slate-500 font-semibold">
                                  ×{req.units_needed} ĐV
                                </span>
                              </div>
                            </div>

                            {/* Patient info */}
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 text-sm">
                                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="font-semibold text-slate-800 truncate">{req.patient_name}</span>
                              </div>
                              {req.component && (
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                  <Droplet className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span>{req.component.component_name}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>Cần trước: {req.required_before ? formatDate(req.required_before) : 'Chưa xác định'}</span>
                              </div>
                              {req.clinical_notes && (
                                <div className="text-xs text-slate-500 bg-slate-50 rounded-sm p-2 mt-1 line-clamp-2 italic">
                                  &quot;{req.clinical_notes}&quot;
                                </div>
                              )}
                            </div>

                            {/* Action */}
                            <div className="mt-3 flex gap-2">
                              {(() => {
                                const matchCount = req.blood_request_donor_matches?.filter((m: any) => m.match_status === 'ACCEPTED').length || 0;
                                const isFull = matchCount >= 3;
                                return isFull ? (
                                  <button disabled className="flex-1 text-center px-3 py-2 bg-slate-200 text-slate-500 text-xs font-bold rounded-sm cursor-not-allowed">
                                    Đã đủ người hiến
                                  </button>
                                ) : (
                                  <Link
                                    href={`/donor/book?request=${req.request_id}&facility=${selectedFacility.facility_id}`}
                                    className="flex-1 text-center px-3 py-2 bg-blood text-white text-xs font-bold rounded-sm hover:bg-red-700 transition-colors flex items-center justify-center gap-1.5"
                                  >
                                    <Heart className="w-3 h-3" /> Hiến ngay
                                  </Link>
                                );
                              })()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 px-6">
                      <CheckCircle2 className="w-12 h-12 text-emerald-200 mb-3" />
                      <h3 className="text-sm font-bold text-slate-700 mb-1">Không có yêu cầu</h3>
                      <p className="text-xs text-slate-400 text-center">
                        Cơ sở y tế này hiện không có yêu cầu máu nào đang chờ xử lý.
                      </p>
                    </div>
                  )}
                </div>

                {/* Panel footer */}
                <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 shrink-0">
                  <Link
                    href={`/donor/book?facility=${selectedFacility.facility_id}`}
                    className="w-full block text-center px-4 py-2.5 bg-[#1a2332] text-white text-xs font-bold rounded-sm hover:bg-[#253344] transition-colors"
                  >
                    Đăng ký hiến máu tại cơ sở này →
                  </Link>
                </div>
              </>
            ) : (
              /* No facility selected state */
              <div className="flex-1 flex flex-col items-center justify-center px-8">
                <div className="w-16 h-16 bg-slate-100 rounded-sm flex items-center justify-center mb-4">
                  <MapPin className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-sm font-bold text-slate-700 mb-1 text-center">Chọn một cơ sở y tế</h3>
                <p className="text-xs text-slate-400 text-center leading-relaxed mb-6">
                  Nhấp vào biểu tượng bệnh viện trên bản đồ để xem danh sách yêu cầu máu đang chờ xử lý tại cơ sở đó.
                </p>
                {!userLocation && (
                  <button
                    onClick={handleLocateUser}
                    disabled={locatingUser}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-sm hover:bg-blue-700 transition-colors"
                  >
                    {locatingUser ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Locate className="w-3.5 h-3.5" />}
                    Tìm bệnh viện gần tôi
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Panel toggle (desktop, when panel is closed) */}
          {!panelOpen && (
            <button
              onClick={() => setPanelOpen(true)}
              className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 bg-white border border-r-0 border-slate-200 rounded-l-sm shadow-md w-6 h-16 items-center justify-center z-[1001] hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
