'use server';
import { requireAdmin } from '@/lib/auth/session';
import { adminClient } from '@/lib/supabase/admin';
import { check, message, uuid } from '@/lib/utils/validation';
import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/types/models';
function refreshAlbum(albumId: string) {
  revalidatePath(`/admin/albums/${albumId}`);
  revalidatePath('/admin/albums');
  revalidatePath(`/gallery/${albumId}`);
  revalidatePath('/gallery');
}
export async function movePhoto(id: string, position: number): Promise<ActionResult> {
  const { db } = await requireAdmin();
  try {
    uuid(id);
    if (!Number.isSafeInteger(position) || position < 0 || position > 2147483646)
      throw new Error('Choose a valid photo position.');
    const { data: albumId, error } = await db.rpc('move_album_photo', {
      p_photo_id: id,
      p_target_position: position,
    });
    check(error);
    if (!albumId) throw new Error('Album not found.');
    refreshAlbum(albumId);
    return { success: 'Photo order saved. Your client sees this order too.' };
  } catch (error) {
    return { error: message(error) };
  }
}
export async function setAlbumCover(id: string): Promise<ActionResult> {
  const { db } = await requireAdmin();
  try {
    uuid(id);
    const { data: photo, error } = await db
      .from('photos')
      .select('album_id,thumbnail_path')
      .eq('id', id)
      .single();
    check(error);
    if (!photo) throw new Error('Photo not found.');
    check(
      (
        await db
          .from('albums')
          .update({ cover_image_path: photo.thumbnail_path })
          .eq('id', photo.album_id)
      ).error,
    );
    refreshAlbum(photo.album_id);
    return { success: 'Album cover saved. It appears on the client gallery home.' };
  } catch (error) {
    return { error: message(error) };
  }
}
export async function deletePhoto(id: string): Promise<ActionResult> {
  const { db } = await requireAdmin();
  try {
    uuid(id);
    const { data: photo, error } = await db.from('photos').select('*').eq('id', id).single();
    check(error);
    if (!photo) throw new Error('Photo not found.');
    const { data: nextCover, error: coverError } = await db
      .from('photos')
      .select('thumbnail_path')
      .eq('album_id', photo.album_id)
      .neq('id', id)
      .order('display_order')
      .limit(1)
      .maybeSingle();
    check(coverError);
    check(
      (
        await adminClient()
          .storage.from('client-photos')
          .remove([photo.storage_path, photo.thumbnail_path])
      ).error,
    );
    check(
      (
        await db
          .from('albums')
          .update({ cover_image_path: nextCover?.thumbnail_path || null })
          .eq('id', photo.album_id)
          .eq('cover_image_path', photo.thumbnail_path)
      ).error,
    );
    check((await db.from('photos').delete().eq('id', id)).error);
    refreshAlbum(photo.album_id);
    return { success: 'Photograph deleted.' };
  } catch (error) {
    return { error: message(error) };
  }
}
