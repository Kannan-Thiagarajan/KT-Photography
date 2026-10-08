import Link from 'next/link';
import { ShieldCheck, ArrowUpRight } from 'lucide-react';
import type { Metadata } from 'next';
import { requireSession } from '@/lib/auth/session';
import { Workspace } from '@/components/layout/workspace';
import { ActionForm, Field } from '@/components/ui/action-form';
import { changePassword } from '@/features/auth/actions';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'My account',
  robots: { index: false, follow: false },
};
export default async function Account() {
  const { profile } = await requireSession();
  return (
    <Workspace profile={profile}>
      <div className="page-heading">
        <div>
          <p className="eyebrow">MAKE THIS SPACE YOURS</p>
          <h1>
            Your <em>account.</em>
          </h1>
          <p>
            {profile.full_name} · {profile.email}
          </p>
        </div>
        {!profile.must_change_password && (
          <Link
            className="button button-outline"
            href={profile.role === 'admin' ? '/admin' : '/gallery'}
          >
            Continue to {profile.role === 'admin' ? 'studio' : 'galleries'}
            <ArrowUpRight size={16} />
          </Link>
        )}
      </div>
      <section className="panel account-panel">
        {profile.must_change_password && (
          <p className="notice info">
            <ShieldCheck size={19} />
            Before opening your gallery, replace the password Kannan shared with a private password
            of your own.
          </p>
        )}
        <div className="panel-heading">
          <div>
            <h2>
              {profile.must_change_password
                ? 'Choose your personal password'
                : 'Change your password'}
            </h2>
            <p>A little extra care for your private memories.</p>
          </div>
        </div>
        <ActionForm action={changePassword} submit="Update my password">
          <Field
            label="Current password"
            name="current_password"
            type="password"
            autoComplete="current-password"
          />
          <Field
            label="New password"
            name="new_password"
            type="password"
            autoComplete="new-password"
          />
          <Field
            label="Confirm new password"
            name="confirm_password"
            type="password"
            autoComplete="new-password"
          />
          <p className="form-help">
            Use 12–128 characters, including uppercase, lowercase and a number. Choose a password
            different from your initial password.
          </p>
        </ActionForm>
      </section>
    </Workspace>
  );
}
