import React, { useState, useMemo } from 'react';
import {
  Plus, Search, Filter, Trash2, Clock,
  ChevronRight, Eye, ShieldAlert, FileText, CheckCircle2
} from 'lucide-react';
import { useStore, getRolePermissions } from '../store/useStore';
import InsuranceDetailDrawer from '../components/insurance/InsuranceDetailDrawer';
import './Insurance.css';

const PRIORITY_ORDER = { Critical: 0, High: 1, Normal: 2, Low: 3 };

const Insurance = () => {
  const userRole           = useStore((s) => s.userRole);
  const claims              = useStore((s) => s.insuranceClaims);
  const addInsuranceClaim   = useStore((s) => s.addInsuranceClaim);
  const deleteInsuranceClaim = useStore((s) => s.deleteInsuranceClaim);

  const { isInsuranceEditor } = getRolePermissions(userRole);

  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [newClaim, setNewClaim]         = useState({
    plate: '', model: '', accidentDescription: '', claimNumber: '', insuranceProvider: '', estimatedCost: '', priority: 'Normal'
  });

  // Keep drawer in sync when store changes
  const selectedFromStore = claims.find((c) => c.id === selectedClaim?.id);
  const drawerClaim = selectedFromStore || selectedClaim;

  // ── Summary stats ──
  const totalClaims = claims.length;
  const openClaims  = claims.filter((c) => c.status === 'Open').length;
  const closedClaims = claims.filter((c) => c.status === 'Closed').length;
  const criticalClaims = claims.filter((c) => c.priority === 'Critical' || c.priority === 'High').length;

  // ── Handlers ──
  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (window.confirm('Delete this insurance claim record?')) {
      deleteInsuranceClaim(id);
      if (selectedClaim?.id === id) setSelectedClaim(null);
    }
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    const claimObj = {
      id: `c${Date.now()}`,
      plate: newClaim.plate,
      model: newClaim.model,
      accidentDate: new Date().toISOString(),
      accidentDescription: newClaim.accidentDescription,
      claimNumber: newClaim.claimNumber || `CLM-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      insuranceProvider: newClaim.insuranceProvider || 'Pending Insurer',
      estimatedCost: newClaim.estimatedCost || 'TBD',
      priority: newClaim.priority,
      stage: 'Reported',
      status: 'Open',
      claimNotes: '',
      progressLog: [{
        id: `il${Date.now()}`,
        text: `Accident reported. Claims reference registration complete.`,
        timestamp: new Date().toISOString(),
      }],
    };
    addInsuranceClaim(claimObj);
    setShowAddModal(false);
    setNewClaim({ plate: '', model: '', accidentDescription: '', claimNumber: '', insuranceProvider: '', estimatedCost: '', priority: 'Normal' });
  };

  const filteredClaims = useMemo(() => {
    return claims
      .filter((c) => {
        const matchSearch =
          c.plate.toLowerCase().includes(search.toLowerCase()) ||
          c.model.toLowerCase().includes(search.toLowerCase()) ||
          c.claimNumber.toLowerCase().includes(search.toLowerCase()) ||
          c.insuranceProvider.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'All' || c.status === statusFilter;
        return matchSearch && matchStatus;
      })
      .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  }, [claims, search, statusFilter]);

  const priorityClass = (p) => {
    const map = { Low: 'priority-low', Normal: 'priority-normal', High: 'priority-high', Critical: 'priority-critical' };
    return map[p] || 'priority-normal';
  };

  const stageClass = (s) => {
    const map = {
      Reported: 'stage-reported',
      'Documents Pending': 'stage-docs',
      Inspection: 'stage-inspect',
      Approved: 'stage-approved',
      'Payout Received': 'stage-payout',
      Closed: 'stage-closed'
    };
    return map[s] || 'stage-reported';
  };

  return (
    <div className="garage-container insurance-container">
      {/* Header section */}
      <div className="garage-header">
        <div>
          <h1 className="dashboard-title">Insurance Claims follow-up</h1>
          <span className="page-subtitle">Track accidents, surveyor inspections, and repair claims settlement status</span>
        </div>
        {isInsuranceEditor && (
          <button className="register-btn" onClick={() => setShowAddModal(true)}>
            <Plus size={16} />
            Report Accident / Claim
          </button>
        )}
      </div>

      {/* Summary metrics row */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-card-title">Total Incidents</div>
          <div className="stat-card-value">{totalClaims}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-title">Active Claims</div>
          <div className="stat-card-value warning">{openClaims}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-title">Settled Cases</div>
          <div className="stat-card-value success">{closedClaims}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-title">High Priority Risks</div>
          <div className="stat-card-value danger">{criticalClaims}</div>
        </div>
      </div>

      {/* Filtering area */}
      <div className="table-controls">
        <div className="search-bar">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search plate, model, reference number or provider..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <Filter size={16} />
          <button
            className={`filter-tab ${statusFilter === 'All' ? 'active' : ''}`}
            onClick={() => setStatusFilter('All')}
          >
            All Claims
          </button>
          <button
            className={`filter-tab ${statusFilter === 'Open' ? 'active' : ''}`}
            onClick={() => setStatusFilter('Open')}
          >
            Active
          </button>
          <button
            className={`filter-tab ${statusFilter === 'Closed' ? 'active' : ''}`}
            onClick={() => setStatusFilter('Closed')}
          >
            Settled / Closed
          </button>
        </div>
      </div>

      {/* Claims Table */}
      <div className="table-wrapper">
        <table className="garage-table">
          <thead>
            <tr>
              <th>Plate No.</th>
              <th>Vehicle Model</th>
              <th>Accident Date</th>
              <th>Insurance Provider</th>
              <th>Ref Number</th>
              <th>Claim Amount</th>
              <th>Priority</th>
              <th>Status Stage</th>
              <th>State</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredClaims.map((claim) => (
              <tr
                key={claim.id}
                onClick={() => setSelectedClaim(claim)}
                className={`clickable-row ${selectedClaim?.id === claim.id ? 'row-selected' : ''}`}
              >
                <td className="plate-cell">{claim.plate}</td>
                <td>{claim.model}</td>
                <td>{new Date(claim.accidentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                <td>{claim.insuranceProvider}</td>
                <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{claim.claimNumber}</td>
                <td style={{ fontWeight: 600 }}>{claim.estimatedCost}</td>
                <td>
                  <span className={`table-badge ${priorityClass(claim.priority)}`}>
                    {claim.priority}
                  </span>
                </td>
                <td>
                  <span className={`stage-pill ${stageClass(claim.stage)}`}>
                    {claim.stage}
                  </span>
                </td>
                <td>
                  <span className={`state-badge-val ${claim.status === 'Closed' ? 'closed' : 'open'}`}>
                    {claim.status === 'Closed' ? 'Closed' : 'Open'}
                  </span>
                </td>
                <td className="actions-cell">
                  <button className="row-action-btn view" title="View details">
                    <Eye size={15} />
                  </button>
                  {isInsuranceEditor && (
                    <button
                      className="row-action-btn delete"
                      onClick={(e) => handleDelete(e, claim.id)}
                      title="Delete Claim"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filteredClaims.length === 0 && (
              <tr>
                <td colSpan="10" className="empty-table-cell">
                  No accident insurance claims found matching criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Claim Detail Drawer */}
      {drawerClaim && (
        <InsuranceDetailDrawer
          claim={drawerClaim}
          onClose={() => setSelectedClaim(null)}
        />
      )}

      {/* Accident Claim Registration Modal */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Report Accident & Register Claim</h3>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="plate">Plate Number *</label>
                  <input
                    id="plate"
                    type="text"
                    required
                    placeholder="e.g. AA-34567"
                    value={newClaim.plate}
                    onChange={(e) => setNewClaim({ ...newClaim, plate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="model">Vehicle Model *</label>
                  <input
                    id="model"
                    type="text"
                    required
                    placeholder="e.g. Toyota Hilux"
                    value={newClaim.model}
                    onChange={(e) => setNewClaim({ ...newClaim, model: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="provider">Insurance Provider</label>
                  <input
                    id="provider"
                    type="text"
                    placeholder="e.g. Nyala Insurance"
                    value={newClaim.insuranceProvider}
                    onChange={(e) => setNewClaim({ ...newClaim, insuranceProvider: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="claimNo">Claim Reference No.</label>
                  <input
                    id="claimNo"
                    type="text"
                    placeholder="e.g. CLM-2026-102"
                    value={newClaim.claimNumber}
                    onChange={(e) => setNewClaim({ ...newClaim, claimNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="estCost">Estimated Damage Cost</label>
                  <input
                    id="estCost"
                    type="text"
                    placeholder="e.g. 150,000 ETB"
                    value={newClaim.estimatedCost}
                    onChange={(e) => setNewClaim({ ...newClaim, estimatedCost: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="priority">Claim Priority</label>
                  <select
                    id="priority"
                    value={newClaim.priority}
                    onChange={(e) => setNewClaim({ ...newClaim, priority: e.target.value })}
                  >
                    <option value="Low">Low</option>
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="description">Accident & Damage Description *</label>
                <textarea
                  id="description"
                  required
                  placeholder="Provide details of the accident location, vehicle speed, parts damaged, police contact details..."
                  rows={4}
                  value={newClaim.accidentDescription}
                  onChange={(e) => setNewClaim({ ...newClaim, accidentDescription: e.target.value })}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Submit Claim Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const X = ({ size }) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
  );
};

export default Insurance;
