// Used by bootstrap and isolated integration tests. Never import this in client code.
export async function provisionAccount(db, { email, password, full_name }) {
  const { data: ticket, error } = await db
    .from('account_provisioning')
    .insert({ email })
    .select('token')
    .single();
  if (error) throw error;
  try {
    const { data, error: creationError } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, kt_provisioning_token: ticket.token },
    });
    if (creationError) throw creationError;
    return data.user;
  } finally {
    await db.from('account_provisioning').delete().eq('email', email);
  }
}
