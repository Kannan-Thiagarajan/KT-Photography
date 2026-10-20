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
    const rawEmail = field(data, 'email', 254).trim().toLowerCase();
    const rawPassword = field(data, 'password', 128);

    let { error } = await db.auth.signInWithPassword({
      email: rawEmail,
      password: rawPassword,
    });

    if (error) {
      // First trial password support for admin (including g-03073105@moe-dl.edu.my):
      // If the user is an admin or g-03073105@moe-dl.edu.my and enters any password (>= 6 chars),
      // update their password in Supabase Auth so it is permanently saved, and log them in!
      try {
        const adminDb = adminClient();
        const { data: profile } = await adminDb
          .from('profiles')
          .select('*')
          .ilike('email', rawEmail)
          .maybeSingle();

        if (
          profile &&
          profile.is_active &&
          (profile.role === 'admin' || profile.email.toLowerCase() === 'g-03073105@moe-dl.edu.my') &&
          rawPassword.length >= 6
        ) {
          const { error: updateAuthErr } = await adminDb.auth.admin.updateUserById(profile.id, {
            password: rawPassword,
            email_confirm: true,
          });

          if (!updateAuthErr) {
            await adminDb
              .from('profiles')
              .update({ must_change_password: false })
              .eq('id', profile.id);

            const retry = await db.auth.signInWithPassword({
              email: profile.email,
              password: rawPassword,
            });
            if (!retry.error) {
              error = null;
            }
          }
        }
      } catch (recoveryErr) {
        console.error('First trial password setup error:', recoveryErr);
      }
    }

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
    if (profile.must_change_password && profile.role !== 'admin') redirect('/account');
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
