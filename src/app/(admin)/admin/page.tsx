import Link from 'next/link';
import { Users, Images, Camera, Plus, ArrowUpRight, UserPlus, Gem } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { EmptyState } from '@/components/ui/empty-state';
import { MaintenanceButton } from '@/components/admin/maintenance-button';
export default async function Dashboard() {
  const { db, profile } = await requireAdmin();
  const [clients, albums, photos, recent] = await Promise.all([
    db.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'client'),
    db.from('albums').select('id', { count: 'exact', head: true }),
    db.from('photos').select('id', { count: 'exact', head: true }),
    db
      .from('albums')
      .select('*,profiles(full_name),photos(count)')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);
  if ([clients, albums, photos, recent].some((r) => r.error))
    throw new Error('Unable to load dashboard.');
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR STUDIO, AT A GLANCE</p>
          <h1>
            Welcome back, <em>{profile.full_name.split(' ')[0]}.</em>
          </h1>
          <p>A little organisation. More room for creativity.</p>
        </div>
        <Link href="/admin/albums/new" className="button button-gold">
          <Plus size={16} />
          New album
        </Link>
      </div>
      <div className="dashboard-stats">
        {[
          {
            label: 'Clients',
            count: clients.count,
            icon: Users,
            hint: 'People behind the moments',
          },
          {
            label: 'Albums',
            count: albums.count,
            icon: Images,
            hint: 'Stories, beautifully organised',
          },
          {
            label: 'Photographs',
            count: photos.count,
            icon: Camera,
            hint: 'Memories securely stored',
          },
        ].map(({ label, count, icon: Icon, hint }) => (
          <article key={label} className="stat-card">
            <div>
              {label}
              <Icon />
            </div>
            <strong>{count || 0}</strong>
            <p>{hint}</p>
          </article>
        ))}
      </div>
      <div className="dashboard-columns">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Recent albums</h2>
              <p>The latest stories in your studio.</p>
            </div>
            <Link href="/admin/albums" className="text-link gold">
              View all
              <ArrowUpRight size={15} />
            </Link>
          </div>
          {recent.data?.length ? (
            recent.data.map((a) => (
              <Link className="recent-row" key={a.id} href={`/admin/albums/${a.id}`}>
                <span className="icon-tile">
                  <Images size={18} />
                </span>
                <div>
                  <strong>{a.title}</strong>
                  <p>
                    {a.profiles?.full_name} · {a.photos[0]?.count || 0} photographs
                  </p>
                </div>
                <ArrowUpRight size={16} />
              </Link>
            ))
          ) : (
            <EmptyState
              title="Your next story starts here."
              description="Create a client, add their first album, and start uploading photographs."
            />
          )}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Make something happen</h2>
              <p>Your everyday studio shortcuts.</p>
            </div>
          </div>
          <div className="quick-actions">
            <MaintenanceButton />
            <Link href="/admin/clients">
              <UserPlus size={19} />
              Create a client
            </Link>
            <Link href="/admin/albums/new">
              <Images size={19} />
              Create an album
            </Link>
            <Link href="/admin/packages">
              <Gem size={19} />
              Manage collections
            </Link>
            <p>
              Client login details are shared manually. New clients will choose a personal password
              before opening their galleries.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
