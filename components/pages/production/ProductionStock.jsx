'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';
import { filterStockByHealth, stockHealthFilterLabel } from '@/lib/production/dashboardLinks';
import ProductionShell from '@/components/production/ProductionShell';
import ProductionFilterBanner from '@/components/production/ProductionFilterBanner';
import ProductionDataTable, { ProdBadge } from '@/components/production/ProductionDataTable';
import '@/components/production/ProductionShell.css';

export default function ProductionStock() {
  const searchParams = useSearchParams();
  const healthFilter = searchParams.get('health');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/production/stock')
      .then(setRows)
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { key: 'materialName', label: 'Material', sortable: true },
    { key: 'currentStock', label: 'Current Stock', render: (r) => `${r.currentStock.toFixed(2)} ${r.unit}` },
    { key: 'reservedQuantity', label: 'Reserved', render: (r) => `${r.reservedQuantity.toFixed(2)} ${r.unit}` },
    { key: 'availableQuantity', label: 'Available', render: (r) => `${r.availableQuantity.toFixed(2)} ${r.unit}` },
    { key: 'health', label: 'Status', render: (r) => <ProdBadge status={r.health} label={r.health === 'healthy' ? 'Healthy' : r.health === 'warning' ? 'Low' : r.health === 'low' ? 'Low' : 'Critical'} /> },
    { key: 'lastUpdated', label: 'Last Updated', render: (r) => r.lastUpdated ? new Date(r.lastUpdated).toLocaleString('en-GB') : '—' },
  ];

  const displayedRows = useMemo(
    () => filterStockByHealth(rows, healthFilter),
    [rows, healthFilter],
  );
  const filterLabel = stockHealthFilterLabel(healthFilter);

  return (
    <ProductionShell title="Stock Balance" subtitle="Calculated from production and dispatch — read only">
      <div className="production-readonly-banner">Stock is calculated automatically: Opening + Production − Dispatch. Manual editing is not permitted.</div>
      <ProductionFilterBanner label={filterLabel} clearHref="/production/stock" />
      {loading ? <p className="page-subtitle">Loading stock…</p> : (
        <ProductionDataTable columns={columns} rows={displayedRows} searchKeys={['materialName']} canEdit={false} emptyMessage="No stock data yet. Record production to build inventory." />
      )}
    </ProductionShell>
  );
}
