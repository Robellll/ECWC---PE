'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard, Users, Wrench, ShieldAlert, Building2,
  Factory, ChevronDown, Package, FolderKanban, ClipboardList,
  CalendarDays, Truck, Boxes, FileBarChart, ScrollText,
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import CargoTruckIcon from '@/components/icons/CargoTruckIcon';
import './Sidebar.css';

const primaryNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/equipment', label: 'Equipment', icon: CargoTruckIcon, matchPrefix: true },
  { href: '/garage', label: 'Central Garage', icon: Wrench },
  { href: '/project-garage', label: 'Project Garage', icon: Building2, matchPrefix: true },
  { href: '/insurance', label: 'Insurance', icon: ShieldAlert },
];

const contactLogNavItem = { href: '/managers', label: 'Contact Log', icon: Users };

const productionSubItems = [
  { href: '/production/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/production/plants', label: 'Production Plants', icon: Factory },
  { href: '/production/materials', label: 'Materials', icon: Package },
  { href: '/production/projects', label: 'Projects', icon: FolderKanban },
  { href: '/production/demand', label: 'Demand Management', icon: ClipboardList },
  { href: '/production/daily', label: 'Daily Production', icon: CalendarDays },
  { href: '/production/dispatch', label: 'Dispatch', icon: Truck },
  { href: '/production/stock', label: 'Stock Balance', icon: Boxes },
  { href: '/production/reports', label: 'Reports', icon: FileBarChart },
];

function isNavActive(pathname, href, matchPrefix) {
  if (matchPrefix) return pathname === href || pathname.startsWith(`${href}/`);
  return pathname === href;
}

const Sidebar = () => {
  const pathname = usePathname();
  const { isCentralGarageFollowup, canViewAuditTrail } = usePermissions();
  const productionActive = pathname.startsWith('/production');
  const [productionOpen, setProductionOpen] = useState(productionActive);

  const visiblePrimaryNavItems = isCentralGarageFollowup
    ? primaryNavItems.filter((item) => item.href === '/garage')
    : primaryNavItems;

  const renderNavLink = ({ href, label, icon: Icon, matchPrefix }) => (
    <Link
      key={href}
      href={href}
      className={isNavActive(pathname, href, matchPrefix) ? 'nav-item active' : 'nav-item'}
    >
      <Icon size={20} />
      <span>{label}</span>
    </Link>
  );

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img src="/logo.png.png" alt="ECWC Logo" className="logo-img" />
      </div>

      <nav className="sidebar-nav">
        {visiblePrimaryNavItems.map(renderNavLink)}

        {!isCentralGarageFollowup && (
        <div className={`nav-group ${productionActive ? 'nav-group-active' : ''}`}>
          <button
            type="button"
            className={`nav-item nav-group-toggle ${productionActive ? 'active' : ''}`}
            onClick={() => setProductionOpen((v) => !v)}
            aria-expanded={productionOpen}
          >
            <Factory size={20} />
            <span>Production</span>
            <ChevronDown size={16} className={`nav-chevron ${productionOpen ? 'open' : ''}`} />
          </button>
          {productionOpen && (
            <div className="nav-subitems">
              {productionSubItems.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={pathname === href ? 'nav-subitem active' : 'nav-subitem'}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
        )}

        {!isCentralGarageFollowup && renderNavLink(contactLogNavItem)}

        {canViewAuditTrail && renderNavLink({
          href: '/audit-trail',
          label: 'Audit Trail',
          icon: ScrollText,
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
