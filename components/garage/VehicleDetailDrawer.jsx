'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X, Clock, User, AlertTriangle, CheckCircle2, Circle, MessageSquarePlus,
  Save, Lock, FileText, Calendar, Flag, ArrowRight, Wrench, ClipboardCheck, UserCheck,
} from 'lucide-react';
import { GARAGE_STAGES } from '@/lib/constants';
import { workshopLabel, workshopColor, isValidStaffName, isValidMaintenanceType, maintenanceTypeLabel } from '@/lib/garage';
import { usePermissions } from '@/hooks/usePermissions';
import { useDuration } from '@/hooks/useDuration';
import { apiFetch } from '@/lib/api-client';
import './VehicleDetailDrawer.css';

const PRIORITY_CONFIG = {
  Low: { color: 'priority-low', icon: '●' },
  Normal: { color: 'priority-normal', icon: '●' },
  High: { color: 'priority-high', icon: '▲' },
  Critical: { color: 'priority-critical', icon: '⬥' },
};

const StageStep = ({ stage, currentStage, index }) => {
  const stageIndex = GARAGE_STAGES.indexOf(currentStage);
  const isCompleted = index < stageIndex;
  const isActive = index === stageIndex;
  return (
    <div className={`stage-step ${isCompleted ? 'step-done' : ''} ${isActive ? 'step-active' : ''}`}>
      <div className="step-icon">
        {isCompleted ? <CheckCircle2 size={16} /> : isActive ? <Circle size={16} className="pulse-ring" /> : <Circle size={16} />}
      </div>
      <span className="step-label">{stage}</span>
      {index < GARAGE_STAGES.length - 1 && <div className={`step-connector ${isCompleted ? 'connector-done' : ''}`} />}
    </div>
  );
};

const LogEntry = ({ entry }) => {
  const d = new Date(entry.timestamp);
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return (
    <div className="log-entry">
      <div className="log-dot" />
      <div className="log-body">
        <p className="log-text">{entry.text}</p>
        <span className="log-time">{date} — {time}</span>
      </div>
    </div>
  );
};

const DurationLive = ({ startTime, endTime }) => {
  const duration = useDuration(startTime, endTime);
  return <div className="detail-duration"><Clock size={14} /><span>{duration}</span></div>;
};

