'use client';

import { useState, useEffect, useRef, memo } from 'react';
import {
  X, Clock, AlertTriangle, CheckCircle2, Circle, MessageSquarePlus,
  Save, Lock, FileText, Calendar, Flag, ArrowRight, User, MapPin,
  DollarSign, Trash2, ZoomIn, Loader2, Pencil, ImagePlus,
} from 'lucide-react';
import { INSURANCE_STAGES } from '@/lib/constants';
import { usePermissions } from '@/hooks/usePermissions';
import { apiFetch } from '@/lib/api-client';
import {
  formatCompensation,
  isValidCompensation,
  isValidStaffName,
  INSURANCE_DOC_FIELDS,
  ACCIDENT_TYPES,
  getDaysSinceAccident,
  getDaysSinceTier,
  formatDaysSinceLabel,
  readImageFileAsDataUrl,
  claimToEditForm,
} from '@/lib/insurance';
import './InsuranceDetailDrawer.css';

const StageStep = memo(({ stage, currentStage, index }) => {
  const stageIndex = INSURANCE_STAGES.indexOf(currentStage);
  const isCompleted = index < stageIndex;
  const isActive = index === stageIndex;
  return (
    <div className={`stage-step ${isCompleted ? 'step-done' : ''} ${isActive ? 'step-active' : ''}`}>
      <div className="step-icon">
        {isCompleted ? <CheckCircle2 size={16} /> : isActive ? <Circle size={16} /> : <Circle size={16} />}
      </div>
      <span className="step-label">{stage}</span>
      {index < INSURANCE_STAGES.length - 1 && (
        <div className={`step-connector ${isCompleted ? 'connector-done' : ''}`} />
      )}
    </div>
  );
});
StageStep.displayName = 'StageStep';

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

const DaysSinceDetail = ({ accidentDate, completedDate }) => {
  const days = getDaysSinceAccident(accidentDate, completedDate);
  const tier = getDaysSinceTier(days);
  return (
    <div className="detail-duration">
      <Clock size={14} />
      <span className={`days-since-badge days-since-${tier}`}>
        {formatDaysSinceLabel(days)} since accident
      </span>
    </div>
  );
};

const DrawerDocRow = ({ docs, editable, onToggle }) => (
  <div className="ins-doc-check-row">
    {INSURANCE_DOC_FIELDS.map(({ key, label }) => {
      const checked = Boolean(docs[key]);
      if (editable) {
        return (
          <button
            key={key}
            type="button"
            className={`ins-doc-chip ${checked ? 'checked' : ''}`}
            onClick={() => onToggle(key)}
          >
            <span className="ins-doc-chip-label">{label}</span>
          </button>
        );
      }
      return (
        <span key={key} className={`ins-doc-chip ${checked ? 'checked' : ''} readonly`}>
          <span className="ins-doc-chip-label">{label}</span>
        </span>
      );
    })}
  </div>
);

