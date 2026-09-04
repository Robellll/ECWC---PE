'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutGrid, ClipboardList, BarChart3, FileSpreadsheet,
} from 'lucide-react';
import {
  format, startOfWeek, startOfMonth, endOfWeek, endOfMonth, subDays,
} from 'date-fns';
import { apiFetch } from '@/lib/api-client';
import AppLoader from '@/components/ui/AppLoader';
import '@/components/pages/Equipment.css';
import '@/components/pages/ProjectEquipment.css';
import '@/components/pages/ProjectGarage.css';
import '@/components/pages/Garage.css';
import '@/components/production/ProductionShell.css';

function todayIso() {
  return format(new Date(), 'yyyy-MM-dd');
}

function formatPct(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `${Number(value).toFixed(1)}%`;
}

function formatNum(value, digits = 1) {
  if (value == null || value === '') return '—';
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

function OidBar({ operablePct, idlePct, downPct }) {
  const o = Math.max(0, Number(operablePct) || 0);
  const i = Math.max(0, Number(idlePct) || 0);
  const d = Math.max(0, Number(downPct) || 0);
  if (o + i + d <= 0) {
    return <span className="text-muted">—</span>;
  }
  return (
    <div
      className="pe-oid-bar"
      title={`Operable ${formatPct(o)} · Idle ${formatPct(i)} · Down ${formatPct(d)}`}
    >
      {o > 0 && <span className="pe-oid-seg pe-oid-seg--op" style={{ width: `${o}%` }} />}
      {i > 0 && <span className="pe-oid-seg pe-oid-seg--idle" style={{ width: `${i}%` }} />}
      {d > 0 && <span className="pe-oid-seg pe-oid-seg--down" style={{ width: `${d}%` }} />}
    </div>
  );
}

export default function EquipmentReports({ projectId }) {
  const router = useRouter();
  const [tab, setTab] = useState('utilization');
  const [from, setFrom] = useState(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [to, setTo] = useState(todayIso);
  const [project, setProject] = useState(null);
  const [assets, setAssets] = useState([]);
  const [fleet, setFleet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!from || !to) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch(
        `/api/project-equipment/${projectId}/daily-ops/summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      );
      setProject(data.project);
      setAssets(data.assets || []);
      setFleet(data.fleet || null);
    } catch (err) {
      setError(err.message || 'Could not load report');
      setAssets([]);
      setFleet(null);
    } finally {
      setLoading(false);
    }
  }, [projectId, from, to]);

  useEffect(() => { load().catch(console.error); }, [load]);

  const applyPreset = (preset) => {
    const now = new Date();
    if (preset === 'week') {
      setFrom(format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
      setTo(format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
    } else if (preset === 'month') {
      setFrom(format(startOfMonth(now), 'yyyy-MM-dd'));
      setTo(format(endOfMonth(now), 'yyyy-MM-dd'));
    } else if (preset === '7d') {
      setFrom(format(subDays(now, 6), 'yyyy-MM-dd'));
      setTo(todayIso());
    }
  };

  const sortedAssets = useMemo(() => {
    const list = [...assets];
    if (tab === 'utilization') {
      list.sort((a, b) => (b.utilizationPct || 0) - (a.utilizationPct || 0));
    } else {
      list.sort((a, b) => (b.downPct || 0) - (a.downPct || 0));
    }
    return list;
  }, [assets, tab]);

  if (loading && !project) {
    return <AppLoader label="Loading equipment reports…" variant="page" className="equipment-container" />;
  }

  if (!project && error) {
    return (
      <div className="equipment-container">
        <p className="production-empty">{error}</p>
        <button type="button" className="btn-secondary" onClick={() => router.push('/equipment')}>Back</button>
      </div>
    );
  }

  return (
    <div className="equipment-container">
      <div className="project-garage-detail-toolbar">
        <div className="pg-toolbar-left">
          <button type="button" className="project-garage-home-btn" onClick={() => router.push('/equipment')}>
            <LayoutGrid size={17} />
            <span>All Projects</span>
          </button>
          <button type="button" className="project-garage-home-btn" onClick={() => router.push(`/equipment/${projectId}`)}>
            <ClipboardList size={17} />
            <span>Asset Register</span>
          </button>
          <button type="button" className="project-garage-home-btn" onClick={() => router.push(`/equipment/${projectId}/operations`)}>
            <FileSpreadsheet size={17} />
            <span>Daily Ops</span>
          </button>
        </div>

        <div className="pg-toolbar-center">
          <h1 className="page-title pg-toolbar-title">{project?.name || 'Project'}</h1>
          <p className="page-subtitle pg-toolbar-subtitle">Equipment reports — utilization and OID</p>
        </div>

        <div className="pg-toolbar-right pe-header-actions project-garage-detail-actions">
          <span className="pe-report-badge">
            <BarChart3 size={16} /> Reports
          </span>
        </div>
      </div>

      <div className="equipment-filters pe-report-filters">
        <label className="pe-report-date">
          From
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="pe-report-date">
          To
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <div className="pe-report-presets">
          <button type="button" className="btn-secondary" onClick={() => applyPreset('7d')}>Last 7 days</button>
          <button type="button" className="btn-secondary" onClick={() => applyPreset('week')}>This week</button>
          <button type="button" className="btn-secondary" onClick={() => applyPreset('month')}>This month</button>
        </div>
      </div>

      <div className="filter-tabs pe-report-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'utilization'}
          className={`filter-tab ${tab === 'utilization' ? 'active' : ''}`}
          onClick={() => setTab('utilization')}
        >
          Utilization
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'oid'}
          className={`filter-tab ${tab === 'oid' ? 'active' : ''}`}
          onClick={() => setTab('oid')}
        >
          OID
        </button>
      </div>

      {error && <p className="pe-form-error">{error}</p>}

      {fleet && (
        <div className="pe-fleet-layout pe-fleet-layout--detail">
          <div className="pe-fleet-card pe-fleet-card--total">
            <span className="pe-fleet-label">Assets logged</span>
            <span className="pe-fleet-value">{fleet.assetCount}</span>
          </div>
          {tab === 'utilization' ? (
            <>
              <div className="pe-fleet-card pe-fleet-card--status">
                <span className="pe-fleet-label">Fleet utilization</span>
                <span className="pe-fleet-value">{formatPct(fleet.utilizationPct)}</span>
              </div>
              <div className="pe-fleet-card pe-fleet-card--status">
                <span className="pe-fleet-label">Operable hr</span>
                <span className="pe-fleet-value success">{formatNum(fleet.operableHr)}</span>
              </div>
              <div className="pe-fleet-card pe-fleet-card--status">
                <span className="pe-fleet-label">Planned hr</span>
                <span className="pe-fleet-value">{formatNum(fleet.plannedHr)}</span>
              </div>
              <div className="pe-fleet-card pe-fleet-card--status">
                <span className="pe-fleet-label">Availability</span>
                <span className="pe-fleet-value">{formatPct(fleet.availabilityPct)}</span>
              </div>
            </>
          ) : (
            <>
              <div className="pe-fleet-card pe-fleet-card--status">
                <span className="pe-fleet-label">Operable</span>
                <span className="pe-fleet-value success">{formatNum(fleet.operableHr)} ({formatPct(fleet.operablePct)})</span>
              </div>
              <div className="pe-fleet-card pe-fleet-card--status">
                <span className="pe-fleet-label">Idle</span>
                <span className="pe-fleet-value warning">{formatNum(fleet.idleHr)} ({formatPct(fleet.idlePct)})</span>
              </div>
              <div className="pe-fleet-card pe-fleet-card--status">
                <span className="pe-fleet-label">Down</span>
                <span className="pe-fleet-value danger">{formatNum(fleet.downHr)} ({formatPct(fleet.downPct)})</span>
              </div>
              <div className="pe-fleet-card pe-fleet-card--status">
                <span className="pe-fleet-label">Total OID hr</span>
                <span className="pe-fleet-value">{formatNum(fleet.totalOidHr)}</span>
              </div>
            </>
          )}
        </div>
      )}

      <div className="table-wrapper">
        {loading ? (
          <AppLoader label="Updating report…" variant="compact" className="pe-report-loading" />
        ) : tab === 'utilization' ? (
          <table className="equipment-table">
            <thead>
              <tr>
                <th>Asset ID</th>
                <th>Name</th>
                <th>Category</th>
                <th>Days</th>
                <th>Operable Hr</th>
                <th>Planned Hr</th>
                <th>Util %</th>
                <th>Avail %</th>
              </tr>
            </thead>
            <tbody>
              {sortedAssets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center empty-row">
                    No daily operations in this date range. Log days under Daily Ops first.
                  </td>
                </tr>
              ) : sortedAssets.map((row) => (
                <tr key={row.equipmentId}>
                  <td className="font-semibold eq-code-cell">{row.assetNo}</td>
                  <td>{row.assetName}</td>
                  <td>{row.category || '—'}</td>
                  <td>{row.daysLogged}</td>
                  <td>{formatNum(row.operableHr)}</td>
                  <td>{formatNum(row.plannedHr)}</td>
                  <td className="font-semibold">{formatPct(row.utilizationPct)}</td>
                  <td>{formatPct(row.availabilityPct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="equipment-table">
            <thead>
              <tr>
                <th>Asset ID</th>
                <th>Name</th>
                <th>Operable Hr</th>
                <th>Idle Hr</th>
                <th>Down Hr</th>
                <th>O %</th>
                <th>I %</th>
                <th>D %</th>
                <th>OID mix</th>
              </tr>
            </thead>
            <tbody>
              {sortedAssets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center empty-row">
                    No daily operations in this date range. Log days under Daily Ops first.
                  </td>
                </tr>
              ) : sortedAssets.map((row) => (
                <tr key={row.equipmentId}>
                  <td className="font-semibold eq-code-cell">{row.assetNo}</td>
                  <td>{row.assetName}</td>
                  <td>{formatNum(row.operableHr)}</td>
                  <td>{formatNum(row.idleHr)}</td>
                  <td>{formatNum(row.downHr)}</td>
                  <td>{formatPct(row.operablePct)}</td>
                  <td>{formatPct(row.idlePct)}</td>
                  <td>{formatPct(row.downPct)}</td>
                  <td>
                    <OidBar
                      operablePct={row.operablePct}
                      idlePct={row.idlePct}
                      downPct={row.downPct}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
