'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Trophy, Wrench, ClipboardCheck, UserCheck } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { apiFetch } from '@/lib/api-client';
import { isRangeComplete } from '@/lib/date-range';
import SearchBar from '@/components/shared/SearchBar';
import GarageDateRangePicker from '@/components/garage/GarageDateRangePicker';
import FilterSummaryCards from '@/components/shared/FilterSummaryCards';
import AppLoader from '@/components/ui/AppLoader';
import './Manpower.css';

export default function ManpowerPerformance() {
  const { canViewManpower } = usePermissions();
  const [data, setData] = useState({ totals: null, staff: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState(null);
  const [activeOnly, setActiveOnly] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (isRangeComplete(dateRange)) {
        params.set('from', dateRange.from.toISOString().slice(0, 10));
        params.set('to', dateRange.to.toISOString().slice(0, 10));
      }
      const qs = params.toString();
      const result = await apiFetch(`/api/manpower/performance${qs ? `?${qs}` : ''}`);
      setData(result || { totals: null, staff: [] });
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    if (canViewManpower) load();
    else setLoading(false);
  }, [canViewManpower, load]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data.staff || []).filter((person) => {
      if (activeOnly && !person.isActive) return false;
      if (!q) return true;
      return [person.employeeId, person.fullName, person.jobTitle]
        .some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [data.staff, search, activeOnly]);

  const cards = useMemo(() => {
    const t = data.totals || {};
    return [
      { id: 'staff', label: 'Active Staff', value: t.activeStaff ?? 0 },
      { id: 'jobs', label: 'Garage Jobs', value: t.jobsInRange ?? 0 },
      { id: 'completed', label: 'Completed', value: t.completedInRange ?? 0 },
      { id: 'active', label: 'With Activity', value: t.withActivity ?? 0 },
    ];
  }, [data.totals]);

  if (!canViewManpower) {
    return (
      <div className="manpower-page">
        <p className="page-subtitle">You do not have access to Man Power.</p>
      </div>
    );
  }

  return (
    <div className="manpower-page">
      <div className="manpower-header">
        <div>
          <h1 className="page-title">Man Power — Performance</h1>
          <p className="page-subtitle">
            Work attributed to each staff member from Central Garage jobs (mechanic, receiving, final inspection).
          </p>
        </div>
      </div>

      <div className="manpower-toolbar manpower-toolbar--perf">
        <SearchBar value={search} onChange={setSearch} placeholder="Search staff…" />
        <GarageDateRangePicker value={dateRange} onChange={setDateRange} />
        <label className="manpower-toggle">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.target.checked)}
          />
          Active only
        </label>
      </div>

      <FilterSummaryCards cards={cards} selectedId={null} onSelect={() => {}} />

      {loading ? (
        <AppLoader label="Loading performance…" variant="inline" />
      ) : (
        <div className="table-wrapper">
          <table className="manpower-table manpower-perf-table">
            <thead>
              <tr>
                <th>#</th>
                <th>ID</th>
                <th>Name</th>
                <th>Job Title</th>
                <th><span className="th-with-icon"><Wrench size={14} /> Mechanic</span></th>
                <th><span className="th-with-icon"><Trophy size={14} /> Done</span></th>
                <th><span className="th-with-icon"><UserCheck size={14} /> Receiving</span></th>
                <th><span className="th-with-icon"><ClipboardCheck size={14} /> Final</span></th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center empty-row">No performance data for this filter.</td>
                </tr>
              ) : rows.map((person, index) => (
                <tr key={person.id} className={person.totalJobs > 0 ? '' : 'row-muted'}>
                  <td className="text-muted">{index + 1}</td>
                  <td className="font-semibold">{person.employeeId}</td>
                  <td>{person.fullName}</td>
                  <td className="text-muted">{person.jobTitle || '—'}</td>
                  <td>{person.asMechanic}</td>
                  <td>{person.asMechanicCompleted}</td>
                  <td>{person.asReceivingInspector}</td>
                  <td>{person.asFinalInspector}</td>
                  <td className="font-semibold">{person.totalJobs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
