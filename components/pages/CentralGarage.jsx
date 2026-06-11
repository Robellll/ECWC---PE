'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Plus, Search, Filter, Trash2, Clock, ChevronRight, Eye } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { useDuration } from '@/hooks/useDuration';
import { apiFetch } from '@/lib/api-client';
import VehicleDetailDrawer from '@/components/garage/VehicleDetailDrawer';
import './Garage.css';

const PRIORITY_ORDER = { Critical: 0, High: 1, Normal: 2, Low: 3 };

const DurationCell = ({ startTime, endTime }) => {
  const duration = useDuration(startTime, endTime);
  return (
    <div className="duration-cell">
      <Clock size={13} /> {duration}
    </div>
  );
};

const CentralGarage = () => {
  const { isGarageEditor: isManager } = usePermissions();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [newVehicle, setNewVehicle] = useState({
    plate: '', model: '', reportedIssue: '', technician: '', priority: 'Normal',
  });

  const loadVehicles = useCallback(async () => {
    const data = await apiFetch('/api/garage-vehicles');
    setVehicles(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadVehicles(); }, [loadVehicles]);

  const drawerVehicle = vehicles.find((v) => v.id === selectedVehicle?.id) || selectedVehicle;

  const totalRegistered = vehicles.length;
  const inProgress = vehicles.filter((v) => v.status === 'In Progress').length;
  const completed = vehicles.filter((v) => v.status === 'Completed').length;
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
    const created = await apiFetch('/api/garage-vehicles', {
      method: 'POST',
      body: JSON.stringify(newVehicle),
    });
    setShowAddModal(false);
    setNewVehicle({ plate: '', model: '', reportedIssue: '', technician: '', priority: 'Normal' });
    await loadVehicles();
    setSelectedVehicle(created);
  };

  const handleVehicleUpdate = (updated) => {
    setVehicles((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
    setSelectedVehicle(updated);
  };

  const filteredVehicles = useMemo(() => {
    return vehicles
      .filter((v) => {
        const matchSearch =
          v.plate.toLowerCase().includes(search.toLowerCase()) ||
          v.model.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'All' || v.status === statusFilter;
        return matchSearch && matchStatus;
      })
      .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  }, [vehicles, search, statusFilter]);

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

      <div className="garage-summary">
        <div className="summary-card">
          <div className="summary-title">Total Registered</div>
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
            placeholder="Search by plate or model…"
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
        <table className="garage-table">
          <thead>
            <tr>
              <th>Priority</th>
              <th>Plate Number</th>
              <th>Vehicle / Equipment</th>
              <th>Stage</th>
              <th>Registered</th>
              <th>Duration</th>
              <th>Status</th>
              <th>Technician</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredVehicles.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center empty-row">
                  No vehicles found. {isManager && 'Register one to get started.'}
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
                <td><span className="stage-pill">{v.stage}</span></td>
                <td className="text-muted">
                  {new Date(v.registeredDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td><DurationCell startTime={v.registeredDate} endTime={v.completedDate} /></td>
                <td>
                  <span className={`status-badge ${v.status === 'Completed' ? 'success' : 'warning'}`}>{v.status}</span>
                </td>
                <td>{v.technician}</td>
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
                  <label>Priority</label>
                  <select value={newVehicle.priority} onChange={(e) => setNewVehicle({ ...newVehicle, priority: e.target.value })}>
                    <option>Low</option><option>Normal</option><option>High</option><option>Critical</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Vehicle / Equipment Model</label>
                <input required type="text" value={newVehicle.model} onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })} placeholder="e.g. CAT 320 Excavator" />
              </div>
              <div className="form-group">
                <label>Reported Issue</label>
                <textarea required value={newVehicle.reportedIssue} onChange={(e) => setNewVehicle({ ...newVehicle, reportedIssue: e.target.value })} rows="3" placeholder="Describe the problem…" />
              </div>
              <div className="form-group">
                <label>Assigned Technician</label>
                <input required type="text" value={newVehicle.technician} onChange={(e) => setNewVehicle({ ...newVehicle, technician: e.target.value })} placeholder="e.g. Dawit Y." />
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
