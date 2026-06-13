'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Wrench, ShieldAlert } from 'lucide-react';
import './Sidebar.css';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/managers', label: 'Contact Log', icon: Users },
  { href: '/equipment', label: 'Equipment', iconSrc: '/equipment-dump-truck.png' },
  { href: '/garage', label: 'Central Garage', icon: Wrench },
  { href: '/insurance', label: 'Insurance', icon: ShieldAlert },
];

const Sidebar = () => {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img src="/logo.png.png" alt="ECWC Logo" className="logo-img" />
      </div>

      <nav className="sidebar-nav">
        {navItems.map(({ href, label, icon: Icon, iconSrc }) => (
          <Link
            key={href}
            href={href}
            className={pathname === href ? 'nav-item active' : 'nav-item'}
          >
            {iconSrc ? (
              <img src={iconSrc} alt="" className="nav-icon-img" aria-hidden="true" />
            ) : (
              <Icon size={20} />
            )}
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
