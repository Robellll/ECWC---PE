'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Users, Building2, HardHat, Wallet, UserRound, BadgeCheck, RefreshCw,
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { apiFetch } from '@/lib/api-client';
import AppLoader from '@/components/ui/AppLoader';
import HrDonutChart from '@/components/hr/HrDonutChart';
import HrBarList from '@/components/hr/HrBarList';
import './Hr.css';

const SCOPES = [
  { value: 'all', label: 'All Employees' },
  { value: 'head_office', label: 'Head Office' },
  { value: 'project', label: 'Projects' },
];

function formatCompactMoney(value) {
  const n = Number(value) || 0;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function KpiCard({ icon: Icon, label, value, hint, tone = '' }) {
  return (
    <article className={`hr-kpi ${tone ? `hr-kpi--${tone}` : ''}`}>
      <span className="hr-kpi-icon"><Icon size={18} /></span>
      <div className="hr-kpi-body">
        <span className="hr-kpi-label">{label}</span>
        <span className="hr-kpi-value">{value}</span>
        {hint && <span className="hr-kpi-hint">{hint}</span>}
      </div>
    </article>
  );
}

export default function HrDashboard() {
  const { canViewHR } = usePermissions();
  const [scope, setScope] = useState('all');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await apiFetch(`/api/hr/dashboard?workforce=${scope}`);
      setData(result);
    } catch (err) {
      setError(err.message || 'Could not load HR dashboard');
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    if (canViewHR) load();
    else setLoading(false);
  }, [canViewHR, load]);

  if (!canViewHR) {
    return (
      <div className="hr-page">
        <p className="page-subtitle">You do not have access to HR.</p>
      </div>
    );
  }

  if (loading && !data) {
    return <AppLoader label="Loading HR dashboard…" variant="page" />;
  }

  const kpis = data?.kpis || {};
  const scopeLabel = SCOPES.find((s) => s.value === scope)?.label || 'All Employees';

  return (
    <div className="hr-page">
      <header className="hr-header">
        <div>
          <h1 className="page-title">HR Dashboard</h1>
          <p className="page-subtitle">
            Plant &amp; Equipment workforce — head office and project employees, pay and structure.
          </p>
        </div>
        <div className="hr-header-actions">
          <div className="hr-scope" role="tablist" aria-label="Workforce scope">
            {SCOPES.map((item) => (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={scope === item.value}
                className={`hr-scope-btn ${scope === item.value ? 'active' : ''}`}
                onClick={() => setScope(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button type="button" className="btn-secondary" onClick={load} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'hr-spin' : ''} /> Refresh
          </button>
        </div>
      </header>

      {error && <p className="hr-error">{error}</p>}

      <div className="hr-kpi-grid">
        <KpiCard
          icon={Users}
          label="Total Employees"
          value={(kpis.total || 0).toLocaleString()}
          hint={scopeLabel}
          tone="accent"
        />
        <KpiCard
          icon={Building2}
          label="Head Office"
          value={(kpis.headOffice || 0).toLocaleString()}
          hint={`${kpis.departments || 0} departments`}
        />
        <KpiCard
          icon={HardHat}
          label="Project Staff"
          value={(kpis.project || 0).toLocaleString()}
          hint={`${kpis.locations || 0} project sites`}
        />
        <KpiCard
          icon={BadgeCheck}
          label="Permanent"
          value={(kpis.permanent || 0).toLocaleString()}
          hint={`${kpis.permanentPct || 0}% of workforce · ${(kpis.contract || 0).toLocaleString()} contract`}
        />
        <KpiCard
          icon={UserRound}
          label="Female Staff"
          value={(kpis.female || 0).toLocaleString()}
          hint={`${kpis.femalePct || 0}% of workforce`}
        />
        <KpiCard
          icon={Wallet}
          label="Monthly Payroll"
          value={`${formatCompactMoney(kpis.grossPayroll)} ETB`}
          hint={`Base ${formatCompactMoney(kpis.basePayroll)} + allowances ${formatCompactMoney(kpis.allowances)}`}
          tone="accent"
        />
      </div>

      <div className="hr-chart-grid">
        {scope === 'all' && (
          <HrDonutChart
            title="Workforce Split"
            subtitle="Head office vs project assignment"
            data={data?.workforceSeries || []}
            colors={['#2f7fd8', '#75c826']}
            valueLabel="employees"
          />
        )}
        <HrDonutChart
          title="Employment Type"
          subtitle="Permanent vs contract"
          data={data?.typeSeries || []}
          colors={['#75c826', '#e6a700', '#7b61c9']}
          valueLabel="employees"
        />
        <HrDonutChart
          title="Gender Distribution"
          subtitle="Male vs female staff"
          data={data?.genderSeries || []}
          colors={['#2f7fd8', '#d6336c', '#8a94a6']}
          valueLabel="employees"
        />
      </div>

      <div className="hr-chart-grid hr-chart-grid--two">
        <HrBarList
          title="Top Job Titles"
          subtitle="Largest role groups in this scope"
          data={data?.jobTitleSeries || []}
          accent="#75c826"
        />
        <HrBarList
          title="Salary Bands"
          subtitle="Base salary distribution (ETB / month)"
          data={data?.salaryBands || []}
          accent="#2f7fd8"
        />
      </div>

      <div className="hr-chart-grid hr-chart-grid--two">
        {scope !== 'project' && (
          <HrBarList
            title="Head Office Departments"
            subtitle="Headcount and monthly payroll"
            data={data?.departmentSeries || []}
            accent="#7b61c9"
            showPayroll
            emptyLabel="No head office employees in this scope."
          />
        )}
        {scope !== 'head_office' && (
          <HrBarList
            title="Project Sites"
            subtitle="Headcount and monthly payroll"
            data={data?.locationSeries || []}
            accent="#e6a700"
            showPayroll
            emptyLabel="No project employees in this scope."
          />
        )}
      </div>

      <HrBarList
        title="Salary Grades"
        subtitle="Ten most common salary scales"
        data={data?.gradeSeries || []}
        accent="#12b3a8"
      />
    </div>
  );
}
