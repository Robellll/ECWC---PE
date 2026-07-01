'use client';

import { Search, X } from 'lucide-react';
import './SearchBar.css';

export default function SearchBar({
  value,
  onChange,
  placeholder,
  className = 'search-bar',
  inputClassName = '',
  iconClassName = 'search-icon',
  ariaLabel,
  variant = 'default',
}) {
  const hasValue = Boolean(value?.length);

  const barClassName = [
    variant === 'modern' && className === 'search-bar' ? null : className,
    variant === 'modern' ? 'search-bar--modern' : null,
  ].filter(Boolean).join(' ') || className;

  const handleClear = () => {
    onChange('');
  };

  return (
    <div className={barClassName}>
      <Search size={16} className={iconClassName} aria-hidden="true" />
      <input
        type="text"
        role="searchbox"
        className={inputClassName}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel || placeholder}
        autoComplete="off"
      />
      {hasValue && (
        <button
          type="button"
          className="search-clear-btn"
          onClick={handleClear}
          aria-label="Clear search"
          title="Clear search"
        >
          <X size={14} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
