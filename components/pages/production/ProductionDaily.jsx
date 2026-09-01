'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { apiFetch } from '@/lib/api-client';
import { dateFilterLabel, filterByToday } from '@/lib/production/dashboardLinks';
import { SHIFTS } from '@/lib/production/constants';
import ProductionShell from '@/components/production/ProductionShell';
import ProductionFilterBanner from '@/components/production/ProductionFilterBanner';
import ProductionDataTable, { ProductionModal, FormField } from '@/components/production/ProductionDataTable';

const empty = () => ({
  productionDate: new Date().toISOString().slice(0, 10),
  projectId: '', plantId: '', materialId: '', quantityProduced: '', unit: 'm³',
  shift: 'day', operatorName: '', remarks: '',
});

export default function ProductionDaily() {
  const { isProductionEditor } = usePermissions();
  const searchParams = useSearchParams();
  const dateFilter = searchParams.get('date');
  const [rows, setRows] = useState([]);
  const [plants, setPlants] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState(empty());
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const [daily, pls, mats, projs] = await Promise.all([
      apiFetch('/api/production/daily'),
      apiFetch('/api/production/plants'),
      apiFetch('/api/production/materials'),
      apiFetch('/api/production/projects'),
    ]);
    setRows(daily);
    setPlants(pls);
    setMaterials(mats);
    setProjects(projs);
  }, []);

  useEffect(() => { load(); }, [load]);

  const projectPlants = useMemo(
    () => (form.projectId ? plants.filter((p) => p.assignedProjectId === form.projectId) : []),
    [plants, form.projectId],
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...form, quantityProduced: Number(form.quantityProduced) };
      if (editing) await apiFetch(`/api/production/daily/${editing}`, { method: 'PUT', body: JSON.stringify(payload) });
      else await apiFetch('/api/production/daily', { method: 'POST', body: JSON.stringify(payload) });
      setOpen(false);
      await load();
    } catch (err) {
      setError(err.message || 'Could not save');
    }
  };

  const columns = [
    { key: 'productionDate', label: 'Date', sortable: true },
    { key: 'plantName', label: 'Plant', sortable: true },
    { key: 'materialName', label: 'Material', sortable: true },
    { key: 'quantityProduced', label: 'Quantity', render: (r) => `${r.quantityProduced} ${r.unit}` },
    { key: 'shiftLabel', label: 'Shift' },
    { key: 'operatorName', label: 'Operator' },
  ];

  const displayedRows = useMemo(
    () => filterByToday(rows, 'productionDate', dateFilter),
    [rows, dateFilter],
  );
  const filterLabel = dateFilterLabel(dateFilter);

  return (
    <ProductionShell title="Daily Production" subtitle="Select a project, then record output from its plants"
      actions={isProductionEditor && <button type="button" className="btn-primary" onClick={() => { setForm(empty()); setEditing(null); setOpen(true); }}><Plus size={16} /> Record Production</button>}
    >
      {!isProductionEditor && <div className="production-readonly-banner">View only — managers cannot edit production records.</div>}
      <ProductionFilterBanner label={filterLabel} clearHref="/production/daily" />
      <ProductionDataTable columns={columns} rows={displayedRows} searchKeys={['plantName', 'materialName', 'operatorName']} canEdit={isProductionEditor}
        onEdit={(r) => {
          const plant = plants.find((p) => p.id === r.plantId);
          setEditing(r.id);
          setForm({
            productionDate: r.productionDate?.slice?.(0, 10) || r.productionDate,
            projectId: plant?.assignedProjectId || '',
            plantId: r.plantId,
            materialId: r.materialId,
            quantityProduced: r.quantityProduced,
            unit: r.unit,
            shift: r.shift,
            operatorName: r.operatorName,
            remarks: r.remarks,
          });
          setOpen(true);
        }}
        onDelete={async (r) => { if (window.confirm('Delete record?')) { await apiFetch(`/api/production/daily/${r.id}`, { method: 'DELETE' }); await load(); } }}
      />
      <ProductionModal
        open={open}
        title={editing ? 'Edit Production' : 'Record Production'}
        onClose={() => setOpen(false)}
        onSubmit={handleSubmit}
        submitLabel={editing ? 'Save Changes' : 'Record Production'}
        large
      >
        {error && <p className="completion-error">{error}</p>}
        <div className="production-form-grid">
          <FormField label="Date"><input type="date" required value={form.productionDate} onChange={(e) => setForm({ ...form, productionDate: e.target.value })} /></FormField>
          <FormField label="Project">
            <select required value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value, plantId: '' })}>
              <option value="">Select project…</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </FormField>
          <FormField label="Plant">
            <select required value={form.plantId} onChange={(e) => setForm({ ...form, plantId: e.target.value })} disabled={!form.projectId}>
              <option value="">{form.projectId ? 'Select plant…' : 'Choose a project first'}</option>
              {projectPlants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </FormField>
          <FormField label="Material"><select required value={form.materialId} onChange={(e) => { const m = materials.find((x) => x.id === e.target.value); setForm({ ...form, materialId: e.target.value, unit: m?.unit || form.unit }); }}><option value="">Select…</option>{materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></FormField>
          <FormField label="Quantity Produced"><input type="number" min="0.01" step="0.01" required value={form.quantityProduced} onChange={(e) => setForm({ ...form, quantityProduced: e.target.value })} /></FormField>
          <FormField label="Unit"><input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></FormField>
          <FormField label="Shift"><select value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })}>{SHIFTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></FormField>
          <FormField label="Operator"><input value={form.operatorName} onChange={(e) => setForm({ ...form, operatorName: e.target.value })} /></FormField>
          <FormField label="Remarks" full><textarea rows={2} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></FormField>
        </div>
      </ProductionModal>
    </ProductionShell>
  );
}
