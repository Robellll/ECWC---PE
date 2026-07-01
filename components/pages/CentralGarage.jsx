'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, Search, Trash2, Clock, ChevronRight, Eye, ArrowUp, ArrowDown } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { useDuration } from '@/hooks/useDuration';
import { apiFetch } from '@/lib/api-client';
import { GARAGE_WORKSHOPS } from '@/lib/garage';
import { sortTableData, nextSortDirection } from '@/lib/table-sort';
import { isRegisteredInRange, isRangeComplete, formatRangeLabel } from '@/lib/date-range';
import VehicleDetailDrawer from '@/components/garage/VehicleDetailDrawer';
import GarageDateRangePicker from '@/components/garage/GarageDateRangePicker';
import FilterSummaryCards from '@/components/shared/FilterSummaryCards';
import './Garage.css';

const PRIORITY_ORDER = { Critical: 0, High: 1, Normal: 2, Low: 3 };

const TABLE_COLUMNS = [
  { key: 'priority', label: 'Priority', type: 'number' },
  { key: 'plate', label: 'Plate Number', type: 'text' },
  { key: 'model', label: 'Vehicle / Equipment', type: 'text' },
  { key: 'registered', label: 'Registered', type: 'date' },
  { key: 'duration', label: 'Duration', type: 'number' },
  { key: 'status', label: 'Status', type: 'text' },
  { key: 'receivingInspector', label: 'Receiving Inspector', type: 'text' },
];

function getDurationMs(vehicle) {
  const start = new Date(vehicle.registeredDate).getTime();
  if (Number.isNaN(start)) return NaN;
  const end = vehicle.completedDate ? new Date(vehicle.completedDate).getTime() : Date.now();
  return end - start;
}

function getSortValue(vehicle, column) {
  switch (column) {
    case 'priority':
      return PRIORITY_ORDER[vehicle.priority] ?? 99;
    case 'plate':
      return (vehicle.plate || '').toLowerCase();
    case 'model':
      return (vehicle.model || '').toLowerCase();
    case 'registered':
      return vehicle.registeredDate;
    case 'duration':
      return getDurationMs(vehicle);
    case 'status':
      return (vehicle.status || '').toLowerCase();
    case 'receivingInspector':
      return (vehicle.receivingInspector || '').toLowerCase();
    default:
      return '';
  }
}

