'use client';

import './FilterSummaryCards.css';

/**
 * Summary cards with optional click-to-filter.
 * First card with isTotal=true is display-only (shows full list count).
 */
export default function FilterSummaryCards({ cards, selectedId, onSelect, className = '' }) {
  return (
    <div className={`filter-summary-row ${className}`.trim()} role="group" aria-label="Summary filters">
      {cards.map((card) => {
        const isTotal = Boolean(card.isTotal);
        const isStatic = Boolean(card.isStatic);
        const isClickable = !isTotal && !isStatic;
        const isSelected = isClickable && selectedId === card.id;
        const className = [
          'filter-summary-card',
          isTotal ? 'is-total' : isClickable ? 'is-filter' : 'is-static',
          isSelected ? 'selected' : '',
          card.variant || '',
          card.stageClass || '',
        ].filter(Boolean).join(' ');

        if (!isClickable) {
          return (
            <div key={card.id} className={className} aria-current={isTotal && !selectedId ? 'true' : undefined}>
              <span className="filter-summary-title">{card.label}</span>
              <span className={`filter-summary-value ${card.valueClass || ''}`}>{card.value}</span>
            </div>
          );
        }

        return (
          <button
            key={card.id}
            type="button"
            className={className}
            aria-pressed={isSelected}
            onClick={() => onSelect(isSelected ? null : card.id)}
          >
            <span className="filter-summary-title">{card.label}</span>
            <span className={`filter-summary-value ${card.valueClass || ''}`}>{card.value}</span>
          </button>
        );
      })}
    </div>
  );
}