const InsuranceDetailDrawer = ({ claim, onClose, onUpdate, onDelete }) => {
  const { isInsuranceEditor } = usePermissions();

  const [notes, setNotes] = useState(claim.claimNotes || '');
  const [notesDirty, setNotesDirty] = useState(false);
  const [logInput, setLogInput] = useState('');
  const [logFocus, setLogFocus] = useState(false);
  const [finalInspectorName, setFinalInspectorName] = useState(claim.finalInspectorName || '');
  const [compensationAmount, setCompensationAmount] = useState(
    claim.compensationAmount != null ? String(claim.compensationAmount) : '',
  );
  const [completeError, setCompleteError] = useState('');
  const [photoOpen, setPhotoOpen] = useState(false);
  const [displayStage, setDisplayStage] = useState(claim.stage);
  const [advancing, setAdvancing] = useState(false);
  const [docSaving, setDocSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(() => claimToEditForm(claim));
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [docs, setDocs] = useState({
    policeReport: claim.policeReport,
    accidentForm: claim.accidentForm,
    licenseDoc: claim.licenseDoc,
  });
  const drawerRef = useRef(null);

  // Reset editable fields only when opening a different claim (not on every field update).
  useEffect(() => {
    setNotes(claim.claimNotes || '');
    setNotesDirty(false);
    setFinalInspectorName(claim.finalInspectorName || '');
    setCompensationAmount(claim.compensationAmount != null ? String(claim.compensationAmount) : '');
    setDocs({
      policeReport: claim.policeReport,
      accidentForm: claim.accidentForm,
      licenseDoc: claim.licenseDoc,
    });
    setCompleteError('');
    setDisplayStage(claim.stage);
    setEditing(false);
    setEditForm(claimToEditForm(claim));
    setEditError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync when switching claims only
  }, [claim.id]);

  useEffect(() => {
    setDisplayStage(claim.stage);
  }, [claim.stage]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        if (photoOpen) setPhotoOpen(false);
        else onClose();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose, photoOpen]);

  const handleSaveNotes = async () => {
    const updated = await apiFetch(`/api/insurance-claims/${claim.id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
    onUpdate(updated);
    setNotesDirty(false);
  };

  const handleAddLog = async () => {
    if (!logInput.trim()) return;
    const updated = await apiFetch(`/api/insurance-claims/${claim.id}/progress`, {
      method: 'POST',
      body: JSON.stringify({ text: logInput.trim() }),
    });
    onUpdate(updated);
    setLogInput('');
  };

  const handleAdvance = async () => {
    const nextStage = INSURANCE_STAGES[INSURANCE_STAGES.indexOf(displayStage) + 1];
    if (!nextStage || advancing) return;
    setAdvancing(true);
    setDisplayStage(nextStage);
    try {
      const updated = await apiFetch(`/api/insurance-claims/${claim.id}/advance-stage`, { method: 'POST' });
      onUpdate(updated);
    } catch (err) {
      setDisplayStage(claim.stage);
      setCompleteError(err.message || 'Could not advance stage');
    } finally {
      setAdvancing(false);
    }
  };

  const handleDocToggle = async (field) => {
    if (docSaving) return;
    const prev = { ...docs };
    const next = { ...docs, [field]: !docs[field] };
    setDocs(next);
    setDocSaving(true);
    try {
      const updated = await apiFetch(`/api/insurance-claims/${claim.id}/documents`, {
        method: 'POST',
        body: JSON.stringify({
          policeReport: next.policeReport,
          accidentForm: next.accidentForm,
          licenseDoc: next.licenseDoc,
        }),
      });
      onUpdate(updated);
    } catch {
      setDocs(prev);
    } finally {
      setDocSaving(false);
    }
  };

  const saveCompletionFields = async () => {
    const updated = await apiFetch(`/api/insurance-claims/${claim.id}/completion-fields`, {
      method: 'POST',
      body: JSON.stringify({
        finalInspectorName,
        compensationAmount: compensationAmount === '' ? null : Number(compensationAmount),
      }),
    });
    onUpdate(updated);
  };

  const handleComplete = async () => {
    setCompleteError('');
    try {
      await saveCompletionFields();
      const updated = await apiFetch(`/api/insurance-claims/${claim.id}/toggle-complete`, {
        method: 'POST',
        body: JSON.stringify({
          finalInspectorName,
          compensationAmount: Number(compensationAmount),
        }),
      });
      onUpdate(updated);
    } catch (err) {
      setCompleteError(err.message || 'Could not complete claim');
    }
  };

  const handleReopen = async () => {
    const updated = await apiFetch(`/api/insurance-claims/${claim.id}/toggle-complete`, { method: 'POST' });
    onUpdate(updated);
  };

  const handleStartEdit = () => {
    setEditForm(claimToEditForm(claim));
    setEditError('');
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditForm(claimToEditForm(claim));
    setEditError('');
    setEditing(false);
  };

  const handleEditPhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readImageFileAsDataUrl(file);
      setEditForm((prev) => ({
        ...prev,
        accidentPhoto: dataUrl,
        photoPreview: dataUrl,
        photoChanged: true,
        clearPhoto: false,
      }));
      setEditError('');
    } catch (err) {
      setEditError(err.message);
    }
  };

  const handleRemovePhoto = () => {
    setEditForm((prev) => ({
      ...prev,
      accidentPhoto: null,
      photoPreview: null,
      photoChanged: true,
      clearPhoto: true,
    }));
  };

  const handleSaveRegistration = async () => {
    setEditError('');
    setEditSaving(true);
    try {
      const payload = {
        vehicleType: editForm.vehicleType,
        plate: editForm.plate,
        projectName: editForm.projectName,
        driverOperator: editForm.driverOperator,
        accidentDate: editForm.accidentDate,
        policeReport: editForm.policeReport,
        accidentForm: editForm.accidentForm,
        licenseDoc: editForm.licenseDoc,
        accidentType: editForm.accidentType,
        accidentTypeOther: editForm.accidentTypeOther,
        accidentDescription: editForm.accidentDescription,
        clearPhoto: editForm.clearPhoto,
      };
      if (editForm.photoChanged && !editForm.clearPhoto) {
        payload.accidentPhoto = editForm.accidentPhoto;
      }
      const updated = await apiFetch(`/api/insurance-claims/${claim.id}/registration`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      onUpdate(updated);
      setDocs({
        policeReport: updated.policeReport,
        accidentForm: updated.accidentForm,
        licenseDoc: updated.licenseDoc,
      });
      setEditing(false);
    } catch (err) {
      setEditError(err.message || 'Could not save changes');
    } finally {
      setEditSaving(false);
    }
  };

  const canEditRegistration = isInsuranceEditor && !editing;

  const currentStageIdx = INSURANCE_STAGES.indexOf(displayStage);
  const canAdvance = isInsuranceEditor && !editing && claim.status !== 'Completed' && currentStageIdx < INSURANCE_STAGES.length - 2 && !advancing;
  const atUnderMaintenance = displayStage === 'Under Maintenance';
  const canComplete =
    isInsuranceEditor &&
    claim.status !== 'Completed' &&
    atUnderMaintenance &&
    isValidStaffName(finalInspectorName) &&
    isValidCompensation(compensationAmount);

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />

      <aside className="vehicle-drawer insurance-drawer" ref={drawerRef} role="dialog" aria-modal="true">
        <div className="drawer-header">
          <div className="drawer-title-group">
            <h2 className="drawer-plate">{claim.plate}</h2>
            <p className="drawer-model">{claim.vehicleType}</p>
          </div>
          <div className="drawer-header-right">
            <span className={`status-badge ${claim.status === 'Completed' ? 'success' : 'warning'}`}>
              {claim.status === 'Completed' ? 'Completed' : 'Open'}
            </span>
            {canEditRegistration && (
              <button type="button" className="drawer-edit-btn" onClick={handleStartEdit} title="Edit registration">
                <Pencil size={16} />
              </button>
            )}
            {onDelete && (
              <button type="button" className="drawer-delete-btn" onClick={onDelete} title="Delete claim">
                <Trash2 size={16} />
              </button>
            )}
            <button type="button" className="drawer-close-btn" onClick={onClose} title="Close (Esc)">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="drawer-body">
          {editing ? (
            <div className="ins-registration-edit">
              <div className="detail-section-title ins-edit-title">
                <Pencil size={15} />
                Edit Registration
              </div>
              <div className="ins-edit-grid">
                <div className="ins-edit-field">
                  <label htmlFor="edit-vehicleType">Make &amp; Model</label>
                  <input
                    id="edit-vehicleType"
                    type="text"
                    value={editForm.vehicleType}
                    onChange={(e) => setEditForm({ ...editForm, vehicleType: e.target.value })}
                  />
                </div>
                <div className="ins-edit-field">
                  <label htmlFor="edit-plate">Plate No.</label>
                  <input
                    id="edit-plate"
                    type="text"
                    value={editForm.plate}
                    onChange={(e) => setEditForm({ ...editForm, plate: e.target.value })}
                  />
                </div>
                <div className="ins-edit-field">
                  <label htmlFor="edit-project">Project</label>
                  <input
                    id="edit-project"
                    type="text"
                    value={editForm.projectName}
                    onChange={(e) => setEditForm({ ...editForm, projectName: e.target.value })}
                  />
                </div>
                <div className="ins-edit-field">
                  <label htmlFor="edit-driver">Driver / Operator</label>
                  <input
                    id="edit-driver"
                    type="text"
                    value={editForm.driverOperator}
                    onChange={(e) => setEditForm({ ...editForm, driverOperator: e.target.value })}
                  />
                </div>
                <div className="ins-edit-field">
                  <label htmlFor="edit-accidentDate">Date of Accident</label>
                  <input
                    id="edit-accidentDate"
                    type="date"
                    value={editForm.accidentDate}
                    onChange={(e) => setEditForm({ ...editForm, accidentDate: e.target.value })}
                  />
                </div>
                <div className="ins-edit-field">
                  <label htmlFor="edit-accidentType">Accident Type</label>
                  <select
                    id="edit-accidentType"
                    value={editForm.accidentType}
                    onChange={(e) => setEditForm({ ...editForm, accidentType: e.target.value })}
                  >
                    {ACCIDENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              {editForm.accidentType === 'other' && (
                <div className="ins-edit-field ins-edit-field-full">
                  <label htmlFor="edit-accidentTypeOther">Specify Accident Type</label>
                  <input
                    id="edit-accidentTypeOther"
                    type="text"
                    value={editForm.accidentTypeOther}
                    onChange={(e) => setEditForm({ ...editForm, accidentTypeOther: e.target.value })}
                  />
                </div>
              )}
              <div className="ins-edit-field ins-edit-field-full">
                <span className="ins-edit-label">Documents on File</span>
                <div className="ins-doc-check-row">
                  {INSURANCE_DOC_FIELDS.map(({ key, label }) => (
                    <label key={key} className={`ins-doc-chip ${editForm[key] ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={Boolean(editForm[key])}
                        onChange={() => setEditForm({ ...editForm, [key]: !editForm[key] })}
                      />
                      <span className="ins-doc-chip-label">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="ins-edit-field ins-edit-field-full">
                <label htmlFor="edit-description">Accident Description</label>
                <textarea
                  id="edit-description"
                  rows={4}
                  value={editForm.accidentDescription}
                  onChange={(e) => setEditForm({ ...editForm, accidentDescription: e.target.value })}
                />
              </div>
              <div className="ins-edit-field ins-edit-field-full">
                <span className="ins-edit-label">Accident Photo</span>
                <div className="photo-upload-zone">
                  <input
                    id="edit-accidentPhoto"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleEditPhotoChange}
                    className="photo-input-hidden"
                  />
                  <div className="ins-edit-photo-actions">
                    <label htmlFor="edit-accidentPhoto" className="photo-upload-btn">
                      <ImagePlus size={18} />
                      {editForm.photoPreview ? 'Change photo' : 'Upload photo'}
                    </label>
                    {editForm.photoPreview && (
                      <button type="button" className="ins-remove-photo-btn" onClick={handleRemovePhoto}>
                        Remove photo
                      </button>
                    )}
                  </div>
                  {editForm.photoPreview && (
                    <img src={editForm.photoPreview} alt="Accident preview" className="photo-preview-thumb" />
                  )}
                </div>
              </div>
              {editError && <p className="completion-error">{editError}</p>}
              <div className="ins-edit-actions">
                <button type="button" className="btn-cancel" onClick={handleCancelEdit} disabled={editSaving}>
                  Cancel
                </button>
                <button type="button" className="save-notes-btn" onClick={handleSaveRegistration} disabled={editSaving}>
                  {editSaving ? <Loader2 size={14} className="spin-icon" /> : <Save size={14} />}
                  {editSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            <>
          {claim.accidentPhoto ? (
            <div className="ins-accident-photo-wrap">
              <button type="button" className="ins-accident-photo-btn" onClick={() => setPhotoOpen(true)}>
                <img src={claim.accidentPhoto} alt="Accident scene" className="ins-accident-photo" />
                <span className="ins-photo-zoom-hint"><ZoomIn size={14} /> View full size</span>
              </button>
            </div>
          ) : (
            <div className="ins-accident-photo-placeholder">No accident photo uploaded</div>
          )}

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
              <MapPin size={14} />
              <div>
                <span className="detail-info-label">Project</span>
                <span className="detail-info-value">{claim.projectName}</span>
              </div>
            </div>
            <div className="detail-info-item">
              <User size={14} />
              <div>
                <span className="detail-info-label">Driver / Operator</span>
                <span className="detail-info-value">{claim.driverOperator}</span>
              </div>
            </div>
            <div className="detail-info-item">
              <AlertTriangle size={14} />
              <div>
                <span className="detail-info-label">Accident Type</span>
                <span className="detail-info-value">
                  {claim.accidentType}
                  {claim.accidentType === 'Other' && claim.accidentTypeOther ? ` — ${claim.accidentTypeOther}` : ''}
                </span>
              </div>
            </div>
            <div className="detail-info-item detail-info-full">
              <Clock size={14} />
              <div>
                <span className="detail-info-label">Time Since Accident</span>
                <DaysSinceDetail accidentDate={claim.accidentDate} completedDate={claim.completedDate} />
              </div>
            </div>
          </div>

          <div className="detail-section">
            <div className="detail-section-title">
              <FileText size={15} />
              Documents
              {!isInsuranceEditor && <span className="read-only-badge"><Lock size={11} /> Read Only</span>}
            </div>
            <DrawerDocRow
              docs={isInsuranceEditor && claim.status !== 'Completed' ? docs : claim}
              editable={isInsuranceEditor && claim.status !== 'Completed'}
              onToggle={handleDocToggle}
            />
          </div>

          <div className="detail-section">
            <div className="detail-section-title">
              <AlertTriangle size={15} />
              Accident Description
            </div>
            <p className="reported-issue-text">{claim.accidentDescription || 'No description provided.'}</p>
          </div>
            </>
          )}

          <div className="detail-section">
            <div className="detail-section-title">
              <Flag size={15} />
              Claim Workflow
            </div>
            <div className="stage-tracker">
              {INSURANCE_STAGES.map((stage, i) => (
                <StageStep key={stage} stage={stage} currentStage={displayStage} index={i} />
              ))}
            </div>
            {canAdvance && (
              <button type="button" className="advance-stage-btn" onClick={handleAdvance} disabled={advancing}>
                {advancing ? <Loader2 size={15} className="spin-icon" /> : <ArrowRight size={15} />}
                {advancing ? 'Updating…' : `Advance to "${INSURANCE_STAGES[currentStageIdx + 1]}"`}
              </button>
            )}
          </div>

          {(atUnderMaintenance || claim.status === 'Completed') && (
            <div className="detail-section">
              <div className="detail-section-title">
                <DollarSign size={15} />
                Completion Details
                {!isInsuranceEditor && <span className="read-only-badge"><Lock size={11} /> Read Only</span>}
              </div>
              <div className="completion-fields">
                <div className="completion-field">
                  <label htmlFor="finalInspector">Final Inspector Name</label>
                  {isInsuranceEditor && claim.status !== 'Completed' ? (
                    <input
                      id="finalInspector"
                      type="text"
                      value={finalInspectorName}
                      onChange={(e) => setFinalInspectorName(e.target.value)}
                      onBlur={saveCompletionFields}
                      placeholder="Required before completion"
                    />
                  ) : (
                    <span className="accountability-value">{claim.finalInspectorName || '—'}</span>
                  )}
                </div>
                <div className="completion-field">
                  <label htmlFor="compensation">Compensation Amount (ETB)</label>
                  {isInsuranceEditor && claim.status !== 'Completed' ? (
                    <input
                      id="compensation"
                      type="number"
                      min="0"
                      step="0.01"
                      value={compensationAmount}
                      onChange={(e) => setCompensationAmount(e.target.value)}
                      onBlur={saveCompletionFields}
                      placeholder="Required before completion"
                    />
                  ) : (
                    <span className="accountability-value">{formatCompensation(claim.compensationAmount)}</span>
                  )}
                </div>
              </div>
              {isInsuranceEditor && claim.status !== 'Completed' && atUnderMaintenance && (
                <>
                  {completeError && <p className="completion-error">{completeError}</p>}
                  <button type="button" className="complete-btn" disabled={!canComplete} onClick={handleComplete}>
                    <CheckCircle2 size={15} />
                    Mark as Completed
                  </button>
                </>
              )}
              {isInsuranceEditor && claim.status === 'Completed' && (
                <button type="button" className="reopen-btn" onClick={handleReopen}>
                  Reopen Claim
                </button>
              )}
            </div>
          )}

          <div className="detail-section">
            <div className="detail-section-title">
              <FileText size={15} />
              Notes
              {!isInsuranceEditor && <span className="read-only-badge"><Lock size={11} /> Read Only</span>}
            </div>
            {isInsuranceEditor ? (
              <div className="notes-editor">
                <textarea
                  className="notes-textarea"
                  value={notes}
                  onChange={(e) => { setNotes(e.target.value); setNotesDirty(true); }}
                  placeholder="Insurance notes, surveyor findings, policy details…"
                  rows={4}
                />
                {notesDirty && (
                  <button type="button" className="save-notes-btn" onClick={handleSaveNotes}>
                    <Save size={14} />
                    Save Notes
                  </button>
                )}
              </div>
            ) : (
              <div className="notes-readonly">
                {claim.claimNotes ? <p>{claim.claimNotes}</p> : <p className="notes-empty">No notes yet.</p>}
              </div>
            )}
          </div>

          <div className="detail-section">
            <div className="detail-section-title">
              <MessageSquarePlus size={15} />
              Activity Log
            </div>
            {isInsuranceEditor && (
              <div className={`log-input-group ${logFocus ? 'focused' : ''}`}>
                <textarea
                  className="log-input"
                  value={logInput}
                  onChange={(e) => setLogInput(e.target.value)}
                  onFocus={() => setLogFocus(true)}
                  onBlur={() => setLogFocus(false)}
                  placeholder="Add activity log entry…"
                  rows={2}
                />
                <button type="button" className="add-log-btn" onClick={handleAddLog} disabled={!logInput.trim()}>
                  Add Entry
                </button>
              </div>
            )}
            <div className="log-feed">
              {[...claim.progressLog].reverse().map((entry) => (
                <LogEntry key={entry.id} entry={entry} />
              ))}
              {claim.progressLog.length === 0 && <p className="log-empty">No activity yet.</p>}
            </div>
          </div>
        </div>
      </aside>

      {photoOpen && claim.accidentPhoto && (
        <div className="ins-photo-lightbox" onClick={() => setPhotoOpen(false)} role="dialog" aria-modal="true">
          <button type="button" className="ins-photo-lightbox-close" onClick={() => setPhotoOpen(false)}>
            <X size={24} />
          </button>
          <img src={claim.accidentPhoto} alt="Accident scene full size" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
};

export default InsuranceDetailDrawer;
