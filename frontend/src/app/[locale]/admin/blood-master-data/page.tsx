'use client';
import { useState } from 'react';
import BloodTypesTab from './components/BloodTypesTab';
import BloodComponentsTab from './components/BloodComponentsTab';
import BloodCompatibilityTab from './components/BloodCompatibilityTab';
import IntervalRulesTab from './components/IntervalRulesTab';
import { Settings2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';


export default function BloodMasterDataPage() {
  const [activeTab, setActiveTab] = useState('blood_types');

  return (
    <div className="space-y-6">
            <PageHeader
        title="Quản lý Dữ liệu Máu"
        description="Cấu hình danh mục nhóm máu, thành phần máu, và các quy tắc y tế"
      />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex px-6 pt-4 border-b border-slate-200 overflow-x-auto">
          <button 
            className={`px-8 py-3 text-sm font-bold transition-all whitespace-nowrap rounded-t-xl border-b-4 -mb-px ${activeTab === 'blood_types' ? 'bg-red-50 text-blood border-blood' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
            onClick={() => setActiveTab('blood_types')}
          >
            Nhóm máu (ABO/Rh)
          </button>
          <button 
            className={`px-8 py-3 text-sm font-bold transition-all whitespace-nowrap rounded-t-xl border-b-4 -mb-px ${activeTab === 'blood_components' ? 'bg-red-50 text-blood border-blood' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
            onClick={() => setActiveTab('blood_components')}
          >
            Thành phần máu
          </button>
          <button 
            className={`px-8 py-3 text-sm font-bold transition-all whitespace-nowrap rounded-t-xl border-b-4 -mb-px ${activeTab === 'blood_compatibility' ? 'bg-red-50 text-blood border-blood' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
            onClick={() => setActiveTab('blood_compatibility')}
          >
            Độ tương thích
          </button>
          <button 
            className={`px-8 py-3 text-sm font-bold transition-all whitespace-nowrap rounded-t-xl border-b-4 -mb-px ${activeTab === 'interval_rules' ? 'bg-red-50 text-blood border-blood' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
            onClick={() => setActiveTab('interval_rules')}
          >
            Quy tắc khoảng cách
          </button>
        </div>

        <div className="p-0">
          {activeTab === 'blood_types' && <BloodTypesTab />}
          {activeTab === 'blood_components' && <BloodComponentsTab />}
          {activeTab === 'blood_compatibility' && <BloodCompatibilityTab />}
          {activeTab === 'interval_rules' && <IntervalRulesTab />}
        </div>
      </div>
    </div>
  );
}
