'use server';
import { requireAdmin } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';
import { adminClient } from '@/lib/supabase/admin';
import { check, field, message, uuid, validateGoogleDriveUrl, validatePixiesetUrl } from '@/lib/utils/validation';
import type { ActionResult } from '@/types/models';
export async function saveAlbum(_: ActionResult, data: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  try {
    const id = String(data.get('id') || '');
    const title = field(data, 'title', 180),
      description = String(data.get('description') || '').trim();
    if (description.length > 3000) throw new Error('Description is too long.');

    const pixieset_url = data.has('pixieset_url')
      ? validatePixiesetUrl(String(data.get('pixieset_url') || ''))
      : undefined;
    const google_drive_url = data.has('google_drive_url')
      ? validateGoogleDriveUrl(String(data.get('google_drive_url') || ''))
      : undefined;

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

      const { data: currentAlbum } = await db.from('albums').select('client_id').eq('id', id).single();

      if ((pixieset_url || google_drive_url) && currentAlbum?.client_id === null) {
        throw new Error('Studio sample albums cannot have client Pixieset or Google Drive delivery links.');
      }

      const updatePayload: {
        title: string;
        description: string;
        cover_image_path?: string | null;
        is_public?: boolean;
        pixieset_url?: string | null;
        google_drive_url?: string | null;
      } = {
        title,
        description,
        ...(data.has('cover_image_path') ? { cover_image_path: cover } : {}),
        ...(data.has('pixieset_url') ? { pixieset_url } : {}),
        ...(data.has('google_drive_url') ? { google_drive_url } : {}),
      };
      if (data.has('is_public')) {
        const wantsPublic = data.get('is_public') === 'on';
        if (wantsPublic) {
          if (currentAlbum?.client_id !== null) {
            throw new Error('Only studio sample albums (without an assigned client) can be published publicly.');
          }
        }
        updatePayload.is_public = wantsPublic;
      }
      check(
        (
          await db
            .from('albums')
            .update(updatePayload)
            .eq('id', id)
        ).error,
      );
    } else {
      const rawClientId = String(data.get('client_id') || '').trim();
      let client_id: string | null = null;
      if (rawClientId && rawClientId !== 'studio') {
        uuid(rawClientId);
        const { data: client } = await db
          .from('profiles')
          .select('id')
          .eq('id', rawClientId)
          .eq('role', 'client')
          .single();
        if (!client) throw new Error('Choose a valid client or create a studio sample.');
        client_id = client.id;
      }

      if ((pixieset_url || google_drive_url) && client_id === null) {
        throw new Error('Studio sample albums cannot have client Pixieset or Google Drive delivery links.');
      }

      const is_public = data.get('is_public') === 'on';
      if (is_public && client_id !== null) {
        throw new Error('Only studio sample albums (without an assigned client) can be published publicly.');
      }
      const { data: album, error } = await db
        .from('albums')
        .insert({
          client_id,
          title,
          description,
          is_public,
          pixieset_url: pixieset_url ?? null,
          google_drive_url: google_drive_url ?? null,
        })
        .select('id')
        .single();
      check(error);
      revalidatePath('/admin/albums');
      revalidatePath('/samples');
      return {
        success: 'Album created. You can now add photographs.',
        id: album!.id,
      };
    }
    revalidatePath('/admin/albums');
    revalidatePath(`/admin/albums/${id}`);
    revalidatePath('/gallery');
    revalidatePath(`/gallery/${id}`);
    revalidatePath('/samples');
    revalidatePath(`/samples/${id}`);
    return { success: 'Album saved.' };
  } catch (error) {
    return { error: message(error) };
  }
}

export async function togglePublishAlbum(id: string, is_public: boolean): Promise<ActionResult> {
  const { db } = await requireAdmin();
  try {
    uuid(id);
    if (is_public) {
      const { data: album } = await db.from('albums').select('client_id').eq('id', id).single();
      if (album?.client_id !== null) {
        throw new Error('Only studio sample albums (without an assigned client) can be published publicly.');
      }
    }
    check((await db.from('albums').update({ is_public }).eq('id', id)).error);
    revalidatePath('/admin/albums');
    revalidatePath(`/admin/albums/${id}`);
    revalidatePath('/samples');
    revalidatePath(`/samples/${id}`);
    return { success: is_public ? 'Album published as public sample.' : 'Album is now private.' };
  } catch (error) {
    return { error: message(error) };
  }
}

export async function togglePhotoPublic(photoId: string, is_public: boolean): Promise<ActionResult> {
  const { db } = await requireAdmin();
  try {
    uuid(photoId);
    const { data: photo, error: fetchError } = await db
      .from('photos')
      .select('album_id')
      .eq('id', photoId)
      .single();
    check(fetchError);
    if (!photo) throw new Error('Photograph not found.');

    check((await db.from('photos').update({ is_public }).eq('id', photoId)).error);

    revalidatePath(`/admin/albums/${photo.album_id}`);
    revalidatePath(`/samples/${photo.album_id}`);
    return { success: is_public ? 'Photo included in public sample.' : 'Photo excluded from public sample.' };
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