const VehicleDetailDrawer = ({ vehicle, onClose, onUpdate }) => {
  const { isGarageEditor: isManager } = usePermissions();
  const [notes, setNotes] = useState(vehicle.managerNotes || '');
  const [notesDirty, setNotesDirty] = useState(false);
  const [logInput, setLogInput] = useState('');
  const [logFocus, setLogFocus] = useState(false);
  const [assignedTechnician, setAssignedTechnician] = useState(vehicle.assignedTechnician || '');
  const [finalInspectionOfficer, setFinalInspectionOfficer] = useState(vehicle.finalInspectionOfficer || '');
  const [maintenanceType, setMaintenanceType] = useState(vehicle.maintenanceType || '');
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState('');
  const drawerRef = useRef(null);

  useEffect(() => {
    setNotes(vehicle.managerNotes || '');
    setNotesDirty(false);
    setAssignedTechnician(vehicle.assignedTechnician || '');
    setFinalInspectionOfficer(vehicle.finalInspectionOfficer || '');
    setMaintenanceType(vehicle.maintenanceType || '');
    setCompleteError('');
  }, [vehicle.id, vehicle.managerNotes, vehicle.assignedTechnician, vehicle.finalInspectionOfficer, vehicle.maintenanceType]);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSaveNotes = async () => {
    const updated = await apiFetch(`/api/garage-vehicles/${vehicle.id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
    onUpdate(updated);
    setNotesDirty(false);
  };

  const handleAddLog = async () => {
    if (!logInput.trim()) return;
    const updated = await apiFetch(`/api/garage-vehicles/${vehicle.id}/progress`, {
      method: 'POST',
      body: JSON.stringify({ text: logInput.trim() }),
    });
    onUpdate(updated);
    setLogInput('');
  };

  const handleAdvance = async () => {
    const updated = await apiFetch(`/api/garage-vehicles/${vehicle.id}/advance-stage`, { method: 'POST' });
    onUpdate(updated);
  };

  const saveCompletionFields = async (overrides = {}) => {
    const payload = {
      assignedTechnician,
      finalInspectionOfficer,
      ...overrides,
    };
    const updated = await apiFetch(`/api/garage-vehicles/${vehicle.id}/completion-fields`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    onUpdate(updated);
    return updated;
  };

  const saveMaintenanceType = async (type) => {
    setMaintenanceType(type);
    const updated = await apiFetch(`/api/garage-vehicles/${vehicle.id}/maintenance-type`, {
      method: 'POST',
      body: JSON.stringify({ maintenanceType: type }),
    });
    onUpdate(updated);
  };

  const handleToggleComplete = async () => {
    setCompleteError('');
    if (!isValidStaffName(assignedTechnician) || !isValidStaffName(finalInspectionOfficer)) {
      setCompleteError('Assigned Mechanic and Final Inspection Officer are required before completion.');
      return;
    }
    if (!isValidMaintenanceType(maintenanceType)) {
      setCompleteError('Maintenance type (Major or Minor) is required before completion.');
      return;
    }
    setCompleting(true);
    try {
      const updated = await apiFetch(`/api/garage-vehicles/${vehicle.id}/toggle-complete`, {
        method: 'POST',
        body: JSON.stringify({ assignedTechnician, finalInspectionOfficer, maintenanceType }),
      });
      onUpdate(updated);
    } catch (err) {
      setCompleteError(err.message || 'Could not complete vehicle.');
    } finally {
      setCompleting(false);
    }
  };

  const handleReopen = async () => {
    const updated = await apiFetch(`/api/garage-vehicles/${vehicle.id}/toggle-complete`, { method: 'POST' });
    onUpdate(updated);
  };

  const currentStageIdx = GARAGE_STAGES.indexOf(vehicle.stage);
  const canAdvance = isManager && vehicle.status !== 'Completed' && currentStageIdx < GARAGE_STAGES.length - 2;
  const atFinalInspection = vehicle.stage === 'Final Inspection' && vehicle.status !== 'Completed';
  const canComplete = isManager && atFinalInspection
    && isValidStaffName(assignedTechnician)
    && isValidStaffName(finalInspectionOfficer)
    && isValidMaintenanceType(maintenanceType);
  const pConfig = PRIORITY_CONFIG[vehicle.priority] || PRIORITY_CONFIG.Normal;
  const workshopStyle = vehicle.workshop ? { '--workshop-color': workshopColor(vehicle.workshop) } : {};

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="vehicle-drawer" ref={drawerRef} role="dialog" aria-modal="true">
        <div className="drawer-header">
          <div className="drawer-title-group">
            <span className={`priority-badge ${pConfig.color}`}>{pConfig.icon} {vehicle.priority}</span>
            <h2 className="drawer-plate">{vehicle.plate}</h2>
            <p className="drawer-model">{vehicle.model}</p>
            {vehicle.sroNumber && <p className="drawer-sro">SRO: {vehicle.sroNumber}</p>}
          </div>
          <div className="drawer-header-right">
            <span className={`status-badge ${vehicle.status === 'Completed' ? 'success' : 'warning'}`}>{vehicle.status}</span>
            <button className="drawer-close-btn" onClick={onClose} title="Close (Esc)"><X size={20} /></button>
          </div>
        </div>

        <div className="drawer-body">
          <div className="detail-info-grid">
            <div className="detail-info-item">
              <Calendar size={14} />
              <div>
                <span className="detail-info-label">Registered</span>
                <span className="detail-info-value">
                  {new Date(vehicle.registeredDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
            {vehicle.workshop && (
              <div className="detail-info-item">
                <Wrench size={14} />
                <div>
                  <span className="detail-info-label">Workshop</span>
                  <span className="workshop-badge drawer-workshop-badge" style={workshopStyle}>
                    {workshopLabel(vehicle.workshop)}
                  </span>
                </div>
              </div>
            )}
            <div className="detail-info-item">
              <Flag size={14} />
              <div>
                <span className="detail-info-label">Maintenance Type</span>
                {isManager ? (
                  <div className="maintenance-type-choice" role="radiogroup" aria-label="Maintenance type">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={maintenanceType === 'major'}
                      className={`type-choice-btn type-major ${maintenanceType === 'major' ? 'selected' : ''}`}
                      onClick={() => saveMaintenanceType('major')}
                    >
                      Major
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={maintenanceType === 'minor'}
                      className={`type-choice-btn type-minor ${maintenanceType === 'minor' ? 'selected' : ''}`}
                      onClick={() => saveMaintenanceType('minor')}
                    >
                      Minor
                    </button>
                  </div>
                ) : (
                  <span className={`maintenance-type-badge ${vehicle.maintenanceType || 'unset'}`}>
                    {maintenanceTypeLabel(vehicle.maintenanceType)}
                  </span>
                )}
              </div>
            </div>
            <div className="detail-info-item detail-info-full">
              <Clock size={14} />
              <div>
                <span className="detail-info-label">Time in Garage</span>
                <DurationLive startTime={vehicle.registeredDate} endTime={vehicle.completedDate} />
              </div>
            </div>
          </div>

          <div className="detail-section accountability-section">
            <div className="detail-section-title"><UserCheck size={15} />Staff Accountability</div>
            <div className="accountability-grid">
              <div className="accountability-item">
                <span className="accountability-label">Receiving Inspector</span>
                <span className="accountability-value">{vehicle.receivingInspector || '—'}</span>
              </div>
              <div className="accountability-item">
                <span className="accountability-label">Assigned Mechanic</span>
                {atFinalInspection && isManager ? (
                  <input
                    className="completion-input"
                    type="text"
                    value={assignedTechnician}
                    onChange={(e) => setAssignedTechnician(e.target.value)}
                    onBlur={saveCompletionFields}
                    placeholder="Mechanic who performed the work"
                  />
                ) : (
                  <span className="accountability-value">{vehicle.assignedTechnician || '—'}</span>
                )}
              </div>
              <div className="accountability-item">
                <span className="accountability-label">Final Inspection Officer</span>
                {atFinalInspection && isManager ? (
                  <input
                    className="completion-input"
                    type="text"
                    value={finalInspectionOfficer}
                    onChange={(e) => setFinalInspectionOfficer(e.target.value)}
                    onBlur={saveCompletionFields}
                    placeholder="Officer who verifies work quality"
                  />
                ) : (
                  <span className="accountability-value">{vehicle.finalInspectionOfficer || '—'}</span>
                )}
              </div>
            </div>
            {atFinalInspection && isManager && (
              <p className="completion-hint">
                <ClipboardCheck size={13} />
                Enter assigned mechanic and final inspection officer before completing.
              </p>
            )}
          </div>

          <div className="detail-section">
            <div className="detail-section-title"><AlertTriangle size={15} />Reported Issue</div>
            <p className="reported-issue-text">{vehicle.reportedIssue || 'No issue description provided.'}</p>
          </div>

          <div className="detail-section">
            <div className="detail-section-title"><Flag size={15} />Maintenance Progress</div>
            <div className="stage-tracker">
              {GARAGE_STAGES.map((stage, i) => (
                <StageStep key={stage} stage={stage} currentStage={vehicle.stage} index={i} />
              ))}
            </div>
            {canAdvance && (
              <button className="advance-stage-btn" onClick={handleAdvance}>
                <ArrowRight size={15} />Advance to &quot;{GARAGE_STAGES[currentStageIdx + 1]}&quot;
              </button>
            )}
            {isManager && atFinalInspection && (
              <>
                {completeError && <p className="completion-error">{completeError}</p>}
                <button
                  className="complete-btn"
                  onClick={handleToggleComplete}
                  disabled={!canComplete || completing}
                  title={!canComplete ? 'Enter Assigned Mechanic and Final Inspection Officer first' : ''}
                >
                  <CheckCircle2 size={15} />Mark as Completed
                </button>
              </>
            )}
            {isManager && vehicle.status === 'Completed' && (
              <button className="reopen-btn" onClick={handleReopen}>Reopen / Return to Under Maintenance</button>
            )}
          </div>

          <div className="detail-section">
            <div className="detail-section-title">
              <FileText size={15} />Maintenance Manager Notes
              {!isManager && <span className="read-only-badge"><Lock size={11} /> Read Only</span>}
            </div>
            {isManager ? (
              <div className="notes-editor">
                <textarea className="notes-textarea" value={notes} onChange={(e) => { setNotes(e.target.value); setNotesDirty(true); }} rows={5} />
                {notesDirty && (
                  <button className="save-notes-btn" onClick={handleSaveNotes}><Save size={14} />Save Notes</button>
                )}
              </div>
            ) : (
              <div className="notes-readonly">
                {vehicle.managerNotes ? <p>{vehicle.managerNotes}</p> : <p className="notes-empty">No notes added yet.</p>}
              </div>
            )}
          </div>

          <div className="detail-section">
            <div className="detail-section-title"><MessageSquarePlus size={15} />Progress Log</div>
            {isManager && (
              <div className={`log-input-group ${logFocus ? 'focused' : ''}`}>
                <textarea className="log-input" value={logInput} onChange={(e) => setLogInput(e.target.value)} onFocus={() => setLogFocus(true)} onBlur={() => setLogFocus(false)} rows={2} />
                <button className="add-log-btn" onClick={handleAddLog} disabled={!logInput.trim()}>Add Entry</button>
              </div>
            )}
            <div className="log-feed">
              {[...vehicle.progressLog].reverse().map((entry) => <LogEntry key={entry.id} entry={entry} />)}
              {vehicle.progressLog.length === 0 && <p className="log-empty">No progress entries yet.</p>}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default VehicleDetailDrawer;
