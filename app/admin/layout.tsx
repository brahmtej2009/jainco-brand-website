import type { Metadata } from 'next';
import AdminChrome from '@/components/admin/AdminChrome';
import AdminLogin from '@/components/admin/AdminLogin';
import { currentAdmin, hasAnyAdmin } from '@/lib/auth';
import { countNewEnquiries } from '@/lib/enquiries';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // One gate for every admin route: signed-out visitors never receive the dashboard markup.
  const admin = await currentAdmin();
  if (!admin) return <AdminLogin setupNeeded={!hasAnyAdmin()} />;

  return (
    <AdminChrome username={admin.username} newEnquiries={countNewEnquiries()}>
      {children}
    </AdminChrome>
  );
}
