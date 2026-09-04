'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronDown, Eye, EyeOff, FilterX, Lock, Pencil, Plus, Trash2, Users, Wallet,
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { apiFetch } from '@/lib/api-client';
import { EMPLOYEE_TYPES } from '@/lib/hr';
import SearchBar from '@/components/shared/SearchBar';
import AppModal, { FormField } from '@/components/ui/AppModal';
import AppLoader from '@/components/ui/AppLoader';
import HrDropdown from '@/components/hr/HrDropdown';
import './Hr.css';

const PAGE_STEP = 100;
const SALARY_PASSCODE = '1212';

const emptyForm = () => ({
  employeeNo: '',
  fullName: '',
  sex: '',
  jobTitle: '',
  grade: '',
  salary: '',
  desertAllowance: '',
  foodAllowance: '',
  department: '',
  workLocation: '',
  employeeType: 'Permanent',
});

function formatMoney(value) {
  if (value == null) return '—';
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function initials(name) {
  return String(name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

export default function HrEmployees({ workforce, title, subtitle }) {
  const { canViewHR, canEditHR } = usePermissions();
  const isProject = workforce === 'project';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [sexFilter, setSexFilter] = useState('');
  const [visible, setVisible] = useState(PAGE_STEP);
  const [expandedId, setExpandedId] = useState(null);

  const [showSalary, setShowSalary] = useState(false);
  const [passOpen, setPassOpen] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [passError, setPassError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await apiFetch(`/api/hr/employees?workforce=${workforce}`);
      setData(result);
    } catch (err) {
      setError(err.message || 'Could not load employees');
    } finally {
      setLoading(false);
    }
  }, [workforce]);

  useEffect(() => {
    if (canViewHR) load();
    else setLoading(false);
  }, [canViewHR, load]);

  useEffect(() => { setVisible(PAGE_STEP); }, [search, typeFilter, groupFilter, sexFilter]);

  const groups = isProject ? (data?.locations || []) : (data?.departments || []);
  const hasFilters = Boolean(search || typeFilter || groupFilter || sexFilter);

  const clearFilters = () => {
    setSearch('');
    setTypeFilter('');
    setGroupFilter('');
    setSexFilter('');
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.employees || []).filter((person) => {
      if (typeFilter && person.employeeType !== typeFilter) return false;
      if (sexFilter && person.sex !== sexFilter) return false;
      if (groupFilter) {
        const group = isProject ? person.workLocation : person.department;
        if (group !== groupFilter) return false;
      }
      if (!q) return true;
      return [person.employeeNo, person.fullName, person.jobTitle, person.grade]
        .some((value) => String(value || '').toLowerCase().includes(q));
    });
  }, [data?.employees, search, typeFilter, groupFilter, sexFilter, isProject]);

  const payroll = useMemo(
    () => filtered.reduce((sum, p) => sum + (Number(p.totalPay ?? p.salary) || 0), 0),
    [filtered],
  );

  const toggleSalary = () => {
    if (showSalary) {
      setShowSalary(false);
      return;
    }
    setPasscode('');
    setPassError('');
    setPassOpen(true);
  };

  const submitPasscode = (event) => {
    event.preventDefault();
    if (passcode.trim() !== SALARY_PASSCODE) {
      setPassError('Incorrect password');
      return;
    }
    setShowSalary(true);
    setPassOpen(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (person) => {
    setEditing(person);
    setForm({
      employeeNo: person.employeeNo || '',
      fullName: person.fullName || '',
      sex: person.sex || '',
      jobTitle: person.jobTitle || '',
      grade: person.grade || '',
      salary: person.salary ?? '',
      desertAllowance: person.desertAllowance ?? '',
      foodAllowance: person.foodAllowance ?? '',
      department: person.department || '',
      workLocation: person.workLocation || '',
      employeeType: person.employeeType || '',
    });
    setFormError('');
    setFormOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const payload = { ...form, workforce };
      if (editing) {
        await apiFetch(`/api/hr/employees/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/api/hr/employees', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setFormOpen(false);
      await load();
    } catch (err) {
      setFormError(err.message || 'Could not save employee');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (person) => {
    if (!window.confirm(`Remove ${person.fullName} from the HR register?`)) return;
    try {
      await apiFetch(`/api/hr/employees/${person.id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err.message || 'Could not delete employee');
    }
  };

  if (!canViewHR) {
    return (
      <div className="hr-page">
        <p className="page-subtitle">You do not have access to HR.</p>
      </div>
    );
  }

  if (loading && !data) {
    return <AppLoader label="Loading employees…" variant="page" />;
  }

  const rows = filtered.slice(0, visible);
  const formTotal = isProject
    ? (Number(form.salary) || 0) + (Number(form.desertAllowance) || 0) + (Number(form.foodAllowance) || 0)
    : Number(form.salary) || 0;
  const columnCount = canEditHR ? 8 : 7;

  return (
    <div className="hr-page">
      <header className="hr-header">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
        <div className="hr-header-actions">
          <button type="button" className="btn-secondary" onClick={toggleSalary}>
            {showSalary ? <EyeOff size={16} /> : <Eye size={16} />}
            {showSalary ? 'Hide Salary' : 'Show Salary'}
          </button>
          {canEditHR && (
            <button type="button" className="btn-primary" onClick={openCreate}>
              <Plus size={16} /> Add Employee
            </button>
          )}
        </div>
      </header>

      {error && <p className="hr-error">{error}</p>}

      <section className="hr-filter-card">
        <div className="hr-filter-top">
          <SearchBar
            value={search}
            onChange={setSearch}
            variant="modern"
            className="hr-search"
            placeholder="Search by name, badge number, job title or grade…"
          />
          <div className="hr-stat-pills">
            <span className="hr-stat-pill">
              <Users size={14} />
              <strong>{filtered.length.toLocaleString()}</strong>
              of {(data?.total || 0).toLocaleString()}
            </span>
            <span className="hr-stat-pill hr-stat-pill--accent">
              <Wallet size={14} />
              <strong className={showSalary ? '' : 'hr-amount-hidden'}>
                {formatMoney(payroll)}
              </strong>
              ETB / month
            </span>
          </div>
        </div>

        <div className="hr-filter-row">
          <HrDropdown
            label={isProject ? 'Project Site' : 'Department'}
            value={groupFilter}
            onChange={setGroupFilter}
            placeholder={isProject ? 'All project sites' : 'All departments'}
            options={groups.map((group) => ({ value: group, label: group }))}
          />
          <HrDropdown
            label="Employment Type"
            value={typeFilter}
            onChange={setTypeFilter}
            placeholder="All types"
            options={(data?.employeeTypes || []).map((type) => ({ value: type, label: type }))}
          />
          <HrDropdown
            label="Gender"
            value={sexFilter}
            onChange={setSexFilter}
            placeholder="All genders"
            options={[{ value: 'M', label: 'Male' }, { value: 'F', label: 'Female' }]}
          />
          {hasFilters && (
            <button type="button" className="hr-clear-filters" onClick={clearFilters}>
              <FilterX size={15} /> Clear filters
            </button>
          )}
        </div>
      </section>

      <section className="hr-table-card">
        <div className="hr-table-scroll">
          <table className="hr-table">
            <thead>
              <tr>
                <th className="hr-col-index">#</th>
                <th>Badge No</th>
                <th>Employee</th>
                <th>Job Title</th>
                <th>Grade</th>
                <th>{isProject ? 'Project Site' : 'Department'}</th>
                <th>Type</th>
                {canEditHR && <th className="hr-col-actions" aria-label="Actions" />}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={columnCount} className="hr-table-empty">
                    No employees match these filters.
                  </td>
                </tr>
              ) : rows.map((person, index) => {
                const expanded = expandedId === person.id;
                return (
                  <Fragment key={person.id}>
                    <tr
                      className={`hr-row-clickable ${expanded ? 'is-expanded' : ''}`}
                      onClick={() => setExpandedId(expanded ? null : person.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setExpandedId(expanded ? null : person.id);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-expanded={expanded}
                      title={`Show details for ${person.fullName}`}
                    >
                      <td className="hr-col-index">{index + 1}</td>
                      <td className="hr-cell-badge">{person.employeeNo || '—'}</td>
                      <td>
                        <span className="hr-person">
                          <span className={`hr-avatar ${person.sex === 'F' ? 'hr-avatar--f' : ''}`}>
                            {initials(person.fullName)}
                          </span>
                          <span className="hr-person-name">{person.fullName}</span>
                          <ChevronDown
                            size={14}
                            className={`hr-person-chevron ${expanded ? 'is-open' : ''}`}
                            aria-hidden="true"
                          />
                        </span>
                      </td>
                      <td className="hr-cell-muted">{person.jobTitle || '—'}</td>
                      <td><span className="hr-grade">{person.grade || '—'}</span></td>
                      <td className="hr-cell-muted hr-cell-group">
                        {(isProject ? person.workLocation : person.department) || '—'}
                      </td>
                      <td>
                        <span className={`hr-badge hr-badge--${(person.employeeType || 'na').toLowerCase()}`}>
                          {person.employeeType || '—'}
                        </span>
                      </td>
                      {canEditHR && (
                        <td className="hr-col-actions">
                          <div className="hr-row-actions" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="hr-icon-btn"
                              onClick={() => openEdit(person)}
                              title={`Edit ${person.fullName}`}
                              aria-label={`Edit ${person.fullName}`}
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              className="hr-icon-btn hr-icon-btn--danger"
                              onClick={() => handleDelete(person)}
                              title={`Delete ${person.fullName}`}
                              aria-label={`Delete ${person.fullName}`}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>

                    {expanded && (
                      <tr className="hr-detail-row">
                        <td colSpan={columnCount}>
                          <div className="hr-detail">
                            <div className="hr-detail-head">
                              <span className={`hr-avatar hr-avatar--lg ${person.sex === 'F' ? 'hr-avatar--f' : ''}`}>
                                {initials(person.fullName)}
                              </span>
                              <div>
                                <h3 className="hr-detail-name">{person.fullName}</h3>
                                <p className="hr-detail-role">
                                  {person.jobTitle || 'No job title recorded'} · {person.workforceLabel}
                                </p>
                              </div>
                              <span className={`hr-badge hr-badge--${(person.employeeType || 'na').toLowerCase()}`}>
                                {person.employeeType || 'Unspecified'}
                              </span>
                            </div>

                            <dl className="hr-detail-grid">
                              <div className="hr-detail-item">
                                <dt>Badge No</dt>
                                <dd>{person.employeeNo || '—'}</dd>
                              </div>
                              <div className="hr-detail-item">
                                <dt>Gender</dt>
                                <dd>{person.sexLabel}</dd>
                              </div>
                              <div className="hr-detail-item">
                                <dt>Salary Grade</dt>
                                <dd>{person.grade || '—'}</dd>
                              </div>
                              <div className="hr-detail-item">
                                <dt>{isProject ? 'Project Site' : 'Department'}</dt>
                                <dd>{(isProject ? person.workLocation : person.department) || '—'}</dd>
                              </div>
                              <div className="hr-detail-item">
                                <dt>Base Salary</dt>
                                <dd className={showSalary ? '' : 'hr-amount-hidden'}>
                                  {formatMoney(person.salary)} ETB
                                </dd>
                              </div>
                              {isProject && (
                                <>
                                  <div className="hr-detail-item">
                                    <dt>Desert Allowance</dt>
                                    <dd className={showSalary ? '' : 'hr-amount-hidden'}>
                                      {formatMoney(person.desertAllowance)} ETB
                                    </dd>
                                  </div>
                                  <div className="hr-detail-item">
                                    <dt>Food Allowance</dt>
                                    <dd className={showSalary ? '' : 'hr-amount-hidden'}>
                                      {formatMoney(person.foodAllowance)} ETB
                                    </dd>
                                  </div>
                                </>
                              )}
                              <div className="hr-detail-item hr-detail-item--total">
                                <dt>Total Monthly Pay</dt>
                                <dd className={showSalary ? '' : 'hr-amount-hidden'}>
                                  {formatMoney(person.totalPay)} ETB
                                </dd>
                              </div>
                            </dl>

                            {!showSalary && (
                              <p className="hr-detail-hint">
                                <Lock size={13} /> Pay figures are hidden — use “Show Salary” to unlock.
                              </p>
                            )}

                            {canEditHR && (
                              <div className="hr-detail-actions">
                                <button type="button" className="btn-secondary" onClick={() => openEdit(person)}>
                                  <Pencil size={15} /> Edit employee
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {visible < filtered.length && (
          <div className="hr-table-footer">
            <span>Showing {rows.length.toLocaleString()} of {filtered.length.toLocaleString()}</span>
            <button type="button" className="btn-secondary" onClick={() => setVisible((v) => v + PAGE_STEP)}>
              Show {Math.min(PAGE_STEP, filtered.length - visible)} more
            </button>
          </div>
        )}
      </section>

      <AppModal
        open={passOpen}
        title="Show salary figures"
        subtitle="Salary and allowance amounts are hidden by default."
        titleIcon={<Lock size={18} />}
        onClose={() => setPassOpen(false)}
        onSubmit={submitPasscode}
        submitLabel="Unlock"
      >
        <FormField label="Password" full>
          <input
            type="password"
            value={passcode}
            autoFocus
            onChange={(e) => { setPasscode(e.target.value); setPassError(''); }}
            placeholder="Enter password"
          />
        </FormField>
        {passError && <p className="hr-error">{passError}</p>}
      </AppModal>

      <AppModal
        open={formOpen}
        title={editing ? 'Edit Employee' : 'Add Employee'}
        subtitle={isProject ? 'Project workforce record' : 'Head office workforce record'}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        submitLabel={saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Employee'}
        submitDisabled={saving}
        large
      >
        <div className="production-form-grid">
          <FormField label="Badge No">
            <input
              value={form.employeeNo}
              onChange={(e) => setForm({ ...form, employeeNo: e.target.value })}
              placeholder="e.g. 08872"
            />
          </FormField>
          <FormField label="Full Name">
            <input
              required
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="First and last name"
            />
          </FormField>
          <FormField label="Gender">
            <select value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })}>
              <option value="">Not specified</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
          </FormField>
          <FormField label="Employment Type">
            <select
              value={form.employeeType}
              onChange={(e) => setForm({ ...form, employeeType: e.target.value })}
            >
              <option value="">Not specified</option>
              {EMPLOYEE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </FormField>
          <FormField label="Job Title" full>
            <input
              value={form.jobTitle}
              onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
              placeholder="e.g. Transport Equipment Operator Level 3"
            />
          </FormField>
          <FormField label={isProject ? 'Project Site' : 'Department'} full>
            <input
              list="hr-group-options"
              value={isProject ? form.workLocation : form.department}
              onChange={(e) => setForm(
                isProject
                  ? { ...form, workLocation: e.target.value }
                  : { ...form, department: e.target.value },
              )}
              placeholder={isProject ? 'Select or type a project site' : 'Select or type a department'}
            />
            <datalist id="hr-group-options">
              {groups.map((group) => <option key={group} value={group} />)}
            </datalist>
          </FormField>
          <FormField label="Salary Grade">
            <input
              value={form.grade}
              onChange={(e) => setForm({ ...form, grade: e.target.value })}
              placeholder="e.g. 8I"
            />
          </FormField>
          <FormField label="Salary (ETB)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.salary}
              onChange={(e) => setForm({ ...form, salary: e.target.value })}
            />
          </FormField>
          {isProject && (
            <>
              <FormField label="Desert Allowance (ETB)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.desertAllowance}
                  onChange={(e) => setForm({ ...form, desertAllowance: e.target.value })}
                />
              </FormField>
              <FormField label="Food Allowance (ETB)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.foodAllowance}
                  onChange={(e) => setForm({ ...form, foodAllowance: e.target.value })}
                />
              </FormField>
            </>
          )}
          <FormField label="Total Pay (calculated)" full>
            <p className="hr-form-total">{formatMoney(formTotal)} ETB / month</p>
          </FormField>
        </div>
        {formError && <p className="hr-error">{formError}</p>}
      </AppModal>
    </div>
  );
}
