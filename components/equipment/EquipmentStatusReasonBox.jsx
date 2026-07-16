'use client';

import { AlertCircle } from 'lucide-react';
import {
  requiresStatusReason,
  statusReasonLabel,
  statusReasonPlaceholder,
} from '@/lib/equipment-form';

export default function EquipmentStatusReasonBox({
  status,
  value,
  onChange,
  id,
  className = '',
}) {
  if (!requiresStatusReason(status)) return null;

  return (
    <div className={`pe-status-reason-box ${className}`.trim()}>
      <div className="pe-status-reason-header">
        <AlertCircle size={16} aria-hidden="true" />
        <label htmlFor={id}>{statusReasonLabel(status)}</label>
      </div>
      <textarea
        id={id}
        required
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={statusReasonPlaceholder(status)}
        className="pe-status-reason-input"
      />
      <p className="pe-status-reason-hint">Required when status is Idle or Down.</p>
    </div>
  );
}
