import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
export function adminClient() {
  if (!process.env.SUPABASE_SECRET_KEY) throw new Error('Server credentials are missing.');
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
