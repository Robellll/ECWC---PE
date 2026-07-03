'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { apiFetch } from '@/lib/api-client';
import { dateFilterLabel, filterByToday } from '@/lib/production/dashboardLinks';
import ProductionShell from '@/components/production/ProductionShell';
import ProductionFilterBanner from '@/components/production/ProductionFilterBanner';
import ProductionDataTable, { ProductionModal, FormField } from '@/components/production/ProductionDataTable';

const empty = () => ({
  dispatchDate: new Date().toISOString().slice(0, 10),
  projectId: '', materialId: '', quantity: '', unit: 'm³',
  vehicle: '', driverName: '', destination: '', deliveryNoteNumber: '', remarks: '',
});

export default function ProductionDispatch() {
  const { isProductionEditor } = usePermissions();
  const searchParams = useSearchParams();
  const dateFilter = searchParams.get('date');
  const [rows, setRows] = useState([]);
  const [projects, setProjects] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [form, setForm] = useState(empty());
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const [disp, projs, mats] = await Promise.all([
      apiFetch('/api/production/dispatch'),
      apiFetch('/api/production/projects'),
      apiFetch('/api/production/materials'),
    ]);
    setRows(disp);
    setProjects(projs);
    setMaterials(mats);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...form, quantity: Number(form.quantity) };
      if (editing) await apiFetch(`/api/production/dispatch/${editing}`, { method: 'PUT', body: JSON.stringify(payload) });
      else await apiFetch('/api/production/dispatch', { method: 'POST', body: JSON.stringify(payload) });
      setOpen(false);
      await load();
    } catch (err) {
      setError(err.message || 'Could not save dispatch');
    }
  };

  const columns = [
    { key: 'dispatchDate', label: 'Date', sortable: true },
    { key: 'projectName', label: 'Project', sortable: true },
    { key: 'materialName', label: 'Material', sortable: true },
    { key: 'quantity', label: 'Quantity', render: (r) => `${r.quantity} ${r.unit}` },
    { key: 'vehicle', label: 'Vehicle' },
    { key: 'driverName', label: 'Driver' },
    { key: 'deliveryNoteNumber', label: 'Delivery Note' },
  ];

  const displayedRows = useMemo(
    () => filterByToday(rows, 'dispatchDate', dateFilter),
    [rows, dateFilter],
  );
  const filterLabel = dateFilterLabel(dateFilter);

  return (
    <ProductionShell title="Dispatch" subtitle="Outgoing materials — stock reduces automatically"
      actions={isProductionEditor && <button type="button" className="btn-primary" onClick={() => { setForm(empty()); setEditing(null); setOpen(true); }}><Plus size={16} /> New Dispatch</button>}
    >
      {!isProductionEditor && <div className="production-readonly-banner">View only — managers cannot edit production records.</div>}
      <ProductionFilterBanner label={filterLabel} clearHref="/production/dispatch" />
      <ProductionDataTable columns={columns} rows={displayedRows} searchKeys={['projectName', 'materialName', 'vehicle', 'driverName']} canEdit={isProductionEditor}
        onEdit={(r) => { setEditing(r.id); setForm({ dispatchDate: r.dispatchDate?.slice?.(0, 10) || r.dispatchDate, projectId: r.projectId, materialId: r.materialId, quantity: r.quantity, unit: r.unit, vehicle: r.vehicle, driverName: r.driverName, destination: r.destination, deliveryNoteNumber: r.deliveryNoteNumber, remarks: r.remarks }); setOpen(true); }}
        onDelete={async (r) => { if (window.confirm('Delete dispatch?')) { await apiFetch(`/api/production/dispatch/${r.id}`, { method: 'DELETE' }); await load(); } }}
      />
      <ProductionModal
        open={open}
        title={editing ? 'Edit Dispatch' : 'New Dispatch'}
        onClose={() => setOpen(false)}
        onSubmit={handleSubmit}
        submitLabel={editing ? 'Save Changes' : 'Create Dispatch'}
        large
      >
        {error && <p className="completion-error">{error}</p>}
        <div className="production-form-grid">
          <FormField label="Date"><input type="date" required value={form.dispatchDate} onChange={(e) => setForm({ ...form, dispatchDate: e.target.value })} /></FormField>
          <FormField label="Project"><select required value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}><option value="">Select…</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></FormField>
          <FormField label="Material"><select required value={form.materialId} onChange={(e) => { const m = materials.find((x) => x.id === e.target.value); setForm({ ...form, materialId: e.target.value, unit: m?.unit || form.unit }); }}><option value="">Select…</option>{materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></FormField>
          <FormField label="Quantity"><input type="number" min="0.01" step="0.01" required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></FormField>
          <FormField label="Unit"><input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></FormField>
          <FormField label="Vehicle"><input value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} /></FormField>
          <FormField label="Driver"><input value={form.driverName} onChange={(e) => setForm({ ...form, driverName: e.target.value })} /></FormField>
          <FormField label="Destination"><input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} /></FormField>
          <FormField label="Delivery Note #"><input value={form.deliveryNoteNumber} onChange={(e) => setForm({ ...form, deliveryNoteNumber: e.target.value })} /></FormField>
          <FormField label="Remarks" full><textarea rows={2} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></FormField>
        </div>
      </ProductionModal>
    </ProductionShell>
  );
}
