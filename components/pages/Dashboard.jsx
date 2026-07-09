'use client';

import {
  Wrench, ShieldAlert, Factory, Building2, Users, Sparkles,
} from 'lucide-react';
import CargoTruckIcon from '@/components/icons/CargoTruckIcon';
import '@/components/dashboard/Dashboard.css';

const MODULES = [
  { label: 'Equipment', icon: CargoTruckIcon },
  { label: 'Project Garage', icon: Building2 },
  { label: 'Central Garage', icon: Wrench },
  { label: 'Insurance', icon: ShieldAlert },
  { label: 'Production', icon: Factory },
  { label: 'Contact Log', icon: Users },
];

export default function Dashboard() {
  return (
    <div className="dashboard-coming-soon">
      <div className="dcs-bg" aria-hidden="true">
        <span className="dcs-orb dcs-orb--1" />
        <span className="dcs-orb dcs-orb--2" />
        <span className="dcs-orb dcs-orb--3" />
        <span className="dcs-grid" />
      </div>

      <div className="dcs-content">
        <div className="dcs-logo-wrap">
          <span className="dcs-glow-ring dcs-glow-ring--outer" />
          <span className="dcs-glow-ring dcs-glow-ring--inner" />
          <div className="dcs-logo-frame">
            <img src="/logo.png.png" alt="ECWC" className="dcs-logo" />
          </div>
        </div>

        <p className="dcs-eyebrow">
          <Sparkles size={14} />
          ECWC Plant &amp; Equipment
        </p>

        <h1 className="dcs-title">
          Dashboard
          <span className="dcs-title-accent"> Coming Soon</span>
        </h1>

        <p className="dcs-lead">
          We&apos;re assembling a unified command centre — live KPIs, fleet health,
          maintenance pipelines, and production insights across every project.
        </p>

        <div className="dcs-progress" role="presentation">
          <span className="dcs-progress-track">
            <span className="dcs-progress-fill" />
          </span>
          <span className="dcs-progress-label">Building your analytics workspace…</span>
        </div>

        <ul className="dcs-modules">
          {MODULES.map(({ label, icon: Icon }, index) => (
            <li
              key={label}
              className="dcs-module-chip"
              style={{ animationDelay: `${0.55 + index * 0.07}s` }}
            >
              <Icon size={15} />
              {label}
            </li>
          ))}
        </ul>

        <p className="dcs-footnote">
          Modules are live in the sidebar — the executive dashboard arrives next.
        </p>
      </div>
    </div>
  );
}
