'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { blogService } from '@/lib/services/blog';
import { BlogPost } from '@/types';
import { MainLayout } from '@/components/layout/MainLayout';
import { ArrowLeft, Calendar, Eye, Tag, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { BlogComments } from '@/components/blog/BlogComments';

export default function BlogDetailPage() {
  const { slug } = useParams();
  const router = useRouter();
  const [document, setDocument] = useState<BlogPost | null>(null);
  const [related, setRelated] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchData(slug as string);
    }
  }, [slug]);

  const fetchData = async (slugId: string) => {
    try {
      setLoading(true);
      const res = await blogService.getPostBySlug(slugId);
      if (res && res.data) {
        setDocument(res.data);
        // Fetch related
        const relatedRes = await blogService.getRelatedPosts(slugId);
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
      <div className="relative bg-navy pt-20 pb-24 overflow-hidden">
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-blood rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
          <div className="absolute top-40 -left-40 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto">
            <Link href="/blog" className="inline-flex items-center text-sm font-medium text-slate-300 hover:text-white transition-colors mb-8 group">
              <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" /> Quay lại Blog
            </Link>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-8 leading-tight tracking-tight shadow-sm">
              {document.title}
            </h1>

            <div className="flex flex-wrap items-center gap-6 text-sm text-slate-300 bg-white/5 inline-flex p-3 pr-6 rounded-full backdrop-blur-md border border-white/10">
              {document.category && (
                <div className="flex items-center gap-2 border-r border-white/10 pr-6">
                  <Tag className="w-4 h-4 text-red-300" />
                  <span className="font-semibold text-red-300">{document.category.category_name}</span>
                </div>
              )}
              {document.author && (
                <div className="flex items-center gap-3 border-r border-white/10 pr-6">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200 shrink-0 ring-2 ring-white/20 shadow-inner">
                    {document.author.avatar_url ? (
                      <img src={document.author.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-300 text-slate-600 font-bold text-lg">
                        {document.author.full_name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <span className="font-semibold text-white text-base">{document.author.full_name}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="font-medium">{new Date(document.published_at || document.created_at).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-slate-400" />
                <span className="font-medium">{document.view_count} lượt xem</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-16">
          
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {document.thumbnail_url && (
              <div className="mb-12 rounded-3xl overflow-hidden shadow-2xl shadow-navy/10 -mt-32 relative z-20 border-4 border-white bg-white">
                <img src={document.thumbnail_url} alt={document.title} className="w-full h-auto max-h-[500px] object-cover" />
              </div>
            )}

            <div className="prose prose-lg md:prose-xl max-w-none prose-headings:text-navy prose-headings:font-bold prose-h2:text-3xl prose-h3:text-2xl prose-a:text-blood hover:prose-a:text-blood-dark prose-img:rounded-2xl prose-img:shadow-lg prose-p:text-slate-700 prose-p:leading-relaxed bg-white rounded-3xl p-8 md:p-12">
              <div dangerouslySetInnerHTML={{ __html: document.content_html }} />
            </div>

            {/* Comments Section */}
            <BlogComments postId={document.post_id} />
          </div>

          {/* Sidebar / Related */}
          {related.length > 0 && (
            <div className="w-full lg:w-96 shrink-0 space-y-8">
              <div className="sticky top-24 bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40">
                <h3 className="text-xl font-extrabold text-navy mb-6 flex items-center gap-3">
                  <div className="w-2 h-8 bg-gradient-to-b from-blood to-blood-dark rounded-full shadow-sm"></div>
                  Bài viết liên quan
                </h3>
                <div className="space-y-6">
                  {related.map(item => (
                    <Link key={item.post_id} href={`/blog/${item.slug}`} className="block group">
                      <div className="flex gap-5 items-start">
                        {item.thumbnail_url && (
                          <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 bg-slate-100 shadow-inner relative">
                            <div className="absolute inset-0 bg-navy/10 group-hover:bg-transparent transition-colors z-10"></div>
                            <img src={item.thumbnail_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out" />
                          </div>
                        )}
                        <div className="flex flex-col pt-1">
                          <h4 className="font-bold text-navy text-sm leading-snug line-clamp-2 group-hover:text-blood transition-colors duration-300">
                            {item.title}
                          </h4>
                          <span className="text-xs font-medium text-slate-400 mt-2 flex items-center gap-1.5">
                            <Calendar className="w-3 h-3" />
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
