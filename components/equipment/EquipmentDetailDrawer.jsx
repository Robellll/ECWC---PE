'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  X, Calendar, User, Lock, FileText, Camera,
  AlertTriangle, Play, HelpCircle, Wrench, ZoomIn,
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import {
  EQUIPMENT_STATUS_OPTIONS,
  EQUIPMENT_CATEGORIES,
  readEquipmentPhoto,
  validateAssetRegisterFields,
  validateStatusReason,
} from '@/lib/equipment-form';
import { typesForCategory } from '@/lib/equipment-register';
import EquipmentStatusReasonBox from '@/components/equipment/EquipmentStatusReasonBox';
import DrawerActionBar from '@/components/ui/DrawerActionBar';
import '@/components/ui/DetailDrawerShell.css';
import './EquipmentDetailDrawer.css';

const STATUS_CONFIG = {
  Operational: { color: 'status-operational', icon: Play, label: 'Operable' },
  'Under Maintenance': { color: 'status-breakdown', icon: Wrench, label: 'Down' },
  Idle: { color: 'status-idle', icon: HelpCircle, label: 'Idle' },
  Breakdown: { color: 'status-breakdown', icon: AlertTriangle, label: 'Down' },
};

function displayStatusLabel(status) {
  if (status === 'Under Maintenance') return 'Down';
  return STATUS_CONFIG[status]?.label || status;
}

function formFromEquipment(equipment) {
  return {
    name: equipment.name || equipment.model || '',
    category: equipment.category || 'Machinery',
    equipmentType: equipment.equipmentType || 'Dozer',
    make: equipment.make || '',
    manufacturingYear: equipment.manufacturingYear ?? '',
    fuelNorm: equipment.fuelNorm ?? '',
    leaseRateHour: equipment.leaseRateHour ?? '',
    plateSerial: equipment.plateSerial || '',
    status: equipment.status === 'Under Maintenance' ? 'Breakdown' : (equipment.status || 'Operational'),
    statusReason: equipment.statusReason || '',
    operatorName: equipment.operatorName || '',
    operatorPhone: equipment.operatorPhone || '',
    capacity: equipment.capacity || '',
    remarks: equipment.remarks || equipment.managerNotes || '',
    photo: equipment.photo || '',
    photoPreview: equipment.photo || '',
    clearPhoto: false,
  };
}

