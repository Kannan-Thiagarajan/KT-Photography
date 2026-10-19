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
        <ActionForm action={saveAlbum} submit="Create album" redirectBase="/admin/albums">
          <Field label="Album title" name="title" placeholder="e.g. Wedding day or Studio Bridal Sample" />
          <label className="field">
            <span>Client or Studio Portfolio</span>
            <select name="client_id" required defaultValue={preferred || ''}>
              <option value="studio">✦ Studio Sample Album (No client required)</option>
              {clients?.map((c) => (
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
          <Field
            label="Pixieset gallery URL (optional)"
            name="pixieset_url"
            placeholder="https://yourstudio.pixieset.com/clientgallery"
          />
          <p className="form-help" style={{ marginTop: '-0.5rem', marginBottom: '1rem', fontSize: '0.8125rem', color: 'var(--color-muted)' }}>
            Links to an existing Pixieset client gallery. Does not synchronise gallery content. Applicable for client albums only.
          </p>
          <Field
            label="Google Drive delivery URL (optional)"
            name="google_drive_url"
            placeholder="https://drive.google.com/drive/folders/..."
          />
          <p className="form-help" style={{ marginTop: '-0.5rem', marginBottom: '1rem', fontSize: '0.8125rem', color: 'var(--color-muted)' }}>
            Links to Google Drive for final photo delivery. The client may still need permission in Google Drive. Applicable for client albums only.
          </p>
          <label className="checkbox-field">
            <input type="checkbox" name="is_public" />
            Publish as public sample album (visible to all website visitors · studio samples only)
          </label>
          <p className="form-help">
            Private albums are only visible to the assigned client and you. Public sample albums appear on the public website.
          </p>
        </ActionForm>
      </section>
    </>
  );
}
