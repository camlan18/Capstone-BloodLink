'use client';
import { useEffect, useState } from 'react';
import { TrendingUp, Activity, Users, FileText, Droplets, HeartPulse, Clock, FileSearch } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { adminDashboardService } from '@/lib/services/admin-dashboard';
import { adminMasterDataService } from '@/lib/services/admin-master-data';
import { toast } from 'sonner';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  
  const [facilities, setFacilities] = useState<any[]>([]);
  
  const [facilityId, setFacilityId] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString();
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString());

  const fetchFacilities = async () => {
    try {
      const res = await adminMasterDataService.getFacilities({ limit: 100 });
      if (res && res.data) {
        setFacilities(Array.isArray(res.data) ? res.data : []);
      }
    } catch (e) {
      console.error('Failed to load facilities', e);
    }
  };

  const fetchDashboardData = async () => {
    try {
      let queryStart = startDate;
      let queryEnd = endDate;

      const res = await adminDashboardService.getStats({
        startDate: queryStart || undefined,
        endDate: queryEnd || undefined,
        facilityId: facilityId === 'all' ? undefined : facilityId
      });

      const rawStats = res.data?.stats || {};
      const rawAlerts = res.data?.alerts || {};
      const rawChart = res.data?.chartData || [];

      // Map to UI stats
      setStats([
        { 
          title: 'Lượt hiến máu', 
          value: rawStats.todayDonations?.toString() || '0', 
          icon: Users, 
          bgColor: 'bg-[#EAF9EE]', textColor: 'text-[#28A745]', borderColor: 'border-[#28A745]/20'
        },
        { 
          title: 'Máu thu nhận (ml)', 
          value: (rawStats.totalVolume || 0).toLocaleString(), 
          icon: Droplets, 
          bgColor: 'bg-[#FFE8E8]', textColor: 'text-[#D32F2F]', borderColor: 'border-[#D32F2F]/20'
        },
        { 
          title: 'Người đăng ký mới', 
          value: rawStats.newDonors?.toString() || '0', 
          icon: HeartPulse, 
          bgColor: 'bg-[#E8F0FE]', textColor: 'text-[#1A73E8]', borderColor: 'border-[#1A73E8]/20'
        },
        { 
          title: 'Chiến dịch đang mở', 
          value: rawStats.activeCampaigns?.toString() || '0', 
          icon: Activity, 
          bgColor: 'bg-[#F3E5F5]', textColor: 'text-[#8E24AA]', borderColor: 'border-[#8E24AA]/20'
        },
        { 
          title: 'Yêu cầu từ bệnh viện', 
          value: rawStats.pendingRequests?.toString() || '0', 
          icon: FileSearch, 
          bgColor: 'bg-[#FDF3E5]', textColor: 'text-[#F57C00]', borderColor: 'border-[#F57C00]/20'
        },
        { 
          title: 'Tổng người hiến', 
          value: rawStats.totalDonors?.toLocaleString() || '0', 
          icon: Users, 
          bgColor: 'bg-[#E0F7FA]', textColor: 'text-[#00ACC1]', borderColor: 'border-[#00ACC1]/20'
        },
      ]);

      // Map to UI Alerts
      setAlerts([
        {
          title: 'Kho máu mức thấp',
          value: rawAlerts.lowInventory || 'Không có',
          icon: Droplets,
          bgColor: 'bg-[#FFF5F5]', textColor: 'text-[#DC3545]', borderColor: 'border-[#DC3545]/20'
        },
        {
          title: 'Yêu cầu khẩn cấp',
          value: rawAlerts.emergencyRequests?.toString() || '0',
          icon: FileText,
          bgColor: 'bg-[#FFFDF5]', textColor: 'text-[#FFC107]', borderColor: 'border-[#FFC107]/20'
        },
        {
          title: 'Bình luận chờ duyệt',
          value: rawAlerts.pendingComments?.toString() || '0',
          icon: FileSearch,
          bgColor: 'bg-[#F5FAFF]', textColor: 'text-[#0D6EFD]', borderColor: 'border-[#0D6EFD]/20'
        },
        {
          title: 'Lịch hẹn sắp tới',
          value: rawAlerts.upcomingSchedules?.toString() || '0',
          icon: Clock,
          bgColor: 'bg-[#F8F5FF]', textColor: 'text-[#6610F2]', borderColor: 'border-[#6610F2]/20'
        }
      ]);

      setChartData(rawChart);

    } catch (e) {
      toast.error('Lỗi khi tải dữ liệu thống kê');
    }
  };

  useEffect(() => {
    fetchFacilities();
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [facilityId, startDate, endDate]);

  const maxChartValue = Math.max(...chartData.map(d => d.count), 10); // Minimum 10 to avoid tiny bars

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Area */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-2">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h2>
          <p className="text-sm text-slate-500 mt-1">Tổng quan hoạt động hiến máu</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="w-72">
            <Select value={facilityId} onValueChange={(v) => setFacilityId(v || 'all')}>
              <SelectTrigger className="w-full bg-white border-slate-200 rounded-none shadow-sm focus:ring-0 focus:border-blood h-10 font-medium text-slate-700">
                <SelectValue placeholder="Tất cả cơ sở y tế">
                  {facilityId === 'all' ? 'Tất cả cơ sở y tế' : facilities.find(f => f.facility_id.toString() === facilityId)?.facility_name || 'Tất cả cơ sở y tế'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-none">
                <SelectItem value="all">Tất cả cơ sở y tế</SelectItem>
                {facilities.map(f => (
                  <SelectItem key={f.facility_id} value={f.facility_id.toString()}>
                    {f.facility_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center bg-white border border-slate-200 rounded-none shadow-sm h-10 px-3 group focus-within:border-blood transition-colors">
            <span className="text-sm text-slate-500 mr-2 font-medium">Từ</span>
            <input 
              type="date" 
              className="text-sm border-none focus:outline-none focus:ring-0 text-slate-700 bg-transparent cursor-pointer" 
              value={startDate ? new Date(startDate).toISOString().split('T')[0] : ''}
              onChange={(e) => setStartDate(new Date(e.target.value).toISOString())}
            />
            <span className="text-slate-300 px-3">→</span>
            <span className="text-sm text-slate-500 mr-2 font-medium">Đến</span>
            <input 
              type="date" 
              className="text-sm border-none focus:outline-none focus:ring-0 text-slate-700 bg-transparent cursor-pointer" 
              value={endDate ? new Date(endDate).toISOString().split('T')[0] : ''}
              onChange={(e) => setEndDate(new Date(e.target.value).toISOString())}
            />
          </div>
        </div>
      </div>

      {/* Main Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className={`${stat.bgColor} ${stat.borderColor} border rounded-none p-5 flex flex-col justify-center gap-2 hover:shadow-sm transition-all`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-none flex items-center justify-center bg-white/60 backdrop-blur-sm border ${stat.borderColor}`}>
                  <Icon className={`w-4 h-4 ${stat.textColor}`} />
                </div>
                <div className="flex-1">
                  <h3 className={`text-[13px] font-medium ${stat.textColor} opacity-90 leading-tight`}>{stat.title}</h3>
                  <p className={`text-xl font-bold ${stat.textColor} mt-0.5`}>{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Alert Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {alerts.map((alert, i) => {
          const Icon = alert.icon;
          return (
            <div key={i} className={`bg-white ${alert.borderColor} border rounded-none p-5 flex items-center gap-4 hover:shadow-sm transition-all`}>
              <div className={`w-12 h-12 rounded-none flex items-center justify-center ${alert.bgColor} border ${alert.borderColor}`}>
                <Icon className={`w-6 h-6 ${alert.textColor}`} />
              </div>
              <div className="flex-1 overflow-hidden">
                <h3 className={`text-sm font-semibold text-slate-700`}>{alert.title}</h3>
                <p className={`text-xl font-bold ${alert.textColor} mt-1 leading-none truncate`} title={alert.value}>{alert.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart Area */}
      <div className="bg-white rounded-none border border-slate-200 shadow-sm p-6 overflow-x-auto mt-6">
        <div className="flex items-center gap-2 mb-8">
          <TrendingUp className="w-5 h-5 text-slate-600" />
          <h3 className="text-lg font-bold text-slate-800">Lượt hiến máu theo ngày</h3>
        </div>
        
        {/* Dynamic Chart */}
        <div className="h-64 flex items-end justify-between gap-2 px-4 pb-8 border-b border-slate-100 relative min-w-[600px]">
          {chartData.map((data, i) => {
            const heightPercent = Math.max((data.count / maxChartValue) * 100, 2); // At least 2% to show a tiny bar
            return (
              <div key={i} className="flex flex-col items-center gap-2 flex-1 relative group h-full justify-end">
                <span className="text-xs text-slate-400 absolute -top-6 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-white px-2 py-1 shadow-sm rounded-sm border border-slate-100 z-10">{data.count} lượt</span>
                <div className="w-full bg-[#FFE8E8] transition-all hover:bg-[#D32F2F]" style={{ height: `${heightPercent}%` }}></div>
                <div className="absolute -bottom-8 flex flex-col items-center">
                  <span className="text-xs text-slate-500 font-medium">{data.date}</span>
                </div>
              </div>
            );
          })}
          {chartData.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
              Không có dữ liệu trong khoảng thời gian này
            </div>
          )}
          {/* Base line */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#D32F2F]"></div>
        </div>
      </div>
    </div>
  );
}
