/**
 * Central Garage staff directory (ID → name lookup).
 * Source: ECWC maintenance personnel table.
 * IDs are stored with leading zeros; lookup normalizes input.
 */

/** @typedef {{ id: string, name: string, title: string }} GarageStaffMember */

/** @type {GarageStaffMember[]} */
export const GARAGE_STAFF_DIRECTORY = [
  { id: '01824', name: 'Mandefro Ayele', title: 'Mechanic level 3' },
  { id: '04044', name: 'Mulugeta Fikre', title: 'Mechanic level 2' },
  { id: '01519', name: 'Kifle Amtatow', title: 'Mechanic level 2' },
  { id: '07125', name: 'Samuel Teka', title: 'Mechanic level 2' },
  { id: '09021', name: 'Osman Mohammed', title: 'Mechanic level 1' },
  { id: '07548', name: 'Mandefro Desala', title: 'Mechanic level 1' },
  { id: '08876', name: 'Kalamlak Yihun', title: 'Electrician level 3' },
  { id: '01566', name: 'Fikadu Marema', title: 'Mechanic level 3' },
  { id: '02506', name: 'G/Kidan G/Medhin', title: 'Mechanic level 3' },
  { id: '08811', name: 'Takele Aklilu', title: 'Mechanic level 2' },
  { id: '03206', name: 'Solomon Mulugeta', title: 'Mechanic level 4' },
  { id: '04610', name: 'Lemma Assefa', title: 'Mechanic level 2' },
  { id: '01308', name: 'Gebrie Haybaro', title: 'Mechanic level 3' },
  { id: '01395', name: 'Yosef Silas', title: 'Welder level 3' },
  { id: '00180', name: 'Temesgen Tesema', title: 'Mechanic level 3' },
  { id: '00086', name: 'Barecha Ararsa', title: 'Mechanic level 4' },
  { id: '04184', name: 'Shiferaw Argaw', title: 'Mechanic level 3' },
  { id: '07492', name: 'Tewodros Tefera', title: 'Mechanic level 4' },
  { id: '01949', name: 'Abiy Petros', title: 'Mechanic level 4' },
  { id: '05909', name: 'Kebede Ayalew', title: 'Mechanic level 4' },
  { id: '01610', name: 'Jafare Sultan', title: 'Electrician level 3' },
  { id: '01254', name: 'Ayalew Abebe', title: 'Mechanic level 4' },
  { id: '04129', name: 'Mare Meles', title: 'Mechanic level 3' },
  { id: '08074', name: 'Girma Abera', title: 'Electrician level 3' },
  { id: '01388', name: 'Mesfine Hailu', title: 'Electrician level 2' },
  { id: '08565', name: 'Shitaye Asmare', title: 'Mechanic level 1' },
  { id: '08724', name: 'Wendessen Negash', title: 'Mechanic level 1' },
  { id: '00132', name: 'Kebede Mulugata', title: 'Mechanic level 4' },
  { id: '08878', name: 'Mubarek Pawlos', title: 'Electrician level 1' },
  { id: '01188', name: 'Zinash Tobe', title: 'Electrician level 4' },
  { id: '01505', name: 'Efrem Melese', title: 'Electrician level 3' },
  { id: '00142', name: 'Legesse Feyisa', title: 'Electrician level 3' },
  { id: '04447', name: 'Radiya Adem', title: 'Electrician level 3' },
  { id: '00106', name: 'Eyob Wondiwosen', title: 'Electrician level 3' },
  { id: '00147', name: 'Mekasha Shiferaw', title: 'Electrician level 3' },
  { id: '01889', name: 'Tewodros Getachew', title: 'Electrician level 2' },
  { id: '07967', name: 'Simay Gemechu', title: 'Electrician level 2' },
  { id: '08753', name: 'Musa Boreja', title: 'Electrician level 2' },
  { id: '04035', name: 'Masrehet Ayele', title: 'Electrician level 2' },
  { id: '07628', name: 'Jenata Gelana', title: 'Electrician level 2' },
  { id: '08756', name: 'Yadeta Kefalewu', title: 'Electrician level 2' },
  { id: '09041', name: 'Tashu Kebede', title: 'Electrician level 1' },
  { id: '01323', name: 'Marie W/Tinsae', title: 'Electrician level 1' },
  { id: '142501', name: 'Fasilaw Getachew', title: 'Jun. Automotive Officer' },
  { id: '142503', name: 'Yohnas Wale', title: 'Jun. Automotive Officer' },
  { id: '04050', name: 'Sintayehu Abebe', title: 'Mechanic level 4' },
  { id: '01381', name: 'Mesfin Abera', title: 'Mechanic level 3' },
  { id: '01524', name: 'Worku Tarekeyn', title: 'Mechanic level 3' },
  { id: '00167', name: 'Sisay Tsehay', title: 'Mechanic level 3' },
  { id: '07086', name: 'Askel Alemu', title: 'Electrician level 2' },
  { id: '03897', name: 'Yilma Nigatu', title: 'Mechanic level 1' },
  { id: '01919', name: 'Afework G/karnuelik', title: 'Mechanic level 4' },
  { id: '00061', name: 'Daniel Tsegaye', title: 'Mechanic level 4' },
  { id: '01265', name: 'Mesfin Tesfaye', title: 'Mechanic level 4' },
  { id: '06151', name: 'Tewodros Bekele', title: 'Mechanic level 2' },
  { id: '08798', name: 'Marshet Yesak', title: 'Electrician level 2' },
  { id: '01120', name: 'Nebiyu Getachew', title: 'Body Technician Level 3' },
  { id: '04008', name: 'Gelashe Jaleta', title: 'Mechanic level 3' },
  { id: '07801', name: 'Dawit Asfawke', title: 'Electrician level 3' },
  { id: '08814', name: 'Abone Abdisa', title: 'Mechanic level 2' },
  // Source list also showed Dawit Hailu under the same ID 01611 — kept first match (Fikadu).
  { id: '01611', name: 'Fikadu Getachew', title: 'Mechanic level 2' },
  { id: '00074', name: 'Bekrie Entisarh', title: 'Equipment service person level 2' },
  { id: '00113', name: 'Lontia Kebede', title: 'Equipment service person level 2' },
  { id: '06448', name: 'Abayeneh Admasu', title: 'Equipment service person level 2' },
  { id: '09031', name: 'Shiferaw Dasne', title: 'Equipment service person level 1' },
  { id: '04225', name: 'Teshome Shifi', title: 'Equipment service person level 1' },
  { id: '00128', name: 'Ibrahim Seid', title: 'Equipment service person level 1' },
  { id: '07241', name: 'Mesfin G/mhedhin', title: 'Equipment service person level 1' },
  { id: '00341', name: 'Ayalew Amie', title: 'Tyre Repairman level 1' },
  { id: '01350', name: 'Getu Seim', title: 'Mechanic Level 4' },
  { id: '07547', name: 'Getachew Worku', title: 'Mechanic Level 3' },
  { id: '06199', name: 'Biruwas Nigusie', title: 'Mechanic Level 4' },
  { id: '04611', name: 'Triye Nigatu', title: 'Mechanic Level 3' },
  { id: '01622', name: 'Kemal Belainhe', title: 'Mechanic Level 3' },
  { id: '01522', name: 'Mohamed Usman', title: 'Mechanic level 2' },
  { id: '08781', name: 'Mullu Wolde', title: 'Electrician Level 3' },
  { id: '00194', name: 'Yoseph Adaneu', title: 'Mechanic Level 3' },
  { id: '00189', name: 'Tesaye Tesew', title: 'Mechanic Level 3' },
  { id: '04449', name: 'Amareh Teila', title: 'Mechanic Level 3' },
  { id: '01369', name: 'Aregash Abebe', title: 'Mechanic Level 3' },
  { id: '08719', name: 'Ephrem Asefa', title: 'Mechanic Level 3' },
  { id: '03880', name: 'Umer Ahmed', title: 'Mechanic Level 3' },
  { id: '04434', name: 'Tewodroos Kasone', title: 'Mechanic Level 3' },
  { id: '01320', name: 'Tesman Shakur', title: 'Body Technician Level 3' },
  { id: '00066', name: 'Ayegelew Aregaw', title: 'Body Technician Level 3' },
  { id: '01352', name: 'Hussen Arega', title: 'Body painter Level 3' },
  { id: '01428', name: 'Tewodros Desese', title: 'Upholstery Man Level 3' },
  { id: '01151', name: 'Mekalu Dereje', title: 'Welder Level 3' },
  { id: '01185', name: 'Tewonmdre Girma', title: 'Body Technician Level 3' },
  { id: '06381', name: 'Jiru Hailu', title: 'Body Technician Level 3' },
  { id: '09016', name: 'Arega Tesew', title: 'Body painter Level 1' },
  { id: '06228', name: 'Derje Admasu', title: 'Body Technician Level 3' },
  { id: '01528', name: 'Workue Gashe', title: 'Welder Level 3' },
  { id: '07597', name: 'Solomon Wondimu', title: 'Body painter Level 2' },
  { id: '00159', name: 'Nefise Mumu', title: 'Body Technician Level 3' },
  { id: '00115', name: 'Meaza Mulugeta', title: 'Body Technician Level 3' },
  { id: '01511', name: 'Solomon Belahu', title: 'Body Technician Level 3' },
  { id: '07611', name: 'Awoke Kefile', title: 'Body Technician Level 3' },
  { id: '00097', name: 'Endale Muguu', title: 'Body painter Level 3' },
  { id: '04033', name: 'Tesfaye Zendek', title: 'Welder Level 3' },
  { id: '04007', name: 'Ashenafi Tesmre', title: 'Equipment service person level 1' },
  { id: '132094', name: 'Siyum Melkonen', title: 'Welder level 2' },
  { id: '142510', name: 'Tashu Balew', title: 'Junior Auto Mech Officer level 2' },
  { id: '142511', name: 'Charnet Decta', title: 'Junior Auto Mech Officer level 2' },
  { id: '136756', name: 'Wendimu Bizhanu', title: 'Body Technician Level 1' },
  { id: '136761', name: 'Alshaga Aberra', title: 'Body Technician Level 1' },
  { id: '136755', name: 'Enguaga Mokesu', title: 'Body Technician Level 1' },
  { id: '136757', name: 'Sintayehu H/gebreal', title: 'Body Technician Level 1' },
  { id: '136869', name: 'Yenu Seyfu', title: 'Body Technician Level 1' },
  { id: '136758', name: 'Esubalew Aires', title: 'Body Technician Level 1' },
  { id: '00080', name: 'Bogale Tesfaye', title: 'Mechanic Level 3' },
  { id: '06191', name: 'Workineh Dereje', title: 'Mechanic Level 4' },
  { id: '01192', name: 'Fasil Assefa', title: 'Mechanic Level 4' },
  { id: '01973', name: 'Ahmed Kemal', title: 'Mechanic Level 3' },
  { id: '09045', name: 'Banahabubek Wondim', title: 'Mechanic Level 3' },
  { id: '02516', name: 'Million Bekele', title: 'Mechanic Level 2' },
  { id: '04322', name: 'Endale Bekele', title: 'Mechanic Level 3' },
  { id: '09018', name: 'Dereje Demisew', title: 'Mechanic Level 3' },
  { id: '08829', name: 'Aberar Samuel', title: 'Mechanic Level 3' },
  { id: '01526', name: 'Gurba Belay', title: 'Electrician Level 3' },
  { id: '01407', name: 'Temes Tesfaye', title: 'Electrician Level 3' },
  { id: '03803', name: 'Davit Birhanu', title: 'Mechanic Level 3' },
  { id: '01447', name: 'Ayalew H/Mariam', title: 'Mechanic Level 4' },
  { id: '07574', name: 'Samuel Negash', title: 'Mechanic Level 3' },
  { id: '00051', name: 'Aklilu H/Mariam', title: 'Mechanic Level 3' },
  { id: '142504', name: 'Fantahun Kinde', title: 'Jun. Automotive Officer' },
  { id: '142500', name: 'Abrham Atnafu', title: 'Jun. Automotive Officer' },
  { id: '142502', name: 'Gashaw Kasa', title: 'Jun. Automotive Officer' },
  { id: '142509', name: 'Shegaye Adane', title: 'Jun. Automotive Officer' },
];

