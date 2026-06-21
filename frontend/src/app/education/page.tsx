'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { educationService } from '@/lib/services/education';
import { EducationDocument } from '@/types';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { BookOpen, Search, Eye, Calendar, ArrowRight, Filter, ChevronLeft, ChevronRight, X, Grid, List } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

// Skeleton Component
const EducationCardSkeleton = () => (
  <Card className="overflow-hidden border-slate-100 rounded-2xl">
    <div className="h-48 bg-slate-100 animate-pulse relative"></div>
    <CardHeader className="p-4">
      <div className="h-6 bg-slate-200 rounded-full animate-pulse w-3/4 mb-2"></div>
      <div className="flex gap-4">
        <div className="h-3 bg-slate-200 rounded-full animate-pulse w-20"></div>
        <div className="h-3 bg-slate-200 rounded-full animate-pulse w-20"></div>
      </div>
    </CardHeader>
    <CardContent className="p-4 pt-0">
      <div className="space-y-3">
        <div className="h-4 bg-slate-200 rounded-full animate-pulse w-full"></div>
        <div className="h-4 bg-slate-200 rounded-full animate-pulse w-5/6"></div>
        <div className="h-4 bg-slate-200 rounded-full animate-pulse w-4/6"></div>
      </div>
    </CardContent>
    <CardFooter className="p-4 bg-white border-t border-slate-50 flex justify-end">
      <div className="h-10 bg-slate-200 rounded-full animate-pulse w-28"></div>
    </CardFooter>
  </Card>
);

function EducationContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category');

  const [documents, setDocuments] = useState<EducationDocument[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [categoryId, setCategoryId] = useState<string>(categoryParam || 'all');
  const [sortBy, setSortBy] = useState<string>('created_at-DESC');
  const [limit, setLimit] = useState<number>(6);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);

  useEffect(() => {
    if (categoryParam) {
      setCategoryId(categoryParam);
      setPage(1);
    }
  }, [categoryParam]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [search, categoryId, sortBy, limit, page]);

  const fetchCategories = async () => {
    try {
      const res = await educationService.getCategories();
      if (res && res.data) setCategories(res.data);
    } catch (error) { console.error(error); }
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const [sortField, sortOrder] = sortBy.split('-');
      
      const params: any = {
        page,
        limit,
        sort: sortField,
        order: sortOrder as 'ASC' | 'DESC',
      };
      
      if (search) params.search = search;
      if (categoryId !== 'all') params.category_id = parseInt(categoryId);

      const res = await educationService.getDocuments(params);
      
      if (res && res.data) {
        // Handle both paginated and non-paginated responses based on API structure
        if (Array.isArray(res.data)) {
          setDocuments(res.data);
          // Fallback if pagination is not supported by backend yet
          setTotalItems(res.data.length);
          setTotalPages(Math.ceil(res.data.length / limit) || 1);
        } else if ((res.data as any).items) {
          setDocuments((res.data as any).items);
          setTotalItems((res.data as any).total);
          setTotalPages(Math.ceil((res.data as any).total / limit));
        }
      }
    } catch (error) { 
      console.error(error); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const selectedCategory = categories.find(c => c.category_id.toString() === categoryId);

  return (
    <MainLayout>
      {/* Hero */}
      <div className="bg-gradient-to-r from-navy to-navy-light text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-blood font-semibold text-sm uppercase tracking-wider mb-3">Kiến thức</p>
            <h1 className="text-3xl md:text-5xl font-bold mb-6">Tài Liệu & Kiến Thức</h1>
            <p className="text-slate-300 mb-8 text-lg">Tìm hiểu thêm về hiến máu, các quy trình và lợi ích sức khỏe</p>
            <form onSubmit={handleSearch} className="flex gap-2 max-w-lg mx-auto">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Tìm kiếm tài liệu..."
                  className="h-12 pl-12 rounded-md bg-white text-slate-900 border-none focus-visible:ring-2 focus-visible:ring-blood"
                />
              </div>
              <button type="submit" className="h-12 px-6 bg-blood hover:bg-blood-dark text-white font-semibold rounded-md transition-all shadow-md shadow-blood/20">
                Tìm kiếm
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filters Bar Redesign */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-slate-500">Kết quả: <strong className="text-navy">{totalItems}</strong> bài viết</span>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3 flex-wrap">
              {categoryId !== 'all' && selectedCategory && (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-md border border-emerald-400 text-emerald-600 text-sm font-medium bg-emerald-50/50">
                  {selectedCategory.category_name}
                  <button onClick={() => { setCategoryId('all'); setPage(1); }} className="hover:text-emerald-800 transition-colors"><X className="h-4 w-4" /></button>
                </div>
              )}
              {search && (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-md border border-emerald-400 text-emerald-600 text-sm font-medium bg-emerald-50/50">
                  Tìm: {search}
                  <button onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }} className="hover:text-emerald-800 transition-colors"><X className="h-4 w-4" /></button>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto">
                <select 
                  value={limit} 
                  onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-md focus:outline-none focus:border-blood w-full md:w-auto appearance-none bg-white cursor-pointer"
                >
                  <option value={6}>Hiển thị (6/trang)</option>
                  <option value={12}>Hiển thị (12/trang)</option>
                  <option value={24}>Hiển thị (24/trang)</option>
                </select>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between py-3 border-t border-slate-100 bg-slate-50/50 rounded-lg px-2 md:px-4">
            <div className="flex items-center overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-hide text-sm">
              <button 
                onClick={() => { setCategoryId('all'); setPage(1); }}
                className={`whitespace-nowrap pr-4 font-medium transition-colors ${categoryId === 'all' ? 'text-navy font-bold' : 'text-slate-500 hover:text-navy'}`}
              >
                Tất cả
              </button>
              {categories.map(cat => (
                <button 
                  key={cat.category_id}
                  onClick={() => { setCategoryId(cat.category_id.toString()); setPage(1); }}
                  className={`whitespace-nowrap px-4 border-l border-slate-200 font-medium transition-colors ${categoryId === cat.category_id.toString() ? 'text-navy font-bold' : 'text-slate-500 hover:text-navy'}`}
                >
                  {cat.category_name}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 ml-auto shrink-0 mt-4 md:mt-0">
              <span className="text-sm text-slate-500">Sắp xếp:</span>
              <select 
                value={sortBy} 
                onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                className="bg-transparent border-none text-sm font-bold text-navy focus:ring-0 cursor-pointer outline-none pr-2 ml-1"
              >
                <option value="created_at-DESC">Mới nhất</option>
                <option value="created_at-ASC">Cũ nhất</option>
                <option value="view_count-DESC">Nổi bật</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(limit)].map((_, i) => <EducationCardSkeleton key={i} />)}
          </div>
        ) : documents.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
              {documents.map((doc) => (
                <Card key={doc.document_id} className="overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all border-slate-100 rounded-lg group">
                  <div className="h-48 bg-slate-100 relative overflow-hidden">
                    {doc.thumbnail_url ? (
                      <img src={doc.thumbnail_url} alt={doc.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-red-50 group-hover:bg-red-100 transition-colors">
                        <BookOpen className="h-16 w-16 text-blood/30" />
                      </div>
                    )}
                    {doc.category && (
                      <Badge className="absolute top-4 left-4 bg-white text-blood hover:bg-white shadow-sm border-none rounded-md px-3 py-1 font-semibold">
                        {doc.category.category_name}
                      </Badge>
                    )}
                  </div>
                  <CardHeader className="p-5 pb-0">
                    <CardTitle className="line-clamp-2 text-navy text-lg group-hover:text-blood transition-colors">{doc.title}</CardTitle>
                    <CardDescription className="flex items-center gap-4 text-xs mt-3 text-slate-500">
                      <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {new Date(doc.created_at).toLocaleDateString('vi-VN')}</span>
                      <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {doc.view_count} lượt xem</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <p className="text-slate-600 text-sm line-clamp-3 leading-relaxed">{doc.summary}</p>
                  </CardContent>
                  <CardFooter className="p-6 border-t border-slate-50 bg-white mt-auto flex items-center justify-end">
                    <Link
                      href={`/education/${doc.slug}`}
                      className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold border border-blood text-blood bg-white hover:bg-blood hover:text-white rounded-md transition-all group/btn"
                    >
                      Đọc tiếp <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-600" />
                </button>
                
                <div className="flex items-center gap-1">
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i + 1)}
                      className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${page === i + 1 ? 'bg-blood text-white shadow-sm shadow-blood/30' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-slate-600" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20 bg-white border border-dashed border-slate-200 rounded-lg">
            <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-navy mb-2">Không tìm thấy tài liệu</h3>
            <p className="text-slate-500 max-w-md mx-auto">Chúng tôi không tìm thấy tài liệu nào phù hợp với bộ lọc hiện tại. Vui lòng thử thay đổi từ khóa hoặc danh mục.</p>
            <button 
              onClick={() => { setSearchInput(''); setSearch(''); setCategoryId('all'); }}
              className="mt-6 px-6 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-md text-sm font-medium transition-colors"
            >
              Xóa bộ lọc
            </button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export default function EducationPage() {
  return (
    <Suspense fallback={<div className="h-screen w-full flex items-center justify-center text-slate-500">Đang tải...</div>}>
      <EducationContent />
    </Suspense>
  );
}
