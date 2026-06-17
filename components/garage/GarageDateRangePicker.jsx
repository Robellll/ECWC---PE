'use client';

import { useState, useEffect, useRef } from 'react';
import { DayPicker } from 'react-day-picker';
import { Calendar, X } from 'lucide-react';
import { formatRangeLabel, isRangeComplete, normalizeRange } from '@/lib/date-range';
import 'react-day-picker/style.css';
import './GarageDateRangePicker.css';

export default function GarageDateRangePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value ?? { from: undefined, to: undefined });
  const ref = useRef(null);

  useEffect(() => {
    if (!open) setDraft(value ?? { from: undefined, to: undefined });
  }, [open, value]);

  useEffect(() => {
    if (!open) return undefined;
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const active = isRangeComplete(value);

  const handleDone = () => {
    const normalized = normalizeRange(draft);
    if (!isRangeComplete(normalized)) return;
    onChange(normalized);
    setOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
    setDraft({ from: undefined, to: undefined });
  };

  return (
    <div className="garage-date-range" ref={ref}>
      <span className="maintenance-type-label">Report Period</span>
      <button
        type="button"
        className={`date-range-trigger ${active ? 'active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <Calendar size={16} />
        <span className="date-range-trigger-text">
          {active ? formatRangeLabel(value) : 'Select date range'}
        </span>
        {active && (
          <span
            className="date-range-clear"
            role="button"
            tabIndex={0}
            onClick={handleClear}
            onKeyDown={(e) => { if (e.key === 'Enter') handleClear(e); }}
            aria-label="Clear date range"
          >
            <X size={14} />
          </span>
        )}
      </button>

      {open && (
        <div className="date-range-popover">
          <p className="date-range-popover-title">Select completion date range</p>
          <p className="date-range-popover-hint">Click a start date, then an end date</p>
          <DayPicker
            mode="range"
            weekStartsOn={1}
            selected={draft}
            onSelect={(range) => setDraft(normalizeRange(range ?? { from: undefined, to: undefined }))}
            numberOfMonths={1}
            defaultMonth={draft.from ?? new Date()}
          />
          <div className="date-range-selection">
            <span>
              <strong>From:</strong>{' '}
              {draft.from
                ? draft.from.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—'}
            </span>
            <span>
              <strong>To:</strong>{' '}
              {draft.to
                ? draft.to.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—'}
            </span>
          </div>
          <div className="date-range-actions">
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={!isRangeComplete(draft)}
              onClick={handleDone}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
