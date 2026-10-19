import type { Metadata } from 'next';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { HomepagePhotoManager } from '@/components/admin/homepage-photo-manager';
import type { HomepagePhoto } from '@/types/models';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Homepage Photos — Studio',
};

export default async function HomepageAdminPage() {
  const { db } = await requireAdmin();

  let photos: HomepagePhoto[] = [];
  try {
    const { data, error } = await db
      .from('homepage_photos')
      .select('*')
      .order('display_order', { ascending: true });

    if (!error && data) {
      photos = data as HomepagePhoto[];
    }
  } catch {
    photos = [];
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">PORTFOLIO SPOTLIGHT</p>
          <h1>
            Homepage <em>showcase.</em>
          </h1>
          <p>Curate and reorder the photographs featured on your public landing page.</p>
        </div>
        <Link
          href="/#portfolio"
          target="_blank"
          className="button button-outline"
        >
          View live portfolio <ExternalLink size={15} />
        </Link>
      </div>

      <HomepagePhotoManager
        photos={photos}
        supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL || ''}
      />
    </>
  );
}
