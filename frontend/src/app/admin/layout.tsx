import { AdminLayout } from '@/components/layout/AdminLayout';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Portal | Hệ thống Hiến Máu',
  description: 'Hệ thống quản trị và nhân viên y tế',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}
