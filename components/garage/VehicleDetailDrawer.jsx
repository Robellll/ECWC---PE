'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X, Clock, User, AlertTriangle, CheckCircle2, Circle, MessageSquarePlus,
  Lock, FileText, Calendar, Flag, ArrowRight, Wrench, ClipboardCheck, UserCheck, Loader2,
} from 'lucide-react';
import { GARAGE_STAGES, PROJECT_GARAGE_STAGES } from '@/lib/constants';
import { workshopLabel, workshopColor, isValidStaffName, isValidMaintenanceType, maintenanceTypeLabel } from '@/lib/garage';
import {
  isValidMaintenanceLocation,
  formatMaintenanceLocationSummary,
} from '@/lib/maintenance-location';
import { usePermissions } from '@/hooks/usePermissions';
import { useDuration } from '@/hooks/useDuration';
import { apiFetch } from '@/lib/api-client';
import MaintenanceLocationPicker from '@/components/garage/MaintenanceLocationPicker';
import TechnicianListEditor from '@/components/garage/TechnicianListEditor';
import StaffIdLookup from '@/components/garage/StaffIdLookup';
import {
  parseAssignedTechnicians,
  serializeAssignedTechnicians,
  isValidTechnicianList,
  normalizeTechnicianList,
} from '@/lib/garage-technicians';
import DrawerActionBar from '@/components/ui/DrawerActionBar';
import '@/components/ui/DetailDrawerShell.css';
import './VehicleDetailDrawer.css';

const PRIORITY_CONFIG = {
  Low: { color: 'priority-low', icon: '●' },
  Normal: { color: 'priority-normal', icon: '●' },
  High: { color: 'priority-high', icon: '▲' },
  Critical: { color: 'priority-critical', icon: '⬥' },
};

