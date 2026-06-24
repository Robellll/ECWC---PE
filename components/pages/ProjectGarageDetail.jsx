'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Search, Filter, Trash2, Clock, ChevronRight, Eye, ArrowUp, ArrowDown, LayoutGrid, Key,
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { useDuration } from '@/hooks/useDuration';
import { apiFetch } from '@/lib/api-client';
import { sortTableData, nextSortDirection } from '@/lib/table-sort';
import { isRegisteredInRange, isRangeComplete, formatRangeLabel } from '@/lib/date-range';
import VehicleDetailDrawer from '@/components/garage/VehicleDetailDrawer';
import ProjectSiteLoginModal from '@/components/garage/ProjectSiteLoginModal';
import GarageDateRangePicker from '@/components/garage/GarageDateRangePicker';
import './Garage.css';
import './ProjectGarage.css';

const PRIORITY_ORDER = { Critical: 0, High: 1, Normal: 2, Low: 3 };

const TABLE_COLUMNS = [
  { key: 'priority', label: 'Priority', type: 'number' },
  { key: 'plate', label: 'Plate / ID', type: 'text' },
  { key: 'model', label: 'Equipment', type: 'text' },
  { key: 'registered', label: 'Registered', type: 'date' },
  { key: 'duration', label: 'Duration', type: 'number' },
  { key: 'status', label: 'Status', type: 'text' },
  { key: 'receivingInspector', label: 'Site Supervisor', type: 'text' },
];

function getDurationMs(vehicle) {
  const start = new Date(vehicle.registeredDate).getTime();
  if (Number.isNaN(start)) return NaN;
  const end = vehicle.completedDate ? new Date(vehicle.completedDate).getTime() : Date.now();
  return end - start;
}

