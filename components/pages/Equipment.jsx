'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Plus, Filter, Trash2, Eye, HardHat, Info,
  ChevronRight, Upload, Table, AlertCircle, X, Check, Clipboard
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { useProjects } from '@/hooks/useProjects';
import { apiFetch } from '@/lib/api-client';
import EquipmentDetailDrawer from '@/components/equipment/EquipmentDetailDrawer';
import SearchBar from '@/components/shared/SearchBar';
import './Equipment.css';

const UNASSIGNED = 'Idle / Unassigned';

const EQUIPMENT_TYPES = [
  'Excavator',
  'Dozer',
  'Dump Truck',
  'Loader',
  'Grader',
  'Roller',
  'Crane',
  'Generator',
  'Concrete Mixer'
];

const Equipment = () => {
  const { isEquipmentEditor: isEditor } = usePermissions();
  const { projects: projectOptions } = useProjects();
  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const loadEquipment = useCallback(async () => {
    const data = await apiFetch('/api/equipment');
    setEquipments(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadEquipment(); }, [loadEquipment]);

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal & Detail Drawer State
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState('single'); // 'single' | 'bulk'
  const [selectedEquipment, setSelectedEquipment] = useState(null);

  // Single Equipment Form State
  const [newEq, setNewEq] = useState({
    code: '',
    name: '',
    type: 'Excavator',
    project: UNASSIGNED,
    capacity: '',
    status: 'Operational',
    managerNotes: ''
  });

  // Bulk Import State
  const [bulkText, setBulkText] = useState('');
  const [bulkRows, setBulkRows] = useState([]); // Array of parsed row objects
  const [bulkParsed, setBulkParsed] = useState(false);
  const [bulkError, setBulkError] = useState('');

  // ── Summary Stats ──
  const total = equipments.length;
  const operational = equipments.filter((e) => e.status === 'Operational').length;
  const maintenance = equipments.filter((e) => e.status === 'Under Maintenance').length;
  const idleOrBreakdown = equipments.filter((e) => e.status === 'Idle' || e.status === 'Breakdown').length;

  // Filtered Equipment List
  const filteredEquipments = useMemo(() => {
    return equipments.filter((eq) => {
      const matchesSearch =
        eq.name.toLowerCase().includes(search.toLowerCase()) ||
        eq.code.toLowerCase().includes(search.toLowerCase()) ||
        eq.type.toLowerCase().includes(search.toLowerCase());
      const matchesProject = projectFilter === 'All' || eq.project === projectFilter;
      const matchesStatus = statusFilter === 'All' || eq.status === statusFilter;
      return matchesSearch && matchesProject && matchesStatus;
    });
  }, [equipments, search, projectFilter, statusFilter]);

  // Handlers
  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this equipment record?')) return;
    await apiFetch(`/api/equipment/${id}`, { method: 'DELETE' });
    if (selectedEquipment?.id === id) setSelectedEquipment(null);
    await loadEquipment();
  };

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    if (equipments.some((eq) => eq.code.toUpperCase() === newEq.code.toUpperCase().trim())) {
      alert(`Equipment code "${newEq.code.trim()}" already exists. Code must be unique.`);
      return;
    }
    await apiFetch('/api/equipment', {
      method: 'POST',
      body: JSON.stringify({
        code: newEq.code.trim(),
        name: newEq.name.trim(),
        type: newEq.type,
        project: newEq.project,
        capacity: newEq.capacity.trim() || 'N/A',
        status: newEq.status,
        managerNotes: newEq.managerNotes.trim(),
      }),
    });
    setShowAddModal(false);
    setNewEq({
      code: '', name: '', type: 'Excavator',
      project: UNASSIGNED,
      capacity: '', status: 'Operational', managerNotes: '',
    });
    await loadEquipment();
  };

  const handleEquipmentUpdate = (updated) => {
    setEquipments((prev) => prev.map((eq) => (eq.id === updated.id ? updated : eq)));
    setSelectedEquipment(updated);
  };

  // Bulk Import Parser (CSV or Tab-Separated)
  const handleParseBulk = () => {
    setBulkError('');
    if (!bulkText.trim()) {
      setBulkError('Please paste some text data first.');
      return;
    }

    const lines = bulkText.split('\n');
    const parsed = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines

      const parts = (line.includes('\t') ? line.split('\t') : line.split(',')).map((p) => p.trim());

      const code = parts[0] || '';
      const name = parts[1] || '';
      const type = parts[2] || 'Excavator';
      const project = parts[3] || projectOptions[0] || UNASSIGNED;
      const capacity = parts[4] || 'N/A';
      const status = parts[5] || 'Operational';

      if (!code || !name) {
        setBulkError(`Line ${i + 1} is missing required values (Code or Model Name). Format: Code, Name, Type, Project, Capacity, Status`);
        return;
      }

      parsed.push({
        id: `bulk-${Date.now()}-${i}`,
        code: code.toUpperCase(),
        name,
        type,
        project,
        capacity,
        status,
        hasError: false
      });
    }

    if (parsed.length === 0) {
      setBulkError('No valid rows parsed.');
      return;
    }

    setBulkRows(parsed);
    setBulkParsed(true);
  };

  const handleUpdateBulkCell = (id, field, value) => {
    setBulkRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const handleAddBulkRow = () => {
    const newRow = {
      id: `bulk-manual-${Date.now()}`,
      code: `ECWC-EQ-${Math.floor(1000 + Math.random() * 9000)}`,
      name: '',
      type: 'Excavator',
      project: projectOptions[0],
      capacity: 'N/A',
      status: 'Operational'
    };
    setBulkRows((prev) => [...prev, newRow]);
  };

  const handleDeleteBulkRow = (id) => {
    setBulkRows((prev) => prev.filter((row) => row.id !== id));
  };

  const handleImportBulkSubmit = async () => {
    const codesInImport = bulkRows.map((r) => r.code.toUpperCase().trim());
    const hasInternalDuplicates = codesInImport.some((code, index) => codesInImport.indexOf(code) !== index);
    if (hasInternalDuplicates) {
      alert('Error: There are duplicate equipment codes within your bulk import list.');
      return;
    }
    const codeMap = new Set(equipments.map((eq) => eq.code.toUpperCase()));
    const existingDuplicates = bulkRows.filter((row) => codeMap.has(row.code.toUpperCase().trim()));
    if (existingDuplicates.length > 0) {
      alert(`Error: Codes already exist: ${existingDuplicates.map((r) => r.code).join(', ')}`);
      return;
    }
    const items = bulkRows.map((row) => ({
      code: row.code.trim().toUpperCase(),
      name: row.name.trim(),
      type: row.type,
      project: row.project,
      capacity: row.capacity.trim() || 'N/A',
      status: row.status,
      managerNotes: 'Imported via Bulk Upload.',
    }));
    await apiFetch('/api/equipment/bulk', { method: 'POST', body: JSON.stringify({ items }) });
    setShowAddModal(false);
    setBulkText('');
    setBulkRows([]);
    setBulkParsed(false);
    setBulkError('');
    await loadEquipment();
  };

  const statusClass = (s) => {
    const map = {
      Operational: 'status-operational',
      'Under Maintenance': 'status-maintenance',
      Idle: 'status-idle',
      Breakdown: 'status-breakdown'
    };
    return map[s] || 'status-operational';
  };

  if (loading) {
    return <div className="equipment-container"><p className="page-subtitle">Loading equipment…</p></div>;
  }

  return (
    <div className="equipment-container">
      {/* Page Header */}
      <div className="equipment-header">
        <div>
          <h1 className="page-title">Equipment Administration</h1>
          <p className="page-subtitle">Project-level machinery register, utilization, and location allocation</p>
        </div>
        {isEditor && (
          <button className="btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Add Equipment
          </button>
        )}
      </div>

      {/* Summary Indicators */}
      <div className="equipment-summary">
        <div className="summary-card">
          <div className="summary-title">Total Active Fleet</div>
          <div className="summary-value">{total}</div>
        </div>
        <div className="summary-card">
          <div className="summary-title">Operational</div>
          <div className="summary-value success">{operational}</div>
        </div>
        <div className="summary-card">
          <div className="summary-title">Under Maintenance</div>
          <div className="summary-value warning">{maintenance}</div>
        </div>
        <div className="summary-card">
          <div className="summary-title">Idle / Breakdown</div>
          <div className="summary-value danger">{idleOrBreakdown}</div>
        </div>
      </div>

      {/* Filtering Options */}
      <div className="equipment-filters">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by machinery code, name, or type…"
        />

        <div className="filters-group">
          <div className="filter-dropdown">
            <Filter size={14} />
            <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
              <option value="All">All Projects</option>
              {projectOptions.map((proj) => (
                <option key={proj} value={proj}>
                  {proj}
                </option>
              ))}
              <option value="Idle / Unassigned">Idle / Unassigned</option>
            </select>
          </div>

          <div className="filter-dropdown">
            <Filter size={14} />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All">All Statuses</option>
              <option value="Operational">Operational</option>
              <option value="Under Maintenance">Under Maintenance</option>
              <option value="Idle">Idle</option>
              <option value="Breakdown">Breakdown</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid Table */}
      <div className="table-wrapper">
        <table className="equipment-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Machinery Model / Name</th>
              <th>Type</th>
              <th>Project Assignment</th>
              <th>Capacity</th>
              <th>Status</th>
              <th>Registered</th>
              <th>Added By</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredEquipments.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center empty-row">
                  No equipment matching filters was found. {isEditor && 'Click "Add Equipment" to register new machinery.'}
                </td>
              </tr>
            ) : (
              filteredEquipments.map((eq) => (
                <tr
                  key={eq.id}
                  className={`row-clickable ${selectedEquipment?.id === eq.id ? 'row-selected' : ''}`}
                  onClick={() => setSelectedEquipment(eq)}
                  title="Click to view details &amp; notes"
                >
                  <td className="font-semibold eq-code-cell">{eq.code}</td>
                  <td className="font-semibold">{eq.name}</td>
                  <td>
                    <span className="type-badge">{eq.type}</span>
                  </td>
                  <td className="project-cell">{eq.project}</td>
                  <td className="capacity-cell">{eq.capacity}</td>
                  <td>
                    <span className={`status-badge-indicator ${statusClass(eq.status)}`}>
                      {eq.status}
                    </span>
                  </td>
                  <td className="text-muted">
                    {new Date(eq.registeredDate).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </td>
                  <td className="text-muted persona-label">{eq.addedBy ? eq.addedBy.replace('1.1.1.1 ', '').replace('1.1 ', '') : 'N/A'}</td>
                  <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="view-btn"
                      onClick={() => setSelectedEquipment(eq)}
                      title="View details"
                    >
                      <Eye size={15} />
                    </button>
                    {isEditor && (
                      <button
                        className="delete-row-btn"
                        onClick={(e) => handleDelete(e, eq.id)}
                        title="Delete machinery record"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                    <ChevronRight size={15} className="row-arrow" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Equipment Modal */}
      {showAddModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddModal(false);
          }}
        >
          <div className={`modal-content ${activeTab === 'bulk' ? 'modal-large' : ''}`}>
            {/* Modal Header */}
            <div className="modal-header">
              <h2>Register New Project Equipment</h2>
              <button className="modal-close-icon-btn" onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="modal-tabs">
              <button
                className={`tab-btn ${activeTab === 'single' ? 'active' : ''}`}
                onClick={() => setActiveTab('single')}
              >
                <HardHat size={15} /> Single Equipment Add
              </button>
              <button
                className={`tab-btn ${activeTab === 'bulk' ? 'active' : ''}`}
                onClick={() => setActiveTab('bulk')}
              >
                <Table size={15} /> Spreadsheet Bulk Upload
              </button>
            </div>

            {/* Tab Body */}
            {activeTab === 'single' ? (
              <form onSubmit={handleSingleSubmit} className="modal-form-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Equipment ID / Code</label>
                    <input
                      required
                      type="text"
                      value={newEq.code}
                      onChange={(e) => setNewEq({ ...newEq, code: e.target.value })}
                      placeholder="e.g. ECWC-EQ-5002"
                    />
                  </div>
                  <div className="form-group">
                    <label>Machinery Model / Name</label>
                    <input
                      required
                      type="text"
                      value={newEq.name}
                      onChange={(e) => setNewEq({ ...newEq, name: e.target.value })}
                      placeholder="e.g. CAT 320D Excavator"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Equipment Type</label>
                    <select
                      value={newEq.type}
                      onChange={(e) => setNewEq({ ...newEq, type: e.target.value })}
                    >
                      {EQUIPMENT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                      <option value="Plant">Batching Plant / Crusher</option>
                      <option value="Vehicle">Support Vehicle</option>
                      <option value="Other">Other Heavy Machinery</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={newEq.status}
                      onChange={(e) => setNewEq({ ...newEq, status: e.target.value })}
                    >
                      <option value="Operational">Operational</option>
                      <option value="Under Maintenance">Under Maintenance</option>
                      <option value="Idle">Idle</option>
                      <option value="Breakdown">Breakdown</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Current Project Assignment</label>
                    <select
                      value={newEq.project}
                      onChange={(e) => setNewEq({ ...newEq, project: e.target.value })}
                    >
                      {projectOptions.map((proj) => (
                        <option key={proj} value={proj}>
                          {proj}
                        </option>
                      ))}
                      <option value="Idle / Unassigned">Idle / Unassigned</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Capacity / Specification</label>
                    <input
                      type="text"
                      value={newEq.capacity}
                      onChange={(e) => setNewEq({ ...newEq, capacity: e.target.value })}
                      placeholder="e.g. 20 Tons, 350 HP, 8 m³"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Initial Administration Notes</label>
                  <textarea
                    value={newEq.managerNotes}
                    onChange={(e) => setNewEq({ ...newEq, managerNotes: e.target.value })}
                    rows="3"
                    placeholder="Enter starting details like assigned operator name, current site sector..."
                  />
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    <Plus size={15} /> Add Equipment
                  </button>
                </div>
              </form>
            ) : (
              <div className="modal-form-body">
                {!bulkParsed ? (
                  <div className="bulk-upload-paste-zone">
                    <p className="bulk-instructions">
                      Copy rows from Excel, Notepad, or a CSV file and paste them directly below. Columns should be ordered as:
                      <br />
                      <strong>Code, Name, Type, Project Location, Capacity/Specs, Status</strong>
                    </p>
                    <div className="csv-example-box">
                      <div className="example-header">
                        <span>CSV Format Example:</span>
                        <span className="badge-csv">CSV</span>
                      </div>
                      <pre>
                        ECWC-EQ-8001, CAT 966H Loader, Loader, Your Project Name, 4.2 m³, Operational{"\n"}
                        ECWC-EQ-8002, Volvo Dump Truck, Dump Truck, Awash-Kombolcha Highway, 15 m³, Idle{"\n"}
                        ECWC-EQ-8003, Komatsu D275 Dozer, Dozer, Adama-Awash Expressway, 320 HP, Under Maintenance
                      </pre>
                    </div>

                    <div className="form-group">
                      <label>Paste Machinery Data</label>
                      <textarea
                        value={bulkText}
                        onChange={(e) => setBulkText(e.target.value)}
                        rows="8"
                        className="textarea-bulk-raw"
                        placeholder="ECWC-EQ-8001, CAT Loader, Loader, Awash-Kombolcha Highway, 4.2 m³, Operational..."
                      />
                    </div>

                    {bulkError && (
                      <div className="bulk-error-alert">
                        <AlertCircle size={15} />
                        <span>{bulkError}</span>
                      </div>
                    )}

                    <div className="modal-actions">
                      <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                        Cancel
                      </button>
                      <button type="button" className="btn-primary" onClick={handleParseBulk}>
                        <Upload size={15} /> Parse &amp; Preview
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bulk-spreadsheet-editor">
                    <div className="spreadsheet-actions-header">
                      <p className="parsed-count-label">
                        Parsed <strong>{bulkRows.length}</strong> equipment records. Double-click or select cells to refine details.
                      </p>
                      <button className="btn-secondary btn-small" onClick={handleAddBulkRow}>
                        <Plus size={13} /> Add Blank Row
                      </button>
                    </div>

                    <div className="spreadsheet-grid-wrapper">
                      <table className="spreadsheet-grid">
                        <thead>
                          <tr>
                            <th>Code *</th>
                            <th>Model / Name *</th>
                            <th>Type</th>
                            <th>Project Location</th>
                            <th>Capacity</th>
                            <th>Status</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {bulkRows.map((row) => (
                            <tr key={row.id}>
                              <td>
                                <input
                                  type="text"
                                  value={row.code}
                                  onChange={(e) => handleUpdateBulkCell(row.id, 'code', e.target.value)}
                                  className="grid-input"
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  value={row.name}
                                  onChange={(e) => handleUpdateBulkCell(row.id, 'name', e.target.value)}
                                  className="grid-input"
                                  placeholder="e.g. Dozer D8"
                                />
                              </td>
                              <td>
                                <select
                                  value={row.type}
                                  onChange={(e) => handleUpdateBulkCell(row.id, 'type', e.target.value)}
                                  className="grid-select"
                                >
                                  {EQUIPMENT_TYPES.map((t) => (
                                    <option key={t} value={t}>
                                      {t}
                                    </option>
                                  ))}
                                  <option value="Plant">Plant</option>
                                  <option value="Vehicle">Vehicle</option>
                                  <option value="Other">Other</option>
                                </select>
                              </td>
                              <td>
                                <select
                                  value={row.project}
                                  onChange={(e) => handleUpdateBulkCell(row.id, 'project', e.target.value)}
                                  className="grid-select"
                                >
                                  {projectOptions.map((proj) => (
                                    <option key={proj} value={proj}>
                                      {proj}
                                    </option>
                                  ))}
                                  <option value="Idle / Unassigned">Idle / Unassigned</option>
                                </select>
                              </td>
                              <td>
                                <input
                                  type="text"
                                  value={row.capacity}
                                  onChange={(e) => handleUpdateBulkCell(row.id, 'capacity', e.target.value)}
                                  className="grid-input"
                                />
                              </td>
                              <td>
                                <select
                                  value={row.status}
                                  onChange={(e) => handleUpdateBulkCell(row.id, 'status', e.target.value)}
                                  className="grid-select"
                                >
                                  <option value="Operational">Operational</option>
                                  <option value="Under Maintenance">Under Maintenance</option>
                                  <option value="Idle">Idle</option>
                                  <option value="Breakdown">Breakdown</option>
                                </select>
                              </td>
                              <td className="text-center">
                                <button
                                  className="icon-btn-danger"
                                  onClick={() => handleDeleteBulkRow(row.id)}
                                  title="Remove this row"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="modal-actions">
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                          setBulkParsed(false);
                          setBulkError('');
                        }}
                      >
                        Back to Text Paste
                      </button>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={handleImportBulkSubmit}
                        disabled={bulkRows.length === 0}
                      >
                        <Check size={15} /> Save &amp; Register {bulkRows.length} Equipments
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Equipment Detail Drawer */}
      {selectedEquipment && (
        <EquipmentDetailDrawer
          equipment={equipments.find((e) => e.id === selectedEquipment.id) || selectedEquipment}
          projectOptions={projectOptions}
          onClose={() => setSelectedEquipment(null)}
          onUpdate={handleEquipmentUpdate}
        />
      )}
    </div>
  );
};

export default Equipment;
