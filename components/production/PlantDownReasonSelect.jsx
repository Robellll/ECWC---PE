'use client';

import { PLANT_DOWN_REASONS, requiresPlantDownReason } from '@/lib/production/plant-status';

export default function PlantDownReasonSelect({ value, onChange, id = 'plant-down-reason' }) {
  return (
    <div className="production-down-reason-box">
      <label htmlFor={id}>Down reason</label>
      <select
        id={id}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select reason…</option>
        {PLANT_DOWN_REASONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

export { requiresPlantDownReason };
