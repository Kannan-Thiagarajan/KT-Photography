import { createClient } from '@supabase/supabase-js';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { provisionAccount } from './provision-account.mjs';
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});
const prompt = createInterface({ input: stdin, output: stdout });
const email = (process.env.KT_ADMIN_EMAIL || (await prompt.question('Admin email: ')))
  .trim()
  .toLowerCase();
const full_name = (
  process.env.KT_ADMIN_NAME ||
  (await prompt.question('Admin name [Kannan]: ')) ||
  'Kannan'
).trim();
prompt.close();
async function hiddenPassword() {
  if (!stdin.isTTY)
    throw new Error('Run in an interactive terminal or set KT_ADMIN_PASSWORD securely.');
  stdout.write('Initial password (12+ chars, uppercase, lowercase and number): ');
  stdin.setRawMode(true);
  stdin.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    function data(bytes) {
      for (const char of bytes.toString()) {
        if (char === '\r' || char === '\n') {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off('data', data);
          stdout.write('\n');
          resolve(value);
          return;
        }
        if (char === '\u0003') {
          stdin.setRawMode(false);
          process.exit(130);
        }
        if (char === '\u007f' || char === '\b') {
          value = value.slice(0, -1);
        } else value += char;
      }
    }
    stdin.on('data', data);
    stdin.on('error', reject);
  });
}
const password = process.env.KT_ADMIN_PASSWORD || (await hiddenPassword());
if (
  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
  password.length < 12 ||
  password.length > 128 ||
  !/[a-z]/.test(password) ||
  !/[A-Z]/.test(password) ||
  !/[0-9]/.test(password)
)
  throw new Error('Enter a valid email and a strong password.');
const { data: existing, error: lookupError } = await db
  .from('profiles')
  .select('id')
  .eq('email', email)
  .maybeSingle();
if (lookupError) throw lookupError;
if (existing)
  throw new Error(
    'An account with that email exists. Bootstrap does not overwrite existing accounts.',
  );
const user = await provisionAccount(db, { email, password, full_name });
const { error: profileError } = await db.from('profiles').insert({
  id: user.id,
  email,
  full_name,
  role: 'admin',
  must_change_password: true,
});
if (profileError) {
  await db.auth.admin.deleteUser(user.id);
  throw profileError;
}
console.log(
  `Admin created for ${email}. Sign in at /login and change the initial password. No email was sent.`,
);