const StageStep = ({ stage, currentStage, index, totalStages }) => {
  const stageList = totalStages === 3 ? PROJECT_GARAGE_STAGES : GARAGE_STAGES;
  const stageIndex = stageList.indexOf(currentStage);
  const isCompleted = index < stageIndex;
  const isActive = index === stageIndex;
  return (
    <div className={`stage-step ${isCompleted ? 'step-done' : ''} ${isActive ? 'step-active' : ''}`}>
      <div className="step-icon">
        {isCompleted ? <CheckCircle2 size={16} /> : isActive ? <Circle size={16} className="pulse-ring" /> : <Circle size={16} />}
      </div>
      <span className="step-label">{stage}</span>
      {index < totalStages - 1 && <div className={`step-connector ${isCompleted ? 'connector-done' : ''}`} />}
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

const VehicleDetailDrawer = ({ vehicle, onClose, onUpdate, variant = 'central' }) => {
  const { isCentralGarageEditor, isProjectGarageEditor, isSuperAdmin, user } = usePermissions();
  const isProject = variant === 'project' || vehicle.garageScope === 'project';
  const canEditThisProject = isSuperAdmin
    || (isProjectGarageEditor && user?.projectId && user.projectId === vehicle.projectId);
  const isManager = isProject ? canEditThisProject : isCentralGarageEditor;
  const stageList = isProject ? PROJECT_GARAGE_STAGES : GARAGE_STAGES;
  const [notes, setNotes] = useState(vehicle.managerNotes || '');
  const [notesDirty, setNotesDirty] = useState(false);
  const [logInput, setLogInput] = useState('');
  const [logFocus, setLogFocus] = useState(false);
  const [assignedTechnicians, setAssignedTechnicians] = useState(() => normalizeTechnicianList(parseAssignedTechnicians(vehicle.assignedTechnician)));
  const [finalInspectionOfficer, setFinalInspectionOfficer] = useState(vehicle.finalInspectionOfficer || '');
  const [maintenanceType, setMaintenanceType] = useState(vehicle.maintenanceType || '');
  const [maintenanceLocation, setMaintenanceLocation] = useState(vehicle.maintenanceLocation || '');
  const [outsourceGarageName, setOutsourceGarageName] = useState(vehicle.outsourceGarageName || '');
  const [locSaving, setLocSaving] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState('');
  const drawerRef = useRef(null);

  useEffect(() => {
    setNotes(vehicle.managerNotes || '');
    setNotesDirty(false);
    setAssignedTechnicians(normalizeTechnicianList(parseAssignedTechnicians(vehicle.assignedTechnician)));
    setFinalInspectionOfficer(vehicle.finalInspectionOfficer || '');
    setMaintenanceType(vehicle.maintenanceType || '');
    setMaintenanceLocation(vehicle.maintenanceLocation || '');
    setOutsourceGarageName(vehicle.outsourceGarageName || '');
    setCompleteError('');
  }, [vehicle.id, vehicle.managerNotes, vehicle.assignedTechnician, vehicle.finalInspectionOfficer, vehicle.maintenanceType, vehicle.maintenanceLocation, vehicle.outsourceGarageName]);

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
    const nextStage = stageList[currentStageIdx + 1];
    if (!nextStage || advancing) return;

    if (nextStage === 'Under Maintenance' && !isValidMaintenanceLocation(maintenanceLocation, outsourceGarageName, isProject ? 'project' : 'central')) {
      setCompleteError('Select maintenance location before advancing.');
      return;
    }

    setAdvancing(true);
    setCompleteError('');
    try {
      const payload = nextStage === 'Under Maintenance'
        ? {
          maintenanceLocation,
          outsourceGarageName: maintenanceLocation === 'outsource' ? outsourceGarageName : '',
        }
        : {};
      const updated = await apiFetch(`/api/garage-vehicles/${vehicle.id}/advance-stage`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      onUpdate(updated);
    } catch (err) {
      setCompleteError(err.message || 'Could not advance stage');
    } finally {
      setAdvancing(false);
    }
  };

  const saveMaintenanceLocation = async (overrides = {}) => {
    if (!isManager || vehicle.status === 'Completed' || vehicle.stage !== 'Under Maintenance') return;
    const loc = overrides.maintenanceLocation ?? maintenanceLocation;
    const garage = overrides.outsourceGarageName ?? outsourceGarageName;
    const scope = isProject ? 'project' : 'central';
    if (!isValidMaintenanceLocation(loc, garage, scope)) return;
    const garageTrimmed = loc === 'outsource' ? garage.trim() : '';
    if (loc === vehicle.maintenanceLocation && garageTrimmed === (vehicle.outsourceGarageName || '').trim()) {
      return;
    }
    setLocSaving(true);
    try {
      const updated = await apiFetch(`/api/garage-vehicles/${vehicle.id}/maintenance-location`, {
        method: 'POST',
        body: JSON.stringify({
          maintenanceLocation: loc,
          outsourceGarageName: garageTrimmed,
        }),
      });
      onUpdate(updated);
    } catch (err) {
      setCompleteError(err.message || 'Could not save maintenance location');
    } finally {
      setLocSaving(false);
    }
  };

  const handleLocationChange = (loc) => {
    setMaintenanceLocation(loc);
    if (loc !== 'outsource') setOutsourceGarageName('');
    if (atUnderMaintenance && loc !== 'outsource') {
      saveMaintenanceLocation({ maintenanceLocation: loc, outsourceGarageName: '' });
    }
  };

  const saveCompletionFields = async (overrides = {}) => {
    const techList = overrides.assignedTechnicians ?? assignedTechnicians;
    const payload = {
      assignedTechnician: serializeAssignedTechnicians(techList),
      finalInspectionOfficer: overrides.finalInspectionOfficer ?? finalInspectionOfficer,
    };
    const updated = await apiFetch(`/api/garage-vehicles/${vehicle.id}/completion-fields`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    onUpdate(updated);
    return updated;
  };

  const handleTechniciansChange = (nextList) => {
    setAssignedTechnicians(nextList);
  };

  const handleTechniciansBlur = () => {
    const cleaned = assignedTechnicians.map((s) => s.trim()).filter(Boolean);
    const normalized = cleaned.length > 0 ? cleaned : [''];
    setAssignedTechnicians(normalized);
    saveCompletionFields({ assignedTechnicians: normalized });
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
    if (!isValidTechnicianList(assignedTechnicians) || (!isProject && !isValidStaffName(finalInspectionOfficer))) {
      setCompleteError(isProject
        ? 'At least one assigned mechanic is required before completion.'
        : 'At least one assigned mechanic and the Final Inspection Officer are required before completion.');
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
        body: JSON.stringify({
          assignedTechnician: serializeAssignedTechnicians(assignedTechnicians),
          finalInspectionOfficer,
          maintenanceType,
        }),
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

  const currentStageIdx = stageList.indexOf(vehicle.stage);
  const canAdvance = isManager && vehicle.status !== 'Completed' && currentStageIdx < stageList.length - 2;
  const advanceNeedsLocation = canAdvance && stageList[currentStageIdx + 1] === 'Under Maintenance';
  const atUnderMaintenance = vehicle.stage === 'Under Maintenance' && vehicle.status !== 'Completed';
  const showMaintenanceLocation = atUnderMaintenance || advanceNeedsLocation || Boolean(vehicle.maintenanceLocation);
  const canEditLocation = isManager && vehicle.status !== 'Completed' && (atUnderMaintenance || advanceNeedsLocation);
  const locationScope = isProject ? 'project' : 'central';
  const effectiveLocation = maintenanceLocation || vehicle.maintenanceLocation;
  const effectiveOutsourceGarage = maintenanceLocation === 'outsource' ? outsourceGarageName : (vehicle.outsourceGarageName || '');
  const atFinalInspection = !isProject && vehicle.stage === 'Final Inspection' && vehicle.status !== 'Completed';
  const atProjectComplete = isProject && vehicle.stage === 'Under Maintenance' && vehicle.status !== 'Completed';
  const canComplete = isManager && (atFinalInspection || atProjectComplete)
    && isValidTechnicianList(assignedTechnicians)
    && (isProject || isValidStaffName(finalInspectionOfficer))
    && isValidMaintenanceType(maintenanceType);
  const readonlyTechnicians = parseAssignedTechnicians(vehicle.assignedTechnician);
  const pConfig = PRIORITY_CONFIG[vehicle.priority] || PRIORITY_CONFIG.Normal;
  const workshopStyle = vehicle.workshop ? { '--workshop-color': workshopColor(vehicle.workshop) } : {};

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="detail-drawer-panel vehicle-drawer" ref={drawerRef} role="dialog" aria-modal="true">
        <div className="drawer-header">
          <div className="drawer-title-group">
            <span className={`priority-badge ${pConfig.color}`}>{pConfig.icon} {vehicle.priority}</span>
            <h2 className="drawer-plate">{vehicle.plate}</h2>
            <p className="drawer-model">{vehicle.model}</p>
            {vehicle.sroNumber && !isProject && <p className="drawer-sro">SRO: {vehicle.sroNumber}</p>}
          </div>
          <div className="drawer-header-right">
            <span className={`status-badge ${vehicle.status === 'Completed' ? 'success' : 'warning'}`}>{vehicle.status}</span>
            <button className="drawer-close-btn" onClick={onClose} title="Close (Esc)"><X size={20} /></button>
          </div>
        </div>

        {isManager && notesDirty && (
          <DrawerActionBar
            hint="Unsaved notes"
            onSave={handleSaveNotes}
            saveLabel="Save Notes"
          />
        )}

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
            {vehicle.workshop && !isProject && (
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
            {showMaintenanceLocation && (
              <div className="detail-info-item detail-info-full garage-maint-loc-row">
                <Wrench size={14} />
                <div className="garage-maint-loc-inner">
                  {canEditLocation ? (
                    <MaintenanceLocationPicker
                      variant={isProject ? 'project' : 'central'}
                      value={maintenanceLocation}
                      outsourceGarageName={outsourceGarageName}
                      onChange={handleLocationChange}
                      onOutsourceNameChange={setOutsourceGarageName}
                      onBlurSave={() => saveMaintenanceLocation()}
                      editable
                      saving={locSaving}
                      hint={advanceNeedsLocation ? 'Required before advancing to Under Maintenance.' : undefined}
                    />
                  ) : (
                    <>
                      <span className="detail-info-label">Maintenance Location</span>
                      <span className="garage-maint-loc-readonly">{formatMaintenanceLocationSummary(vehicle)}</span>
                    </>
                  )}
                </div>
              </div>
            )}
            <div className="detail-info-item detail-info-full">
              <Clock size={14} />
              <div>
                <span className="detail-info-label">{isProject ? 'Time on Site' : 'Time in Garage'}</span>
                <DurationLive startTime={vehicle.registeredDate} endTime={vehicle.completedDate} />
              </div>
            </div>
          </div>

          <div className="detail-section accountability-section">
            <div className="detail-section-title"><UserCheck size={15} />Staff Accountability</div>
            <div className="accountability-grid">
              <div className="accountability-item">
                <span className="accountability-label">{isProject ? 'Site Supervisor' : 'Receiving Inspector'}</span>
                <span className="accountability-value">{vehicle.receivingInspector || '—'}</span>
              </div>
              {isProject && vehicle.siteOperatorName && (
                <div className="accountability-item">
                  <span className="accountability-label">Registered By</span>
                  <span className="accountability-value">{vehicle.siteOperatorName}</span>
                </div>
              )}
              <div className="accountability-item accountability-item--technicians">
                <span className="accountability-label">{isProject ? 'Assigned Mechanics' : 'Assigned Mechanics'}</span>
                {(atFinalInspection || atProjectComplete) && isManager ? (
                  <TechnicianListEditor
                    values={assignedTechnicians}
                    onChange={handleTechniciansChange}
                    onBlur={handleTechniciansBlur}
                    useStaffLookup={!isProject}
                    idPrefix={`mechanic-${vehicle.id}`}
                    addLabel="Add technician"
                    namePlaceholder="Mechanic who performed the work"
                  />
                ) : readonlyTechnicians.length > 1 ? (
                  <ul className="technicians-readonly-list">
                    {readonlyTechnicians.map((name) => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="accountability-value">{vehicle.assignedTechnician || '—'}</span>
                )}
              </div>
              {!isProject && (
              <div className="accountability-item">
                <span className="accountability-label">Final Inspection Officer</span>
                {atFinalInspection && isManager ? (
                  <StaffIdLookup
                    id={`inspector-${vehicle.id}`}
                    required
                    value={finalInspectionOfficer}
                    onChange={setFinalInspectionOfficer}
                    onBlur={saveCompletionFields}
                    idPlaceholder="Staff ID"
                    namePlaceholder="Name fills from ID"
                  />
                ) : (
                  <span className="accountability-value">{vehicle.finalInspectionOfficer || '—'}</span>
                )}
              </div>
              )}
            </div>
            {atFinalInspection && isManager && !isProject && (
              <p className="completion-hint">
                <ClipboardCheck size={13} />
                Enter assigned mechanics{!isProject ? ' and final inspection officer' : ''} before completing.
              </p>
            )}
            {atProjectComplete && isManager && (
              <p className="completion-hint">
                <ClipboardCheck size={13} />
                Enter assigned mechanics before completing.
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
              {stageList.map((stage, i) => (
                <StageStep key={stage} stage={stage} currentStage={vehicle.stage} index={i} totalStages={stageList.length} />
              ))}
            </div>
            {canAdvance && (
              <>
                {completeError && advanceNeedsLocation && <p className="completion-error">{completeError}</p>}
                <button
                  className="advance-stage-btn"
                  onClick={handleAdvance}
                  disabled={advancing || (advanceNeedsLocation && !isValidMaintenanceLocation(effectiveLocation, effectiveOutsourceGarage, locationScope))}
                >
                  {advancing ? <Loader2 size={15} className="spin-icon" /> : <ArrowRight size={15} />}
                  {advancing ? 'Updating…' : `Advance to "${stageList[currentStageIdx + 1]}"`}
                </button>
              </>
            )}
            {isManager && (atFinalInspection || atProjectComplete) && (
              <>
                {completeError && <p className="completion-error">{completeError}</p>}
                <button
                  className="complete-btn"
                  onClick={handleToggleComplete}
                  disabled={!canComplete || completing}
                  title={!canComplete ? (isProject ? 'Enter at least one Assigned Mechanic first' : 'Enter Assigned Mechanics and Final Inspection Officer first') : ''}
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
