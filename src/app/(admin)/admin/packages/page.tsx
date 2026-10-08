import { Plus, ChevronDown } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { PackageForm } from '@/components/admin/package-form';
import { money } from '@/config/brand';
export default async function Packages() {
  const { db } = await requireAdmin();
  const { data: packages, error } = await db.from('packages').select('*').order('display_order');
  if (error) throw new Error('Unable to load collections.');
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR PUBLIC COLLECTIONS</p>
          <h1>
            A collection for
            <br />
            <em>every chapter.</em>
          </h1>
          <p>Update pricing, inclusions and visibility on your website.</p>
        </div>
      </div>
      <div className="package-editor">
        {packages?.map((p) => (
          <details key={p.id}>
            <summary>
              <div>
                <h2>{p.title}</h2>
                <p>
                  {money(p.price)} · {p.included_hours} hours ·{' '}
                  {p.is_active ? 'Visible on website' : 'Hidden'}
                </p>
              </div>
              <ChevronDown size={18} />
            </summary>
            <PackageForm value={p} />
          </details>
        ))}
        <details>
          <summary>
            <div className="text-link gold">
              <Plus size={18} />
              Add a new collection
            </div>
            <ChevronDown size={18} />
          </summary>
          <PackageForm />
        </details>
      </div>
    </>
  );
}
