import Link from 'next/link';
import { ArrowUpRight, ShieldCheck, Users as UsersIcon } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { ActionForm, Field } from '@/components/ui/action-form';
import { createClient } from '@/features/clients/actions';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination, pageNumber } from '@/components/ui/pagination';

export default async function Clients({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tab?: string }>;
}) {
  const { db } = await requireAdmin();
  const params = await searchParams;
  const tab = params.tab === 'admins' ? 'admins' : 'clients';
  const page = pageNumber(params.page),
    size = 20;

  const {
    data: clients,
    count: clientCount,
    error: clientError,
  } = await db
    .from('profiles')
    .select('*,albums(count)', { count: 'exact' })
    .eq('role', 'client')
    .order('created_at', { ascending: false })
    .range((page - 1) * size, page * size - 1);

  const {
    data: admins,
    count: adminCount,
    error: adminError,
  } = await db
    .from('profiles')
    .select('*', { count: 'exact' })
    .eq('role', 'admin')
    .order('created_at', { ascending: false });

  if (clientError || adminError) throw new Error('Unable to load users.');

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">PEOPLE & THEIR STORIES</p>
          <h1>
            Users & <em>access.</em>
          </h1>
          <p>Manage clients, assign albums, and invite studio administrators.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <Link
          href="/admin/clients?tab=clients"
          className={`button ${tab === 'clients' ? 'button-gold' : 'button-outline'} button-small`}
        >
          <UsersIcon size={14} />
          Clients ({clientCount || 0})
        </Link>
        <Link
          href="/admin/clients?tab=admins"
          className={`button ${tab === 'admins' ? 'button-gold' : 'button-outline'} button-small`}
        >
          <ShieldCheck size={14} />
          Administrators ({adminCount || 0})
        </Link>
      </div>

      <div className="management-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>{tab === 'admins' ? 'Studio administrators' : 'Client directory'}</h2>
              <p>
                {tab === 'admins'
                  ? `${adminCount || 0} administrators with studio & gallery management access`
                  : `${clientCount || 0} clients in your studio`}
              </p>
            </div>
          </div>

          {tab === 'admins' ? (
            admins?.length ? (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Administrator</th>
                      <th>Role</th>
                      <th>Access</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <strong>{a.full_name}</strong>
                          <small>{a.email}</small>
                        </td>
                        <td>
                          <span
                            className="status-pill"
                            style={{
                              background: '#2b1b3d',
                              color: 'var(--gold, #d4af37)',
                              border: '1px solid #d4af3744',
                            }}
                          >
                            Admin
                          </span>
                        </td>
                        <td>
                          <span className={`status-pill ${!a.is_active ? 'inactive' : ''}`}>
                            {!a.is_active ? 'Disabled' : 'Active'}
                          </span>
                        </td>
                        <td>
                          <Link
                            href={`/admin/clients/${a.id}`}
                            className="button button-outline button-small"
                          >
                            Manage
                            <ArrowUpRight size={12} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No administrators found."
                description="Use the form on the right to add or invite an administrator."
              />
            )
          ) : clients?.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Albums</th>
                    <th>Access</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.full_name}</strong>
                        <small>{c.email}</small>
                      </td>
                      <td>{c.albums[0]?.count || 0}</td>
                      <td>
                        <span
                          className={`status-pill ${!c.is_active ? 'inactive' : c.must_change_password ? 'pending' : ''}`}
                        >
                          {!c.is_active
                            ? 'Disabled'
                            : c.must_change_password
                              ? 'First sign-in'
                              : 'Active'}
                        </span>
                      </td>
                      <td>
                        <Link
                          href={`/admin/clients/${c.id}`}
                          className="button button-outline button-small"
                        >
                          Manage
                          <ArrowUpRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="Every story begins with a person."
              description="Create your first client using the form. Their galleries will be visible only to them."
            />
          )}

          {tab === 'clients' && (
            <Pagination base="/admin/clients" page={page} count={clientCount || 0} size={size} />
          )}
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>{tab === 'admins' ? 'Add an administrator' : 'Add a user or client'}</h2>
              <p>
                {tab === 'admins'
                  ? 'Grant full administrative access to the studio and galleries.'
                  : 'Give their memories a private home or create a studio admin.'}
              </p>
            </div>
          </div>
          <ActionForm action={createClient} submit={tab === 'admins' ? 'Create admin account' : 'Create account'} resetOnSuccess>
            <Field label="Full name" name="full_name" placeholder="Full name" />
            <Field
              label="Email address"
              name="email"
              type="email"
              placeholder="user@example.com"
              autoComplete="off"
            />
            <label className="field">
              <span>Account role</span>
              <select name="role" defaultValue={tab === 'admins' ? 'admin' : 'client'}>
                <option value="client">Client (Private Gallery Access)</option>
                <option value="admin">Administrator (Studio & Gallery Management)</option>
              </select>
            </label>
            <Field
              label="Initial password"
              name="password"
              type="password"
              autoComplete="new-password"
            />
            <p className="form-help">
              Use 12–128 characters with uppercase, lowercase and a number. Share the password privately.
              Admins can sign in at /login with their password or use their password on first trial sign-in.
            </p>
          </ActionForm>
        </section>
      </div>
    </>
  );
}
