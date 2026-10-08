import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { ActionForm, Field } from '@/components/ui/action-form';
import { createClient } from '@/features/clients/actions';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination, pageNumber } from '@/components/ui/pagination';
export default async function Clients({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { db } = await requireAdmin();
  const page = pageNumber((await searchParams).page),
    size = 20;
  const {
    data: clients,
    count,
    error,
  } = await db
    .from('profiles')
    .select('*,albums(count)', { count: 'exact' })
    .eq('role', 'client')
    .order('created_at', { ascending: false })
    .range((page - 1) * size, page * size - 1);
  if (error) throw new Error('Unable to load clients.');
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">PEOPLE & THEIR STORIES</p>
          <h1>
            Your <em>clients.</em>
          </h1>
          <p>Create accounts, manage access, and keep every gallery personal.</p>
        </div>
      </div>
      <div className="management-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Client directory</h2>
              <p>{count || 0} clients in your studio</p>
            </div>
          </div>
          {clients?.length ? (
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
          <Pagination base="/admin/clients" page={page} count={count || 0} size={size} />
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Add a new client</h2>
              <p>Give their memories a private home.</p>
            </div>
          </div>
          <ActionForm action={createClient} submit="Create client account" resetOnSuccess>
            <Field label="Full name" name="full_name" placeholder="Client’s full name" />
            <Field
              label="Email address"
              name="email"
              type="email"
              placeholder="client@example.com"
              autoComplete="off"
            />
            <Field
              label="Initial password"
              name="password"
              type="password"
              autoComplete="new-password"
            />
            <p className="form-help">
              Use 12–128 characters with uppercase, lowercase and a number. Share the password
              privately. The client must change it on first sign-in.
            </p>
          </ActionForm>
        </section>
      </div>
    </>
  );
}
