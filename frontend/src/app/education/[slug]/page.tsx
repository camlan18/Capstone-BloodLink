'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { educationService } from '@/lib/services/education';
import { EducationDocument } from '@/types';
import { MainLayout } from '@/components/layout/MainLayout';
import { ArrowLeft, Calendar, Eye, Tag, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function EducationDetailPage() {
  const { slug } = useParams();
  const router = useRouter();
  const [document, setDocument] = useState<EducationDocument | null>(null);
  const [related, setRelated] = useState<EducationDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchData(slug as string);
    }
  }, [slug]);

  const fetchData = async (slugId: string) => {
    try {
      setLoading(true);
      const res = await educationService.getDocumentBySlug(slugId);
      if (res && res.data) {
        setDocument(res.data);
        // Fetch related
        const relatedRes = await educationService.getRelatedDocuments(slugId);
        if (relatedRes && relatedRes.data) {
          setRelated(relatedRes.data);
        }
      } else {
        router.push('/404');
      }
    } catch (error) {
      console.error(error);
      router.push('/404');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-12 animate-pulse max-w-5xl mx-auto">
          <div className="h-8 bg-slate-200 rounded w-1/4 mb-6"></div>
          <div className="h-12 bg-slate-200 rounded w-3/4 mb-4"></div>
          <div className="h-64 bg-slate-200 rounded w-full mb-8"></div>
        </div>
      </MainLayout>
    );
  }

  if (!document) return null;

  return (
    <MainLayout>
      {/* Hero Section */}
      <div className="relative bg-navy pt-16 pb-16 overflow-hidden">
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-10 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-blood rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
          <div className="absolute top-40 -left-40 w-72 h-72 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-7xl mx-auto">
            <Link href="/education" className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-white transition-colors mb-6 group">
              <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" /> Quay lại Tài liệu
            </Link>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight max-w-4xl">
              {document.title}
            </h1>

            <div className="flex flex-wrap items-center gap-6 text-sm text-slate-300">
              {document.category && (
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-emerald-400" />
                  <span className="font-medium text-emerald-400">{document.category.category_name}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>{new Date(document.created_at).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-slate-400" />
                <span>{document.view_count} lượt xem</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-12">
          
          {/* Main Content */}
          <div className="flex-1 lg:max-w-[70%] min-w-0">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {document.thumbnail_url && (
                <div className="w-full relative border-b border-slate-100">
                  <img 
                    src={document.thumbnail_url} 
                    alt={document.title} 
                    className="w-full h-auto max-h-[600px] object-cover" 
                  />
                </div>
              )}

              <div className="p-8 md:p-12">
                <div className="prose prose-lg max-w-none w-full break-words overflow-x-hidden prose-headings:text-navy prose-headings:font-bold prose-h2:text-3xl prose-h3:text-2xl prose-a:text-blood hover:prose-a:text-blood-dark prose-img:rounded-lg prose-img:border prose-img:border-slate-100 prose-img:max-w-full prose-img:h-auto prose-p:text-slate-800 prose-p:leading-relaxed">
                  <div 
                    dangerouslySetInnerHTML={{ __html: document.content_html }} 
                    className="w-full [&_img]:max-w-full [&_img]:h-auto [&_iframe]:max-w-full [&_table]:max-w-full [&_table]:block [&_table]:overflow-x-auto"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar / Related */}
          {related.length > 0 && (
            <div className="w-full lg:w-[30%] shrink-0">
              <div className="sticky top-24 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-navy mb-5 flex items-center gap-2">
                  <div className="w-1 h-6 bg-blood rounded-sm"></div>
                  Bài viết liên quan
                </h3>
                <div className="space-y-5">
                  {related.map(item => (
                    <Link key={item.document_id} href={`/education/${item.slug}`} className="block group">
                      <div className="flex gap-4 items-start">
                        {item.thumbnail_url && (
                          <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 border border-slate-100">
                            <img src={item.thumbnail_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-in-out" />
                          </div>
                        )}
                        <div className="flex flex-col pt-0.5">
                          <h4 className="font-semibold text-navy text-sm leading-snug line-clamp-2 group-hover:text-blood transition-colors duration-200">
                            {item.title}
                          </h4>
                          <span className="text-xs font-medium text-slate-500 mt-1.5 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(item.created_at).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </MainLayout>
  );
}
