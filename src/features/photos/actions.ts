'use server';
import { requireAdmin } from '@/lib/auth/session';
import { adminClient } from '@/lib/supabase/admin';
import { check, message, uuid } from '@/lib/utils/validation';
import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/types/models';
export async function deletePhoto(id: string): Promise<ActionResult> {
  const { db } = await requireAdmin();
  try {
    uuid(id);
    const { data: photo, error } = await db.from('photos').select('*').eq('id', id).single();
    check(error);
    if (!photo) throw new Error('Photo not found.');
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
          .update({ cover_image_path: null })
          .eq('cover_image_path', photo.thumbnail_path)
      ).error,
    );
    check((await db.from('photos').delete().eq('id', id)).error);
    revalidatePath(`/admin/albums/${photo.album_id}`);
    return { success: 'Photograph deleted.' };
  } catch (error) {
    return { error: message(error) };
  }
}
