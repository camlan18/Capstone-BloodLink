import { AdminLayout } from '@/components/layout/AdminLayout';
import { Metadata } from 'next';

/** Metadata mặc định cho khu vực trang quản trị Admin Portal. */
export const metadata: Metadata = {
  title: 'Admin Portal | Hệ thống Hiến Máu',
  description: 'Hệ thống quản trị và nhân viên y tế',
};

/**
 * Layout bọc tất cả trang con trong đường dẫn /admin bằng AdminLayout.
 */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}
