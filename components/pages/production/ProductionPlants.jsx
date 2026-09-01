'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { apiFetch } from '@/lib/api-client';
import { filterPlants, plantFilterLabel } from '@/lib/production/dashboardLinks';
import { PLANT_TYPES, PLANT_STATUSES } from '@/lib/production/constants';
import { requiresPlantDownReason } from '@/lib/production/plant-status';
import ProductionShell from '@/components/production/ProductionShell';
import ProductionFilterBanner from '@/components/production/ProductionFilterBanner';
import ProductionDataTable, {
  ProdBadge, ProductionModal, FormField,
} from '@/components/production/ProductionDataTable';
import PlantDownReasonSelect from '@/components/production/PlantDownReasonSelect';
import AppLoader from '@/components/ui/AppLoader';
import '@/components/production/ProductionShell.css';

const empty = () => ({
  name: '', code: '', plantType: 'aggregate', capacity: 0, unit: 'm³',
  projectName: '', status: 'operable', statusReason: '', commissionDate: '', notes: '',
});

export default function ProductionPlants() {
  const { isProductionEditor } = usePermissions();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get('status');
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(empty());
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const plants = await apiFetch('/api/production/plants');
    setRows(plants);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(empty()); setEditing(null); setOpen(true); };
  const openEdit = (row) => {
    setEditing(row.id);
    setForm({
      name: row.name, code: row.code, plantType: row.plantType,
      capacity: row.capacity, unit: row.unit,
      projectName: row.assignedProjectName || '',
      status: row.status,
      statusReason: row.statusReason || '',
      commissionDate: row.commissionDate?.slice?.(0, 10) || row.commissionDate || '',
      notes: row.notes,
    });
    setOpen(true);
  };

  const handleStatusChange = (status) => {
    setForm((f) => ({
      ...f,
      status,
      statusReason: status === 'down' ? f.statusReason : '',
    }));
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete plant "${row.name}"?`)) return;
    await apiFetch(`/api/production/plants/${row.id}`, { method: 'DELETE' });
    await load();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      capacity: Number(form.capacity),
      commissionDate: form.commissionDate || null,
      statusReason: requiresPlantDownReason(form.status) ? form.statusReason : '',
    };
    if (editing) {
      await apiFetch(`/api/production/plants/${editing}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await apiFetch('/api/production/plants', { method: 'POST', body: JSON.stringify(payload) });
    }
    setOpen(false);
    await load();
  };

  const columns = [
    { key: 'code', label: 'Code', sortable: true },
    { key: 'name', label: 'Plant Name', sortable: true },
    { key: 'plantTypeLabel', label: 'Type', sortable: true },
    { key: 'capacity', label: 'Capacity', render: (r) => `${r.capacity} ${r.unit}` },
    { key: 'assignedProjectName', label: 'Project', sortable: true },
    { key: 'status', label: 'Status', render: (r) => <ProdBadge status={r.status} label={r.statusLabel} /> },
  ];

  const displayedRows = useMemo(
    () => filterPlants(rows, statusFilter),
    [rows, statusFilter],
  );
  const filterLabel = plantFilterLabel(statusFilter);

  return (
    <ProductionShell
      title="Production Plants"
      subtitle="Register plants and their project — projects are created automatically"
      actions={isProductionEditor && (
        <button type="button" className="btn-primary" onClick={openCreate}><Plus size={16} /> Add Plant</button>
      )}
    >
      {!isProductionEditor && <div className="production-readonly-banner">View only — managers cannot edit production records.</div>}
      <ProductionFilterBanner label={filterLabel} clearHref="/production/plants" />
      {loading ? <AppLoader label="Loading plants…" variant="inline" /> : (
        <ProductionDataTable
          columns={columns}
          rows={displayedRows}
          searchKeys={['name', 'code', 'assignedProjectName']}
          canEdit={isProductionEditor}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      )}
      <ProductionModal
        open={open}
        title={editing ? 'Edit Plant' : 'Add Plant'}
        onClose={() => setOpen(false)}
        onSubmit={handleSubmit}
        submitLabel={editing ? 'Save Changes' : 'Add Plant'}
        large
      >
        <div className="production-form-grid">
          <FormField label="Plant Name"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></FormField>
          <FormField label="Plant Code"><input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></FormField>
          <FormField label="Project Name"><input required value={form.projectName} onChange={(e) => setForm({ ...form, projectName: e.target.value })} placeholder="e.g. GERD Dam" /></FormField>
          <FormField label="Plant Type">
            <select value={form.plantType} onChange={(e) => setForm({ ...form, plantType: e.target.value })}>
              {PLANT_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </FormField>
          <FormField label="Status">
            <select value={form.status} onChange={(e) => handleStatusChange(e.target.value)}>
              {PLANT_STATUSES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </FormField>
          {requiresPlantDownReason(form.status) && (
            <FormField label="Down Reason" full>
              <PlantDownReasonSelect
                value={form.statusReason}
                onChange={(statusReason) => setForm({ ...form, statusReason })}
              />
            </FormField>
          )}
          <FormField label="Capacity"><input type="number" min="0" step="0.01" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></FormField>
          <FormField label="Unit"><input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></FormField>
          <FormField label="Commission Date"><input type="date" value={form.commissionDate} onChange={(e) => setForm({ ...form, commissionDate: e.target.value })} /></FormField>
          <FormField label="Notes" full><textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></FormField>
        </div>
      </ProductionModal>
    </ProductionShell>
  );
}
