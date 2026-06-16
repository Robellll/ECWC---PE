import { sql } from './db.js';

/** Roles that receive garage completion alerts: P&E Maintenance Manager + P&E Admin */
export const GARAGE_NOTIFY_ROLES = ['pe_manager', 'pe_admin'];

export function garageCompletionMessage(vehicle) {
  const model = vehicle.model || 'Vehicle';
  const plate = vehicle.plate || '—';
  return `${model} (${plate}) maintenance is completed.`;
}

export async function createGarageCompletionNotifications(vehicle, excludeUserId) {
  const message = garageCompletionMessage(vehicle);
  await sql`
    INSERT INTO notifications (user_id, vehicle_id, type, message)
    SELECT u.id, ${vehicle.id}, 'garage_completed', ${message}
    FROM users u
    WHERE u.role IN ('pe_manager'::user_role, 'pe_admin'::user_role)
      AND u.id != ${excludeUserId}
  `;
}

export function mapNotification(row) {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    type: row.type,
    message: row.message,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}
