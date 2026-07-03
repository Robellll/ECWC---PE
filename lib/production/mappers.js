import { sql } from '@/lib/db.js';
import {
  plantTypeLabel, plantStatusLabel, materialCategoryLabel,
  projectStatusLabel, demandPriorityLabel, demandStatusLabel, shiftLabel,
  demandCompletionPct,
} from './constants.js';

export function mapProdMaterial(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    categoryLabel: materialCategoryLabel(row.category),
    unit: row.unit,
    description: row.description || '',
    minStockLevel: Number(row.min_stock_level),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapProdProject(row, plantIds = []) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    region: row.region || '',
    location: row.location || '',
    client: row.client || '',
    status: row.status,
    statusLabel: projectStatusLabel(row.status),
    startDate: row.start_date,
    endDate: row.end_date,
    plantIds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapProdPlant(row, projectName = '') {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    plantType: row.plant_type,
    plantTypeLabel: plantTypeLabel(row.plant_type),
    capacity: Number(row.capacity),
    unit: row.unit,
    location: row.location || '',
    assignedProjectId: row.assigned_project_id,
    assignedProjectName: projectName || row.project_name || '',
    status: row.status,
    statusLabel: plantStatusLabel(row.status),
    commissionDate: row.commission_date,
    notes: row.notes || '',
    statusChangedAt: row.status_changed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapProdDemand(row) {
  if (!row) return null;
  const requested = Number(row.requested_quantity);
  const produced = Number(row.produced_quantity);
  const remaining = Math.max(0, requested - produced);
  return {
    id: row.id,
    projectId: row.project_id,
    projectName: row.project_name || '',
    materialId: row.material_id,
    materialName: row.material_name || '',
    requestedQuantity: requested,
    unit: row.unit,
    requiredDate: row.required_date,
    priority: row.priority,
    priorityLabel: demandPriorityLabel(row.priority),
    status: row.status,
    statusLabel: demandStatusLabel(row.status),
    producedQuantity: produced,
    remainingQuantity: remaining,
    completionPct: demandCompletionPct(requested, produced),
    remarks: row.remarks || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapProdDaily(row) {
  if (!row) return null;
  return {
    id: row.id,
    productionDate: row.production_date,
    plantId: row.plant_id,
    plantName: row.plant_name || '',
    materialId: row.material_id,
    materialName: row.material_name || '',
    quantityProduced: Number(row.quantity_produced),
    unit: row.unit,
    shift: row.shift,
    shiftLabel: shiftLabel(row.shift),
    operatorName: row.operator_name || '',
    remarks: row.remarks || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapProdDispatch(row) {
  if (!row) return null;
  return {
    id: row.id,
    dispatchDate: row.dispatch_date,
    projectId: row.project_id,
    projectName: row.project_name || '',
    materialId: row.material_id,
    materialName: row.material_name || '',
    quantity: Number(row.quantity),
    unit: row.unit,
    vehicle: row.vehicle || '',
    driverName: row.driver_name || '',
    destination: row.destination || '',
    deliveryNoteNumber: row.delivery_note_number || '',
    remarks: row.remarks || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function logProdAudit(userId, entityType, entityId, action, details = '') {
  await sql`
    INSERT INTO prod_audit_logs (user_id, entity_type, entity_id, action, details)
    VALUES (${userId}, ${entityType}, ${entityId}, ${action}, ${details})
  `;
}
