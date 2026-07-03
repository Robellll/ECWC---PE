'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { apiFetch } from '@/lib/api-client';
import { demandFilterLabel, filterDemand } from '@/lib/production/dashboardLinks';
import { DEMAND_PRIORITIES, DEMAND_STATUSES } from '@/lib/production/constants';
import ProductionShell from '@/components/production/ProductionShell';
import ProductionFilterBanner from '@/components/production/ProductionFilterBanner';
import ProductionDataTable, { ProdBadge, ProdProgress, ProductionModal, FormField } from '@/components/production/ProductionDataTable';

const empty = () => ({
  projectId: '', materialId: '', requestedQuantity: '', unit: 'm³',
  requiredDate: new Date().toISOString().slice(0, 10), priority: 'medium',
  status: 'pending', producedQuantity: 0, remarks: '',
});

export default function ProductionDemand() {
  const { isProductionEditor } = usePermissions();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get('status');
  const [rows, setRows] = useState([]);
  const [projects, setProjects] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [form, setForm] = useState(empty());
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const [demand, projs, mats] = await Promise.all([
      apiFetch('/api/production/demand'),
      apiFetch('/api/production/projects'),
      apiFetch('/api/production/materials'),
    ]);
    setRows(demand);
    setProjects(projs);
    setMaterials(mats);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      requestedQuantity: Number(form.requestedQuantity),
      producedQuantity: Number(form.producedQuantity || 0),
    };
    if (editing) await apiFetch(`/api/production/demand/${editing}`, { method: 'PUT', body: JSON.stringify(payload) });
    else await apiFetch('/api/production/demand', { method: 'POST', body: JSON.stringify(payload) });
    setOpen(false);
    await load();
  };

  const columns = [
    { key: 'projectName', label: 'Project', sortable: true },
    { key: 'materialName', label: 'Material', sortable: true },
    { key: 'requestedQuantity', label: 'Requested', render: (r) => `${r.requestedQuantity} ${r.unit}` },
    { key: 'producedQuantity', label: 'Produced', render: (r) => `${r.producedQuantity} ${r.unit}` },
    { key: 'remainingQuantity', label: 'Remaining', render: (r) => `${r.remainingQuantity} ${r.unit}` },
    { key: 'completionPct', label: 'Progress', render: (r) => <><ProdProgress value={r.completionPct} /> {r.completionPct}%</> },
    { key: 'requiredDate', label: 'Required', sortable: true },
    { key: 'priority', label: 'Priority', render: (r) => <ProdBadge status={r.priority} label={r.priorityLabel} /> },
    { key: 'status', label: 'Status', render: (r) => <ProdBadge status={r.status} label={r.statusLabel} /> },
  ];

  const displayedRows = useMemo(
    () => filterDemand(rows, statusFilter),
    [rows, statusFilter],
  );
  const filterLabel = demandFilterLabel(statusFilter);

  return (
    <ProductionShell title="Demand Management" subtitle="Track production requests and fulfillment"
      actions={isProductionEditor && <button type="button" className="btn-primary" onClick={() => { setForm(empty()); setEditing(null); setOpen(true); }}><Plus size={16} /> New Demand</button>}
    >
      {!isProductionEditor && <div className="production-readonly-banner">View only — managers cannot edit production records.</div>}
      <ProductionFilterBanner label={filterLabel} clearHref="/production/demand" />
      <ProductionDataTable columns={columns} rows={displayedRows} searchKeys={['projectName', 'materialName']} canEdit={isProductionEditor}
        onEdit={(r) => { setEditing(r.id); setForm({ projectId: r.projectId, materialId: r.materialId, requestedQuantity: r.requestedQuantity, unit: r.unit, requiredDate: r.requiredDate?.slice?.(0, 10) || r.requiredDate, priority: r.priority, status: r.status, producedQuantity: r.producedQuantity, remarks: r.remarks }); setOpen(true); }}
        onDelete={async (r) => { if (window.confirm('Delete demand?')) { await apiFetch(`/api/production/demand/${r.id}`, { method: 'DELETE' }); await load(); } }}
      />
      <ProductionModal
        open={open}
        title={editing ? 'Edit Demand' : 'New Demand'}
        onClose={() => setOpen(false)}
        onSubmit={handleSubmit}
        submitLabel={editing ? 'Save Changes' : 'Create Demand'}
        large
      >
        <div className="production-form-grid">
          <FormField label="Project"><select required value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}><option value="">Select…</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></FormField>
          <FormField label="Material"><select required value={form.materialId} onChange={(e) => { const m = materials.find((x) => x.id === e.target.value); setForm({ ...form, materialId: e.target.value, unit: m?.unit || form.unit }); }}><option value="">Select…</option>{materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></FormField>
          <FormField label="Requested Qty"><input type="number" min="0.01" step="0.01" required value={form.requestedQuantity} onChange={(e) => setForm({ ...form, requestedQuantity: e.target.value })} /></FormField>
          <FormField label="Unit"><input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></FormField>
          <FormField label="Required Date"><input type="date" required value={form.requiredDate} onChange={(e) => setForm({ ...form, requiredDate: e.target.value })} /></FormField>
          <FormField label="Priority"><select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{DEMAND_PRIORITIES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></FormField>
          <FormField label="Status"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{DEMAND_STATUSES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></FormField>
          {editing && <FormField label="Produced Qty"><input type="number" min="0" value={form.producedQuantity} onChange={(e) => setForm({ ...form, producedQuantity: e.target.value })} /></FormField>}
          <FormField label="Remarks" full><textarea rows={2} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></FormField>
        </div>
      </ProductionModal>
    </ProductionShell>
  );
}
