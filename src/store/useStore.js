import { create } from 'zustand';

const STAGES = ['Received', 'Diagnosing', 'In Repair', 'Testing', 'Completed'];

const initialVehicles = [
  {
    id: 'v1',
    plate: 'AA-12345',
    model: 'CAT 320 Excavator',
    registeredDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 - 5 * 60 * 60 * 1000).toISOString(),
    reportedIssue: 'Hydraulic leak on the left arm cylinder — noticed during morning inspection.',
    managerNotes: 'Confirmed hydraulic seal failure on boom cylinder. Ordered replacement seals from supplier. ETA 2 days.',
    technician: 'Dawit Y.',
    priority: 'High',
    stage: 'In Repair',
    status: 'In Progress',
    completedDate: null,
    progressLog: [
      { id: 'l1', text: 'Vehicle received and initial inspection done. Hydraulic system isolated.', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 - 4 * 60 * 60 * 1000).toISOString() },
      { id: 'l2', text: 'Seal failure confirmed on boom cylinder. Parts ordered from Addis Ababa depot.', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
    ],
  },
  {
    id: 'v2',
    plate: 'OR-98765',
    model: 'Volvo Dump Truck',
    registeredDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    reportedIssue: 'Brake pedal feels spongy, vehicle pulling to the left when braking.',
    managerNotes: 'Front brake pads replaced. Rear drums inspected and within tolerance. Test drive passed.',
    technician: 'Helen T.',
    priority: 'Normal',
    stage: 'Completed',
    status: 'Completed',
    completedDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    progressLog: [
      { id: 'l3', text: 'Brake system inspected. Front pads worn to 2mm — below limit.', timestamp: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString() },
      { id: 'l4', text: 'New brake pads installed. Brake fluid bled and topped up.', timestamp: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString() },
      { id: 'l5', text: 'Road test completed. Braking performance confirmed satisfactory. Vehicle cleared.', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
    ],
  },
  {
    id: 'v3',
    plate: 'AA-55555',
    model: 'Komatsu Dozer',
    registeredDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    reportedIssue: 'Engine losing power under load. Black smoke from exhaust. Oil consumption high.',
    managerNotes: 'Full engine overhaul required. Piston rings and cylinder liners worn. Engine disassembled.',
    technician: 'Abebe B.',
    priority: 'Critical',
    stage: 'Diagnosing',
    status: 'In Progress',
    completedDate: null,
    progressLog: [
      { id: 'l6', text: 'Initial diagnostic: compression test failed on cylinders 3 and 4.', timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString() },
      { id: 'l7', text: 'Engine disassembly started. Piston rings severely worn, cylinder liners scored.', timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
    ],
  },
];

const INSURANCE_STAGES_LIST = ['Reported', 'Documents Pending', 'Inspection', 'Approved', 'Payout Received', 'Closed'];

const initialClaims = [
  {
    id: 'c1',
    plate: 'AA-34567',
    model: 'Toyota Hilux Pick-up',
    accidentDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    accidentDescription: 'Side collision on the right door during site transit. No driver injuries reported.',
    claimNumber: 'CLM-2026-102',
    insuranceProvider: 'Nyala Insurance',
    estimatedCost: '120,000 ETB',
    priority: 'Normal',
    stage: 'Inspection',
    status: 'Open',
    claimNotes: 'Surveyor assigned: Helen K. Inspection scheduled for tomorrow morning at the central workshop.',
    progressLog: [
      { id: 'il1', text: 'Accident reported at project site. Police report requested.', timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'il2', text: 'Police report and driver statement submitted to claims department.', timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() },
    ]
  },
  {
    id: 'c2',
    plate: 'OR-78901',
    model: 'Caterpillar Loader',
    accidentDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    accidentDescription: 'Engine compartment fire triggered by electrical short circuit in dry conditions.',
    claimNumber: 'CLM-2026-098',
    insuranceProvider: 'Ethiopian Insurance Corp',
    estimatedCost: '450,000 ETB',
    priority: 'Critical',
    stage: 'Approved',
    status: 'Open',
    claimNotes: 'Claim approved by insurer. Repair parts ordered. Workshop manager Helen T. handling parts clearance.',
    progressLog: [
      { id: 'il3', text: 'Fire incident reported at Adama site. Damage report filed.', timestamp: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'il4', text: 'Insurer surveyor inspected vehicle and engine block.', timestamp: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'il5', text: 'Insurer approved 90% liability. Parts procurement initiated.', timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString() },
    ]
  }
];

const initialEquipments = [
  {
    id: 'eq1',
    code: 'ECWC-EQ-1001',
    name: 'CAT 320D Excavator',
    type: 'Excavator',
    project: 'Grand Ethiopian Renaissance Dam (GERD)',
    capacity: '20 Tons',
    status: 'Operational',
    registeredDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    addedBy: '1.1.1.1 Project Plant & Equipment Administration',
    managerNotes: 'Operational at GERD concrete plant sector.'
  },
  {
    id: 'eq2',
    code: 'ECWC-EQ-2045',
    name: 'Komatsu D275 Dozer',
    type: 'Dozer',
    project: 'Awash-Kombolcha Highway',
    capacity: '320 HP',
    status: 'Operational',
    registeredDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    addedBy: '1.1.1.1 Project Plant & Equipment Administration',
    managerNotes: 'Working on clearing stage 2.'
  },
  {
    id: 'eq3',
    code: 'ECWC-EQ-3082',
    name: 'Volvo FMX Dump Truck',
    type: 'Dump Truck',
    project: 'Grand Ethiopian Renaissance Dam (GERD)',
    capacity: '15 m³',
    status: 'Under Maintenance',
    registeredDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    addedBy: '1.1.1.1 Project Plant & Equipment Administration',
    managerNotes: 'Sent to central workshop for front suspension issues.'
  },
  {
    id: 'eq4',
    code: 'ECWC-EQ-4011',
    name: 'CAT 966H Loader',
    type: 'Loader',
    project: 'Awash-Kombolcha Highway',
    capacity: '4.2 m³',
    status: 'Idle',
    registeredDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    addedBy: 'Super Admin',
    managerNotes: 'Awaiting operator assignment for next shift.'
  }
];

export const useStore = create((set) => ({
  theme: 'light',
  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),

  userRole: 'Super Admin',
  setUserRole: (role) => set({ userRole: role }),

  garageVehicles: initialVehicles,

  addVehicle: (vehicle) =>
    set((state) => ({ garageVehicles: [vehicle, ...state.garageVehicles] })),

  updateVehicle: (id, changes) =>
    set((state) => ({
      garageVehicles: state.garageVehicles.map((v) => (v.id === id ? { ...v, ...changes } : v)),
    })),

  deleteVehicle: (id) =>
    set((state) => ({
      garageVehicles: state.garageVehicles.filter((v) => v.id !== id),
    })),

  updateManagerNotes: (id, notes) =>
    set((state) => ({
      garageVehicles: state.garageVehicles.map((v) =>
        v.id === id ? { ...v, managerNotes: notes } : v
      ),
    })),

  addProgressEntry: (id, text) =>
    set((state) => ({
      garageVehicles: state.garageVehicles.map((v) =>
        v.id === id
          ? {
              ...v,
              progressLog: [
                ...v.progressLog,
                { id: `l${Date.now()}`, text, timestamp: new Date().toISOString() },
              ],
            }
          : v
      ),
    })),

  advanceStage: (id) =>
    set((state) => ({
      garageVehicles: state.garageVehicles.map((v) => {
        if (v.id !== id) return v;
        const currentIdx = STAGES.indexOf(v.stage);
        const nextStage = STAGES[Math.min(currentIdx + 1, STAGES.length - 1)];
        const isCompleted = nextStage === 'Completed';
        return {
          ...v,
          stage: nextStage,
          status: isCompleted ? 'Completed' : 'In Progress',
          completedDate: isCompleted ? new Date().toISOString() : v.completedDate,
        };
      }),
    })),

  toggleComplete: (id) =>
    set((state) => ({
      garageVehicles: state.garageVehicles.map((v) => {
        if (v.id !== id) return v;
        const isCompleted = v.status === 'Completed';
        return {
          ...v,
          status: isCompleted ? 'In Progress' : 'Completed',
          stage: isCompleted ? 'In Repair' : 'Completed',
          completedDate: isCompleted ? null : new Date().toISOString(),
        };
      }),
    })),

  insuranceClaims: initialClaims,

  addInsuranceClaim: (claim) =>
    set((state) => ({ insuranceClaims: [claim, ...state.insuranceClaims] })),

  updateInsuranceClaim: (id, changes) =>
    set((state) => ({
      insuranceClaims: state.insuranceClaims.map((c) => (c.id === id ? { ...c, ...changes } : c)),
    })),

  deleteInsuranceClaim: (id) =>
    set((state) => ({
      insuranceClaims: state.insuranceClaims.filter((c) => c.id !== id),
    })),

  updateClaimNotes: (id, notes) =>
    set((state) => ({
      insuranceClaims: state.insuranceClaims.map((c) =>
        c.id === id ? { ...c, claimNotes: notes } : c
      ),
    })),

  addInsuranceProgressEntry: (id, text) =>
    set((state) => ({
      insuranceClaims: state.insuranceClaims.map((c) =>
        c.id === id
          ? {
              ...c,
              progressLog: [
                ...c.progressLog,
                { id: `il${Date.now()}`, text, timestamp: new Date().toISOString() },
              ],
            }
          : c
      ),
    })),

  advanceInsuranceStage: (id) =>
    set((state) => ({
      insuranceClaims: state.insuranceClaims.map((c) => {
        if (c.id !== id) return c;
        const currentIdx = INSURANCE_STAGES_LIST.indexOf(c.stage);
        const nextStage = INSURANCE_STAGES_LIST[Math.min(currentIdx + 1, INSURANCE_STAGES_LIST.length - 1)];
        const isClosed = nextStage === 'Closed';
        return {
          ...c,
          stage: nextStage,
          status: isClosed ? 'Closed' : 'Open',
        };
      }),
    })),

  toggleInsuranceComplete: (id) =>
    set((state) => ({
      insuranceClaims: state.insuranceClaims.map((c) => {
        if (c.id !== id) return c;
        const isClosed = c.status === 'Closed';
        return {
          ...c,
          status: isClosed ? 'Open' : 'Closed',
          stage: isClosed ? 'Approved' : 'Closed',
        };
      }),
    })),

  equipments: initialEquipments,

  addEquipment: (equipment) =>
    set((state) => ({ equipments: [equipment, ...state.equipments] })),

  addEquipments: (newEquipments) =>
    set((state) => ({ equipments: [...newEquipments, ...state.equipments] })),

  updateEquipment: (id, changes) =>
    set((state) => ({
      equipments: state.equipments.map((eq) => (eq.id === id ? { ...eq, ...changes } : eq)),
    })),

  deleteEquipment: (id) =>
    set((state) => ({
      equipments: state.equipments.filter((eq) => eq.id !== id),
    })),
}));