const SortableHeader = ({ column, label, sortColumn, sortDirection, onSort }) => {
  const isActive = sortColumn === column.key;
  return (
    <th scope="col" className={isActive ? 'th-sortable th-sorted' : 'th-sortable'}>
      <button
        type="button"
        className="th-sort-btn"
        onClick={() => onSort(column.key)}
        aria-sort={isActive ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        <span className="th-sort-label">{label}</span>
        <span className={`th-sort-icons ${isActive ? 'active' : ''}`} aria-hidden="true">
          {isActive ? (
            sortDirection === 'asc' ? <ArrowUp size={12} strokeWidth={2.5} /> : <ArrowDown size={12} strokeWidth={2.5} />
          ) : (
            <>
              <ArrowUp size={10} className="th-sort-icon-muted" strokeWidth={2} />
              <ArrowDown size={10} className="th-sort-icon-muted" strokeWidth={2} />
            </>
          )}
        </span>
      </button>
    </th>
  );
};

const DurationCell = ({ startTime, endTime }) => {
  const duration = useDuration(startTime, endTime);
  return (
    <div className="duration-cell">
      <Clock size={13} /> {duration}
    </div>
  );
};

const IN_PROGRESS_CARD = 'In Progress';

const emptyForm = () => ({
  plate: '',
  sroNumber: '',
  model: '',
  reportedIssue: '',
  workshop: GARAGE_WORKSHOPS[0].value,
  receivingInspector: '',
  maintenanceType: 'major',
  priority: 'Normal',
});

const CentralGarage = () => {
  const searchParams = useSearchParams();
  const vehicleIdParam = searchParams.get('vehicle');
  const { isCentralGarageEditor: isManager } = usePermissions();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cardFilter, setCardFilter] = useState(null);
  const [locationFilter, setLocationFilter] = useState(null);
  const [maintenanceTypeFilter, setMaintenanceTypeFilter] = useState('all');
  const [dateRange, setDateRange] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [newVehicle, setNewVehicle] = useState(emptyForm);
  const [sortColumn, setSortColumn] = useState('registered');
  const [sortDirection, setSortDirection] = useState('desc');
  const [sortAnimating, setSortAnimating] = useState(false);

  const loadVehicles = useCallback(async () => {
    const data = await apiFetch('/api/garage-vehicles');
    setVehicles(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadVehicles(); }, [loadVehicles]);

  useEffect(() => {
    if (!vehicleIdParam || loading) return;
    const match = vehicles.find((v) => v.id === vehicleIdParam);
    if (match) setSelectedVehicle(match);
  }, [vehicleIdParam, loading, vehicles]);

  const drawerVehicle = vehicles.find((v) => v.id === selectedVehicle?.id) || selectedVehicle;

  const rangeActive = isRangeComplete(dateRange);

  const typeFilteredVehicles = useMemo(() => {
    let list = vehicles;
    if (maintenanceTypeFilter !== 'all') {
      list = list.filter((v) => v.maintenanceType === maintenanceTypeFilter);
    }
    if (rangeActive) {
      list = list.filter((v) => isRegisteredInRange(v, dateRange));
    }
    return list;
  }, [vehicles, maintenanceTypeFilter, dateRange, rangeActive]);

  const totalRegistered = typeFilteredVehicles.length;
  const inProgress = typeFilteredVehicles.filter((v) => v.status === 'In Progress').length;
  const completed = typeFilteredVehicles.filter((v) => v.status === 'Completed').length;
  const completionRate = totalRegistered === 0 ? 0 : Math.round((completed / totalRegistered) * 100);

  const inProgressVehicles = useMemo(
    () => typeFilteredVehicles.filter((v) => v.status === 'In Progress'),
    [typeFilteredVehicles],
  );

  const inProgressLocationCounts = useMemo(() => ({
    central: inProgressVehicles.filter((v) => v.maintenanceLocation === 'central').length,
    outsource: inProgressVehicles.filter((v) => v.maintenanceLocation === 'outsource').length,
  }), [inProgressVehicles]);

  const summaryCards = useMemo(() => [
    {
      id: 'total',
      label: rangeActive ? 'Registered in Period' : 'Total Registered',
      value: totalRegistered,
      isTotal: true,
    },
    {
      id: IN_PROGRESS_CARD,
      label: 'In Progress',
      value: inProgress,
      valueClass: 'warning',
      subFilters: [
        { id: 'central', label: 'Central', value: inProgressLocationCounts.central },
        { id: 'outsource', label: 'Outsource', value: inProgressLocationCounts.outsource },
      ],
      subFiltersLayout: 'compact',
    },
    {
      id: 'Completed',
      label: 'Completed',
      value: completed,
      valueClass: 'success',
    },
    {
      id: 'completion-rate',
      label: 'Completion Rate',
      value: `${completionRate}%`,
      isStatic: true,
    },
  ], [rangeActive, totalRegistered, inProgress, completed, completionRate, inProgressLocationCounts]);

  const handleTotalReset = useCallback(() => {
    setCardFilter(null);
    setLocationFilter(null);
  }, []);

  const handleCardSelect = useCallback((id) => {
    if (id === cardFilter) {
      setCardFilter(null);
      setLocationFilter(null);
    } else {
      setCardFilter(id);
      if (id !== IN_PROGRESS_CARD) setLocationFilter(null);
    }
  }, [cardFilter]);

  const handleLocationSubSelect = useCallback((_cardId, subId) => {
    setCardFilter(IN_PROGRESS_CARD);
    setLocationFilter((prev) => (prev === subId ? null : subId));
  }, []);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this maintenance record?')) return;
    await apiFetch(`/api/garage-vehicles/${id}`, { method: 'DELETE' });
    if (selectedVehicle?.id === id) setSelectedVehicle(null);
    await loadVehicles();
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const created = await apiFetch('/api/garage-vehicles', {
      method: 'POST',
      body: JSON.stringify(newVehicle),
    });
    setShowAddModal(false);
    setNewVehicle(emptyForm());
    await loadVehicles();
    setSelectedVehicle(created);
  };

  const handleVehicleUpdate = (updated) => {
    setVehicles((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
    setSelectedVehicle(updated);
  };

  const handleSort = useCallback((columnKey) => {
    setSortDirection((prev) => nextSortDirection(sortColumn, columnKey, prev));
    setSortColumn(columnKey);
    setSortAnimating(true);
  }, [sortColumn]);

  useEffect(() => {
    if (!sortAnimating) return undefined;
    const timer = setTimeout(() => setSortAnimating(false), 220);
    return () => clearTimeout(timer);
  }, [sortAnimating, sortColumn, sortDirection]);

  const columnTypeMap = useMemo(
    () => Object.fromEntries(TABLE_COLUMNS.map((c) => [c.key, c.type])),
    [],
  );

  const filteredVehicles = useMemo(() => {
    const filtered = vehicles.filter((v) => {
      const matchSearch =
        v.plate.toLowerCase().includes(search.toLowerCase()) ||
        v.model.toLowerCase().includes(search.toLowerCase()) ||
        (v.sroNumber || '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = !cardFilter || v.status === cardFilter;
      const matchLocation = !locationFilter
        || (v.status === 'In Progress' && v.maintenanceLocation === locationFilter);
      const matchType =
        maintenanceTypeFilter === 'all' ||
        v.maintenanceType === maintenanceTypeFilter;
      const matchRange = !rangeActive || isRegisteredInRange(v, dateRange);
      return matchSearch && matchStatus && matchLocation && matchType && matchRange;
    });

    return sortTableData(filtered, {
      column: sortColumn,
      direction: sortDirection,
      type: columnTypeMap[sortColumn],
      getValue: getSortValue,
    });
  }, [vehicles, search, cardFilter, locationFilter, maintenanceTypeFilter, dateRange, rangeActive, sortColumn, sortDirection, columnTypeMap]);

  const priorityClass = (p) => {
    const map = { Low: 'priority-low', Normal: 'priority-normal', High: 'priority-high', Critical: 'priority-critical' };
    return map[p] || 'priority-normal';
  };

  if (loading) {
    return <div className="garage-container"><p className="page-subtitle">Loading garage records…</p></div>;
  }

  return (
    <div className="garage-container">
      <div className="garage-header">
        <div>
          <h1 className="page-title">Central Garage</h1>
          <p className="page-subtitle">Plant &amp; Equipment Maintenance Workflow</p>
        </div>
        {isManager && (
          <button className="btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Register Vehicle
          </button>
        )}
      </div>

      <div className="maintenance-type-filters">
        <span className="maintenance-type-label">Maintenance Type</span>
        <div className="maintenance-type-toggle" role="group" aria-label="Filter by maintenance type">
          <button
            type="button"
            className={`type-filter-btn ${maintenanceTypeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setMaintenanceTypeFilter('all')}
          >
            All
          </button>
          <button
            type="button"
            className={`type-filter-btn type-major ${maintenanceTypeFilter === 'major' ? 'active' : ''}`}
            onClick={() => setMaintenanceTypeFilter('major')}
          >
            Major
          </button>
          <button
            type="button"
            className={`type-filter-btn type-minor ${maintenanceTypeFilter === 'minor' ? 'active' : ''}`}
            onClick={() => setMaintenanceTypeFilter('minor')}
          >
            Minor
          </button>
        </div>
        <GarageDateRangePicker
          value={dateRange}
          onChange={setDateRange}
          popoverTitle="Select registration date range"
        />
      </div>

      {rangeActive && (
        <p className="date-range-hint">
          Showing jobs registered {formatRangeLabel(dateRange)}
          {maintenanceTypeFilter !== 'all' && ` · ${maintenanceTypeFilter === 'major' ? 'Major' : 'Minor'} only`}
        </p>
      )}

      <FilterSummaryCards
        cards={summaryCards}
        selectedId={cardFilter}
        onSelect={handleCardSelect}
        selectedSubId={locationFilter}
        onSubSelect={handleLocationSubSelect}
        onTotalReset={handleTotalReset}
      />

      <div className="garage-filters">
        <div className="search-bar">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search by plate, model, or SRO…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="table-wrapper">
        <table className="garage-table garage-table-sortable">
          <thead>
            <tr>
              {TABLE_COLUMNS.map((col) => (
                <SortableHeader
                  key={col.key}
                  column={col}
                  label={col.label}
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
              ))}
              <th scope="col" className="th-actions" aria-label="Actions" />
            </tr>
          </thead>
          <tbody className={sortAnimating ? 'tbody-sorting' : ''}>
            {filteredVehicles.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center empty-row">
                  {rangeActive
                    ? `No jobs registered ${formatRangeLabel(dateRange)}.`
                    : `No vehicles found. ${isManager ? 'Register one to get started.' : ''}`}
                </td>
              </tr>
            ) : filteredVehicles.map((v) => (
              <tr
                key={v.id}
                className={`row-clickable ${v.status === 'Completed' ? 'row-completed' : ''} ${selectedVehicle?.id === v.id ? 'row-selected' : ''}`}
                onClick={() => setSelectedVehicle(v)}
                title="Click to view details"
              >
                <td>
                  <span className={`priority-badge table-priority ${priorityClass(v.priority)}`}>{v.priority}</span>
                </td>
                <td className="font-semibold plate-cell">{v.plate}</td>
                <td>{v.model}</td>
                <td className="text-muted">
                  {new Date(v.registeredDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td><DurationCell startTime={v.registeredDate} endTime={v.completedDate} /></td>
                <td>
                  <span className={`status-badge ${v.status === 'Completed' ? 'success' : 'warning'}`}>{v.status}</span>
                </td>
                <td className="text-muted">{v.receivingInspector || '—'}</td>
                <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                  <button className="view-btn" onClick={() => setSelectedVehicle(v)} title="View details">
                    <Eye size={15} />
                  </button>
                  {isManager && (
                    <button className="delete-row-btn" onClick={(e) => handleDelete(e, v.id)} title="Delete record">
                      <Trash2 size={15} />
                    </button>
                  )}
                  <ChevronRight size={15} className="row-arrow" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}>
          <div className="modal-content">
            <h2>Register Vehicle for Maintenance</h2>
            <form onSubmit={handleAddSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Plate Number</label>
                  <input required type="text" value={newVehicle.plate} onChange={(e) => setNewVehicle({ ...newVehicle, plate: e.target.value })} placeholder="e.g. AA-12345" />
                </div>
                <div className="form-group">
                  <label>SRO No.</label>
                  <input required type="text" value={newVehicle.sroNumber} onChange={(e) => setNewVehicle({ ...newVehicle, sroNumber: e.target.value })} placeholder="e.g. 54321" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Vehicle / Equipment Model</label>
                  <input required type="text" value={newVehicle.model} onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })} placeholder="e.g. CAT 320 Excavator" />
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select value={newVehicle.priority} onChange={(e) => setNewVehicle({ ...newVehicle, priority: e.target.value })}>
                    <option>Low</option><option>Normal</option><option>High</option><option>Critical</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Workshop</label>
                <select required value={newVehicle.workshop} onChange={(e) => setNewVehicle({ ...newVehicle, workshop: e.target.value })}>
                  {GARAGE_WORKSHOPS.map((w) => (
                    <option key={w.value} value={w.value}>{w.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Maintenance Type</label>
                <div className="registration-type-choice" role="radiogroup" aria-label="Maintenance type">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={newVehicle.maintenanceType === 'major'}
                    className={`type-choice-btn type-major ${newVehicle.maintenanceType === 'major' ? 'selected' : ''}`}
                    onClick={() => setNewVehicle({ ...newVehicle, maintenanceType: 'major' })}
                  >
                    Major
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={newVehicle.maintenanceType === 'minor'}
                    className={`type-choice-btn type-minor ${newVehicle.maintenanceType === 'minor' ? 'selected' : ''}`}
                    onClick={() => setNewVehicle({ ...newVehicle, maintenanceType: 'minor' })}
                  >
                    Minor
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Reported Issue</label>
                <textarea required value={newVehicle.reportedIssue} onChange={(e) => setNewVehicle({ ...newVehicle, reportedIssue: e.target.value })} rows="3" placeholder="Describe the problem…" />
              </div>
              <div className="form-group">
                <label>Receiving Inspector</label>
                <input required type="text" value={newVehicle.receivingInspector} onChange={(e) => setNewVehicle({ ...newVehicle, receivingInspector: e.target.value })} placeholder="Inspector who receives the vehicle" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary"><Plus size={15} /> Register Vehicle</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {drawerVehicle && (
        <VehicleDetailDrawer
          vehicle={drawerVehicle}
          onClose={() => setSelectedVehicle(null)}
          onUpdate={handleVehicleUpdate}
        />
      )}
    </div>
  );
};

export default CentralGarage;
