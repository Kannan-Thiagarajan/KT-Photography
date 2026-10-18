import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { serverClient } from '@/lib/supabase/server';
export const getSession = cache(async () => {
  const db = await serverClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;
  const { data: profile, error } = await db.from('profiles').select('*').eq('id', user.id).single();
  if (error || !profile || !profile.is_active) return null;
  return { user, profile, db };
});
export async function requireSession() {
  const session = await getSession();
  if (!session) redirect('/login');
  return session;
}
export async function requireAdmin() {
  const session = await requireSession();
  if (session.profile.role !== 'admin') redirect('/gallery');
  if (session.profile.must_change_password) redirect('/account');
  return session;
}
export async function requireGallery() {
  const session = await requireSession();
  if (session.profile.must_change_password) redirect('/account');
  return session;
}
