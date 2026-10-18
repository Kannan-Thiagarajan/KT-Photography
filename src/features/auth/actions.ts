'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { serverClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { requireSession } from '@/lib/auth/session';
import { emailValue, passwordValue, field, message, check } from '@/lib/utils/validation';
import type { ActionResult } from '@/types/models';
export async function login(_: ActionResult, data: FormData): Promise<ActionResult> {
  const db = await serverClient();
  try {
    const { error } = await db.auth.signInWithPassword({
      email: emailValue(field(data, 'email', 254)),
      password: field(data, 'password', 128),
    });
    if (error)
      return {
        error: 'Unable to sign in. Check your email and password, or contact Kannan.',
      };
    const {
      data: { user },
    } = await db.auth.getUser();
    const { data: profile } = await db.from('profiles').select('*').eq('id', user!.id).single();
    if (!profile?.is_active) {
      await db.auth.signOut();
      return {
        error: 'Your gallery access is unavailable. Please contact Kannan.',
      };
    }
    revalidatePath('/', 'layout');
    if (profile.must_change_password) redirect('/account');
    redirect(profile.role === 'admin' ? '/admin' : '/gallery');
  } catch (error) {
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') throw error;
    return { error: message(error) };
  }
}
export async function logout() {
  const db = await serverClient();
  await db.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}
export async function changePassword(_: ActionResult, data: FormData): Promise<ActionResult> {
  const { db, profile } = await requireSession();
  try {
    const old = field(data, 'current_password', 128);
    const password = passwordValue(field(data, 'new_password', 128));
    if (old === password)
      throw new Error('Choose a password different from your current password.');
    if (password !== data.get('confirm_password'))
      throw new Error('Your new passwords do not match.');
    const { error: verify } = await db.auth.signInWithPassword({
      email: profile.email,
      password: old,
    });
    if (verify) throw new Error('Your current password is incorrect.');
    check((await db.auth.updateUser({ password })).error);
    check(
      (
        await adminClient()
          .from('profiles')
          .update({ must_change_password: false })
          .eq('id', profile.id)
      ).error,
    );
    revalidatePath('/', 'layout');
    return { success: 'Password updated. Your gallery is ready to explore.' };
  } catch (error) {
    return { error: message(error) };
  }
}
