'use client';
import { useState } from 'react';
import EducationDocumentsTab from './components/EducationDocumentsTab';
import EducationCategoriesTab from './components/EducationCategoriesTab';
import { BookOpen } from 'lucide-react';

export default function AdminEducationPage() {
  const [activeTab, setActiveTab] = useState('documents');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center">
            <BookOpen className="w-6 h-6 mr-2 text-blood" />
            Tài liệu Giáo dục
          </h1>
          <p className="text-sm text-slate-500 mt-1">Quản lý các bài viết, hướng dẫn và kiến thức về hiến máu</p>
        </div>
      </div>

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
