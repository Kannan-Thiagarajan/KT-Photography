import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { ActionForm, Field, TextArea } from '@/components/ui/action-form';
import { saveAlbum } from '@/features/albums/actions';
import { EmptyState } from '@/components/ui/empty-state';
export default async function NewAlbum({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const { db } = await requireAdmin();
  const preferred = (await searchParams).client;
  const { data: clients, error } = await db
    .from('profiles')
    .select('id,full_name,email')
    .eq('role', 'client')
    .order('full_name');
  if (error) throw new Error('Unable to load clients.');
  return (
    <>
      <Link href="/admin/albums" className="back-link">
        <ArrowLeft size={14} />
        All albums
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">A NEW CHAPTER</p>
          <h1>
            Create an <em>album.</em>
          </h1>
          <p>Choose who this story belongs to. Add photographs after creating it.</p>
        </div>
      </div>
      <section className="panel account-panel">
        {clients?.length ? (
          <ActionForm action={saveAlbum} submit="Create album" redirectBase="/admin/albums">
            <Field label="Album title" name="title" placeholder="e.g. Wedding day" />
            <label className="field">
              <span>Client</span>
              <select name="client_id" required defaultValue={preferred || ''}>
                <option value="" disabled>
                  Select a client
                </option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} · {c.email}
                  </option>
                ))}
              </select>
            </label>
            <TextArea
              label="Description (optional)"
              name="description"
              placeholder="A short note about this collection of memories."
            />
            <p className="form-help">Only the assigned client and you can access this album.</p>
          </ActionForm>
        ) : (
          <EmptyState
            title="Start with a client."
            description="Create a client account before making their first album."
          >
            <Link href="/admin/clients" className="button button-gold">
              Add a client
            </Link>
          </EmptyState>
        )}
      </section>
    </>
  );
}
