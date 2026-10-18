import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSession } from '@/lib/auth/session';
import { adminClient } from '@/lib/supabase/admin';
import type { Database } from '@/types/database';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  const headers = { 'Cache-Control': 'private, no-store' };
  const { id } = await params;

  if (!session || session.profile.must_change_password) {
    const anonDb = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false } },
    );
    const { data: publicPhoto, error } = await anonDb
      .from('photos')
      .select('*, albums!inner(is_public, client_id)')
      .eq('id', id)
      .maybeSingle();

    const isStudioSample =
      (publicPhoto as any)?.albums?.is_public === true &&
      (publicPhoto as any)?.albums?.client_id === null;
    const isPublicPhoto = (publicPhoto as any)?.is_public === true;

    if (error || !publicPhoto || !isStudioSample || !isPublicPhoto) {
      return NextResponse.json(
        { error: 'Sign in to access this photograph.' },
        { status: 401, headers },
      );
    }

    // Public visitors can only view web-optimised previews; master originals are restricted to authenticated clients/admins
    const download = new URL(request.url).searchParams.get('download') === '1';
    const adminStorage = adminClient().storage.from('client-photos');
    const { data: signed, error: signError } = await adminStorage.createSignedUrl(
      publicPhoto.thumbnail_path,
      60,
      download ? { download: publicPhoto.filename } : {},
    );

    if (signError || !signed) {
      return NextResponse.json({ error: 'Unable to load photograph.' }, { status: 404, headers });
    }

    return NextResponse.redirect(signed.signedUrl, {
      status: 302,
      headers: { 'Cache-Control': 'public, max-age=60' },
    });
  }
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
