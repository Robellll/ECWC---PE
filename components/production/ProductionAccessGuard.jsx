'use client';

import { usePermissions } from '@/hooks/usePermissions';

export default function ProductionAccessGuard({ children }) {
  const { canViewProduction } = usePermissions();

  if (!canViewProduction) {
    return (
      <div style={{ padding: '2rem' }}>
        <h1 className="page-title">Production</h1>
        <p className="page-subtitle">You do not have permission to access the Production module.</p>
      </div>
    );
  }

  return children;
}
