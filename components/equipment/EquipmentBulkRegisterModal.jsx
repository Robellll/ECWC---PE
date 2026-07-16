'use client';

import { useState, useMemo } from 'react';
import { Plus, Trash2, Copy, Check } from 'lucide-react';
import AppModal from '@/components/ui/AppModal';
import {
  emptyBulkEquipmentRow,
  EQUIPMENT_STATUS_OPTIONS,
  isBulkRowComplete,
  isBulkRowPartial,
  requiresStatusReason,
  validateStatusReason,
} from '@/lib/equipment-form';

const INITIAL_ROW_COUNT = 3;

const BULK_ROW_PLACEHOLDERS = [
  {
    assetNo: 'ECWC-AST-00421',
    plateSerial: 'AA-3-12345',
    model: 'CAT 320D Excavator',
    operatorName: 'Abebe Kebede',
    operatorPhone: '0911 234 567',
    capacity: '20 ton',
    remarks: 'Sector 12, chainage 4+200',
  },
  {
    assetNo: 'ECWC-AST-00422',
    plateSerial: 'ABCD1234',
    model: '100 KVA Generator',
    operatorName: 'Kebede Alemu',
    operatorPhone: '0912 345 678',
    capacity: '4×4 pickup',
    remarks: 'Site logistics vehicle',
  },
  {
    assetNo: 'ECWC-AST-00423',
    plateSerial: 'AA-4-11223',
    model: 'Nissan Dump Truck',
    operatorName: 'Dawit Tesfaye',
    operatorPhone: '0913 456 789',
    capacity: '15 m³',
    remarks: 'Hauling aggregate',
  },
];

const BULK_DEFAULT_PLACEHOLDERS = {
  assetNo: 'ECWC-AST-00XXX',
  plateSerial: 'AA-3-12345',
  model: 'e.g. CAT 320D Excavator',
  operatorName: 'Operator name',
  operatorPhone: '0911…',
  capacity: '20 ton',
  remarks: 'Site notes',
};

function bulkPlaceholder(rowIndex, field) {
  return BULK_ROW_PLACEHOLDERS[rowIndex]?.[field] ?? BULK_DEFAULT_PLACEHOLDERS[field];
}

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
        plateSerial: source.plateSerial,
        model: source.model,
        status: source.status,
        statusReason: source.statusReason,
        operatorName: source.operatorName,
        operatorPhone: source.operatorPhone,
        capacity: source.capacity,
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
      setError('Each row must have Asset No., Plate / Serial, and Vehicle / Equipment Model — or leave the row blank.');
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
        plateSerial: row.plateSerial.trim(),
        model: row.model.trim(),
        status: row.status,
        statusReason: row.statusReason.trim(),
        operatorName: row.operatorName.trim(),
        operatorPhone: row.operatorPhone.trim(),
        capacity: row.capacity.trim(),
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
      subtitle={<>Add multiple items for <strong>{projectName}</strong>. Asset No., Plate / Serial, and Vehicle / Equipment Model are required.</>}
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
                <th>Asset No. *</th>
                <th>Plate / Serial *</th>
                <th>Vehicle / Equipment Model *</th>
                <th>Status</th>
                <th>Idle / Down reason</th>
                <th>Operator</th>
                <th>Phone</th>
                <th>Capacity</th>
                <th>Remarks</th>
                <th className="pe-bulk-col-actions" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const rowError = isBulkRowPartial(row);
                return (
                  <tr key={row.id} className={rowError ? 'pe-bulk-row-error' : ''}>
                    <td className="pe-bulk-col-num text-muted">{index + 1}</td>
                    <td>
                      <input
                        type="text"
                        value={row.assetNo}
                        onChange={(e) => updateCell(row.id, 'assetNo', e.target.value)}
                        className="grid-input"
                        placeholder={bulkPlaceholder(index, 'assetNo')}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={row.plateSerial}
                        onChange={(e) => updateCell(row.id, 'plateSerial', e.target.value)}
                        className="grid-input"
                        placeholder={bulkPlaceholder(index, 'plateSerial')}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={row.model}
                        onChange={(e) => updateCell(row.id, 'model', e.target.value)}
                        className="grid-input"
                        placeholder={bulkPlaceholder(index, 'model')}
                      />
                    </td>
                    <td>
                      <select
                        value={row.status}
                        onChange={(e) => updateCell(row.id, 'status', e.target.value)}
                        className="grid-select"
                      >
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
                        placeholder={requiresStatusReason(row.status) ? 'Required for Idle / Down' : '—'}
                        disabled={!requiresStatusReason(row.status)}
                        aria-required={requiresStatusReason(row.status)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={row.operatorName}
                        onChange={(e) => updateCell(row.id, 'operatorName', e.target.value)}
                        className="grid-input"
                        placeholder={bulkPlaceholder(index, 'operatorName')}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={row.operatorPhone}
                        onChange={(e) => updateCell(row.id, 'operatorPhone', e.target.value)}
                        className="grid-input"
                        placeholder={bulkPlaceholder(index, 'operatorPhone')}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={row.capacity}
                        onChange={(e) => updateCell(row.id, 'capacity', e.target.value)}
                        className="grid-input"
                        placeholder={bulkPlaceholder(index, 'capacity')}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={row.remarks}
                        onChange={(e) => updateCell(row.id, 'remarks', e.target.value)}
                        className="grid-input"
                        placeholder={bulkPlaceholder(index, 'remarks')}
                      />
                    </td>
                    <td className="pe-bulk-actions-cell">
                      <div className="pe-bulk-actions-inner">
                        <button
                          type="button"
                          className="icon-btn-ghost"
                          onClick={() => duplicateRow(row.id)}
                          title="Duplicate row"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn-danger"
                          onClick={() => deleteRow(row.id)}
                          title="Remove row"
                        >
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
