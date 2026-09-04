'use client';

import { useState, useMemo } from 'react';
import { Plus, Trash2, Copy, Check } from 'lucide-react';
import AppModal from '@/components/ui/AppModal';
import {
  emptyBulkEquipmentRow,
  EQUIPMENT_STATUS_OPTIONS,
  EQUIPMENT_CATEGORIES,
  isBulkRowComplete,
  isBulkRowPartial,
  requiresStatusReason,
  validateStatusReason,
  validateAssetRegisterFields,
} from '@/lib/equipment-form';
import { typesForCategory } from '@/lib/equipment-register';

const INITIAL_ROW_COUNT = 3;

function createInitialRows() {
  return Array.from({ length: INITIAL_ROW_COUNT }, () => emptyBulkEquipmentRow());
}

export default function EquipmentBulkRegisterModal({
  open,
  projectName,
  existingAssetNos = [],
  onClose,
  onSubmit,
}) {
  const [rows, setRows] = useState(createInitialRows);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const validRows = useMemo(
    () => rows.filter((row) => isBulkRowComplete(row)),
    [rows],
  );

  const updateCell = (id, field, value) => {
    setRows((prev) => prev.map((row) => {
      if (row.id !== id) return row;
      const next = { ...row, [field]: value };
      if (field === 'status' && value !== row.status) {
        next.statusReason = '';
      }
      if (field === 'category') {
        const types = typesForCategory(value);
        next.equipmentType = types.includes(row.equipmentType) ? row.equipmentType : (types[0] || '');
      }
      return next;
    }));
    setError('');
  };

  const addRows = (count) => {
    const newRows = Array.from({ length: count }, () => emptyBulkEquipmentRow());
    setRows((prev) => [...prev, ...newRows]);
  };

  const deleteRow = (id) => {
    setRows((prev) => {
      const next = prev.filter((row) => row.id !== id);
      return next.length > 0 ? next : [emptyBulkEquipmentRow()];
    });
  };

  const duplicateRow = (id) => {
    setRows((prev) => {
      const index = prev.findIndex((row) => row.id === id);
      if (index === -1) return prev;
      const source = prev[index];
      const copy = {
        ...emptyBulkEquipmentRow(),
        name: source.name,
        category: source.category,
        equipmentType: source.equipmentType,
        make: source.make,
        manufacturingYear: source.manufacturingYear,
        fuelNorm: source.fuelNorm,
        leaseRateHour: source.leaseRateHour,
        status: source.status,
        statusReason: source.statusReason,
        plateSerial: source.plateSerial,
        remarks: source.remarks,
      };
      const next = [...prev];
      next.splice(index + 1, 0, copy);
      return next;
    });
  };

  const handleClose = () => {
    setRows(createInitialRows());
    setError('');
    onClose();
  };

  const handleSubmit = async () => {
    setError('');
    const partialRows = rows.filter((row) => isBulkRowPartial(row));
    if (partialRows.length > 0) {
      setError('Each row must have Asset ID, Name, Category, Type, and Make — or leave the row blank.');
      return;
    }
    if (validRows.length === 0) {
      setError('Add at least one complete equipment row.');
      return;
    }

    const assetNos = validRows.map((row) => row.assetNo.trim().toUpperCase());
    const internalDupes = assetNos.filter((code, index) => assetNos.indexOf(code) !== index);
    if (internalDupes.length > 0) {
      setError(`Duplicate asset numbers in form: ${[...new Set(internalDupes)].join(', ')}`);
      return;
    }

    const existingSet = new Set(existingAssetNos.map((code) => code.toUpperCase()));
    const conflicts = validRows.filter((row) => existingSet.has(row.assetNo.trim().toUpperCase()));
    if (conflicts.length > 0) {
      setError(`Asset numbers already registered: ${conflicts.map((r) => r.assetNo).join(', ')}`);
      return;
    }

    for (const row of validRows) {
      const formError = validateAssetRegisterFields(row);
      if (formError) {
        setError(`Row ${rows.findIndex((r) => r.id === row.id) + 1}: ${formError}`);
        return;
      }
      const reasonError = validateStatusReason(row.status, row.statusReason);
      if (reasonError) {
        setError(`Row ${rows.findIndex((r) => r.id === row.id) + 1}: ${reasonError}`);
        return;
      }
    }

    setSaving(true);
    try {
      await onSubmit(validRows.map((row) => ({
        assetNo: row.assetNo.trim(),
        name: row.name.trim(),
        category: row.category,
        equipmentType: row.equipmentType,
        make: row.make.trim(),
        manufacturingYear: row.manufacturingYear,
        fuelNorm: row.fuelNorm,
        leaseRateHour: row.leaseRateHour,
        plateSerial: row.plateSerial.trim(),
        status: row.status,
        statusReason: row.statusReason.trim(),
        remarks: row.remarks.trim(),
      })));
      setRows(createInitialRows());
      onClose();
    } catch (err) {
      setError(err.message || 'Could not register equipment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal
      open={open}
      title="Bulk Register Equipment"
      subtitle={<>Add multiple items for <strong>{projectName}</strong>. Asset ID, Name, Category, Type, and Make are required.</>}
      onClose={handleClose}
      xl
      noForm
      contentClassName="pe-bulk-modal"
      footer={(
        <div className="production-modal-actions pe-bulk-modal-actions">
          <div className="pe-bulk-add-buttons">
            <button type="button" className="btn-secondary btn-small" onClick={() => addRows(1)}>
              <Plus size={13} /> Add Row
            </button>
            <button type="button" className="btn-secondary btn-small" onClick={() => addRows(5)}>
              <Plus size={13} /> Add 5 Rows
            </button>
            <button type="button" className="btn-secondary btn-small" onClick={() => addRows(10)}>
              <Plus size={13} /> Add 10 Rows
            </button>
          </div>
          <div className="pe-bulk-submit-row">
            <button type="button" className="btn-secondary" onClick={handleClose}>Cancel</button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSubmit}
              disabled={saving || validRows.length === 0}
            >
              <Check size={15} />
              {saving ? 'Registering…' : `Register ${validRows.length} Item${validRows.length === 1 ? '' : 's'}`}
            </button>
          </div>
        </div>
      )}
    >
      <div className="bulk-spreadsheet-editor">
        <div className="spreadsheet-grid-wrapper pe-bulk-grid-wrapper">
          <table className="spreadsheet-grid pe-bulk-grid">
            <thead>
              <tr>
                <th className="pe-bulk-col-num">#</th>
                <th>Asset ID *</th>
                <th>Name *</th>
                <th>Category *</th>
                <th>Type *</th>
                <th>Make *</th>
                <th>Year</th>
                <th>Fuel Norm</th>
                <th>Lease/Hr</th>
                <th>Status</th>
                <th>Idle / Down reason</th>
                <th>Plate / Serial</th>
                <th>Remarks</th>
                <th className="pe-bulk-col-actions" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const rowError = isBulkRowPartial(row);
                const typeOptions = typesForCategory(row.category);
                return (
                  <tr key={row.id} className={rowError ? 'pe-bulk-row-error' : ''}>
                    <td className="pe-bulk-col-num text-muted">{index + 1}</td>
                    <td>
                      <input type="text" value={row.assetNo} onChange={(e) => updateCell(row.id, 'assetNo', e.target.value)} className="grid-input" placeholder="AA-65266" />
                    </td>
                    <td>
                      <input type="text" value={row.name} onChange={(e) => updateCell(row.id, 'name', e.target.value)} className="grid-input" placeholder="Bull Dozer (CAT)" />
                    </td>
                    <td>
                      <select value={row.category} onChange={(e) => updateCell(row.id, 'category', e.target.value)} className="grid-select">
                        {EQUIPMENT_CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select value={row.equipmentType} onChange={(e) => updateCell(row.id, 'equipmentType', e.target.value)} className="grid-select">
                        {typeOptions.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input type="text" value={row.make} onChange={(e) => updateCell(row.id, 'make', e.target.value)} className="grid-input" placeholder="CAT" />
                    </td>
                    <td>
                      <input type="number" value={row.manufacturingYear} onChange={(e) => updateCell(row.id, 'manufacturingYear', e.target.value)} className="grid-input" placeholder="2019" />
                    </td>
                    <td>
                      <input type="number" step="0.1" value={row.fuelNorm} onChange={(e) => updateCell(row.id, 'fuelNorm', e.target.value)} className="grid-input" placeholder="28" />
                    </td>
                    <td>
                      <input type="number" step="0.01" value={row.leaseRateHour} onChange={(e) => updateCell(row.id, 'leaseRateHour', e.target.value)} className="grid-input" placeholder="1800" />
                    </td>
                    <td>
                      <select value={row.status} onChange={(e) => updateCell(row.id, 'status', e.target.value)} className="grid-select">
                        {EQUIPMENT_STATUS_OPTIONS.map((opt) => (
                          <option key={opt.uiValue} value={opt.uiValue}>{opt.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className={requiresStatusReason(row.status) ? 'pe-bulk-reason-required' : ''}>
                      <input
                        type="text"
                        value={row.statusReason}
                        onChange={(e) => updateCell(row.id, 'statusReason', e.target.value)}
                        className="grid-input"
                        placeholder={requiresStatusReason(row.status) ? 'Required' : '—'}
                        disabled={!requiresStatusReason(row.status)}
                      />
                    </td>
                    <td>
                      <input type="text" value={row.plateSerial} onChange={(e) => updateCell(row.id, 'plateSerial', e.target.value)} className="grid-input" placeholder="Optional" />
                    </td>
                    <td>
                      <input type="text" value={row.remarks} onChange={(e) => updateCell(row.id, 'remarks', e.target.value)} className="grid-input" placeholder="Notes" />
                    </td>
                    <td className="pe-bulk-actions-cell">
                      <div className="pe-bulk-actions-inner">
                        <button type="button" className="icon-btn-ghost" onClick={() => duplicateRow(row.id)} title="Duplicate row">
                          <Copy size={14} />
                        </button>
                        <button type="button" className="icon-btn-danger" onClick={() => deleteRow(row.id)} title="Remove row">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {error && <p className="pe-form-error">{error}</p>}
      </div>
    </AppModal>
  );
}
