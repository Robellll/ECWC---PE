'use client';

function formatMoney(value) {
  if (value == null) return null;
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export default function HrBarList({
  title,
  subtitle,
  data = [],
  accent = '#75c826',
  showPayroll = false,
  emptyLabel = 'No data yet.',
}) {
  const max = data.reduce((m, item) => Math.max(m, Number(item.value) || 0), 0);

  return (
    <section className="hr-card">
      <header className="hr-card-head">
        <h2 className="hr-card-title">{title}</h2>
        {subtitle && <p className="hr-card-subtitle">{subtitle}</p>}
      </header>

      {data.length === 0 ? (
        <p className="hr-empty">{emptyLabel}</p>
      ) : (
        <ul className="hr-bar-list">
          {data.map((item) => {
            const value = Number(item.value) || 0;
            const width = max > 0 ? (value / max) * 100 : 0;
            return (
              <li key={item.label} className="hr-bar-row">
                <div className="hr-bar-meta">
                  <span className="hr-bar-label" title={item.label}>{item.label}</span>
                  <span className="hr-bar-value">
                    {value.toLocaleString()}
                    {showPayroll && item.payroll != null && (
                      <em>{formatMoney(item.payroll)} ETB</em>
                    )}
                  </span>
                </div>
                <div className="hr-bar-track">
                  <span
                    className="hr-bar-fill"
                    style={{ width: `${width}%`, background: accent }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
