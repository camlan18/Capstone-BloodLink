'use client';
import { useState } from 'react';
import EducationDocumentsTab from './components/EducationDocumentsTab';
import EducationCategoriesTab from './components/EducationCategoriesTab';
import { BookOpen } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';


export default function AdminEducationPage() {
  const [activeTab, setActiveTab] = useState('documents');

  return (
    <div className="space-y-6">
            <PageHeader
        title="Tài liệu Giáo dục"
        description="Quản lý các bài viết, hướng dẫn và kiến thức về hiến máu"
      />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex px-6 pt-4 border-b border-slate-200 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('documents')}
            className={`px-8 py-3 text-sm font-bold transition-all whitespace-nowrap rounded-t-xl border-b-4 -mb-px ${activeTab === 'documents' ? 'bg-red-50 text-blood border-blood' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
          >
            Tất cả tài liệu
          </button>
          <button 
            onClick={() => setActiveTab('categories')}
            className={`px-8 py-3 text-sm font-bold transition-all whitespace-nowrap rounded-t-xl border-b-4 -mb-px ${activeTab === 'categories' ? 'bg-red-50 text-blood border-blood' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
          >
            Danh mục
          </button>
        </div>
        
        <div className="p-0">
          {activeTab === 'documents' && <EducationDocumentsTab />}
          {activeTab === 'categories' && <EducationCategoriesTab />}
        </div>
      </div>
    </div>
  );
}
