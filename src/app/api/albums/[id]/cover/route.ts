import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSession } from '@/lib/auth/session';
import { adminClient } from '@/lib/supabase/admin';
import type { Database } from '@/types/database';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  const headers = { 'Cache-Control': 'private, no-store' };
  const { id } = await params;

  if (!session || session.profile.must_change_password) {
    const anonDb = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false } },
    );
    const { data: publicAlbum } = await anonDb
      .from('albums')
      .select('cover_image_path, is_public, client_id')
      .eq('id', id)
      .eq('is_public', true)
      .is('client_id', null)
      .maybeSingle();

    if (!publicAlbum?.cover_image_path) {
      return new NextResponse(null, { status: 401, headers });
    }

    const adminStorage = adminClient().storage.from('client-photos');
    const { data: signed } = await adminStorage.createSignedUrl(publicAlbum.cover_image_path, 60);
    if (!signed) return new NextResponse(null, { status: 404, headers });
    return NextResponse.redirect(signed.signedUrl, {
      status: 302,
      headers: { 'Cache-Control': 'public, max-age=60' },
    });
  }
  const { data: album } = await session.db
    .from('albums')
    .select('cover_image_path')
    .eq('id', id)
    .maybeSingle();
  if (!album?.cover_image_path) return new NextResponse(null, { status: 404, headers });
  const { data: photo } = await session.db
    .from('photos')
    .select('thumbnail_path')
    .eq('album_id', id)
    .eq('thumbnail_path', album.cover_image_path)
    .maybeSingle();
  if (!photo) return new NextResponse(null, { status: 404, headers });
  const { data: signed } = await session.db.storage
    .from('client-photos')
    .createSignedUrl(photo.thumbnail_path, 60);
  if (!signed) return new NextResponse(null, { status: 404, headers });
  return NextResponse.redirect(signed.signedUrl, { status: 302, headers });
}
