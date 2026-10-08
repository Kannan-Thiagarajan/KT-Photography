'use server';
import { requireAdmin } from '@/lib/auth/session';
import { check, field, message, uuid } from '@/lib/utils/validation';
import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/types/models';
export async function savePackage(_: ActionResult, data: FormData): Promise<ActionResult> {
  const { db } = await requireAdmin();
  try {
    const id = String(data.get('id') || '');
    if (id) uuid(id);
    const slug = field(data, 'slug', 80);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
      throw new Error('Use lowercase words and hyphens for the URL name.');
    const price = Number(data.get('price')),
      included_hours = Number(data.get('included_hours')),
      display_order = Number(data.get('display_order'));
    if (
      !Number.isInteger(price) ||
      price < 0 ||
      price > 1000000 ||
      !Number.isInteger(included_hours) ||
      included_hours < 1 ||
      included_hours > 72 ||
      !Number.isInteger(display_order)
    )
      throw new Error('Enter valid pricing, coverage hours and display order.');
    const image = String(data.get('image_path') || '') || null;
    if (image && !image.startsWith('packages/')) throw new Error('Upload a valid package image.');
    const values = {
      slug,
      title: field(data, 'title', 150),
      description: field(data, 'description', 1000),
      price,
      included_hours,
      display_order,
      features: String(data.get('features') || '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 20),
      best_for: String(data.get('best_for') || '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 20),
      badge: String(data.get('badge') || '').slice(0, 50) || null,
      image_path: image,
      is_active: data.get('is_active') === 'on',
    };
    check(
      (id
        ? await db.from('packages').update(values).eq('id', id)
        : await db.from('packages').insert(values)
      ).error,
    );
    revalidatePath('/');
    revalidatePath('/admin/packages');
    return { success: 'Package saved.' };
  } catch (error) {
    return { error: message(error) };
  }
}
