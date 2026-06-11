'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Wrench, ShieldAlert } from 'lucide-react';
import './Sidebar.css';

const DumpTruck = ({ size = 20, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 512.853 512.853"
    fill="currentColor"
    {...props}
  >
    <g transform="translate(1 1)">
      <g>
        <g>
          <path d="M504.173,184.6l-74.24-81.92c-5.973-5.973-13.653-9.387-21.333-9.387h-78.507c-13.653,0-23.893,10.24-23.893,23.893
            v180.907h-41.326L296.57,76.227h52.297c5.12,0,8.533-3.413,8.533-8.533s-3.413-8.533-8.533-8.533h-59.733H280.6h-42.667
            c-3.413,0-6.827,1.707-7.68,5.12l-12.8,32.427c-1.707,3.413-4.267,5.12-7.68,5.12H41.667c-3.413,0-6.827,1.707-8.533,5.12
            L-1,192.28c0,1.707,0,3.413,0,5.12l25.6,110.933v71.68c0,11.093,9.387,20.48,20.48,20.48h5.723
            c4.075,29.155,28.753,51.2,59.131,51.2c30.378,0,55.056-22.045,59.131-51.2h180.405c4.075,29.155,28.753,51.2,59.131,51.2
            s55.056-22.045,59.131-51.2h22.789c11.093,0,20.48-9.387,21.333-19.627v-176.64C511.853,196.547,509.293,189.72,504.173,184.6z" />
        </g>
      </g>
    </g>
  </svg>
);

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/managers', label: 'Contact Log', icon: Users },
  { href: '/equipment', label: 'Equipment', icon: DumpTruck, custom: true },
  { href: '/garage', label: 'Central Garage', icon: Wrench },
  { href: '/insurance', label: 'Insurance', icon: ShieldAlert },
];

const Sidebar = () => {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img src="/logo.png.png" alt="ECWC Logo" className="logo-img" />
        <span className="logo-text">Plant & Equip</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(({ href, label, icon: Icon, custom }) => (
          <Link
            key={href}
            href={href}
            className={pathname === href ? 'nav-item active' : 'nav-item'}
          >
            {custom ? <Icon size={20} /> : <Icon size={20} />}
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
