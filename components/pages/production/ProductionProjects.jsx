'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { apiFetch } from '@/lib/api-client';
import { PROJECT_STATUSES } from '@/lib/production/constants';
import ProductionShell from '@/components/production/ProductionShell';
import ProductionDataTable, { ProdBadge, ProductionModal, FormField } from '@/components/production/ProductionDataTable';

const empty = () => ({
  name: '', code: '', region: '', location: '', client: '',
  status: 'active', startDate: '', endDate: '', plantIds: [],
});

export default function ProductionProjects() {
  const { isProductionEditor } = usePermissions();
  const [rows, setRows] = useState([]);
  const [plants, setPlants] = useState([]);
  const [form, setForm] = useState(empty());
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const [projs, pls] = await Promise.all([
      apiFetch('/api/production/projects'),
      apiFetch('/api/production/plants'),
    ]);
    setRows(projs);
    setPlants(pls);
  }, []);

  useEffect(() => { load(); }, [load]);

  const togglePlant = (id) => {
    setForm((f) => ({
      ...f,
      plantIds: f.plantIds.includes(id) ? f.plantIds.filter((p) => p !== id) : [...f.plantIds, id],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, startDate: form.startDate || null, endDate: form.endDate || null };
    if (editing) await apiFetch(`/api/production/projects/${editing}`, { method: 'PUT', body: JSON.stringify(payload) });
    else await apiFetch('/api/production/projects', { method: 'POST', body: JSON.stringify(payload) });
    setOpen(false);
    await load();
  };

  const columns = [
    { key: 'code', label: 'Code', sortable: true },
    { key: 'name', label: 'Project', sortable: true },
    { key: 'region', label: 'Region' },
    { key: 'client', label: 'Client' },
    { key: 'status', label: 'Status', render: (r) => <ProdBadge status={r.status} label={r.statusLabel} /> },
    { key: 'plantIds', label: 'Plants', render: (r) => r.plantIds?.length || 0 },
  ];

  return (
    <ProductionShell title="Projects" subtitle="Production projects and plant assignments"
      actions={isProductionEditor && <button type="button" className="btn-primary" onClick={() => { setForm(empty()); setEditing(null); setOpen(true); }}><Plus size={16} /> Add Project</button>}
    >
      {!isProductionEditor && <div className="production-readonly-banner">View only — managers cannot edit production records.</div>}
      <ProductionDataTable columns={columns} rows={rows} searchKeys={['name', 'code', 'region', 'client']} canEdit={isProductionEditor}
        onEdit={(r) => { setEditing(r.id); setForm({ name: r.name, code: r.code, region: r.region, location: r.location, client: r.client, status: r.status, startDate: r.startDate?.slice?.(0, 10) || '', endDate: r.endDate?.slice?.(0, 10) || '', plantIds: r.plantIds || [] }); setOpen(true); }}
        onDelete={async (r) => { if (window.confirm(`Delete ${r.name}?`)) { await apiFetch(`/api/production/projects/${r.id}`, { method: 'DELETE' }); await load(); } }}
      />
      <ProductionModal
        open={open}
        title={editing ? 'Edit Project' : 'Add Project'}
        onClose={() => setOpen(false)}
        onSubmit={handleSubmit}
        submitLabel={editing ? 'Save Changes' : 'Add Project'}
        large
      >
        <div className="production-form-grid">
          <FormField label="Project Name"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></FormField>
          <FormField label="Project Code"><input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></FormField>
          <FormField label="Region"><input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} /></FormField>
          <FormField label="Location"><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></FormField>
          <FormField label="Client"><input value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} /></FormField>
          <FormField label="Status"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{PROJECT_STATUSES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></FormField>
          <FormField label="Start Date"><input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></FormField>
          <FormField label="End Date"><input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></FormField>
          <FormField label="Assigned Plants" full>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {plants.map((p) => (
                <label key={p.id} style={{ fontSize: '0.8rem' }}>
                  <input type="checkbox" checked={form.plantIds.includes(p.id)} onChange={() => togglePlant(p.id)} /> {p.name}
                </label>
              ))}
            </div>
          </FormField>
        </div>
      </ProductionModal>
    </ProductionShell>
  );
}
