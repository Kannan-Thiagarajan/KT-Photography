import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  const headers = { 'Cache-Control': 'private, no-store' };
  if (!session || session.profile.must_change_password)
    return NextResponse.json(
      { error: 'Sign in to access this photograph.' },
      { status: 401, headers },
    );
  const { id } = await params;
  const { data: photo, error } = await session.db
    .from('photos')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error || !photo)
    return NextResponse.json({ error: 'Photograph not found.' }, { status: 404, headers });
  const download = new URL(request.url).searchParams.get('download') === '1';
  const { data: signed, error: signError } = await session.db.storage
    .from('client-photos')
    .createSignedUrl(
      download ? photo.storage_path : photo.thumbnail_path,
      60,
      download ? { download: photo.filename } : {},
    );
  if (signError || !signed)
    return NextResponse.json({ error: 'Unable to load photograph.' }, { status: 404, headers });
  return NextResponse.redirect(signed.signedUrl, { status: 302, headers });
}
