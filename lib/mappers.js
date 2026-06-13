const GARAGE_STAGE_TO_UI = {
  received: 'Received',
  under_maintenance: 'Under Maintenance',
  final_inspection: 'Final Inspection',
  completed: 'Completed',
  diagnosing: 'Under Maintenance',
  in_repair: 'Under Maintenance',
  testing: 'Final Inspection',
};

const GARAGE_STAGE_FROM_UI = Object.fromEntries(
  Object.entries(GARAGE_STAGE_TO_UI).map(([k, v]) => [v, k])
);

const INSURANCE_STAGE_TO_UI = {
  reported: 'Reported',
  documents_pending: 'Documents Pending',
  inspection: 'Inspection',
  approved: 'Approved',
  payout_received: 'Payout Received',
  closed: 'Closed',
};

const INSURANCE_STAGE_FROM_UI = Object.fromEntries(
  Object.entries(INSURANCE_STAGE_TO_UI).map(([k, v]) => [v, k])
);

const PRIORITY_TO_UI = { low: 'Low', normal: 'Normal', high: 'High', critical: 'Critical' };
const PRIORITY_FROM_UI = Object.fromEntries(Object.entries(PRIORITY_TO_UI).map(([k, v]) => [v, k]));

const EQUIPMENT_STATUS_TO_UI = {
  operational: 'Operational',
  under_maintenance: 'Under Maintenance',
  idle: 'Idle',
  breakdown: 'Breakdown',
};

const EQUIPMENT_STATUS_FROM_UI = Object.fromEntries(
  Object.entries(EQUIPMENT_STATUS_TO_UI).map(([k, v]) => [v, k])
);

const EQUIPMENT_TYPE_TO_UI = {
  excavator: 'Excavator',
  dozer: 'Dozer',
  dump_truck: 'Dump Truck',
  loader: 'Loader',
  grader: 'Grader',
  roller: 'Roller',
  crane: 'Crane',
  generator: 'Generator',
  concrete_mixer: 'Concrete Mixer',
  plant: 'Plant',
  vehicle: 'Vehicle',
  other: 'Other',
};

const EQUIPMENT_TYPE_FROM_UI = Object.fromEntries(
  Object.entries(EQUIPMENT_TYPE_TO_UI).map(([k, v]) => [v, k])
);

export function mapProject(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    isUnassigned: row.is_unassigned,
    sortOrder: row.sort_order,
  };
}

export function mapContact(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    phone: row.phone || '',
    email: row.email || '',
    role: row.role,
    projectId: row.project_id,
    avatar: row.avatar || row.name?.slice(0, 2).toUpperCase(),
    sortOrder: row.sort_order,
  };
}

export function mapEquipment(row) {
  if (!row) return null;
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    type: EQUIPMENT_TYPE_TO_UI[row.type] || row.type,
    project: row.project_name || 'Idle / Unassigned',
    projectId: row.project_id,
    capacity: row.capacity || 'N/A',
    status: EQUIPMENT_STATUS_TO_UI[row.status] || row.status,
    registeredDate: row.registered_at,
    addedBy: row.added_by_name || '',
    managerNotes: row.manager_notes || '',
  };
}

export function mapGarageVehicle(row, logs = []) {
  if (!row) return null;
  const assigned =
    row.assigned_technician ?? row.technician ?? '';
  return {
    id: row.id,
    plate: row.plate,
    sroNumber: row.sro_number || '',
    model: row.model,
    registeredDate: row.registered_at,
    reportedIssue: row.reported_issue || '',
    managerNotes: row.manager_notes || '',
    workshop: row.workshop || '',
    receivingInspector: row.receiving_inspector || '',
    assignedTechnician: assigned,
    technician: assigned,
    finalInspectionOfficer: row.final_inspection_officer || '',
    priority: PRIORITY_TO_UI[row.priority] || row.priority,
    stage: GARAGE_STAGE_TO_UI[row.stage] || row.stage,
    status: row.status === 'completed' ? 'Completed' : 'In Progress',
    completedDate: row.completed_at,
    progressLog: logs.map(mapProgressLog),
  };
}

export function mapInsuranceClaim(row, logs = []) {
  if (!row) return null;
  return {
    id: row.id,
    plate: row.plate,
    model: row.model,
    accidentDate: row.accident_date,
    accidentDescription: row.accident_description || '',
    claimNumber: row.claim_number,
    insuranceProvider: row.insurance_provider || '',
    estimatedCost: row.estimated_cost || '',
    priority: PRIORITY_TO_UI[row.priority] || row.priority,
    stage: INSURANCE_STAGE_TO_UI[row.stage] || row.stage,
    status: row.status === 'closed' ? 'Closed' : 'Open',
    claimNotes: row.claim_notes || '',
    progressLog: logs.map(mapProgressLog),
  };
}

export function mapProgressLog(row) {
  return {
    id: row.id,
    text: row.text,
    timestamp: row.created_at,
  };
}

export function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    projectId: row.project_id,
    createdAt: row.created_at,
  };
}

export {
  GARAGE_STAGE_FROM_UI,
  INSURANCE_STAGE_FROM_UI,
  PRIORITY_FROM_UI,
  EQUIPMENT_STATUS_FROM_UI,
  EQUIPMENT_TYPE_FROM_UI,
};