function getSortValue(vehicle, column) {
  switch (column) {
    case 'priority': return PRIORITY_ORDER[vehicle.priority] ?? 99;
    case 'plate': return (vehicle.plate || '').toLowerCase();
    case 'model': return (vehicle.model || '').toLowerCase();
    case 'registered': return vehicle.registeredDate;
    case 'duration': return getDurationMs(vehicle);
    case 'status': return (vehicle.status || '').toLowerCase();
    case 'receivingInspector': return (vehicle.receivingInspector || '').toLowerCase();
    default: return '';
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
  return <div className="duration-cell"><Clock size={13} /> {duration}</div>;
};

const emptyForm = () => ({
  plate: '',
  model: '',
  reportedIssue: '',
  siteSupervisor: '',
  maintenanceType: 'major',
  priority: 'Normal',
  siteOperatorName: '',
});

const ProjectGarageDetail = ({ projectId }) => {
  const router = useRouter();
  const { isSuperAdmin, user, isProjPEAdmin, isProjPEMaintenance } = usePermissions();
  const canEdit = isSuperAdmin
    || ((isProjPEAdmin || isProjPEMaintenance) && user?.projectId === projectId);
  const [projectName, setProjectName] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [maintenanceTypeFilter, setMaintenanceTypeFilter] = useState('all');
  const [dateRange, setDateRange] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [newVehicle, setNewVehicle] = useState(emptyForm);
  const [sortColumn, setSortColumn] = useState('registered');
  const [sortDirection, setSortDirection] = useState('desc');
  const [sortAnimating, setSortAnimating] = useState(false);
  const [showSiteLogin, setShowSiteLogin] = useState(false);

  const loadVehicles = useCallback(async () => {
    const data = await apiFetch(`/api/project-garage/${projectId}/vehicles`);
    setProjectName(data.project?.name || '');
    setVehicles(data.vehicles || []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadVehicles(); }, [loadVehicles]);

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

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this maintenance record?')) return;
    await apiFetch(`/api/garage-vehicles/${id}`, { method: 'DELETE' });
    if (selectedVehicle?.id === id) setSelectedVehicle(null);
    await loadVehicles();
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const created = await apiFetch(`/api/project-garage/${projectId}/vehicles`, {
      method: 'POST',
      body: JSON.stringify({
        ...newVehicle,
        siteOperatorName: newVehicle.siteOperatorName || user?.name || '',
      }),
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
        v.model.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'All' || v.status === statusFilter;
      const matchType = maintenanceTypeFilter === 'all' || v.maintenanceType === maintenanceTypeFilter;
      const matchRange = !rangeActive || isRegisteredInRange(v, dateRange);
      return matchSearch && matchStatus && matchType && matchRange;
    });
    return sortTableData(filtered, {
      column: sortColumn,
      direction: sortDirection,
      type: columnTypeMap[sortColumn],
      getValue: getSortValue,
    });
  }, [vehicles, search, statusFilter, maintenanceTypeFilter, dateRange, rangeActive, sortColumn, sortDirection, columnTypeMap]);

  const priorityClass = (p) => {
    const map = { Low: 'priority-low', Normal: 'priority-normal', High: 'priority-high', Critical: 'priority-critical' };
    return map[p] || 'priority-normal';
  };

  if (loading) {
    return <div className="garage-container"><p className="page-subtitle">Loading project garage…</p></div>;
  }

  return (
    <div className="garage-container">
      <div className="project-garage-detail-top">
        <button type="button" className="project-garage-home-btn" onClick={() => router.push('/project-garage')}>
          <LayoutGrid size={17} />
          <span>All Projects</span>
        </button>
      </div>

      <div className="project-garage-detail-header">
        <div>
          <h1 className="page-title">{projectName}</h1>
          <p className="page-subtitle">Project site maintenance · Received → Under Maintenance → Completed</p>
        </div>
        <div className="project-garage-detail-actions">
          {canEdit && (
            <button className="btn-primary" onClick={() => setShowAddModal(true)}>
              <Plus size={16} /> Register Equipment
            </button>
          )}
          {isSuperAdmin && (
            <button type="button" className="btn-secondary" onClick={() => setShowSiteLogin(true)}>
              <Key size={16} /> Site Login
            </button>
          )}
        </div>
      </div>

      <div className="maintenance-type-filters">
        <span className="maintenance-type-label">Maintenance Type</span>
        <div className="maintenance-type-toggle" role="group" aria-label="Filter by maintenance type">
          {['all', 'major', 'minor'].map((type) => (
            <button
              key={type}
              type="button"
              className={`type-filter-btn ${type !== 'all' ? `type-${type}` : ''} ${maintenanceTypeFilter === type ? 'active' : ''}`}
              onClick={() => setMaintenanceTypeFilter(type)}
            >
              {type === 'all' ? 'All' : type === 'major' ? 'Major' : 'Minor'}
            </button>
          ))}
        </div>
        <GarageDateRangePicker
          value={dateRange}
          onChange={setDateRange}
          popoverTitle="Select registration date range"
        />
      </div>

      {rangeActive && (
        <p className="date-range-hint">Showing jobs registered {formatRangeLabel(dateRange)}</p>
      )}

      <div className="garage-summary">
        <div className="summary-card">
          <div className="summary-title">{rangeActive ? 'Registered in Period' : 'Total Registered'}</div>
          <div className="summary-value">{totalRegistered}</div>
        </div>
        <div className="summary-card">
          <div className="summary-title">In Progress</div>
          <div className="summary-value warning">{inProgress}</div>
        </div>
        <div className="summary-card">
          <div className="summary-title">Completed</div>
          <div className="summary-value success">{completed}</div>
        </div>
        <div className="summary-card">
          <div className="summary-title">Completion Rate</div>
          <div className="summary-value">{completionRate}%</div>
        </div>
      </div>

      <div className="garage-filters">
        <div className="search-bar">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search by plate or equipment…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-dropdown">
          <Filter size={16} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="All">All Statuses</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
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
                    : `No equipment registered. ${canEdit ? 'Register one to get started.' : ''}`}
                </td>
              </tr>
            ) : filteredVehicles.map((v) => (
              <tr
                key={v.id}
                className={`row-clickable ${v.status === 'Completed' ? 'row-completed' : ''} ${selectedVehicle?.id === v.id ? 'row-selected' : ''}`}
                onClick={() => setSelectedVehicle(v)}
                title="Click to view details"
              >
                <td><span className={`priority-badge table-priority ${priorityClass(v.priority)}`}>{v.priority}</span></td>
                <td className="font-semibold plate-cell">{v.plate}</td>
                <td>{v.model}</td>
                <td className="text-muted">
                  {new Date(v.registeredDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td><DurationCell startTime={v.registeredDate} endTime={v.completedDate} /></td>
                <td><span className={`status-badge ${v.status === 'Completed' ? 'success' : 'warning'}`}>{v.status}</span></td>
                <td className="text-muted">{v.receivingInspector || '—'}</td>
                <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                  <button className="view-btn" onClick={() => setSelectedVehicle(v)} title="View details"><Eye size={15} /></button>
                  {canEdit && (
                    <button className="delete-row-btn" onClick={(e) => handleDelete(e, v.id)} title="Delete record"><Trash2 size={15} /></button>
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
            <h2>Register Equipment for Site Maintenance</h2>
            <form onSubmit={handleAddSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Plate / Equipment ID</label>
                  <input required type="text" value={newVehicle.plate} onChange={(e) => setNewVehicle({ ...newVehicle, plate: e.target.value })} placeholder="e.g. AA-12345" />
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select value={newVehicle.priority} onChange={(e) => setNewVehicle({ ...newVehicle, priority: e.target.value })}>
                    <option>Low</option><option>Normal</option><option>High</option><option>Critical</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Equipment / Vehicle Model</label>
                <input required type="text" value={newVehicle.model} onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })} placeholder="e.g. CAT 320 Excavator" />
              </div>
              <div className="form-group">
                <label>Maintenance Type</label>
                <div className="registration-type-choice" role="radiogroup" aria-label="Maintenance type">
                  <button type="button" role="radio" aria-checked={newVehicle.maintenanceType === 'major'} className={`type-choice-btn type-major ${newVehicle.maintenanceType === 'major' ? 'selected' : ''}`} onClick={() => setNewVehicle({ ...newVehicle, maintenanceType: 'major' })}>Major</button>
                  <button type="button" role="radio" aria-checked={newVehicle.maintenanceType === 'minor'} className={`type-choice-btn type-minor ${newVehicle.maintenanceType === 'minor' ? 'selected' : ''}`} onClick={() => setNewVehicle({ ...newVehicle, maintenanceType: 'minor' })}>Minor</button>
                </div>
              </div>
              <div className="form-group">
                <label>Reported Issue</label>
                <textarea required value={newVehicle.reportedIssue} onChange={(e) => setNewVehicle({ ...newVehicle, reportedIssue: e.target.value })} rows="3" placeholder="Describe the problem…" />
              </div>
              <div className="form-group">
                <label>Site Supervisor</label>
                <input required type="text" value={newVehicle.siteSupervisor} onChange={(e) => setNewVehicle({ ...newVehicle, siteSupervisor: e.target.value })} placeholder="Supervisor receiving the equipment" />
              </div>
              <div className="form-group">
                <label>Your Name (optional)</label>
                <input type="text" value={newVehicle.siteOperatorName} onChange={(e) => setNewVehicle({ ...newVehicle, siteOperatorName: e.target.value })} placeholder={user?.name || 'Who is registering this job'} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary"><Plus size={15} /> Register Equipment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {drawerVehicle && (
        <VehicleDetailDrawer
          vehicle={drawerVehicle}
          variant="project"
          onClose={() => setSelectedVehicle(null)}
          onUpdate={handleVehicleUpdate}
        />
      )}

      {showSiteLogin && (
        <ProjectSiteLoginModal
          project={{ id: projectId, name: projectName }}
          onClose={() => setShowSiteLogin(false)}
        />
      )}
    </div>
  );
};

export default ProjectGarageDetail;
