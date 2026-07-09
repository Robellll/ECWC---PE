'use client';

import './AppLoader.css';

export default function AppLoader({
  label = 'Loading…',
  variant = 'page',
  className = '',
}) {
  return (
    <div
      className={`app-loader app-loader--${variant} ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="app-loader-visual" aria-hidden="true">
        <div className="app-loader-ring" />
        <div className="app-loader-core" />
      </div>
      {label ? <p className="app-loader-label">{label}</p> : null}
    </div>
  );
}
