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
    .eq('role', 'client')
    .maybeSingle();
  if (error || !client) notFound();
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
        All clients
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">CLIENT PROFILE</p>
          <h1>{client.full_name}</h1>
          <p>{client.email}</p>
        </div>
        <Link href={`/admin/albums/new?client=${id}`} className="button button-gold">
          <Plus size={16} />
          New album
        </Link>
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
            <label className="checkbox-field">
              <input type="checkbox" name="is_active" defaultChecked={client.is_active} />
              Allow client to access their galleries
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
              Use 12–128 characters with uppercase, lowercase and a number. A reset requires the
              client to change their password again. Share new credentials privately; no email is
              sent.
            </p>
          </ActionForm>
          <p className="detail-note">
            Disabling access blocks this client’s galleries, downloads and database access. Existing
            signed photo links expire within 60 seconds.
          </p>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>Assigned albums</h2>
          </div>
          {albums?.length ? (
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
