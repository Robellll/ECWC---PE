'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

/**
 * Styled single-select dropdown. Native <select> option lists cannot be themed,
 * so the menu is rendered as a popup list with optional filtering.
 */
export default function HrDropdown({
  label,
  value,
  options = [],
  onChange,
  placeholder = 'All',
  searchThreshold = 8,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef(null);
  const searchRef = useRef(null);

  const items = useMemo(
    () => [{ value: '', label: placeholder }, ...options],
    [options, placeholder],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.label.toLowerCase().includes(q));
  }, [items, query]);

  const selected = items.find((item) => item.value === value) || items[0];
  const searchable = options.length >= searchThreshold;

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }
    setActiveIndex(Math.max(0, filtered.findIndex((item) => item.value === value)));
    if (searchable) searchRef.current?.focus();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const commit = (item) => {
    onChange(item.value);
    setOpen(false);
  };

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!open && (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown')) {
      event.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = filtered[activeIndex];
      if (item) commit(item);
    }
  };

  return (
    <div
      className={`hr-dropdown ${value ? 'is-active' : ''} ${open ? 'is-open' : ''}`}
      ref={rootRef}
      onKeyDown={onKeyDown}
    >
      {label && <span className="hr-dropdown-label">{label}</span>}
      <button
        type="button"
        className="hr-dropdown-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="hr-dropdown-value">{selected?.label}</span>
        <ChevronDown size={15} className="hr-dropdown-chevron" aria-hidden="true" />
      </button>

      {open && (
        <div className="hr-dropdown-menu" role="listbox">
          {searchable && (
            <div className="hr-dropdown-search">
              <Search size={14} aria-hidden="true" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
                placeholder="Type to filter…"
                aria-label="Filter options"
              />
            </div>
          )}
          <ul className="hr-dropdown-list">
            {filtered.length === 0 ? (
              <li className="hr-dropdown-none">No matches</li>
            ) : filtered.map((item, index) => (
              <li key={item.value || '__all'}>
                <button
                  type="button"
                  role="option"
                  aria-selected={item.value === value}
                  className={[
                    'hr-dropdown-option',
                    item.value === value ? 'is-selected' : '',
                    index === activeIndex ? 'is-active' : '',
                  ].filter(Boolean).join(' ')}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => commit(item)}
                >
                  <span className="hr-dropdown-option-label">{item.label}</span>
                  {item.value === value && <Check size={14} />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
