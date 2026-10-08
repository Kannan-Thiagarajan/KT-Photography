import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { Brand } from '@/components/layout/brand';
import { ActionForm, Field } from '@/components/ui/action-form';
import { login } from '@/features/auth/actions';
import { whatsappLink } from '@/config/brand';
export const metadata: Metadata = {
  title: 'Your private gallery',
  robots: { index: false, follow: false },
};
export default async function LoginPage() {
  const session = await getSession();
  if (session)
    redirect(
      session.profile.must_change_password
        ? '/account'
        : session.profile.role === 'admin'
          ? '/admin'
          : '/gallery',
    );
  return (
    <main id="main" className="auth-page">
      <div className="auth-visual">
        <Image
          src="/assets/images/alagi.webp"
          alt="Bridal portrait"
          fill
          loading="eager"
          sizes="50vw"
        />
        <div className="auth-visual-copy">
          <p className="eyebrow">YOUR STORY, BEAUTIFULLY PRESERVED</p>
          <h2>
            A little space for
            <br />
            <em>your memories.</em>
          </h2>
          <p>
            Your favourite moments, in a gallery that’s just for you. Revisit them whenever you
            like.
          </p>
        </div>
      </div>
      <div className="auth-panel">
        <Brand />
        <div className="auth-form-wrap">
          <p className="eyebrow">WELCOME TO YOUR GALLERY</p>
          <h1>
            Good to see <em>you.</em>
          </h1>
          <p>
            Sign in with the details Kannan shared with you.
            <br />
            Your photographs are waiting.
          </p>
          <ActionForm action={login} submit="Sign in to my gallery">
            <Field
              label="Email address"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
            />
            <Field
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Your private password"
            />
          </ActionForm>
          <div className="auth-hint">
            Need your login details or a password reset?
            <br />
            <a
              href={whatsappLink('Hi Kannan, I need help accessing my private photo gallery.')}
              target="_blank"
              rel="noreferrer"
            >
              Contact Kannan on WhatsApp ↗
            </a>
          </div>
        </div>
        <div className="auth-footer">
          <Link href="/">← Back to website</Link>
          <span>Private. Personal. Yours.</span>
        </div>
      </div>
    </main>
  );
}
