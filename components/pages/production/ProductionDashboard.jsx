'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import {
  ALERT_LINKS,
  INTELLIGENCE_KPI_CARDS,
  PRIMARY_KPI_CARDS,
} from '@/lib/production/dashboardLinks';
import ProductionShell from '@/components/production/ProductionShell';
import { SimpleBarChart } from '@/components/production/ProductionDataTable';
import '@/components/production/ProductionShell.css';

export default function ProductionDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/production/dashboard')
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <ProductionShell title="Production Dashboard" subtitle="Loading…">
        <p className="page-subtitle">Loading dashboard…</p>
      </ProductionShell>
    );
  }

  if (!data) {
    return (
      <ProductionShell title="Production Dashboard">
        <p className="production-empty">Could not load dashboard.</p>
      </ProductionShell>
    );
  }

  const { kpis, intelligence, charts, alerts } = data;

  return (
    <ProductionShell
      title="Production Dashboard"
      subtitle="Real-time overview of plants, production, stock, and demand"
    >
      <div className="production-kpi-grid">
        {PRIMARY_KPI_CARDS.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="production-kpi-card production-kpi-card--clickable"
            aria-label={`${card.label} — view details`}
          >
            <div className="production-kpi-label">{card.label}</div>
            <div className="production-kpi-value">
              {Number(kpis[card.valueKey]).toLocaleString()}
            </div>
          </Link>
        ))}
      </div>

      <div className="production-kpi-grid" style={{ marginBottom: '1.25rem' }}>
        {INTELLIGENCE_KPI_CARDS.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="production-kpi-card production-kpi-card--clickable"
            aria-label={`${card.label} — view details`}
          >
            <div className="production-kpi-label">{card.label}</div>
            <div className="production-kpi-value">{card.getValue(intelligence)}</div>
          </Link>
        ))}
      </div>

      <div className="production-charts-grid">
        <div className="production-chart-card">
          <h3 className="production-chart-title">Daily Production Trend</h3>
          <SimpleBarChart items={charts.dailyTrend} valueKey="total" labelKey="date" />
        </div>
        <div className="production-chart-card">
          <h3 className="production-chart-title">Production by Material</h3>
          <SimpleBarChart items={charts.productionByMaterial} />
        </div>
        <div className="production-chart-card">
          <h3 className="production-chart-title">Stock by Material</h3>
          <SimpleBarChart items={charts.stockByMaterial} valueKey="total" />
        </div>
        <div className="production-chart-card">
          <h3 className="production-chart-title">Demand vs Production</h3>
          <SimpleBarChart items={charts.demandVsProduction} valueKey="produced" labelKey="name" />
        </div>
        <div className="production-chart-card">
          <h3 className="production-chart-title">Plant Performance</h3>
          <SimpleBarChart items={charts.plantPerformance} />
        </div>
        <div className="production-chart-card">
          <h3 className="production-chart-title">Monthly Production</h3>
          <SimpleBarChart items={charts.monthlyProduction} valueKey="total" labelKey="month" />
        </div>
      </div>

      <div className="production-alerts-panel">
        <h3 className="production-chart-title"><AlertTriangle size={16} style={{ verticalAlign: 'middle' }} /> Alerts</h3>
        {alerts.length === 0 ? (
          <p className="production-empty">No active alerts.</p>
        ) : alerts.map((a, i) => {
          const href = ALERT_LINKS[a.type];
          const content = (
            <>
              <span className={`production-alert-dot ${a.severity === 'critical' ? 'critical' : a.severity === 'warning' ? 'warning' : 'info'}`} />
              <span>{a.message}</span>
            </>
          );

          if (!href) {
            return (
              <div key={i} className="production-alert-item">
                {content}
              </div>
            );
          }

          return (
            <Link
              key={i}
              href={href}
              className="production-alert-item production-alert-item--clickable"
            >
              {content}
            </Link>
          );
        })}
      </div>
    </ProductionShell>
  );
}
