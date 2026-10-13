'use client';
import { useState } from 'react';
import BlogPostsTab from './components/BlogPostsTab';
import BlogCategoriesTab from './components/BlogCategoriesTab';
import BlogCommentsTab from './components/BlogCommentsTab';
import { PageHeader } from '@/components/ui/PageHeader';


export default function AdminBlogPage() {
  const [activeTab, setActiveTab] = useState('posts');

  return (
    <div className="space-y-6">
            <PageHeader
        title="Quản lý Blog"
        description="Quản lý bài viết và danh mục bài viết"
      />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex px-6 pt-4 border-b border-slate-200 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('posts')}
            className={`px-8 py-3 text-sm font-bold transition-all whitespace-nowrap rounded-t-xl border-b-4 -mb-px ${activeTab === 'posts' ? 'bg-red-50 text-blood border-blood' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
          >
            Tất cả bài viết
          </button>
          <button 
            onClick={() => setActiveTab('categories')}
            className={`px-8 py-3 text-sm font-bold transition-all whitespace-nowrap rounded-t-xl border-b-4 -mb-px ${activeTab === 'categories' ? 'bg-red-50 text-blood border-blood' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
          >
            Danh mục
          </button>
          <button 
            onClick={() => setActiveTab('comments')}
            className={`px-8 py-3 text-sm font-bold transition-all whitespace-nowrap rounded-t-xl border-b-4 -mb-px ${activeTab === 'comments' ? 'bg-red-50 text-blood border-blood' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
          >
            Quản lý bình luận
          </button>
        </div>
        
        <div className="p-0">
          {activeTab === 'posts' && <BlogPostsTab />}
          {activeTab === 'categories' && <BlogCategoriesTab />}
          {activeTab === 'comments' && <BlogCommentsTab />}
        </div>
      </div>
    </div>
  );
}
