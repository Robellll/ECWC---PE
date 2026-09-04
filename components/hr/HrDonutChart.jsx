'use client';

import { useMemo, useState } from 'react';

const RADIUS = 56;
const STROKE = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function HrDonutChart({
  title,
  subtitle,
  data = [],
  colors = ['#75c826', '#2f7fd8', '#e6a700', '#c94f4f', '#7b61c9', '#12b3a8'],
  valueLabel = 'people',
}) {
  const [active, setActive] = useState(null);

  const segments = useMemo(() => {
    const values = data.map((item) => Math.max(0, Number(item.value) || 0));
    const total = values.reduce((sum, value) => sum + value, 0);
    const lengths = values.map((value) => (total > 0 ? (value / total) * CIRCUMFERENCE : 0));

    return {
      total,
      items: data.map((item, index) => {
        const length = lengths[index];
        return {
          ...item,
          value: values[index],
          share: total > 0 ? values[index] / total : 0,
          color: colors[index % colors.length],
          dashArray: `${length} ${CIRCUMFERENCE - length}`,
          // Each arc starts where all preceding arcs ended.
          dashOffset: -lengths.slice(0, index).reduce((sum, len) => sum + len, 0),
        };
      }),
    };
  }, [data, colors]);

  const focused = active != null ? segments.items[active] : null;
  const centerValue = focused ? focused.value : segments.total;
  const centerLabel = focused
    ? `${(focused.share * 100).toFixed(1)}% ${focused.label}`
    : valueLabel;

  return (
    <section className="hr-card hr-chart-card">
      <header className="hr-card-head">
        <h2 className="hr-card-title">{title}</h2>
        {subtitle && <p className="hr-card-subtitle">{subtitle}</p>}
      </header>

      {segments.total === 0 ? (
        <p className="hr-empty">No data yet.</p>
      ) : (
        <div className="hr-donut-layout">
          <div className="hr-donut-wrap">
            <svg viewBox="0 0 160 160" className="hr-donut" role="img" aria-label={title}>
              <g transform="rotate(-90 80 80)">
                <circle
                  cx="80"
                  cy="80"
                  r={RADIUS}
                  className="hr-donut-track"
                  strokeWidth={STROKE}
                />
                {segments.items.map((segment, index) => (
                  <circle
                    key={segment.label}
                    cx="80"
                    cy="80"
                    r={RADIUS}
                    fill="none"
                    stroke={segment.color}
                    strokeWidth={active === index ? STROKE + 6 : STROKE}
                    strokeDasharray={segment.dashArray}
                    strokeDashoffset={segment.dashOffset}
                    className="hr-donut-segment"
                    opacity={active == null || active === index ? 1 : 0.35}
                    onMouseEnter={() => setActive(index)}
                    onMouseLeave={() => setActive(null)}
                  />
                ))}
              </g>
            </svg>
            <div className="hr-donut-center">
              <span className="hr-donut-value">{centerValue.toLocaleString()}</span>
              <span className="hr-donut-label">{centerLabel}</span>
            </div>
          </div>

          <ul className="hr-legend">
            {segments.items.map((segment, index) => (
              <li
                key={segment.label}
                className={`hr-legend-item ${active === index ? 'is-active' : ''}`}
                onMouseEnter={() => setActive(index)}
                onMouseLeave={() => setActive(null)}
              >
                <span className="hr-legend-dot" style={{ background: segment.color }} />
                <span className="hr-legend-label">{segment.label}</span>
                <span className="hr-legend-value">
                  {segment.value.toLocaleString()}
                  <em>{(segment.share * 100).toFixed(1)}%</em>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
