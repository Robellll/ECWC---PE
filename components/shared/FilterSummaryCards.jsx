'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import './FilterSummaryCards.css';

function SubFilterButtons({ card, isSelected, selectedSubId, onSubSelect, vertical, compact }) {
  if (!card.subFilters?.length) return null;
  return (
    <div
      className={[
        'filter-summary-subfilters',
        vertical ? 'filter-summary-subfilters--stacked' : '',
        compact ? 'filter-summary-subfilters--compact' : '',
      ].filter(Boolean).join(' ')}
      role="group"
      aria-label={`${card.label} filters`}
      onClick={(e) => e.stopPropagation()}
    >
      {card.subFilters.map((sub) => {
        const subActive = isSelected && selectedSubId === sub.id;
        return (
          <button
            key={sub.id}
            type="button"
            className={`filter-sub-btn ${sub.id === 'central' ? 'sub-central' : 'sub-outsource'} ${subActive ? 'active' : ''}`}
            aria-pressed={subActive}
            onClick={() => onSubSelect?.(card.id, subActive ? null : sub.id)}
          >
            <span className="filter-sub-label">{sub.label}</span>
            <span className="filter-sub-value">{sub.value}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Summary cards with optional click-to-filter.
 * Total card (isTotal): clickable reset — flashes green then fades back.
 * Cards may include subFilters; use subFiltersLayout: 'compact' for beside-title layout.
 */
export default function FilterSummaryCards({
  cards,
  selectedId,
  onSelect,
  selectedSubId,
  onSubSelect,
  onTotalReset,
  className = '',
}) {
  const [totalFlash, setTotalFlash] = useState(false);
  const flashTimerRef = useRef(null);

  const triggerTotalFlash = useCallback(() => {
    onTotalReset?.();
    setTotalFlash(true);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setTotalFlash(false), 3000);
  }, [onTotalReset]);

  useEffect(() => () => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
  }, []);

  const renderCardBody = (card, isSelected) => {
    const isCompact = card.subFiltersLayout === 'compact' && card.subFilters?.length;
    const subFilters = (
      <SubFilterButtons
        card={card}
        isSelected={isSelected}
        selectedSubId={selectedSubId}
        onSubSelect={onSubSelect}
        vertical={isCompact}
        compact={isCompact}
      />
    );

    if (isCompact) {
      return (
        <div className="filter-summary-compact-body">
          <span className="filter-summary-title filter-summary-compact-title">{card.label}</span>
          {subFilters}
          <span className={`filter-summary-value filter-summary-compact-value ${card.valueClass || ''}`}>{card.value}</span>
        </div>
      );
    }

    return (
      <>
        <span className="filter-summary-title">{card.label}</span>
        <span className={`filter-summary-value ${card.valueClass || ''}`}>{card.value}</span>
        {subFilters}
      </>
    );
  };

  return (
    <div className={`filter-summary-row ${className}`.trim()} role="group" aria-label="Summary filters">
      {cards.map((card) => {
        const isTotal = Boolean(card.isTotal);
        const isStatic = Boolean(card.isStatic);
        const isClickable = !isStatic && (isTotal || !card.isTotal);
        const isFilterClickable = !isTotal && !isStatic;
        const isSelected = isFilterClickable && selectedId === card.id;
        const isCompact = card.subFiltersLayout === 'compact' && card.subFilters?.length;

        const cardClassName = [
          'filter-summary-card',
          isTotal ? 'is-total is-total-btn' : isFilterClickable ? 'is-filter' : 'is-static',
          isSelected ? 'selected' : '',
          isTotal && totalFlash ? 'total-flash' : '',
          card.variant || '',
          card.stageClass || '',
          card.subFilters?.length ? 'has-subfilters' : '',
          isCompact ? 'has-subfilters-compact' : '',
        ].filter(Boolean).join(' ');

        if (isTotal) {
          return (
            <button
              key={card.id}
              type="button"
              className={cardClassName}
              aria-label={`${card.label} — show all`}
              onClick={triggerTotalFlash}
            >
              {renderCardBody(card, false)}
            </button>
          );
        }

        if (!isFilterClickable) {
          return (
            <div key={card.id} className={cardClassName}>
              {renderCardBody(card, false)}
            </div>
          );
        }

        return (
          <button
            key={card.id}
            type="button"
            className={cardClassName}
            aria-pressed={isSelected}
            onClick={() => onSelect(isSelected ? null : card.id)}
          >
            {renderCardBody(card, isSelected)}
          </button>
        );
      })}
    </div>
  );
}
