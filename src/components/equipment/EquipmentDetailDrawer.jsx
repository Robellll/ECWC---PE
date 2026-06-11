import React, { useState, useEffect, useRef } from 'react';
import {
  X, Calendar, User, Wrench, Lock, Save, FileText, CheckCircle2,
  AlertTriangle, Play, HelpCircle, Shield, Briefcase
} from 'lucide-react';
import { useStore, getRolePermissions } from '../../store/useStore';
import './EquipmentDetailDrawer.css';

const STATUS_CONFIG = {
  Operational: { color: 'status-operational', icon: Play, label: 'Operational' },
  'Under Maintenance': { color: 'status-maintenance', icon: Wrench, label: 'Under Maintenance' },
  Idle: { color: 'status-idle', icon: HelpCircle, label: 'Idle' },
  Breakdown: { color: 'status-breakdown', icon: AlertTriangle, label: 'Breakdown' }
};

const PROJECTS_LIST = [
  'Grand Ethiopian Renaissance Dam (GERD)',
  'Awash-Kombolcha Highway',
  'Adama-Awash Expressway',
  'Koye Feche Housing Project',
  'Bole Airport Expansion'
];

const EquipmentDetailDrawer = ({ equipment, onClose }) => {
  const userRole = useStore((s) => s.userRole);
  const updateEquipment = useStore((s) => s.updateEquipment);

  const isEditor = getRolePermissions(userRole).isEquipmentEditor;

  const [notes, setNotes] = useState(equipment.managerNotes || '');
  const [project, setProject] = useState(equipment.project || '');
  const [status, setStatus] = useState(equipment.status || 'Operational');
  const [capacity, setCapacity] = useState(equipment.capacity || '');
  const [dirty, setDirty] = useState(false);
  
  const drawerRef = useRef(null);

  // Sync state when equipment changes
  useEffect(() => {
    setNotes(equipment.managerNotes || '');
    setProject(equipment.project || '');
    setStatus(equipment.status || 'Operational');
    setCapacity(equipment.capacity || '');
    setDirty(false);
  }, [equipment]);

  // Close on Escape key press
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSave = () => {
    updateEquipment(equipment.id, {
      project,
      status,
      capacity,
      managerNotes: notes
    });
    setDirty(false);
  };

  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.Operational;
  const StatusIcon = statusCfg.icon;

  return (
    <>
      {/* Backdrop */}
      <div className="drawer-backdrop" onClick={onClose} />

      {/* Drawer Panel */}
      <aside className="equipment-drawer animate-slide-in" ref={drawerRef} role="dialog" aria-modal="true">
        {/* Header */}
        <div className="drawer-header">
          <div className="drawer-title-group">
            <span className="equipment-code-badge">{equipment.code}</span>
            <h2 className="drawer-name">{equipment.name}</h2>
            <span className="equipment-type-pill">{equipment.type}</span>
          </div>
          <div className="drawer-header-right">
            <span className={`status-badge-indicator ${statusCfg.color}`}>
              <StatusIcon size={14} />
              {statusCfg.label}
            </span>
            <button className="drawer-close-btn" onClick={onClose} title="Close (Esc)">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="drawer-body">
          {/* Metadata Section */}
          <div className="detail-info-grid">
            <div className="detail-info-item">
              <Calendar size={14} className="info-icon" />
              <div>
                <span className="detail-info-label">Added On</span>
                <span className="detail-info-value">
                  {new Date(equipment.registeredDate).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              </div>
            </div>
            <div className="detail-info-item">
              <User size={14} className="info-icon" />
              <div>
                <span className="detail-info-label">Added By</span>
                <span className="detail-info-value">{equipment.addedBy || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="drawer-stats-section">
            <h3 className="section-title">Equipment Attributes</h3>
            
            {isEditor ? (
              <div className="edit-form-fields">
                <div className="drawer-form-group">
                  <label>Current Project Assignment</label>
                  <select
                    value={project}
                    onChange={(e) => {
                      setProject(e.target.value);
                      setDirty(true);
                    }}
                  >
                    {PROJECTS_LIST.map((proj) => (
                      <option key={proj} value={proj}>
                        {proj}
                      </option>
                    ))}
                    <option value="Idle / Unassigned">Idle / Unassigned</option>
                  </select>
                </div>

                <div className="drawer-form-row">
                  <div className="drawer-form-group">
                    <label>Operational Status</label>
                    <select
                      value={status}
                      onChange={(e) => {
                        setStatus(e.target.value);
                        setDirty(true);
                      }}
                    >
                      <option value="Operational">Operational</option>
                      <option value="Under Maintenance">Under Maintenance</option>
                      <option value="Idle">Idle</option>
                      <option value="Breakdown">Breakdown</option>
                    </select>
                  </div>

                  <div className="drawer-form-group">
                    <label>Capacity / Specs</label>
                    <input
                      type="text"
                      value={capacity}
                      onChange={(e) => {
                        setCapacity(e.target.value);
                        setDirty(true);
                      }}
                      placeholder="e.g. 20 Tons, 320 HP"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="attributes-readonly-grid">
                <div className="attribute-row">
                  <span className="attr-label">Project:</span>
                  <span className="attr-val font-semibold">{project}</span>
                </div>
                <div className="attribute-row">
                  <span className="attr-label">Status:</span>
                  <span className="attr-val font-semibold">{status}</span>
                </div>
                <div className="attribute-row">
                  <span className="attr-label">Capacity / Specification:</span>
                  <span className="attr-val font-semibold">{capacity}</span>
                </div>
              </div>
            )}
          </div>

          {/* Manager Notes */}
          <div className="detail-section">
            <div className="detail-section-title">
              <FileText size={15} />
              Administration &amp; Manager Notes
              {!isEditor && <span className="read-only-badge"><Lock size={11} /> Read Only</span>}
            </div>

            {isEditor ? (
              <div className="notes-editor">
                <textarea
                  className="notes-textarea"
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    setDirty(true);
                  }}
                  placeholder="Add administrative notes regarding project location, operator details, specific task assignments, or site relocations…"
                  rows={6}
                />
              </div>
            ) : (
              <div className="notes-readonly">
                {equipment.managerNotes ? (
                  <p>{equipment.managerNotes}</p>
                ) : (
                  <p className="notes-empty">No notes have been added for this equipment.</p>
                )}
              </div>
            )}
          </div>

          {/* Persistent Action Panel if edited */}
          {isEditor && dirty && (
            <div className="drawer-sticky-save">
              <p className="unsaved-warning">You have unsaved changes</p>
              <button className="save-btn" onClick={handleSave}>
                <Save size={15} /> Save Changes
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default EquipmentDetailDrawer;
