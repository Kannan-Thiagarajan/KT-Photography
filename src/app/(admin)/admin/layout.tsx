import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/session';
import { Workspace } from '@/components/layout/workspace';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Studio',
  robots: { index: false, follow: false },
};
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAdmin();
  return <Workspace profile={profile}>{children}</Workspace>;
}