/** Normalize ID for lookup: digits only, strip leading zeros (keep "0" if all zeros). */
export function normalizeStaffId(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (!digits) return '';
  const stripped = digits.replace(/^0+/, '');
  return stripped || '0';
}

export function normalizeStaffName(raw) {
  return String(raw ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Active lookup directory — starts as seed list; can be replaced from DB. */
let activeDirectory = [...GARAGE_STAFF_DIRECTORY];
const byNormalizedId = new Map();
const byNormalizedName = new Map();

function rebuildLookupMaps(members) {
  byNormalizedId.clear();
  byNormalizedName.clear();
  for (const member of members) {
    const idKey = normalizeStaffId(member.id);
    if (idKey && !byNormalizedId.has(idKey)) {
      byNormalizedId.set(idKey, member);
    }
    const nameKey = normalizeStaffName(member.name);
    if (nameKey && !byNormalizedName.has(nameKey)) {
      byNormalizedName.set(nameKey, member);
    }
  }
}

rebuildLookupMaps(activeDirectory);

export function getActiveStaffDirectory() {
  return activeDirectory;
}

/** Replace in-memory directory (e.g. after loading manpower_staff from DB). */
export function setActiveStaffDirectory(members) {
  if (!Array.isArray(members) || members.length === 0) return activeDirectory;
  activeDirectory = members.map((m) => ({
    id: String(m.id || m.employeeId || '').trim(),
    name: String(m.name || m.fullName || '').trim(),
    title: String(m.title || m.jobTitle || '').trim(),
  })).filter((m) => m.id && m.name);
  rebuildLookupMaps(activeDirectory);
  return activeDirectory;
}

export function findGarageStaffById(rawId) {
  const key = normalizeStaffId(rawId);
  if (!key) return null;
  return byNormalizedId.get(key) || null;
}

export function findGarageStaffByName(rawName) {
  const key = normalizeStaffName(rawName);
  if (!key) return null;
  if (byNormalizedName.has(key)) return byNormalizedName.get(key);

  const stripped = key
    .replace(/\b(?:m\.?\s*l\.?\s*\d+|elt\.?\s*l?\s*\d+|mechanic|electrician|tyre\s*man|level\s*\d+|l\d+)\b/g, ' ')
    .replace(/[./]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (stripped && stripped !== key && byNormalizedName.has(stripped)) {
    return byNormalizedName.get(stripped);
  }

  const first = (stripped || key).split(' ')[0];
  if (first && first.length >= 3) {
    const matches = activeDirectory.filter(
      (m) => normalizeStaffName(m.name).split(' ')[0] === first,
    );
    if (matches.length === 1) return matches[0];
  }

  return null;
}

/** Stored display: "Full Name (ID)" */
export function formatStaffDisplay(member) {
  if (!member) return '';
  return `${member.name} (${member.id})`;
}

/** Parse ID from a stored "Name (ID)" string, if present. */
export function parseStaffIdFromDisplay(value) {
  if (!value || typeof value !== 'string') return '';
  const match = value.trim().match(/\((\d+)\)\s*$/);
  return match ? match[1] : '';
}

function isDigitsOnlyStaffValue(value) {
  return /^\d+$/.test(String(value ?? '').trim());
}

/**
 * Resolve any legacy staff value (ID-only, name-only, or Name (ID))
 * into "Full Name (ID)" when the person exists in the directory.
 * Unmatched values are returned trimmed as-is.
 */
export function resolveStaffDisplay(raw) {
  if (raw == null) return '';
  const value = String(raw).trim();
  if (!value) return '';

  const idFromParens = parseStaffIdFromDisplay(value);
  if (idFromParens) {
    const byId = findGarageStaffById(idFromParens);
    if (byId) return formatStaffDisplay(byId);
    return value;
  }

  if (isDigitsOnlyStaffValue(value)) {
    const byId = findGarageStaffById(value);
    if (byId) return formatStaffDisplay(byId);
    return value;
  }

  const byName = findGarageStaffByName(value);
  if (byName) return formatStaffDisplay(byName);

  return value;
}

/**
 * Split legacy technician fields into people.
 * Older completed records used commas (and sometimes & / ;);
 * newer ones use newlines.
 */
export function splitStaffEntries(raw) {
  if (raw == null) return [];
  const text = String(raw).trim();
  if (!text) return [];

  // Already "Name (ID)" — keep as one entry even if commas appear elsewhere.
  if (/^.+\(\d+\)\s*$/.test(text) && !/[,\n;&]/.test(text.replace(/\(\d+\)\s*$/, ''))) {
    return [text];
  }

  // Mixed legacy: "Name (ID), Name (ID)" or "id1, id2" or "name1, name2"
  return text
    .split(/[\n;,]+|\s+&\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Resolve assigned_technician (comma / newline / & separated) into Name (ID) lines. */
export function resolveAssignedTechniciansField(raw) {
  if (raw == null) return '';
  const parts = splitStaffEntries(raw);
  if (parts.length === 0) return '';
  return parts
    .map((part) => resolveStaffDisplay(part))
    .filter(Boolean)
    .join('\n');
}
