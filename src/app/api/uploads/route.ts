import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { getSession } from '@/lib/auth/session';
import { adminClient } from '@/lib/supabase/admin';
import { signTicket, verifyTicket } from '@/lib/utils/uploads';
import { check, message, uuid } from '@/lib/utils/validation';
export const runtime = 'nodejs';
export const maxDuration = 60;
const types: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.profile.role !== 'admin' || session.profile.must_change_password)
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const db = adminClient();
  let cleanup: { bucket: string; paths: string[] } | null = null;
  try {
    const input = await request.json();
    if (input.phase === 'prepare') {
      const type = String(input.type),
        size = Number(input.size),
        filename = String(input.filename).slice(0, 200),
        albumId = input.albumId ? uuid(String(input.albumId)) : null;
      const bucket = albumId ? 'client-photos' : 'public-assets';
      const max = albumId ? 25 * 1024 * 1024 : 8 * 1024 * 1024;
      if (!types[type] || !Number.isInteger(size) || size < 1 || size > max)
        throw new Error(`Upload JPG, PNG or WebP images under ${max / 1024 / 1024} MB.`);
      let clientId = '';
      if (albumId) {
        const { data: album, error } = await session.db
          .from('albums')
          .select('client_id')
          .eq('id', albumId)
          .single();
        check(error);
        if (!album) throw new Error('Album not found.');
        clientId = album.client_id;
      }
      const path = albumId
        ? `${clientId}/${albumId}/${randomUUID()}.${types[type]}`
        : `packages/${randomUUID()}.${types[type]}`;
      const { data, error } = await db.storage.from(bucket).createSignedUploadUrl(path);
      check(error);
      check(
        (
          await db.from('upload_jobs').insert({
            storage_path: path,
            admin_id: session.user.id,
            album_id: albumId,
            bucket,
            expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          })
        ).error,
      );
      return NextResponse.json({
        url: data!.signedUrl,
        ticket: signTicket({
          path,
          albumId,
          filename,
          size,
          type,
          bucket,
          expires: Date.now() + 15 * 60 * 1000,
          adminId: session.user.id,
        }),
      });
    }
    if (input.phase !== 'complete') throw new Error('Invalid upload request.');
    const ticket = verifyTicket(String(input.ticket));
    if (ticket.adminId !== session.user.id) throw new Error('Invalid upload owner.');
    const { data: claim, error: claimError } = await db
      .from('upload_jobs')
      .update({ status: 'processing' })
      .eq('storage_path', ticket.path)
      .eq('admin_id', session.user.id)
      .eq('status', 'prepared')
      .select('storage_path')
      .maybeSingle();
    check(claimError);
    if (!claim) {
      const { data: photo } = await db
        .from('photos')
        .select('thumbnail_path')
        .eq('storage_path', ticket.path)
        .maybeSingle();
      if (photo) return NextResponse.json({ success: true, path: photo.thumbnail_path });
      throw new Error('This upload is already processing or has expired. Try uploading again.');
    }
    cleanup = { bucket: ticket.bucket, paths: [ticket.path] };
    const { data: file, error } = await db.storage.from(ticket.bucket).download(ticket.path);
    check(error);
    if (!file || file.size !== ticket.size)
      throw new Error('Uploaded size does not match. Please try again.');
    const bytes = Buffer.from(await file.arrayBuffer());
    const image = sharp(bytes, { limitInputPixels: 80_000_000 });
    const metadata = await image.metadata();
    if (
      !metadata.width ||
      !metadata.height ||
      !['jpeg', 'png', 'webp'].includes(metadata.format || '')
    )
      throw new Error('The uploaded file is not a supported image.');
    const thumbnail = await image
      .rotate()
      .resize({
        width: 1200,
        height: 1200,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer();
    const thumbnailPath = ticket.path.replace(/\.[^.]+$/, '-preview.webp');
    cleanup.paths.push(thumbnailPath);
    check(
      (
        await db.storage.from(ticket.bucket).upload(thumbnailPath, thumbnail, {
          contentType: 'image/webp',
          cacheControl: ticket.bucket === 'client-photos' ? '0' : '3600',
          upsert: false,
        })
      ).error,
    );
    if (ticket.albumId) {
      const { data: album } = await session.db
        .from('albums')
        .select('id,client_id,cover_image_path')
        .eq('id', ticket.albumId)
        .single();
      if (!album || !ticket.path.startsWith(`${album.client_id}/${album.id}/`))
        throw new Error('Album is no longer available.');
      check(
        (
          await db.from('photos').insert({
            album_id: album.id,
            storage_path: ticket.path,
            thumbnail_path: thumbnailPath,
            filename: ticket.filename,
            file_size: file.size,
            width: metadata.width,
            height: metadata.height,
          })
        ).error,
      );
      cleanup = null;
      if (!album.cover_image_path)
        await db
          .from('albums')
          .update({ cover_image_path: thumbnailPath })
          .eq('id', album.id)
          .is('cover_image_path', null);
    } else {
      check((await db.storage.from(ticket.bucket).remove([ticket.path])).error);
      cleanup = null;
    }
    await db.from('upload_jobs').update({ status: 'complete' }).eq('storage_path', ticket.path);
    return NextResponse.json({ success: true, path: thumbnailPath });
  } catch (error) {
    if (cleanup) {
      await db.storage.from(cleanup.bucket).remove(cleanup.paths);
      await db
        .from('upload_jobs')
        .update({ status: 'failed' })
        .eq('storage_path', cleanup.paths[0]);
    }
    return NextResponse.json({ error: message(error) }, { status: 400 });
  }
}
