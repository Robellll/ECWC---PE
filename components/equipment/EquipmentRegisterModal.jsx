'use client';

import { useMemo, useState } from 'react';
import { Camera } from 'lucide-react';
import AppModal, { FormField } from '@/components/ui/AppModal';
import {
  emptyEquipmentForm,
  EQUIPMENT_STATUS_OPTIONS,
  EQUIPMENT_CATEGORIES,
  readEquipmentPhoto,
  validateAssetRegisterFields,
  validateStatusReason,
} from '@/lib/equipment-form';
import { typesForCategory } from '@/lib/equipment-register';
import EquipmentStatusReasonBox from '@/components/equipment/EquipmentStatusReasonBox';

export default function EquipmentRegisterModal({
  open,
  projectName,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(emptyEquipmentForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const typeOptions = useMemo(
    () => typesForCategory(form.category),
    [form.category],
  );

  const setStatus = (status) => {
    setForm((f) => ({
      ...f,
      status,
      statusReason: status === f.status ? f.statusReason : '',
    }));
  };

  const setCategory = (category) => {
    const types = typesForCategory(category);
    setForm((f) => ({
      ...f,
      category,
      equipmentType: types.includes(f.equipmentType) ? f.equipmentType : (types[0] || ''),
    }));
  };

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
    const formError = validateAssetRegisterFields(form);
    if (formError) {
      setError(formError);
      return;
    }
    const reasonError = validateStatusReason(form.status, form.statusReason);
    if (reasonError) {
      setError(reasonError);
      return;
    }
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
        <FormField label="Asset ID">
          <input
            required
            value={form.assetNo}
            onChange={(e) => setForm({ ...form, assetNo: e.target.value })}
            placeholder="e.g. AA-65266"
          />
        </FormField>
        <FormField label="Asset / Equipment Name">
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Bull Dozer (CAT)"
          />
        </FormField>
        <FormField label="Category">
          <select required value={form.category} onChange={(e) => setCategory(e.target.value)}>
            {EQUIPMENT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Equipment Type">
          <select
            required
            value={form.equipmentType}
            onChange={(e) => setForm({ ...form, equipmentType: e.target.value })}
          >
            {typeOptions.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Make">
          <input
            required
            value={form.make}
            onChange={(e) => setForm({ ...form, make: e.target.value })}
            placeholder="e.g. CAT, Komatsu, Toyota"
          />
        </FormField>
        <FormField label="Manufacturing Year">
          <input
            type="number"
            min="1950"
            max="2100"
            value={form.manufacturingYear}
            onChange={(e) => setForm({ ...form, manufacturingYear: e.target.value })}
            placeholder="e.g. 2019"
          />
        </FormField>
        <FormField label="Fuel Norm (L/hr)">
          <input
            type="number"
            min="0"
            step="0.1"
            value={form.fuelNorm}
            onChange={(e) => setForm({ ...form, fuelNorm: e.target.value })}
            placeholder="e.g. 28"
          />
        </FormField>
        <FormField label="Lease Rate/Hour (ETB)">
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.leaseRateHour}
            onChange={(e) => setForm({ ...form, leaseRateHour: e.target.value })}
            placeholder="e.g. 1800"
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
        <EquipmentStatusReasonBox
          status={form.status}
          value={form.statusReason}
          onChange={(statusReason) => setForm((f) => ({ ...f, statusReason }))}
          id="equipmentRegisterStatusReason"
        />
        <FormField label="Plate / Serial No. (optional)">
          <input
            value={form.plateSerial}
            onChange={(e) => setForm({ ...form, plateSerial: e.target.value })}
            placeholder="e.g. AA-3-12345"
          />
        </FormField>
        <FormField label="Capacity / Spec (optional)">
          <input
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            placeholder="e.g. 20 ton, 150 KVA"
          />
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
            placeholder="Location on site, assignment notes…"
          />
        </FormField>
      </div>

      {error && <p className="pe-form-error">{error}</p>}
    </AppModal>
  );
}
