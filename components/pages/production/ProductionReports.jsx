'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { apiFetch } from '@/lib/api-client';
import ProductionShell from '@/components/production/ProductionShell';
import ProductionDataTable, { exportCsv, printReport } from '@/components/production/ProductionDataTable';
import { FormField } from '@/components/production/ProductionDataTable';
import AppLoader from '@/components/ui/AppLoader';

const REPORT_TYPES = [
  { value: 'daily', label: 'Daily Production' },
  { value: 'weekly', label: 'Weekly Production' },
  { value: 'monthly', label: 'Monthly Production' },
  { value: 'plant-performance', label: 'Plant Performance' },
  { value: 'stock-balance', label: 'Stock Balance' },
  { value: 'dispatch-history', label: 'Dispatch History' },
  { value: 'demand-vs-production', label: 'Demand vs Production' },
  { value: 'project-supply', label: 'Project Supply Status' },
];

export default function ProductionReports() {
  const { canExportProductionReports } = usePermissions();
  const [type, setType] = useState('daily');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [projectId, setProjectId] = useState('');
  const [plantId, setPlantId] = useState('');
  const [materialId, setMaterialId] = useState('');
  const [region, setRegion] = useState('');
  const [rows, setRows] = useState([]);
  const [projects, setProjects] = useState([]);
  const [plants, setPlants] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/production/projects'),
      apiFetch('/api/production/plants'),
      apiFetch('/api/production/materials'),
    ]).then(([p, pl, m]) => { setProjects(p); setPlants(pl); setMaterials(m); });
  }, []);

  const runReport = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ type });
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (projectId) params.set('projectId', projectId);
    if (plantId) params.set('plantId', plantId);
    if (materialId) params.set('materialId', materialId);
    if (region) params.set('region', region);
    const data = await apiFetch(`/api/production/reports?${params}`);
    setRows(data.rows || []);
    setLoading(false);
  }, [type, from, to, projectId, plantId, materialId, region]);

  useEffect(() => { runReport(); }, [runReport]);

  const headers = rows[0] ? Object.fromEntries(Object.keys(rows[0]).map((k) => [k, k.replace(/_/g, ' ')])) : {};
  const reportLabel = REPORT_TYPES.find((r) => r.value === type)?.label || 'Report';

  const handleExport = () => {
    if (!rows.length) return;
    exportCsv(`${type}-report.csv`, rows, headers);
  };

  const handlePrint = () => {
    if (!rows.length) return;
    printReport(reportLabel, rows, headers);
  };

  const columns = rows[0]
    ? Object.keys(rows[0]).map((k) => ({ key: k, label: k.replace(/_/g, ' '), sortable: true }))
    : [];

  return (
    <ProductionShell title="Reports" subtitle="Filter, export, and print production reports">
      <div className="production-form-grid" style={{ marginBottom: '1rem', background: 'var(--bg-card)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
        <FormField label="Report Type">
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {REPORT_TYPES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </FormField>
        <FormField label="From Date"><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></FormField>
        <FormField label="To Date"><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></FormField>
        <FormField label="Project">
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)}><option value="">All</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        </FormField>
        <FormField label="Plant">
          <select value={plantId} onChange={(e) => setPlantId(e.target.value)}><option value="">All</option>{plants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        </FormField>
        <FormField label="Material">
          <select value={materialId} onChange={(e) => setMaterialId(e.target.value)}><option value="">All</option>{materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
        </FormField>
        <FormField label="Region"><input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Filter by region" /></FormField>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
          <button type="button" className="btn-primary" onClick={runReport}>Run Report</button>
          {canExportProductionReports && (
            <>
              <button type="button" className="btn-secondary" onClick={handleExport} disabled={!rows.length}><Download size={15} /> Excel</button>
              <button type="button" className="btn-secondary" onClick={handlePrint} disabled={!rows.length}><Printer size={15} /> Print / PDF</button>
            </>
          )}
        </div>
      </div>
      {loading ? <AppLoader label="Loading report…" variant="inline" /> : (
        <ProductionDataTable columns={columns} rows={rows.map((r, i) => ({ ...r, id: String(i) }))} searchKeys={columns.map((c) => c.key)} canEdit={false} />
      )}
    </ProductionShell>
  );
}
