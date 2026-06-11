import React, { useState, useEffect, useRef } from 'react';
import {
  X, ChevronRight, Clock, User, ShieldAlert, AlertTriangle,
  CheckCircle2, Circle, MessageSquarePlus, Save, Lock,
  FileText, Calendar, Flag, ArrowRight, Activity, DollarSign
} from 'lucide-react';
import { useStore, INSURANCE_STAGES, getRolePermissions } from '../../store/useStore';
import { useDuration } from '../../hooks/useDuration';
import './InsuranceDetailDrawer.css';

const PRIORITY_CONFIG = {
  Low:      { color: 'priority-low',      icon: '●' },
  Normal:   { color: 'priority-normal',   icon: '●' },
  High:     { color: 'priority-high',     icon: '▲' },
  Critical: { color: 'priority-critical', icon: '⬥' },
};

const StageStep = ({ stage, currentStage, index }) => {
  const stageIndex = INSURANCE_STAGES.indexOf(currentStage);
  const isCompleted = index < stageIndex;
  const isActive    = index === stageIndex;
  return (
    <div className={`stage-step ${isCompleted ? 'step-done' : ''} ${isActive ? 'step-active' : ''}`}>
      <div className="step-icon">
        {isCompleted ? <CheckCircle2 size={16} /> : isActive ? <Circle size={16} className="pulse-ring" /> : <Circle size={16} />}
      </div>
      <span className="step-label">{stage}</span>
      {index < INSURANCE_STAGES.length - 1 && (
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
      <span>{duration} elapsed</span>
    </div>
  );
};

const InsuranceDetailDrawer = ({ claim, onClose }) => {
  const userRole          = useStore((s) => s.userRole);
  const updateClaimNotes  = useStore((s) => s.updateClaimNotes);
  const addInsuranceProgressEntry = useStore((s) => s.addInsuranceProgressEntry);
  const advanceInsuranceStage     = useStore((s) => s.advanceInsuranceStage);
  const toggleInsuranceComplete   = useStore((s) => s.toggleInsuranceComplete);

  const { isInsuranceEditor } = getRolePermissions(userRole);

  const [notes, setNotes]           = useState(claim.claimNotes || '');
  const [notesDirty, setNotesDirty] = useState(false);
  const [logInput, setLogInput]     = useState('');
  const [logFocus, setLogFocus]     = useState(false);
  const drawerRef = useRef(null);

  // Sync notes when claim changes
  useEffect(() => {
    setNotes(claim.claimNotes || '');
    setNotesDirty(false);
  }, [claim.id, claim.claimNotes]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSaveNotes = () => {
    updateClaimNotes(claim.id, notes);
    setNotesDirty(false);
  };

  const handleAddLog = () => {
    if (!logInput.trim()) return;
    addInsuranceProgressEntry(claim.id, logInput.trim());
    setLogInput('');
  };

  const handleLogKey = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAddLog();
  };

  const currentStageIdx = INSURANCE_STAGES.indexOf(claim.stage);
  const canAdvance = isInsuranceEditor && currentStageIdx < INSURANCE_STAGES.length - 1;

  const pConfig = PRIORITY_CONFIG[claim.priority] || PRIORITY_CONFIG.Normal;

  return (
    <>
      {/* Backdrop */}
      <div className="drawer-backdrop" onClick={onClose} />

      {/* Drawer panel */}
      <aside className="vehicle-drawer insurance-drawer" ref={drawerRef} role="dialog" aria-modal="true">

        {/* ── Header ── */}
        <div className="drawer-header">
          <div className="drawer-title-group">
            <span className={`priority-badge ${pConfig.color}`}>
              {pConfig.icon} {claim.priority}
            </span>
            <h2 className="drawer-plate">{claim.plate}</h2>
            <p className="drawer-model">{claim.model}</p>
          </div>
          <div className="drawer-header-right">
            <span className={`status-badge ${claim.status === 'Closed' ? 'success' : 'warning'}`}>
              {claim.status === 'Closed' ? 'Closed' : 'Open Claim'}
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
                <span className="detail-info-label">Accident Date</span>
                <span className="detail-info-value">
                  {new Date(claim.accidentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
            <div className="detail-info-item">
              <ShieldAlert size={14} />
              <div>
                <span className="detail-info-label">Provider</span>
                <span className="detail-info-value">{claim.insuranceProvider}</span>
              </div>
            </div>
            <div className="detail-info-item">
              <DollarSign size={14} />
              <div>
                <span className="detail-info-label">Est. Claim Amount</span>
                <span className="detail-info-value">{claim.estimatedCost}</span>
              </div>
            </div>
            <div className="detail-info-item">
              <Activity size={14} />
              <div>
                <span className="detail-info-label">Reference No.</span>
                <span className="detail-info-value" style={{ fontFamily: 'monospace', fontWeight: 600 }}>{claim.claimNumber}</span>
              </div>
            </div>
            <div className="detail-info-item detail-info-full">
              <Clock size={14} />
              <div>
                <span className="detail-info-label">Time Elapsed Since Accident</span>
                <DurationLive startTime={claim.accidentDate} endTime={claim.status === 'Closed' ? new Date().toISOString() : null} />
              </div>
            </div>
          </div>

          {/* Reported Accident Description */}
          <div className="detail-section">
            <div className="detail-section-title">
              <AlertTriangle size={15} />
              Accident & Damage Description
            </div>
            <p className="reported-issue-text">{claim.accidentDescription || 'No accident description details provided.'}</p>
          </div>

          {/* Insurance Stages Stepper */}
          <div className="detail-section">
            <div className="detail-section-title">
              <Flag size={15} />
              Insurance Processing Progress
            </div>
            <div className="stage-tracker">
              {INSURANCE_STAGES.map((stage, i) => (
                <StageStep key={stage} stage={stage} currentStage={claim.stage} index={i} />
              ))}
            </div>
            {canAdvance && (
              <button
                className="advance-stage-btn"
                onClick={() => advanceInsuranceStage(claim.id)}
              >
                <ArrowRight size={15} />
                Advance to "{INSURANCE_STAGES[currentStageIdx + 1]}"
              </button>
            )}
            {isInsuranceEditor && claim.status !== 'Closed' && claim.stage === 'Payout Received' && (
              <button className="complete-btn" onClick={() => { toggleInsuranceComplete(claim.id); onClose(); }}>
                <CheckCircle2 size={15} />
                Close Insurance Case
              </button>
            )}
            {isInsuranceEditor && claim.status === 'Closed' && (
              <button className="reopen-btn" onClick={() => toggleInsuranceComplete(claim.id)}>
                Reopen Claim / Set to Approved
              </button>
            )}
          </div>

          {/* Claims notes */}
          <div className="detail-section">
            <div className="detail-section-title">
              <FileText size={15} />
              Insurance Claim / Technical Notes
              {!isInsuranceEditor && <span className="read-only-badge"><Lock size={11} /> Read Only</span>}
            </div>

            {isInsuranceEditor ? (
              <div className="notes-editor">
                <textarea
                  className="notes-textarea"
                  value={notes}
                  onChange={(e) => { setNotes(e.target.value); setNotesDirty(true); }}
                  placeholder="Add technical insurance notes, surveyor findings, policy coverage details, police file details…"
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
                {claim.claimNotes
                  ? <p>{claim.claimNotes}</p>
                  : <p className="notes-empty">No notes added yet by the Insurance Department.</p>
                }
              </div>
            )}
          </div>

          {/* Progress timeline log */}
          <div className="detail-section">
            <div className="detail-section-title">
              <MessageSquarePlus size={15} />
              Claim Activity Log
            </div>

            {isInsuranceEditor && (
              <div className={`log-input-group ${logFocus ? 'focused' : ''}`}>
                <textarea
                  className="log-input"
                  value={logInput}
                  onChange={(e) => setLogInput(e.target.value)}
                  onKeyDown={handleLogKey}
                  onFocus={() => setLogFocus(true)}
                  onBlur={() => setLogFocus(false)}
                  placeholder="Add a claims activity log update… (Ctrl+Enter to submit)"
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
              {[...claim.progressLog].reverse().map((entry) => (
                <LogEntry key={entry.id} entry={entry} />
              ))}
              {claim.progressLog.length === 0 && (
                <p className="log-empty">No activity records yet.</p>
              )}
            </div>
          </div>

        </div>
      </aside>
    </>
  );
};

export default InsuranceDetailDrawer;
