'use client';

import { useState } from 'react';
import { Camera } from 'lucide-react';
import AppModal, { FormField } from '@/components/ui/AppModal';
import {
  emptyEquipmentForm,
  EQUIPMENT_STATUS_OPTIONS,
  readEquipmentPhoto,
} from '@/lib/equipment-form';

export default function EquipmentRegisterModal({
  open,
  projectName,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(emptyEquipmentForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const setStatus = (status) => setForm((f) => ({ ...f, status }));

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readEquipmentPhoto(file);
      setForm((f) => ({ ...f, photo: dataUrl, photoPreview: dataUrl }));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSubmit(form);
      setForm(emptyEquipmentForm());
      onClose();
    } catch (err) {
      setError(err.message || 'Could not register equipment');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setForm(emptyEquipmentForm());
    setError('');
    onClose();
  };

  return (
    <AppModal
      open={open}
      title={`Register Equipment — ${projectName}`}
      onClose={handleClose}
      onSubmit={handleSubmit}
      submitLabel={saving ? 'Registering…' : 'Register Equipment'}
      submitDisabled={saving}
      large
    >
      <div className="production-form-grid">
        <FormField label="Asset No.">
          <input
            required
            value={form.assetNo}
            onChange={(e) => setForm({ ...form, assetNo: e.target.value })}
            placeholder="e.g. ECWC-AST-00421"
          />
        </FormField>
        <FormField label="Plate / Serial No.">
          <input
            required
            value={form.plateSerial}
            onChange={(e) => setForm({ ...form, plateSerial: e.target.value })}
            placeholder="e.g. AA-3-12345 or chassis serial"
          />
        </FormField>
        <FormField label="Vehicle / Equipment Model" full>
          <input
            required
            value={form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
            placeholder="e.g. CAT 320D Excavator"
          />
        </FormField>
        <FormField label="Current Status" full>
          <div className="pe-status-choice" role="radiogroup" aria-label="Equipment status">
            {EQUIPMENT_STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.group}
                type="button"
                role="radio"
                aria-checked={form.status === opt.uiValue}
                className={`pe-status-choice-btn pe-status-${opt.group} ${form.status === opt.uiValue ? 'selected' : ''}`}
                onClick={() => setStatus(opt.uiValue)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </FormField>
        <FormField label="Operator Name (optional)">
          <input
            value={form.operatorName}
            onChange={(e) => setForm({ ...form, operatorName: e.target.value })}
            placeholder="e.g. Abebe Kebede"
          />
        </FormField>
        <FormField label="Operator Phone (optional)">
          <input
            value={form.operatorPhone}
            onChange={(e) => setForm({ ...form, operatorPhone: e.target.value })}
            placeholder="e.g. 0911 234 567"
          />
        </FormField>
        <FormField label="Capacity / Specification (optional)">
          <input
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            placeholder="e.g. 20 ton, 1.2 m³, 320 HP"
          />
        </FormField>
        <FormField label="Equipment Photo (optional)" full>
          <div className="pe-photo-upload-zone">
            <input
              id="equipmentPhoto"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="photo-input-hidden"
              onChange={handlePhotoChange}
            />
            <label htmlFor="equipmentPhoto" className="pe-photo-upload-btn">
              <Camera size={16} />
              {form.photoPreview ? 'Change photo' : 'Add photo (max 2 MB)'}
            </label>
            {form.photoPreview && (
              <img src={form.photoPreview} alt="Equipment preview" className="pe-photo-preview" />
            )}
          </div>
        </FormField>
        <FormField label="Remarks (optional)" full>
          <textarea
            rows={3}
            value={form.remarks}
            onChange={(e) => setForm({ ...form, remarks: e.target.value })}
            placeholder="e.g. Sector 12, chainage 4+200, night shift"
          />
        </FormField>
      </div>

      {error && <p className="pe-form-error">{error}</p>}
    </AppModal>
  );
}
