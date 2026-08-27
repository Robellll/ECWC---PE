'use client';

import { Plus, Trash2 } from 'lucide-react';
import StaffIdLookup from '@/components/garage/StaffIdLookup';
import './TechnicianListEditor.css';

export default function TechnicianListEditor({
  values = [''],
  onChange,
  onBlur,
  useStaffLookup = true,
  idPrefix = 'technician',
  addLabel = 'Add technician',
  namePlaceholder = 'Mechanic who performed the work',
}) {
  const rows = values.length > 0 ? values : [''];

  const updateRow = (index, nextValue) => {
    const next = [...rows];
    next[index] = nextValue;
    onChange(next);
  };

  const addRow = () => {
    onChange([...rows, '']);
  };

  const removeRow = (index) => {
    if (rows.length <= 1) {
      onChange(['']);
      return;
    }
    onChange(rows.filter((_, i) => i !== index));
  };

  return (
    <div className="technician-list-editor">
      {rows.map((value, index) => (
        <div key={`${idPrefix}-${index}`} className="technician-list-row">
          <span className="technician-list-index">{index + 1}</span>
          <div className="technician-list-field">
            {useStaffLookup ? (
              <StaffIdLookup
                id={`${idPrefix}-${index}`}
                value={value}
                onChange={(next) => updateRow(index, next)}
                onBlur={onBlur}
                required={index === 0}
                idPlaceholder="Staff ID"
                namePlaceholder="Name fills from ID"
              />
            ) : (
              <input
                type="text"
                className="technician-list-name-input"
                value={value}
                onChange={(e) => updateRow(index, e.target.value)}
                onBlur={onBlur}
                placeholder={namePlaceholder}
                required={index === 0}
              />
            )}
          </div>
          {rows.length > 1 && (
            <button
              type="button"
              className="technician-list-remove"
              onClick={() => removeRow(index)}
              title="Remove technician"
              aria-label={`Remove technician ${index + 1}`}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ))}
      <button type="button" className="technician-list-add" onClick={addRow}>
        <Plus size={14} />
        {addLabel}
      </button>
    </div>
  );
}
