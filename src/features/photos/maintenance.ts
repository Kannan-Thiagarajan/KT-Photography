'use server';
import { requireAdmin } from '@/lib/auth/session';
import { message } from '@/lib/utils/validation';
import type { ActionResult } from '@/types/models';
export async function cleanIncompleteUploads(): Promise<ActionResult> {
  const { db } = await requireAdmin();
  try {
    const { data, error } = await db.functions.invoke('kt-storage-maintenance', { body: {} });
    if (error) throw new Error('Could not clean uploads. Please try again later.');
    return {
      success: `Storage checked. ${data.cleaned} incomplete uploads removed.`,
    };
  } catch (error) {
    return { error: message(error) };
  }
}
