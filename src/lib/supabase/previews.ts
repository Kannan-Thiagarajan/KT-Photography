import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Use the caller's RLS-protected client, never a service-role client or a shared cache.
export async function signedPreviews(db: SupabaseClient<Database>, paths: (string | null)[]) {
  const unique = [...new Set(paths.filter((path): path is string => !!path))];
  if (!unique.length) return {} as Record<string, string>;
  const { data } = await db.storage.from('client-photos').createSignedUrls(unique, 60);
  const urls: Record<string, string> = {};
  for (const item of data || []) {
    if (item.path && item.signedUrl && !item.error) urls[item.path] = item.signedUrl;
  }
  return urls;
}
