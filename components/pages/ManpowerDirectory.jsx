'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, UserX, UserCheck, RefreshCw } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { apiFetch } from '@/lib/api-client';
import { invalidateManpowerDirectoryCache } from '@/hooks/useManpowerDirectory';
import SearchBar from '@/components/shared/SearchBar';
import AppModal, { FormField } from '@/components/ui/AppModal';
import AppLoader from '@/components/ui/AppLoader';
import './Manpower.css';

const emptyForm = () => ({
  employeeId: '',
  fullName: '',
  jobTitle: '',
  notes: '',
  isActive: true,
});

export default function ManpowerDirectory() {
  const { canViewManpower, canEditManpower } = usePermissions();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/manpower');
      setStaff(Array.isArray(data) ? data : []);
      invalidateManpowerDirectoryCache();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canViewManpower) load();
    else setLoading(false);
  }, [canViewManpower, load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staff.filter((person) => {
      if (!showInactive && !person.isActive) return false;
      if (!q) return true;
      return [person.employeeId, person.fullName, person.jobTitle]
        .some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [staff, search, showInactive]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setError('');
    setModalOpen(true);
  };

  const openEdit = (person) => {
    setEditing(person);
    setForm({
      employeeId: person.employeeId,
      fullName: person.fullName,
      jobTitle: person.jobTitle || '',
      notes: person.notes || '',
      isActive: person.isActive,
    });
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await apiFetch(`/api/manpower/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(form),
        });
      } else {
        await apiFetch('/api/manpower', {
          method: 'POST',
          body: JSON.stringify(form),
        });
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err.message || 'Could not save staff member');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (person) => {
    const nextActive = !person.isActive;
    await apiFetch(`/api/manpower/${person.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: nextActive }),
    });
    await load();
  };

  if (!canViewManpower) {
    return (
      <div className="manpower-page">
        <p className="page-subtitle">You do not have access to Man Power.</p>
      </div>
    );
  }

  if (loading) {
    return <AppLoader label="Loading staff directory…" variant="page" className="manpower-page" />;
  }

  return (
    <div className="manpower-page">
      <div className="manpower-header">
        <div>
          <h1 className="page-title">Man Power — Staff Directory</h1>
          <p className="page-subtitle">
            Manage employee IDs and names used across Central Garage accountability fields.
          </p>
        </div>
        <div className="manpower-header-actions">
          <button type="button" className="btn-secondary" onClick={load}>
            <RefreshCw size={15} /> Refresh
          </button>
          {canEditManpower && (
            <button type="button" className="btn-primary" onClick={openCreate}>
              <Plus size={15} /> Add Staff
            </button>
          )}
        </div>
      </div>

      <div className="manpower-toolbar">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search ID, name, or job title…"
        />
        <label className="manpower-toggle">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          Show inactive
        </label>
        <span className="manpower-count">{filtered.length} shown</span>
      </div>

      <div className="table-wrapper">
        <table className="manpower-table">
          <thead>
            <tr>
              <th>ID No.</th>
              <th>Full Name</th>
              <th>Job Title</th>
              <th>Status</th>
              {canEditManpower && <th aria-label="Actions" />}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={canEditManpower ? 5 : 4} className="text-center empty-row">
                  No staff found.
                </td>
              </tr>
            ) : filtered.map((person) => (
              <tr key={person.id} className={person.isActive ? '' : 'row-inactive'}>
                <td className="font-semibold">{person.employeeId}</td>
                <td>{person.fullName}</td>
                <td className="text-muted">{person.jobTitle || '—'}</td>
                <td>
                  <span className={`status-badge ${person.isActive ? 'success' : 'warning'}`}>
                    {person.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                {canEditManpower && (
                  <td className="actions-cell">
                    <button type="button" className="icon-btn-ghost" onClick={() => openEdit(person)} title="Edit">
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      className="btn-secondary btn-small manpower-status-btn"
                      onClick={() => toggleActive(person)}
                      title={person.isActive ? 'Set status to Inactive (keeps the record)' : 'Set status to Active'}
                    >
                      {person.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                      {person.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AppModal
        open={modalOpen}
        title={editing ? 'Edit Staff Member' : 'Add Staff Member'}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        submitLabel={saving ? 'Saving…' : 'Save'}
        submitDisabled={saving}
      >
        <div className="production-form-grid">
          <FormField label="Employee ID">
            <input
              required
              value={form.employeeId}
              onChange={(e) => setForm({ ...form, employeeId: e.target.value.replace(/[^\d]/g, '') })}
              placeholder="e.g. 01824"
            />
          </FormField>
          <FormField label="Full Name">
            <input
              required
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="e.g. Mandefro Ayele"
            />
          </FormField>
          <FormField label="Job Title" full>
            <input
              value={form.jobTitle}
              onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
              placeholder="e.g. Mechanic level 3"
            />
          </FormField>
          <FormField label="Notes" full>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional notes"
            />
          </FormField>
          {editing && (
            <label className="manpower-toggle manpower-toggle--form">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              Active
            </label>
          )}
        </div>
        {error && <p className="manpower-error">{error}</p>}
      </AppModal>
    </div>
  );
}
