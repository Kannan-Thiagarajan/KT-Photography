import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  const headers = { 'Cache-Control': 'private, no-store' };
  if (!session || session.profile.must_change_password)
    return new NextResponse(null, { status: 401, headers });
  const { id } = await params;
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
