'use server';
import { requireAdmin } from '@/lib/auth/session';
import { check, message, uuid } from '@/lib/utils/validation';
import { revalidatePath } from 'next/cache';
import { adminClient } from '@/lib/supabase/admin';
import type { ActionResult } from '@/types/models';

export async function saveHomepagePhoto(_: ActionResult, data: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  try {
    const id = String(data.get('id') || '');
    if (id) uuid(id);
    const storage_path = String(data.get('storage_path') || '').trim();
    if (!storage_path) throw new Error('Please upload an image for the homepage.');
    if (!/^homepage\/[a-zA-Z0-9_\-\.]+\.(jpg|jpeg|png|webp)$/i.test(storage_path)) {
      throw new Error('Invalid storage path format.');
    }

    const title = String(data.get('title') || '').trim().slice(0, 150);
    const alt = String(data.get('alt') || title || 'KT Photography showcase image').trim().slice(0, 200);
    const label = String(data.get('label') || '').trim().slice(0, 100);
    const category = String(data.get('category') || 'Bridal portraits').trim().slice(0, 100);
    const display_order = Number(data.get('display_order') || 0);

    if (!Number.isInteger(display_order)) {
      throw new Error('Enter a valid display order number.');
    }

    const is_active = data.has('is_active') ? data.get('is_active') === 'on' : true;

    const values = {
      storage_path,
      title,
      alt,
      label,
      category,
      display_order,
      is_active,
    };

    check(
      (id
        ? await db.from('homepage_photos').update(values).eq('id', id)
        : await db.from('homepage_photos').insert(values)
      ).error,
    );

    revalidatePath('/');
    revalidatePath('/admin/homepage');
    return { success: id ? 'Photo details saved.' : 'Photo added to homepage showcase.' };
  } catch (error) {
    return { error: message(error) };
  }
}

export async function deleteHomepagePhoto(id: string): Promise<ActionResult> {
  const { db } = await requireAdmin();
  try {
    uuid(id);
    const { data: photo, error } = await db
      .from('homepage_photos')
      .select('id, storage_path')
      .eq('id', id)
      .single();
    check(error);
    if (!photo) throw new Error('Homepage photo not found.');

    check((await db.from('homepage_photos').delete().eq('id', id)).error);

    // Clean up file in public-assets storage if present
    if (photo.storage_path) {
      try {
        const storage = adminClient().storage.from('public-assets');
        await storage.remove([photo.storage_path]);
      } catch {
        // Continue even if storage object was already removed
      }
    }

    revalidatePath('/');
    revalidatePath('/admin/homepage');
    return { success: 'Photo removed from homepage.' };
  } catch (error) {
    return { error: message(error) };
  }
}

export async function toggleHomepagePhoto(id: string, is_active: boolean): Promise<ActionResult> {
  const { db } = await requireAdmin();
  try {
    uuid(id);
    check((await db.from('homepage_photos').update({ is_active }).eq('id', id)).error);

    revalidatePath('/');
    revalidatePath('/admin/homepage');
    return { success: is_active ? 'Photo published to homepage.' : 'Photo hidden from homepage.' };
  } catch (error) {
    return { error: message(error) };
  }
}

export async function reorderHomepagePhotos(ids: string[]): Promise<ActionResult> {
  const { db } = await requireAdmin();
  try {
    for (let i = 0; i < ids.length; i++) {
      const id = uuid(ids[i]);
      check((await db.from('homepage_photos').update({ display_order: i }).eq('id', id)).error);
    }

    revalidatePath('/');
    revalidatePath('/admin/homepage');
    return { success: 'Homepage photo order updated.' };
  } catch (error) {
    return { error: message(error) };
  }
}
