import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, ArrowUpRight } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { ActionForm, Field } from '@/components/ui/action-form';
import { updateClient } from '@/features/clients/actions';
import { EmptyState } from '@/components/ui/empty-state';
export default async function ClientDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db } = await requireAdmin();
  const { data: client, error } = await db
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error || !client) notFound();
  const isAdmin = client.role === 'admin';
  const { data: albums, error: albumError } = await db
    .from('albums')
    .select('id,title,photos(count)')
    .eq('client_id', id)
    .order('created_at', { ascending: false });
  if (albumError) throw new Error('Unable to load client albums.');
  return (
    <>
      <Link href="/admin/clients" className="back-link">
        <ArrowLeft size={14} />
        All users & clients
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{isAdmin ? 'ADMINISTRATOR PROFILE' : 'CLIENT PROFILE'}</p>
          <h1>{client.full_name}</h1>
          <p>{client.email}</p>
        </div>
        {!isAdmin && (
          <Link href={`/admin/albums/new?client=${id}`} className="button button-gold">
            <Plus size={16} />
            New album
          </Link>
        )}
      </div>
      <div className="management-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>Profile & access</h2>
          </div>
          <ActionForm action={updateClient}>
            <input type="hidden" name="id" value={client.id} />
            <div className="form-grid">
              <Field label="Full name" name="full_name" defaultValue={client.full_name} />
              <Field label="Email address" name="email" type="email" defaultValue={client.email} />
            </div>
            <label className="field">
              <span>Account role</span>
              <select name="role" defaultValue={client.role}>
                <option value="client">Client (Private Gallery Access)</option>
                <option value="admin">Administrator (Studio & Admin Access)</option>
              </select>
            </label>
            <label className="checkbox-field">
              <input type="checkbox" name="is_active" defaultChecked={client.is_active} />
              Allow user to sign in to the studio / gallery
            </label>
            <Field
              label="Reset password (optional)"
              name="password"
              type="password"
              required={false}
              autoComplete="new-password"
              placeholder="Leave blank to keep current password"
            />
            <p className="form-help">
              Use 12–128 characters with uppercase, lowercase and a number. Share new credentials privately; no email is
              sent.
            </p>
          </ActionForm>
          <p className="detail-note">
            Disabling access blocks this user from signing in or viewing private resources.
          </p>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>{isAdmin ? 'Administrator privileges' : 'Assigned albums'}</h2>
          </div>
          {isAdmin ? (
            <div style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <p style={{ color: 'var(--text-muted)' }}>
                This user has full <strong>Administrator</strong> privileges across KT Photography studio.
              </p>
              <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', lineHeight: 1.8 }}>
                <li>Full access to client directory & private galleries</li>
                <li>Upload and manage albums & photographs</li>
                <li>Configure pricing packages and quotations</li>
                <li>Curate homepage showcase photos and sample albums</li>
                <li>Invite and manage other studio administrators</li>
              </ul>
            </div>
          ) : albums?.length ? (
            albums.map((a) => (
              <Link href={`/admin/albums/${a.id}`} key={a.id} className="recent-row">
                <div>
                  <strong>{a.title}</strong>
                  <p>{a.photos[0]?.count || 0} photographs</p>
                </div>
                <ArrowUpRight size={16} />
              </Link>
            ))
          ) : (
            <EmptyState
              title="A blank canvas."
              description="Create this client’s first album to start collecting their memories."
            />
          )}
        </section>
      </div>
    </>
  );
}
