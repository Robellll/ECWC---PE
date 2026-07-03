'use client';

import './ProductionShell.css';

export default function ProductionShell({ title, subtitle, children, actions }) {
  return (
    <div className="production-module">
      <div className="production-page-header">
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="production-page-actions">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
