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
  reported_notified: 'Reported/Notified',
  document_pending: 'Document Pending',
  insurance_inspection: 'Insurance Inspection',
  bid: 'Bid',
  under_maintenance: 'Under Maintenance',
  completed: 'Completed',
  reported: 'Reported/Notified',
  documents_pending: 'Document Pending',
  inspection: 'Insurance Inspection',
  approved: 'Bid',
  payout_received: 'Under Maintenance',
  closed: 'Completed',
};

const ACCIDENT_TYPE_TO_UI = {
  collision: 'Collision',
  rollover: 'Rollover',
  other: 'Other',
};

const ACCIDENT_TYPE_FROM_UI = Object.fromEntries(
  Object.entries(ACCIDENT_TYPE_TO_UI).map(([k, v]) => [v, k]),
);

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

export function mapProject(row, extras = {}) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    isUnassigned: row.is_unassigned,
    sortOrder: row.sort_order,
    garageSiteEmail: row.garage_site_email || '',
    garageEnabled: Boolean(row.garage_enabled),
    inProgressCount: Number(extras.inProgressCount ?? row.in_progress_count ?? 0),
    completedCount: Number(extras.completedCount ?? row.completed_count ?? 0),
    totalJobs: Number(extras.totalJobs ?? row.total_jobs ?? 0),
    adminContact: extras.adminContact ?? null,
    maintenanceContact: extras.maintenanceContact ?? null,
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
  const scope = row.garage_scope === 'project' || row.project_id ? 'project' : 'central';
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
    maintenanceType: row.maintenance_type || '',
    priority: PRIORITY_TO_UI[row.priority] || row.priority,
    stage: GARAGE_STAGE_TO_UI[row.stage] || row.stage,
    status: row.status === 'completed' ? 'Completed' : 'In Progress',
    completedDate: row.completed_at,
    progressLog: logs.map(mapProgressLog),
    projectId: row.project_id || null,
    garageScope: scope,
    siteOperatorName: row.site_operator_name || '',
  };
}

export function mapInsuranceClaim(row, logs = []) {
  if (!row) return null;
  return {
    id: row.id,
    plate: row.plate,
    vehicleType: row.vehicle_type || '',
    projectId: row.project_id,
    projectName: row.project_name || '',
    driverOperator: row.driver_operator || '',
    accidentDate: row.accident_date,
    policeReport: Boolean(row.police_report),
    accidentForm: Boolean(row.accident_form),
    licenseDoc: Boolean(row.license_doc),
    accidentType: ACCIDENT_TYPE_TO_UI[row.accident_type] || row.accident_type || '',
    accidentTypeOther: row.accident_type_other || '',
    accidentDescription: row.accident_description || '',
    accidentPhoto: row.accident_photo || '',
    finalInspectorName: row.final_inspector_name || '',
    compensationAmount: row.compensation_amount != null ? Number(row.compensation_amount) : null,
    stage: INSURANCE_STAGE_TO_UI[row.stage] || row.stage,
    status: row.status === 'closed' ? 'Completed' : 'Open',
    completedDate: row.completed_at,
    claimNotes: row.claim_notes || '',
    repairLocation: row.repair_location || null,
    outsourceGarageName: row.outsource_garage_name || '',
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
  ACCIDENT_TYPE_FROM_UI,
  PRIORITY_FROM_UI,
  EQUIPMENT_STATUS_FROM_UI,
  EQUIPMENT_TYPE_FROM_UI,
};