export const GARAGE_STAGES = STAGES;
export const INSURANCE_STAGES = INSURANCE_STAGES_LIST;

export const getRolePermissions = (role) => {
  const isSuperAdmin = role === 'Super Admin';
  const isCEO = role === '1. CEO';
  const isPEManager = role === '1.1 Plant & Equipment Manager';
  const isPEAdmin = role === '1.1.1 Plant & Equipment Administration';
  const isProjPEAdmin = role === '1.1.1.1 Project Plant & Equipment Administration';
  const isPEMaintenance = role === '1.1.2 Plant & Equipment Maintenance';
  const isProjPEMaintenance = role === '1.1.2.1 Project Plant & Equipment Maintenance';
  const isInsuranceOfficer = role === '1.1.3 Insurance Officer';

  return {
    isSuperAdmin,
    isCEO,
    isPEManager,
    isPEAdmin,
    isProjPEAdmin,
    isPEMaintenance,
    isProjPEMaintenance,
    isInsuranceOfficer,
    // Maintenance operations (garage modifications) allowed for Super Admin & Maintenance roles
    isGarageEditor: isSuperAdmin || isPEMaintenance || isProjPEMaintenance,
    // Executive level dashboard view allowed for Super Admin, CEO & P&E Manager
    isExecutive: isSuperAdmin || isCEO || isPEManager,
    // Project level Admin identifier
    isProjectAdmin: isProjPEAdmin,
    // Insurance operations allowed for Super Admin & Insurance Officer
    isInsuranceEditor: isSuperAdmin || isInsuranceOfficer,
    // Equipment operations (add/edit) allowed for Super Admin, P&E Manager, Central Admin & Project Admin
    isEquipmentEditor: isSuperAdmin || isPEManager || isPEAdmin || isProjPEAdmin,
  };
};
