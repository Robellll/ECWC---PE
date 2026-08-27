'use client';

import { useEffect, useState } from 'react';
import {
  findGarageStaffById,
  formatStaffDisplay,
  parseStaffIdFromDisplay,
} from '@/lib/garage-staff';
import { useManpowerDirectory } from '@/hooks/useManpowerDirectory';
import './StaffIdLookup.css';

/**
 * Enter staff ID → auto-fills name from the Man Power directory.
 * Stored value format: "Full Name (ID)" when found; otherwise keeps typed name.
 */
export default function StaffIdLookup({
  value = '',
  onChange,
  onBlur,
  required = false,
  id,
  namePlaceholder = 'Name appears after ID lookup',
  idPlaceholder = 'Enter ID number',
  disabled = false,
  className = '',
}) {
  useManpowerDirectory();
  const [staffId, setStaffId] = useState(() => parseStaffIdFromDisplay(value));
  const [manualName, setManualName] = useState('');
  const match = findGarageStaffById(staffId);
  const displayName = match
    ? formatStaffDisplay(match)
    : (value && !parseStaffIdFromDisplay(value) ? value : manualName);

  useEffect(() => {
    const parsed = parseStaffIdFromDisplay(value);
    if (parsed) {
      setStaffId(parsed);
      setManualName('');
      return;
    }
    if (value && !findGarageStaffById(staffId)) {
      setManualName(value);
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const emit = (_nextId, nextName) => {
    if (typeof onChange === 'function') onChange(nextName);
  };

  const handleIdChange = (e) => {
    const nextId = e.target.value.replace(/[^\d]/g, '');
    setStaffId(nextId);
    const found = findGarageStaffById(nextId);
    if (found) {
      setManualName('');
      emit(nextId, formatStaffDisplay(found));
    } else if (!nextId) {
      setManualName('');
      emit('', '');
    } else {
      emit(nextId, manualName);
    }
  };

  const handleNameChange = (e) => {
    const next = e.target.value;
    setManualName(next);
    emit(staffId, next);
  };

  const showNotFound = staffId.length >= 3 && !match;

  return (
    <div className={`staff-id-lookup ${className}`.trim()}>
      <div className="staff-id-lookup-row">
        <div className="staff-id-lookup-id">
          <label htmlFor={id ? `${id}-id` : undefined} className="staff-id-lookup-sublabel">
            ID No.
          </label>
          <input
            id={id ? `${id}-id` : undefined}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={staffId}
            onChange={handleIdChange}
            onBlur={onBlur}
            placeholder={idPlaceholder}
            disabled={disabled}
            required={required}
            aria-invalid={showNotFound}
          />
        </div>
        <div className="staff-id-lookup-name">
          <label htmlFor={id ? `${id}-name` : undefined} className="staff-id-lookup-sublabel">
            Full Name
          </label>
          <input
            id={id ? `${id}-name` : undefined}
            type="text"
            value={match ? match.name : displayName}
            onChange={handleNameChange}
            onBlur={onBlur}
            placeholder={namePlaceholder}
            disabled={disabled || Boolean(match)}
            readOnly={Boolean(match)}
            required={required && !match}
            className={match ? 'staff-id-lookup-name-filled' : ''}
          />
        </div>
      </div>
      {match && (
        <p className="staff-id-lookup-meta">{match.title} · ID {match.id}</p>
      )}
      {showNotFound && (
        <p className="staff-id-lookup-error">
          No staff found for this ID. Check the number, or type the name manually.
        </p>
      )}
    </div>
  );
}
