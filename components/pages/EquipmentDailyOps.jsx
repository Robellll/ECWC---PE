'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, LayoutGrid, ClipboardList, BarChart3 } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { apiFetch } from '@/lib/api-client';
import AppModal, { FormField } from '@/components/ui/AppModal';
import AppLoader from '@/components/ui/AppLoader';
import '@/components/pages/Equipment.css';
import '@/components/pages/ProjectEquipment.css';
import '@/components/pages/ProjectGarage.css';
import '@/components/pages/Garage.css';
import '@/components/production/ProductionShell.css';

const emptyForm = () => ({
  equipmentId: '',
  opsDate: new Date().toISOString().slice(0, 10),
  operableHr: '',
  idleHr: '',
  downHr: '',
  reasonDown: '',
  reasonIdle: '',
  actualFuel: '',
  notes: '',
});

function formatPct(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `${Number(value).toFixed(1)}%`;
}

function formatNum(value, digits = 1) {
  if (value == null || value === '') return '—';
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

export default function EquipmentDailyOps({ projectId }) {
  const router = useRouter();
  const { canEditAnyProjectEquipment, isProjPEAdmin, user } = usePermissions();
  const canEdit = canEditAnyProjectEquipment || (isProjPEAdmin && user?.projectId === projectId);

  const [project, setProject] = useState(null);
  const [equipment, setEquipment] = useState([]);
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().slice(0, 10));
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedAsset = useMemo(
    () => equipment.find((e) => e.id === form.equipmentId) || null,
    [equipment, form.equipmentId],
  );

  const load = useCallback(async () => {
    const [detail, ops] = await Promise.all([
      apiFetch(`/api/project-equipment/${projectId}`),
      apiFetch(`/api/project-equipment/${projectId}/daily-ops?date=${encodeURIComponent(dateFilter)}`),
    ]);
    setProject(detail.project);
    setEquipment(detail.equipment || []);
    setRows(ops.rows || []);
    setTotals(ops.totals || null);
    setLoading(false);
  }, [projectId, dateFilter]);

  useEffect(() => { load().catch(console.error); }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setForm((f) => ({ ...f, opsDate: dateFilter }));
    setError('');
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      equipmentId: row.equipmentId,
      opsDate: String(row.opsDate).slice(0, 10),
      operableHr: row.operableHr,
      idleHr: row.idleHr,
      downHr: row.downHr,
      reasonDown: row.reasonDown || '',
      reasonIdle: row.reasonIdle || '',
      actualFuel: row.actualFuel ?? '',
      notes: row.notes || '',
    });
    setError('');
    setOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        equipmentId: form.equipmentId,
        opsDate: form.opsDate,
        operableHr: Number(form.operableHr || 0),
        idleHr: Number(form.idleHr || 0),
        downHr: Number(form.downHr || 0),
        reasonDown: form.reasonDown,
        reasonIdle: form.reasonIdle,
        actualFuel: form.actualFuel === '' ? null : Number(form.actualFuel),
        notes: form.notes,
      };
      if (editingId) {
        await apiFetch(`/api/project-equipment/${projectId}/daily-ops/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch(`/api/project-equipment/${projectId}/daily-ops`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setOpen(false);
      await load();
    } catch (err) {
      setError(err.message || 'Could not save daily log');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete daily log for ${row.assetNo} on ${String(row.opsDate).slice(0, 10)}?`)) return;
    await apiFetch(`/api/project-equipment/${projectId}/daily-ops/${row.id}`, { method: 'DELETE' });
    await load();
  };

  if (loading) {
    return <AppLoader label="Loading daily operations…" variant="page" className="equipment-container" />;
  }

  if (!project) {
    return (
      <div className="equipment-container">
        <p className="production-empty">Project not found or access denied.</p>
        <button type="button" className="btn-secondary" onClick={() => router.push('/equipment')}>Back</button>
      </div>
    );
  }

  return (
    <div className="equipment-container">
      <div className="project-garage-detail-toolbar">
        <div className="pg-toolbar-left">
          <button type="button" className="project-garage-home-btn" onClick={() => router.push('/equipment')}>
            <LayoutGrid size={17} />
            <span>All Projects</span>
          </button>
          <button type="button" className="project-garage-home-btn" onClick={() => router.push(`/equipment/${projectId}`)}>
            <ClipboardList size={17} />
            <span>Asset Register</span>
          </button>
        </div>

        <div className="pg-toolbar-center">
          <h1 className="page-title pg-toolbar-title">{project.name}</h1>
          <p className="page-subtitle pg-toolbar-subtitle">Daily Operations Log — hours, fuel, and revenue</p>
        </div>

        <div className="pg-toolbar-right pe-header-actions project-garage-detail-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => router.push(`/equipment/${projectId}/reports`)}
          >
            <BarChart3 size={16} /> Reports
          </button>
          {canEdit && (
            <button type="button" className="btn-primary" onClick={openCreate}>
              <Plus size={16} /> Log Day
            </button>
          )}
        </div>
      </div>

      <div className="equipment-filters" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Date
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            style={{ marginLeft: '0.5rem' }}
          />
        </label>
        {totals && (
          <div className="pe-fleet-layout pe-fleet-layout--detail" style={{ margin: 0, flex: 1 }}>
            <div className="pe-fleet-card pe-fleet-card--total">
              <span className="pe-fleet-label">Entries</span>
              <span className="pe-fleet-value">{totals.count}</span>
            </div>
            <div className="pe-fleet-card pe-fleet-card--status">
              <span className="pe-fleet-label">Operable Hr</span>
              <span className="pe-fleet-value success">{formatNum(totals.operableHr)}</span>
            </div>
            <div className="pe-fleet-card pe-fleet-card--status">
              <span className="pe-fleet-label">Idle Hr</span>
              <span className="pe-fleet-value warning">{formatNum(totals.idleHr)}</span>
            </div>
            <div className="pe-fleet-card pe-fleet-card--status">
              <span className="pe-fleet-label">Down Hr</span>
              <span className="pe-fleet-value danger">{formatNum(totals.downHr)}</span>
            </div>
            <div className="pe-fleet-card pe-fleet-card--status">
              <span className="pe-fleet-label">Revenue (ETB)</span>
              <span className="pe-fleet-value">{formatNum(totals.totalRevenue, 0)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="table-wrapper">
        <table className="equipment-table">
          <thead>
            <tr>
              <th>Asset ID</th>
              <th>Name</th>
              <th>Op Hr</th>
              <th>Idle Hr</th>
              <th>Down Hr</th>
              <th>Avail %</th>
              <th>Util %</th>
              <th>Fuel Act</th>
              <th>Fuel Exp</th>
              <th>Var %</th>
              <th>Revenue</th>
              {canEdit && <th aria-label="Actions" />}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 12 : 11} className="text-center empty-row">
                  No daily logs for this date. {canEdit && 'Click "Log Day" to add an entry.'}
                </td>
              </tr>
            ) : rows.map((row) => (
              <tr
                key={row.id}
                className="row-clickable"
                onClick={() => canEdit && openEdit(row)}
              >
                <td className="font-semibold eq-code-cell">{row.assetNo}</td>
                <td>{row.assetName}</td>
                <td>{formatNum(row.operableHr)}</td>
                <td>{formatNum(row.idleHr)}</td>
                <td>{formatNum(row.downHr)}</td>
                <td>{formatPct(row.availabilityPct)}</td>
                <td>{formatPct(row.utilizationPct)}</td>
                <td>{formatNum(row.actualFuel)}</td>
                <td>{formatNum(row.expectedFuel)}</td>
                <td>{formatPct(row.fuelVariancePct)}</td>
                <td className="font-semibold">{formatNum(row.totalRevenue, 0)}</td>
                {canEdit && (
                  <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                    <button type="button" className="delete-row-btn" onClick={() => handleDelete(row)} title="Delete">
                      <Trash2 size={15} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AppModal
        open={open}
        title={editingId ? 'Edit Daily Log' : 'Log Daily Operations'}
        onClose={() => setOpen(false)}
        onSubmit={handleSubmit}
        submitLabel={saving ? 'Saving…' : editingId ? 'Save Changes' : 'Save Log'}
        submitDisabled={saving}
        large
      >
        <div className="production-form-grid">
          <FormField label="Date">
            <input
              type="date"
              required
              value={form.opsDate}
              onChange={(e) => setForm({ ...form, opsDate: e.target.value })}
            />
          </FormField>
          <FormField label="Asset">
            <select
              required
              value={form.equipmentId}
              onChange={(e) => setForm({ ...form, equipmentId: e.target.value })}
              disabled={Boolean(editingId)}
            >
              <option value="">Select asset…</option>
              {equipment.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.code} — {eq.name}
                </option>
              ))}
            </select>
          </FormField>
          {selectedAsset && (
            <FormField label="From Asset Register" full>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {selectedAsset.category || '—'} · {selectedAsset.equipmentType || '—'}
                {' · '}Fuel Norm: {selectedAsset.fuelNorm ?? '—'} L/hr
                {' · '}Lease: {selectedAsset.leaseRateHour != null ? Number(selectedAsset.leaseRateHour).toLocaleString() : '—'} ETB/hr
              </p>
            </FormField>
          )}
          <FormField label="Operable Hours">
            <input type="number" min="0" step="0.1" value={form.operableHr} onChange={(e) => setForm({ ...form, operableHr: e.target.value })} />
          </FormField>
          <FormField label="Idle Hours">
            <input type="number" min="0" step="0.1" value={form.idleHr} onChange={(e) => setForm({ ...form, idleHr: e.target.value })} />
          </FormField>
          <FormField label="Down Hours">
            <input type="number" min="0" step="0.1" value={form.downHr} onChange={(e) => setForm({ ...form, downHr: e.target.value })} />
          </FormField>
          <FormField label="Actual Fuel (L)">
            <input type="number" min="0" step="0.1" value={form.actualFuel} onChange={(e) => setForm({ ...form, actualFuel: e.target.value })} />
          </FormField>
          {Number(form.idleHr) > 0 && (
            <FormField label="Reason for Idle" full>
              <input required value={form.reasonIdle} onChange={(e) => setForm({ ...form, reasonIdle: e.target.value })} placeholder="Why was the asset idle?" />
            </FormField>
          )}
          {Number(form.downHr) > 0 && (
            <FormField label="Reason for Down" full>
              <input required value={form.reasonDown} onChange={(e) => setForm({ ...form, reasonDown: e.target.value })} placeholder="Why was the asset down?" />
            </FormField>
          )}
          <FormField label="Notes (optional)" full>
            <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </FormField>
        </div>
        {error && <p className="pe-form-error">{error}</p>}
      </AppModal>
    </div>
  );
}
