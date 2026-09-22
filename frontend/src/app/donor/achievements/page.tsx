'use client';
import { useEffect, useState } from 'react';
import { donorService } from '@/lib/services/donor';
import { Award, Heart, Star, Shield, Droplet, Calendar, Info } from 'lucide-react';

export default function AchievementsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await donorService.getAchievements();
      if (res && res.data) {
        setData(res.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'droplet': return <Droplet className="w-8 h-8" />;
      case 'heart': return <Heart className="w-8 h-8" />;
      case 'award': return <Award className="w-8 h-8" />;
      case 'star': return <Star className="w-8 h-8" />;
      case 'shield': return <Shield className="w-8 h-8" />;
      default: return <Award className="w-8 h-8" />;
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blood"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy">Thành Tích Của Bạn</h1>
          <p className="text-slate-500 text-sm mt-1">Ghi nhận những đóng góp ý nghĩa của bạn cho cộng đồng</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-red-900">Tổng Lần Hiến</h3>
            <Heart className="w-6 h-6 text-red-500" />
          </div>
          <p className="text-3xl font-bold text-red-600 mt-4">{data?.totalDonations || 0}</p>
          <p className="text-sm text-red-700 mt-1">Lần hiến máu thành công</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-blue-900">Tổng Lượng Máu</h3>
            <Droplet className="w-6 h-6 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-blue-600 mt-4">{data?.totalVolumeMl || 0} <span className="text-lg">ml</span></p>
          <p className="text-sm text-blue-700 mt-1">Đã đóng góp vào ngân hàng máu</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-6 border border-emerald-200">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-emerald-900">Số Người Đã Giúp</h3>
            <UserIcon className="w-6 h-6 text-emerald-500" />
          </div>
          <p className="text-3xl font-bold text-emerald-600 mt-4">{data?.peopleHelped || 0}</p>
          <p className="text-sm text-emerald-700 mt-1">Bệnh nhân khẩn cấp</p>
        </div>
      </div>

      {/* Badges Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mt-8">
        <h2 className="text-lg font-bold text-navy mb-6 flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-500" />
          Huy Hiệu Đạt Được
        </h2>
        
        {data?.badges && data.badges.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {data.badges.map((badge: any) => (
              <div key={badge.id} className="flex flex-col items-center text-center group">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-3 shadow-md transition-transform transform group-hover:scale-110 ${badge.color}`}>
                  {getIcon(badge.icon)}
                </div>
                <h4 className="font-semibold text-sm text-slate-800">{badge.name}</h4>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-slate-50 rounded-lg border border-dashed border-slate-300">
            <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-slate-600">Chưa có huy hiệu nào</h3>
            <p className="text-xs text-slate-500 mt-1">Hãy bắt đầu hành trình hiến máu của bạn để nhận huy hiệu đầu tiên!</p>
          </div>
        )}

        {/* Badge Rules */}
        <div className="bg-slate-50 rounded-xl p-5 mt-8 border border-slate-100">
          <h3 className="font-semibold text-navy flex items-center gap-2 mb-4 text-sm">
            <Info className="w-4 h-4 text-slate-500" />
            Quy luật nhận huy hiệu
          </h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <Droplet className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <span><strong className="text-slate-800">Giọt Máu Đầu Tiên:</strong> Hiến máu thành công 1 lần.</span>
            </li>
            <li className="flex items-start gap-2">
              <Heart className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <span><strong className="text-slate-800">Trái Tim Đồng:</strong> Hiến máu thành công 3 lần.</span>
            </li>
            <li className="flex items-start gap-2">
              <Award className="w-4 h-4 text-slate-600 mt-0.5 shrink-0" />
              <span><strong className="text-slate-800">Trái Tim Bạc:</strong> Hiến máu thành công 5 lần.</span>
            </li>
            <li className="flex items-start gap-2">
              <Star className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
              <span><strong className="text-slate-800">Trái Tim Vàng:</strong> Hiến máu thành công 10 lần.</span>
            </li>
            <li className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
              <span><strong className="text-slate-800">Máu Hiếm:</strong> Thuộc nhóm máu hiếm (AB+ hoặc nhóm Rh-).</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Progress & Info */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mt-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="font-bold text-navy flex items-center gap-2">
            <Droplet className="w-4 h-4 text-blood" /> 
            Nhóm máu của bạn: <span className="text-blood">{data?.bloodType || 'Chưa cập nhật'}</span>
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Ngày có thể hiến máu tiếp theo: {' '}
            <span className="font-medium text-slate-700">
              {data?.nextEligibleDate ? new Date(data.nextEligibleDate).toLocaleDateString('vi-VN') : 'Sẵn sàng hiến ngay'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

function UserIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
