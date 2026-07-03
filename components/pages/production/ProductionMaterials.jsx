'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { apiFetch } from '@/lib/api-client';
import { MATERIAL_CATEGORIES } from '@/lib/production/constants';
import ProductionShell from '@/components/production/ProductionShell';
import ProductionDataTable, { ProductionModal, FormField } from '@/components/production/ProductionDataTable';

const empty = () => ({ name: '', category: 'aggregate', unit: 'm³', description: '', minStockLevel: 0 });

export default function ProductionMaterials() {
  const { isProductionEditor } = usePermissions();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(empty());
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setRows(await apiFetch('/api/production/materials'));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, minStockLevel: Number(form.minStockLevel) };
    if (editing) await apiFetch(`/api/production/materials/${editing}`, { method: 'PUT', body: JSON.stringify(payload) });
    else await apiFetch('/api/production/materials', { method: 'POST', body: JSON.stringify(payload) });
    setOpen(false);
    await load();
  };

  const columns = [
    { key: 'name', label: 'Material', sortable: true },
    { key: 'categoryLabel', label: 'Category', sortable: true },
    { key: 'unit', label: 'Unit' },
    { key: 'minStockLevel', label: 'Min Stock' },
    { key: 'description', label: 'Description' },
  ];

  return (
    <ProductionShell title="Materials" subtitle="Production material catalog"
      actions={isProductionEditor && <button type="button" className="btn-primary" onClick={() => { setForm(empty()); setEditing(null); setOpen(true); }}><Plus size={16} /> Add Material</button>}
    >
      {!isProductionEditor && <div className="production-readonly-banner">View only — managers cannot edit production records.</div>}
      <ProductionDataTable columns={columns} rows={rows} searchKeys={['name', 'categoryLabel']} canEdit={isProductionEditor}
        onEdit={(r) => { setEditing(r.id); setForm({ name: r.name, category: r.category, unit: r.unit, description: r.description, minStockLevel: r.minStockLevel }); setOpen(true); }}
        onDelete={async (r) => { if (window.confirm(`Delete ${r.name}?`)) { await apiFetch(`/api/production/materials/${r.id}`, { method: 'DELETE' }); await load(); } }}
      />
      <ProductionModal
        open={open}
        title={editing ? 'Edit Material' : 'Add Material'}
        onClose={() => setOpen(false)}
        onSubmit={handleSubmit}
        submitLabel={editing ? 'Save Changes' : 'Add Material'}
      >
        <div className="production-form-grid">
          <FormField label="Material Name"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></FormField>
          <FormField label="Category"><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{MATERIAL_CATEGORIES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></FormField>
          <FormField label="Unit"><input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></FormField>
          <FormField label="Min Stock Level"><input type="number" min="0" value={form.minStockLevel} onChange={(e) => setForm({ ...form, minStockLevel: e.target.value })} /></FormField>
          <FormField label="Description" full><textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></FormField>
        </div>
      </ProductionModal>
    </ProductionShell>
  );
}
