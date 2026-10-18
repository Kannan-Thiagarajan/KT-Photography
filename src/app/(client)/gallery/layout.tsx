import type { Metadata } from 'next';
import { requireGallery } from '@/lib/auth/session';
import { Workspace } from '@/components/layout/workspace';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'My galleries',
  robots: { index: false, follow: false },
};
export default async function GalleryLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireGallery();
  return <Workspace profile={profile}>{children}</Workspace>;
}
