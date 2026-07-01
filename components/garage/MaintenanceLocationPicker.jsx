'use client';

import {
  CENTRAL_LOCATION_OPTIONS,
  PROJECT_LOCATION_OPTIONS,
} from '@/lib/maintenance-location';
import './MaintenanceLocationPicker.css';

export default function MaintenanceLocationPicker({
  variant = 'central',
  value,
  outsourceGarageName = '',
  onChange,
  onOutsourceNameChange,
  onBlurSave,
  editable = true,
  hint,
  saving = false,
}) {
  const options = variant === 'project' ? PROJECT_LOCATION_OPTIONS : CENTRAL_LOCATION_OPTIONS;

  if (!editable) {
    return null;
  }

  return (
    <div className="garage-maint-loc-block">
      <span className="garage-maint-loc-label">Maintenance Location</span>
      <div className="garage-maint-loc-toggle" role="group" aria-label="Maintenance location">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`garage-maint-loc-btn loc-${opt.value} ${value === opt.value ? 'active' : ''}`}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {value === 'outsource' && (
        <input
          type="text"
          className="garage-maint-outsource-input"
          value={outsourceGarageName}
          onChange={(e) => onOutsourceNameChange(e.target.value)}
          onBlur={onBlurSave}
          placeholder="Which garage is the equipment at?"
          disabled={saving}
        />
      )}
      {hint && <p className="garage-maint-loc-hint">{hint}</p>}
    </div>
  );
}
