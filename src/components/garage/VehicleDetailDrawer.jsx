import React, { useState, useEffect, useRef } from 'react';
import {
  X, ChevronRight, Clock, User, Wrench, AlertTriangle,
  CheckCircle2, Circle, MessageSquarePlus, Save, Lock,
  FileText, Calendar, Flag, ArrowRight
} from 'lucide-react';
import { useStore, GARAGE_STAGES, getRolePermissions } from '../../store/useStore';
import { useDuration } from '../../hooks/useDuration';
import './VehicleDetailDrawer.css';

const PRIORITY_CONFIG = {
  Low:      { color: 'priority-low',      icon: '●' },
  Normal:   { color: 'priority-normal',   icon: '●' },
  High:     { color: 'priority-high',     icon: '▲' },
  Critical: { color: 'priority-critical', icon: '⬥' },
};

const StageStep = ({ stage, currentStage, index }) => {
  const stageIndex = GARAGE_STAGES.indexOf(currentStage);
  const isCompleted = index < stageIndex;
  const isActive    = index === stageIndex;
  return (
    <div className={`stage-step ${isCompleted ? 'step-done' : ''} ${isActive ? 'step-active' : ''}`}>
      <div className="step-icon">
        {isCompleted ? <CheckCircle2 size={16} /> : isActive ? <Circle size={16} className="pulse-ring" /> : <Circle size={16} />}
      </div>
      <span className="step-label">{stage}</span>
      {index < GARAGE_STAGES.length - 1 && (
        <div className={`step-connector ${isCompleted ? 'connector-done' : ''}`} />
      )}
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
  return (
    <div className="detail-duration">
      <Clock size={14} />
      <span>{duration}</span>
    </div>
  );
};

const VehicleDetailDrawer = ({ vehicle, onClose }) => {
  const userRole          = useStore((s) => s.userRole);
  const updateManagerNotes = useStore((s) => s.updateManagerNotes);
  const addProgressEntry  = useStore((s) => s.addProgressEntry);
  const advanceStage      = useStore((s) => s.advanceStage);
  const toggleComplete    = useStore((s) => s.toggleComplete);

  const isManager = getRolePermissions(userRole).isGarageEditor;

  const [notes, setNotes]           = useState(vehicle.managerNotes || '');
  const [notesDirty, setNotesDirty] = useState(false);
  const [logInput, setLogInput]     = useState('');
  const [logFocus, setLogFocus]     = useState(false);
  const drawerRef = useRef(null);

  // Sync notes when vehicle changes
  useEffect(() => {
    setNotes(vehicle.managerNotes || '');
    setNotesDirty(false);
  }, [vehicle.id, vehicle.managerNotes]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSaveNotes = () => {
    updateManagerNotes(vehicle.id, notes);
    setNotesDirty(false);
  };

  const handleAddLog = () => {
    if (!logInput.trim()) return;
    addProgressEntry(vehicle.id, logInput.trim());
    setLogInput('');
  };

  const handleLogKey = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAddLog();
  };

  const currentStageIdx = GARAGE_STAGES.indexOf(vehicle.stage);
  const canAdvance = isManager && currentStageIdx < GARAGE_STAGES.length - 1;

  const pConfig = PRIORITY_CONFIG[vehicle.priority] || PRIORITY_CONFIG.Normal;

  return (
    <>
      {/* Backdrop */}
      <div className="drawer-backdrop" onClick={onClose} />

      {/* Drawer panel */}
      <aside className="vehicle-drawer" ref={drawerRef} role="dialog" aria-modal="true">

        {/* ── Header ── */}
        <div className="drawer-header">
          <div className="drawer-title-group">
            <span className={`priority-badge ${pConfig.color}`}>
              {pConfig.icon} {vehicle.priority}
            </span>
            <h2 className="drawer-plate">{vehicle.plate}</h2>
            <p className="drawer-model">{vehicle.model}</p>
          </div>
          <div className="drawer-header-right">
            <span className={`status-badge ${vehicle.status === 'Completed' ? 'success' : 'warning'}`}>
              {vehicle.status}
            </span>
            <button className="drawer-close-btn" onClick={onClose} title="Close (Esc)">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="drawer-body">

          {/* Info grid */}
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
            <div className="detail-info-item">
              <User size={14} />
              <div>
                <span className="detail-info-label">Technician</span>
                <span className="detail-info-value">{vehicle.technician}</span>
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

          {/* Reported Issue */}
          <div className="detail-section">
            <div className="detail-section-title">
              <AlertTriangle size={15} />
              Reported Issue
            </div>
            <p className="reported-issue-text">{vehicle.reportedIssue || 'No issue description provided.'}</p>
          </div>

          {/* Progress Tracker */}
          <div className="detail-section">
            <div className="detail-section-title">
              <Flag size={15} />
              Maintenance Progress
            </div>
            <div className="stage-tracker">
              {GARAGE_STAGES.map((stage, i) => (
                <StageStep key={stage} stage={stage} currentStage={vehicle.stage} index={i} />
              ))}
            </div>
            {canAdvance && (
              <button
                className="advance-stage-btn"
                onClick={() => advanceStage(vehicle.id)}
              >
                <ArrowRight size={15} />
                Advance to "{GARAGE_STAGES[currentStageIdx + 1]}"
              </button>
            )}
            {isManager && vehicle.status !== 'Completed' && vehicle.stage === 'Testing' && (
              <button className="complete-btn" onClick={() => { toggleComplete(vehicle.id); onClose(); }}>
                <CheckCircle2 size={15} />
                Mark as Completed
              </button>
            )}
            {isManager && vehicle.status === 'Completed' && (
              <button className="reopen-btn" onClick={() => toggleComplete(vehicle.id)}>
                Reopen / Return to In Repair
              </button>
            )}
          </div>

          {/* Manager Notes */}
          <div className="detail-section">
            <div className="detail-section-title">
              <FileText size={15} />
              Maintenance Manager Notes
              {!isManager && <span className="read-only-badge"><Lock size={11} /> Read Only</span>}
            </div>

            {isManager ? (
              <div className="notes-editor">
                <textarea
                  className="notes-textarea"
                  value={notes}
                  onChange={(e) => { setNotes(e.target.value); setNotesDirty(true); }}
                  placeholder="Add technical notes about this vehicle's maintenance status, parts needed, findings…"
                  rows={5}
                />
                {notesDirty && (
                  <button className="save-notes-btn" onClick={handleSaveNotes}>
                    <Save size={14} />
                    Save Notes
                  </button>
                )}
              </div>
            ) : (
              <div className="notes-readonly">
                {vehicle.managerNotes
                  ? <p>{vehicle.managerNotes}</p>
                  : <p className="notes-empty">No notes added yet by the Maintenance Manager.</p>
                }
              </div>
            )}
          </div>

          {/* Progress Log */}
          <div className="detail-section">
            <div className="detail-section-title">
              <MessageSquarePlus size={15} />
              Progress Log
            </div>

            {isManager && (
              <div className={`log-input-group ${logFocus ? 'focused' : ''}`}>
                <textarea
                  className="log-input"
                  value={logInput}
                  onChange={(e) => setLogInput(e.target.value)}
                  onKeyDown={handleLogKey}
                  onFocus={() => setLogFocus(true)}
                  onBlur={() => setLogFocus(false)}
                  placeholder="Add a progress update… (Ctrl+Enter to submit)"
                  rows={2}
                />
                <button
                  className="add-log-btn"
                  onClick={handleAddLog}
                  disabled={!logInput.trim()}
                >
                  Add Entry
                </button>
              </div>
            )}

            <div className="log-feed">
              {[...vehicle.progressLog].reverse().map((entry) => (
                <LogEntry key={entry.id} entry={entry} />
              ))}
              {vehicle.progressLog.length === 0 && (
                <p className="log-empty">No progress entries yet.</p>
              )}
            </div>
          </div>

        </div>
      </aside>
    </>
  );
};

export default VehicleDetailDrawer;
