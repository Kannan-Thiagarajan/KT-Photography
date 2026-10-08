'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Images,
  Gem,
  LogOut,
  ArrowUpRight,
  Menu,
  X,
  UserRound,
  Home,
} from 'lucide-react';
import { Brand } from './brand';
import { logout } from '@/features/auth/actions';
export function Workspace({
  children,
  profile,
}: {
  children: React.ReactNode;
  profile: { full_name: string; email: string; role: string };
}) {
  const pathname = usePathname(),
    [open, setOpen] = useState(false);
  const admin = profile.role === 'admin';
  const links = admin
    ? [
        { href: '/admin', label: 'Overview', icon: LayoutDashboard },
        { href: '/admin/clients', label: 'Clients', icon: Users },
        { href: '/admin/albums', label: 'Albums', icon: Images },
        { href: '/admin/packages', label: 'Collections', icon: Gem },
      ]
    : [{ href: '/gallery', label: 'My galleries', icon: Images }];
  return (
    <div className="workspace">
      {open && (
        <button
          className="sidebar-shade"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`workspace-sidebar ${open ? 'open' : ''}`}>
        <Brand />
        <p className="sidebar-label">{admin ? 'STUDIO WORKSPACE' : 'YOUR PRIVATE COLLECTION'}</p>
        <nav className="sidebar-nav" aria-label="Workspace navigation">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              href={href}
              key={href}
              className={
                (href === '/admin' ? pathname === href : pathname.startsWith(href)) ? 'active' : ''
              }
              onClick={() => setOpen(false)}
            >
              <Icon size={17} strokeWidth={1.6} />
              {label}
            </Link>
          ))}
          <Link
            href="/account"
            className={pathname === '/account' ? 'active' : ''}
            onClick={() => setOpen(false)}
          >
            <UserRound size={17} strokeWidth={1.6} />
            My account
          </Link>
        </nav>
        <div className="sidebar-bottom">
          <Link className="text-link" href="/">
            <Home size={15} />
            Back to website
          </Link>
          <div className="sidebar-user">
            <span className="user-avatar">
              {profile.full_name
                .split(' ')
                .slice(0, 2)
                .map((n) => n[0])
                .join('')}
            </span>
            <div>
              <strong>{profile.full_name}</strong>
              <small>{admin ? 'Photographer & administrator' : 'KT Photography client'}</small>
            </div>
          </div>
          <form action={logout}>
            <button className="signout-button">
              <LogOut size={15} />
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="workspace-header">
          <div>
            <button
              className="icon-button mobile-menu"
              aria-label={open ? 'Close navigation' : 'Open navigation'}
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={19} /> : <Menu size={19} />}
            </button>
            <span className="eyebrow" style={{ fontSize: 8 }}>
              {admin ? 'KT / STUDIO' : 'KT / CLIENT GALLERY'}
            </span>
          </div>
          <div>
            <Link href="/" className="text-link">
              View website
              <ArrowUpRight size={14} />
            </Link>
            <span className="user-avatar">{profile.full_name.charAt(0)}</span>
          </div>
        </header>
        <main id="main" className="workspace-content">
          {children}
        </main>
      </div>
    </div>
  );
}
