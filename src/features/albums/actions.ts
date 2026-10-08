'use server';
import { requireAdmin } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';
import { adminClient } from '@/lib/supabase/admin';
import { check, field, message, uuid } from '@/lib/utils/validation';
import type { ActionResult } from '@/types/models';
export async function saveAlbum(_: ActionResult, data: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  try {
    const id = String(data.get('id') || '');
    const title = field(data, 'title', 180),
      description = String(data.get('description') || '').trim();
    if (description.length > 3000) throw new Error('Description is too long.');
    if (id) {
      uuid(id);
      const cover = String(data.get('cover_image_path') || '') || null;
      if (cover) {
        const { data: photo } = await db
          .from('photos')
          .select('id')
          .eq('album_id', id)
          .eq('thumbnail_path', cover)
          .maybeSingle();
        if (!photo) throw new Error('Choose a cover from this album.');
      }
      check(
        (
          await db
            .from('albums')
            .update({
              title,
              description,
              ...(data.has('cover_image_path') ? { cover_image_path: cover } : {}),
            })
            .eq('id', id)
        ).error,
      );
    } else {
      const client_id = uuid(field(data, 'client_id'));
      const { data: client } = await db
        .from('profiles')
        .select('id')
        .eq('id', client_id)
        .eq('role', 'client')
        .single();
      if (!client) throw new Error('Choose a valid client.');
      const { data: album, error } = await db
        .from('albums')
        .insert({ client_id, title, description })
        .select('id')
        .single();
      check(error);
      revalidatePath('/admin/albums');
      return {
        success: 'Album created. You can now add photographs.',
        id: album!.id,
      };
    }
    revalidatePath('/admin/albums');
    revalidatePath(`/admin/albums/${id}`);
    return { success: 'Album saved.' };
  } catch (error) {
    return { error: message(error) };
  }
}
export async function deleteAlbum(id: string): Promise<ActionResult> {
  const { db } = await requireAdmin();
  try {
    uuid(id);
    const { data: album } = await db.from('albums').select('id').eq('id', id).single();
    if (!album) throw new Error('Album not found.');
    const storage = adminClient().storage.from('client-photos');
    // Paginate cleanup to support albums with thousands of photos.
    while (true) {
      const { data: photos, error } = await db
        .from('photos')
        .select('id,storage_path,thumbnail_path')
        .eq('album_id', id)
        .limit(100);
      check(error);
      if (!photos?.length) break;
      check(
        (await storage.remove(photos.flatMap((p) => [p.storage_path, p.thumbnail_path]))).error,
      );
      check(
        (
          await db
            .from('photos')
            .delete()
            .in(
              'id',
              photos.map((p) => p.id),
            )
        ).error,
      );
    }
    check((await db.from('albums').delete().eq('id', id)).error);
    revalidatePath('/admin/albums');
    revalidatePath('/admin');
    return { success: 'Album and its photographs deleted.' };
  } catch (error) {
    return { error: message(error) };
  }
}