export default function EquipmentDetailDrawer({
  equipment,
  onClose,
  onUpdate,
  canEdit = false,
}) {
  const [form, setForm] = useState(() => formFromEquipment(equipment));
  const [dirty, setDirty] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [error, setError] = useState('');
  const drawerRef = useRef(null);

  const typeOptions = useMemo(
    () => typesForCategory(form.category),
    [form.category],
  );

  useEffect(() => {
    setForm(formFromEquipment(equipment));
    setDirty(false);
    setError('');
  }, [equipment]);

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

  const patch = (updates) => {
    setForm((f) => ({ ...f, ...updates }));
    setDirty(true);
  };

  const setCategory = (category) => {
    const types = typesForCategory(category);
    setForm((f) => ({
      ...f,
      category,
      equipmentType: types.includes(f.equipmentType) ? f.equipmentType : (types[0] || ''),
    }));
    setDirty(true);
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readEquipmentPhoto(file);
      patch({ photo: dataUrl, photoPreview: dataUrl, clearPhoto: false });
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const patchStatus = (status) => {
    setForm((f) => ({
      ...f,
      status,
      statusReason: status === f.status ? f.statusReason : '',
    }));
    setDirty(true);
  };

  const handleSave = async () => {
    setError('');
    const formError = validateAssetRegisterFields({
      assetNo: equipment.code,
      ...form,
    });
    if (formError) {
      setError(formError);
      return;
    }
    const reasonError = validateStatusReason(form.status, form.statusReason);
    if (reasonError) {
      setError(reasonError);
      return;
    }
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        equipmentType: form.equipmentType,
        make: form.make.trim(),
        manufacturingYear: form.manufacturingYear,
        fuelNorm: form.fuelNorm,
        leaseRateHour: form.leaseRateHour,
        plateSerial: form.plateSerial.trim(),
        status: form.status,
        statusReason: form.statusReason.trim(),
        operatorName: form.operatorName.trim(),
        operatorPhone: form.operatorPhone.trim(),
        capacity: form.capacity.trim(),
        remarks: form.remarks.trim(),
      };
      if (form.clearPhoto) payload.clearPhoto = true;
      else if (form.photo && form.photo !== equipment.photo) payload.photo = form.photo;

      const updated = await apiFetch(`/api/equipment/${equipment.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      onUpdate(updated);
      setDirty(false);
    } catch (err) {
      setError(err.message || 'Could not save changes');
    }
  };

  const statusCfg = STATUS_CONFIG[form.status] || STATUS_CONFIG.Operational;
  const StatusIcon = statusCfg.icon;
  const preview = form.photoPreview;

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="detail-drawer-panel equipment-drawer" ref={drawerRef} role="dialog" aria-modal="true">
        <div className="drawer-header">
          <div className="drawer-title-group">
            <span className="equipment-code-badge">{equipment.code}</span>
            <h2 className="drawer-name">{form.name}</h2>
            {(form.category || form.equipmentType) && (
              <span className="equipment-plate-pill">
                {[form.category, form.equipmentType].filter(Boolean).join(' · ')}
              </span>
            )}
          </div>
          <div className="drawer-header-right">
            <span className={`status-badge-indicator ${statusCfg.color}`}>
              <StatusIcon size={14} />
              {displayStatusLabel(form.status)}
            </span>
            <button type="button" className="drawer-close-btn" onClick={onClose} title="Close (Esc)">
              <X size={20} />
            </button>
          </div>
        </div>

        {canEdit && dirty && (
          <DrawerActionBar
            error={error}
            onSave={handleSave}
            saveLabel="Save Changes"
          />
        )}

        <div className="drawer-body">
          {preview ? (
            <button type="button" className="pe-drawer-photo-wrap" onClick={() => setPhotoOpen(true)}>
              <img src={preview} alt={form.name} className="pe-drawer-photo" />
              <span className="pe-drawer-photo-zoom"><ZoomIn size={16} /> View full size</span>
            </button>
          ) : (
            <div className="pe-drawer-photo-placeholder">No photo uploaded</div>
          )}

          <div className="detail-info-grid">
            <div className="detail-info-item">
              <Calendar size={14} className="info-icon" />
              <div>
                <span className="detail-info-label">Registered</span>
                <span className="detail-info-value">
                  {new Date(equipment.registeredDate).toLocaleDateString('en-GB', {
                    day: '2-digit', month: 'short', year: 'numeric',
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

          <div className="drawer-stats-section">
            <h3 className="section-title">Asset Register</h3>

            {canEdit ? (
              <div className="edit-form-fields">
                <div className="drawer-form-group">
                  <label>Asset / Equipment Name</label>
                  <input
                    value={form.name}
                    onChange={(e) => patch({ name: e.target.value })}
                    placeholder="e.g. Bull Dozer (CAT)"
                  />
                </div>

                <div className="drawer-form-row">
                  <div className="drawer-form-group">
                    <label>Category</label>
                    <select value={form.category} onChange={(e) => setCategory(e.target.value)}>
                      {EQUIPMENT_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="drawer-form-group">
                    <label>Equipment Type</label>
                    <select value={form.equipmentType} onChange={(e) => patch({ equipmentType: e.target.value })}>
                      {typeOptions.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="drawer-form-row">
                  <div className="drawer-form-group">
                    <label>Make</label>
                    <input value={form.make} onChange={(e) => patch({ make: e.target.value })} placeholder="CAT" />
                  </div>
                  <div className="drawer-form-group">
                    <label>Manufacturing Year</label>
                    <input type="number" min="1950" max="2100" value={form.manufacturingYear} onChange={(e) => patch({ manufacturingYear: e.target.value })} />
                  </div>
                </div>

                <div className="drawer-form-row">
                  <div className="drawer-form-group">
                    <label>Fuel Norm (L/hr)</label>
                    <input type="number" min="0" step="0.1" value={form.fuelNorm} onChange={(e) => patch({ fuelNorm: e.target.value })} />
                  </div>
                  <div className="drawer-form-group">
                    <label>Lease Rate/Hour (ETB)</label>
                    <input type="number" min="0" step="0.01" value={form.leaseRateHour} onChange={(e) => patch({ leaseRateHour: e.target.value })} />
                  </div>
                </div>

                <div className="drawer-form-group">
                  <label>Status</label>
                  <div className="pe-status-choice pe-status-choice--drawer" role="radiogroup">
                    {EQUIPMENT_STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.group}
                        type="button"
                        role="radio"
                        aria-checked={form.status === opt.uiValue}
                        className={`pe-status-choice-btn pe-status-${opt.group} ${form.status === opt.uiValue ? 'selected' : ''}`}
                        onClick={() => patchStatus(opt.uiValue)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <EquipmentStatusReasonBox
                  status={form.status}
                  value={form.statusReason}
                  onChange={(statusReason) => patch({ statusReason })}
                  id={`equipmentStatusReason-${equipment.id}`}
                />

                <div className="drawer-form-row">
                  <div className="drawer-form-group">
                    <label>Plate / Serial No.</label>
                    <input value={form.plateSerial} onChange={(e) => patch({ plateSerial: e.target.value })} />
                  </div>
                  <div className="drawer-form-group">
                    <label>Capacity / Spec</label>
                    <input value={form.capacity} onChange={(e) => patch({ capacity: e.target.value })} />
                  </div>
                </div>

                <div className="drawer-form-row">
                  <div className="drawer-form-group">
                    <label>Operator Name</label>
                    <input value={form.operatorName} onChange={(e) => patch({ operatorName: e.target.value })} />
                  </div>
                  <div className="drawer-form-group">
                    <label>Operator Phone</label>
                    <input value={form.operatorPhone} onChange={(e) => patch({ operatorPhone: e.target.value })} />
                  </div>
                </div>

                <div className="drawer-form-group">
                  <label>Photo</label>
                  <div className="pe-photo-upload-zone">
                    <input
                      id={`equipmentPhotoEdit-${equipment.id}`}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="photo-input-hidden"
                      onChange={handlePhotoChange}
                    />
                    <label htmlFor={`equipmentPhotoEdit-${equipment.id}`} className="pe-photo-upload-btn">
                      <Camera size={16} />
                      {preview ? 'Change photo' : 'Add photo'}
                    </label>
                    {preview && canEdit && (
                      <button
                        type="button"
                        className="pe-photo-remove-btn"
                        onClick={() => patch({ photo: '', photoPreview: '', clearPhoto: true })}
                      >
                        Remove photo
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="attributes-readonly-grid">
                <div className="attribute-row">
                  <span className="attr-label">Project</span>
                  <span className="attr-val font-semibold">{equipment.project}</span>
                </div>
                <div className="attribute-row">
                  <span className="attr-label">Category</span>
                  <span className="attr-val">{form.category || '—'}</span>
                </div>
                <div className="attribute-row">
                  <span className="attr-label">Equipment Type</span>
                  <span className="attr-val">{form.equipmentType || '—'}</span>
                </div>
                <div className="attribute-row">
                  <span className="attr-label">Make</span>
                  <span className="attr-val">{form.make || '—'}</span>
                </div>
                <div className="attribute-row">
                  <span className="attr-label">Manufacturing Year</span>
                  <span className="attr-val">{form.manufacturingYear || '—'}</span>
                </div>
                <div className="attribute-row">
                  <span className="attr-label">Fuel Norm (L/hr)</span>
                  <span className="attr-val">{form.fuelNorm !== '' && form.fuelNorm != null ? form.fuelNorm : '—'}</span>
                </div>
                <div className="attribute-row">
                  <span className="attr-label">Lease Rate/Hour (ETB)</span>
                  <span className="attr-val">{form.leaseRateHour !== '' && form.leaseRateHour != null ? Number(form.leaseRateHour).toLocaleString() : '—'}</span>
                </div>
                <div className="attribute-row">
                  <span className="attr-label">Status</span>
                  <span className="attr-val">{displayStatusLabel(form.status)}</span>
                </div>
                {form.statusReason && (form.status === 'Idle' || form.status === 'Breakdown') && (
                  <div className="attribute-row pe-status-reason-readonly">
                    <span className="attr-label">{form.status === 'Idle' ? 'Reason for idle' : 'Reason for down'}</span>
                    <span className="attr-val">{form.statusReason}</span>
                  </div>
                )}
                <div className="attribute-row">
                  <span className="attr-label">Plate / Serial</span>
                  <span className="attr-val">{form.plateSerial || '—'}</span>
                </div>
                <div className="attribute-row">
                  <span className="attr-label">Operator</span>
                  <span className="attr-val">
                    {form.operatorName
                      ? <>{form.operatorName}{form.operatorPhone && <> · {form.operatorPhone}</>}</>
                      : '—'}
                  </span>
                </div>
              </div>
            )}

            {!canEdit && (
              <div className="read-only-badge" style={{ marginTop: '0.5rem' }}>
                <Lock size={11} /> Read only
              </div>
            )}
          </div>

          <div className="detail-section">
            <div className="detail-section-title">
              <FileText size={15} />
              Remarks
            </div>
            {canEdit ? (
              <textarea
                className="notes-textarea"
                value={form.remarks}
                onChange={(e) => patch({ remarks: e.target.value })}
                rows={5}
                placeholder="Location on site, sector, assignment notes…"
              />
            ) : (
              <div className="notes-readonly">
                {form.remarks ? <p>{form.remarks}</p> : <p className="notes-empty">No remarks recorded.</p>}
              </div>
            )}
          </div>
        </div>
      </aside>

      {photoOpen && preview && (
        <div className="pe-photo-lightbox" onClick={() => setPhotoOpen(false)}>
          <img src={preview} alt={form.name} />
        </div>
      )}
    </>
  );
}
