'use server';
import { requireAdmin } from '@/lib/auth/session';
import { adminClient } from '@/lib/supabase/admin';
import { provisionAccount } from '@/lib/auth/provision';
import { revalidatePath } from 'next/cache';
import { check, emailValue, field, message, passwordValue, uuid } from '@/lib/utils/validation';
import type { ActionResult } from '@/types/models';
export async function createClient(_: ActionResult, data: FormData): Promise<ActionResult> {
  await requireAdmin();
  const db = adminClient();
  try {
    const full_name = field(data, 'full_name', 150),
      email = emailValue(field(data, 'email', 254)),
      password = passwordValue(field(data, 'password', 128));
    const role = (data.get('role') === 'admin' ? 'admin' : 'client') as 'admin' | 'client';
    const created = await provisionAccount({ email, password, full_name });
    const { error: insert } = await db.from('profiles').insert({
      id: created.id,
      full_name,
      email,
      role,
      is_active: true,
      must_change_password: role === 'client',
    });
    if (insert) {
      await db.auth.admin.deleteUser(created.id);
      throw new Error('Could not save the profile. Please try again.');
    }
    revalidatePath('/admin');
    revalidatePath('/admin/clients');
    return {
      success: `${role === 'admin' ? 'Administrator' : 'Client'} account created for ${email}. Share their login details privately; no email was sent.`,
    };
  } catch (error) {
    return { error: message(error) };
  }
}
export async function updateClient(_: ActionResult, data: FormData): Promise<ActionResult> {
  await requireAdmin();
  const db = adminClient();
  try {
    const id = uuid(field(data, 'id'));
    const { data: client } = await db.from('profiles').select('*').eq('id', id).single();
    if (!client) throw new Error('User not found.');
    const full_name = field(data, 'full_name', 150),
      email = emailValue(field(data, 'email', 254));
    const roleInput = data.get('role');
    const role = (
      roleInput === 'admin' ? 'admin' : roleInput === 'client' ? 'client' : client.role
    ) as 'admin' | 'client';
    const { data: duplicate } = await db
      .from('profiles')
      .select('id')
      .eq('email', email)
      .neq('id', id)
      .maybeSingle();
    if (duplicate) throw new Error('This email address is already in use.');
    const active = data.get('is_active') === 'on';
    const password = String(data.get('password') || '');
    if (password) passwordValue(password);
    check(
      (
        await db.auth.admin.updateUserById(id, {
          email,
          email_confirm: true,
          ban_duration: active ? 'none' : '876000h',
          ...(password ? { password } : {}),
          user_metadata: { full_name },
        })
      ).error,
    );
    const { error } = await db
      .from('profiles')
      .update({
        email,
        full_name,
        role,
        is_active: active,
        ...(password ? { must_change_password: role === 'client' } : {}),
      })
      .eq('id', id);
    check(error);
    revalidatePath('/admin/clients');
    revalidatePath(`/admin/clients/${id}`);
    return {
      success: `${role === 'admin' ? 'Administrator' : 'Client'} updated. Share any new credentials privately.`,
    };
  } catch (error) {
    return { error: message(error) };
  }
}
