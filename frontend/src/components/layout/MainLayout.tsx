import { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { Toaster } from '@/components/ui/sonner';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
      <Toaster richColors position="top-right" />
    </div>
  );
};
