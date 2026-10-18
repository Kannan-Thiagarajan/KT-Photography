import 'server-only';
import { adminClient } from '@/lib/supabase/admin';
import { check } from '@/lib/utils/validation';
export async function provisionAccount({
  email,
  password,
  full_name,
}: {
  email: string;
  password: string;
  full_name: string;
}) {
  const db = adminClient();
  const { data: ticket, error } = await db
    .from('account_provisioning')
    .insert({ email })
    .select('token')
    .single();
  check(error);
  try {
    const result = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, kt_provisioning_token: ticket!.token },
    });
    check(result.error);
    return result.data.user!;
  } finally {
    await db.from('account_provisioning').delete().eq('email', email);
  }
}
