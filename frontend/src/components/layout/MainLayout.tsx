import { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { Toaster } from '@/components/ui/sonner';

/** Props cấu hình bố cục trang công khai MainLayout. */
interface MainLayoutProps {
  children: ReactNode;
  hideFooter?: boolean;
  fullHeight?: boolean;
}

/**
 * Layout chuẩn cho các trang người dùng công khai gồm Header, vùng nội dung chính, Footer tùy chọn và Toaster.
 */
export const MainLayout = ({ children, hideFooter = false, fullHeight = false }: MainLayoutProps) => {
  return (
    <div className={`flex flex-col bg-slate-50 font-sans ${fullHeight ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
      <Header />
      <main className={fullHeight ? 'flex-1 flex flex-col overflow-hidden' : 'flex-1'}>
        {children}
      </main>
      {!hideFooter && <Footer />}
      <Toaster richColors position="top-right" />
    </div>
  );
};
