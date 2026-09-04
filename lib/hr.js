/** HR employee master data: normalization + dashboard aggregation. */

export const WORKFORCES = ['head_office', 'project'];

export const WORKFORCE_LABELS = {
  head_office: 'Head Office',
  project: 'Projects',
};

const MINOR_WORDS = new Set(['and', 'of', 'the', 'in', 'for', 'to', '&']);

const ROMAN_NUMERALS = new Set(['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x']);

export function cleanText(value) {
  return String(value ?? '')
    .replace(/^'+/, '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Title-case a label while keeping separators (hyphen, slash, ampersand) intact,
 * so "HALABA-ANGACHA-WATO & DAMBOYA" becomes "Halaba-Angacha-Wato & Damboya".
 */
export function titleCase(value) {
  const text = cleanText(value);
  if (!text) return '';
  const hasLower = /[a-z]/.test(text);
  let wordIndex = -1;

  return text
    .split(/([^A-Za-z0-9']+)/)
    .map((token) => {
      if (!token || /^[^A-Za-z0-9']+$/.test(token)) return token;
      wordIndex += 1;
      if (/\d/.test(token)) return token;
      if (hasLower && token.length <= 2 && token === token.toUpperCase()) return token;
      const lower = token.toLowerCase();
      if (ROMAN_NUMERALS.has(lower)) return lower.toUpperCase();
      if (wordIndex > 0 && MINOR_WORDS.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');
}

/** Display spelling for a job title: consistent "Level N" and "Dump Truck" wording. */
export function canonicalJobTitle(value) {
  return titleCase(value)
    .replace(/\b(Lev|Lvl)\b\.?/gi, 'Level')
    .replace(/\bLevel\s*\.?\s*-?\s*(\d)/gi, 'Level $1')
    .replace(/\bDum(p)?\s*truck\b/gi, 'Dump Truck')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeSex(value) {
  const text = cleanText(value).toUpperCase();
  if (text.startsWith('M')) return 'M';
  if (text.startsWith('F')) return 'F';
  return '';
}

export function sexLabel(value) {
  if (value === 'M') return 'Male';
  if (value === 'F') return 'Female';
  return 'Unspecified';
}

export function normalizeEmployeeType(value) {
  const text = cleanText(value).toLowerCase().replace(/[^a-z]/g, '');
  if (!text) return '';
  if (text.startsWith('per')) return 'Permanent';
  if (text.startsWith('con')) return 'Contract';
  if (text.startsWith('tem')) return 'Temporary';
  return titleCase(value);
}

const ROMAN_TO_DIGIT = {
  i: '1', ii: '2', iii: '3', iv: '4', v: '5', vi: '6', vii: '7', viii: '8',
};

/**
 * Grouping key for job titles. The workbooks spell the same role many ways
 * (Level.3 / LEV 3 / level -3, Dumptruck / Dum Truck, Driver I / Driver Level 1),
 * so the level wording is dropped and roman numerals become digits.
 */
export function jobTitleKey(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/dum(p)?\s*truck/g, 'dumptruck')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\b(lev|level|lvl)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((word) => ROMAN_TO_DIGIT[word] || word)
    .join(' ')
    .trim();
}

export function parseAmount(value) {
  if (value == null || value === '') return null;
  const n = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

export function mapHrEmployee(row) {
  if (!row) return null;
  return {
    id: row.id,
    workforce: row.workforce,
    workforceLabel: WORKFORCE_LABELS[row.workforce] || row.workforce,
    employeeNo: row.employee_no || '',
    fullName: row.full_name || '',
    sex: row.sex || '',
    sexLabel: sexLabel(row.sex),
    jobTitle: row.job_title || '',
    grade: row.grade || '',
    salary: row.salary == null ? null : Number(row.salary),
    desertAllowance: row.desert_allowance == null ? null : Number(row.desert_allowance),
    foodAllowance: row.food_allowance == null ? null : Number(row.food_allowance),
    totalPay: row.total_pay == null ? null : Number(row.total_pay),
    department: row.department || '',
    workLocation: row.work_location || '',
    employeeType: row.employee_type || '',
    isActive: row.is_active !== false,
  };
}

export const EMPLOYEE_TYPES = ['Permanent', 'Contract', 'Temporary'];

/**
 * Clean and validate an employee submitted from the HR forms. Project staff
 * carry allowances, so their total pay is salary plus both allowances.
 */
export function normalizeHrEmployeeInput(input = {}, workforce) {
  const fullName = titleCase(input.fullName);
  if (!fullName) return { error: 'Full name is required' };
  if (!WORKFORCES.includes(workforce)) return { error: 'Invalid workforce' };

  const salary = parseAmount(input.salary);
  const isProject = workforce === 'project';
  const desertAllowance = isProject ? parseAmount(input.desertAllowance) : null;
  const foodAllowance = isProject ? parseAmount(input.foodAllowance) : null;

  for (const [label, amount] of [
    ['Salary', salary],
    ['Desert allowance', desertAllowance],
    ['Food allowance', foodAllowance],
  ]) {
    if (amount != null && amount < 0) return { error: `${label} cannot be negative` };
  }

  const jobTitle = canonicalJobTitle(input.jobTitle);
  const totalPay = isProject
    ? Math.round(((salary || 0) + (desertAllowance || 0) + (foodAllowance || 0)) * 100) / 100
    : salary;

  return {
    data: {
      workforce,
      employeeNo: cleanText(input.employeeNo),
      fullName,
      sex: normalizeSex(input.sex),
      jobTitle,
      jobTitleKey: jobTitleKey(jobTitle),
      grade: cleanText(input.grade).toUpperCase(),
      salary,
      desertAllowance,
      foodAllowance,
      totalPay,
      department: isProject ? '' : titleCase(input.department),
      workLocation: isProject ? titleCase(input.workLocation) : 'Head Office',
      employeeType: normalizeEmployeeType(input.employeeType),
    },
  };
}

const SALARY_BANDS = [
  { label: 'Under 10K', min: 0, max: 10000 },
  { label: '10K – 15K', min: 10000, max: 15000 },
  { label: '15K – 20K', min: 15000, max: 20000 },
  { label: '20K – 25K', min: 20000, max: 25000 },
  { label: '25K – 30K', min: 25000, max: 30000 },
  { label: '30K and above', min: 30000, max: Infinity },
];

function countBy(rows, getKey) {
  const map = new Map();
  rows.forEach((row) => {
    const key = getKey(row);
    if (!key) return;
    map.set(key, (map.get(key) || 0) + 1);
  });
  return map;
}

function toSeries(map, { limit } = {}) {
  const list = [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  return limit ? list.slice(0, limit) : list;
}

function sum(rows, pick) {
  return rows.reduce((acc, row) => acc + (Number(pick(row)) || 0), 0);
}

function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

/** Build every figure the HR dashboard needs from raw employee rows. */
export function buildHrDashboard(rows) {
  const people = rows.map(mapHrEmployee);
  const headOffice = people.filter((p) => p.workforce === 'head_office');
  const projects = people.filter((p) => p.workforce === 'project');

  const female = people.filter((p) => p.sex === 'F').length;
  const male = people.filter((p) => p.sex === 'M').length;
  const permanent = people.filter((p) => p.employeeType === 'Permanent').length;
  const contract = people.filter((p) => p.employeeType === 'Contract').length;

  const basePayroll = sum(people, (p) => p.salary);
  const grossPayroll = sum(people, (p) => (p.totalPay != null ? p.totalPay : p.salary));
  const allowances = sum(people, (p) => (p.desertAllowance || 0) + (p.foodAllowance || 0));
  const withSalary = people.filter((p) => p.salary != null);

  // Group spelling variants together, then label each group with its most
  // common wording so the chart shows a title people recognise.
  const jobTitleMap = new Map();
  people.forEach((p) => {
    if (!p.jobTitle) return;
    const key = jobTitleKey(p.jobTitle);
    const group = jobTitleMap.get(key) || { value: 0, labels: new Map() };
    group.value += 1;
    group.labels.set(p.jobTitle, (group.labels.get(p.jobTitle) || 0) + 1);
    jobTitleMap.set(key, group);
  });

  const jobTitleSeries = [...jobTitleMap.values()]
    .map((group) => ({
      label: [...group.labels.entries()].sort((a, b) => b[1] - a[1])[0][0],
      value: group.value,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const salaryBands = SALARY_BANDS.map((band) => ({
    label: band.label,
    value: withSalary.filter((p) => p.salary >= band.min && p.salary < band.max).length,
  })).filter((band) => band.value > 0);

  const genderSeries = [
    { label: 'Male', value: male },
    { label: 'Female', value: female },
    { label: 'Unspecified', value: people.length - male - female },
  ].filter((item) => item.value > 0);

  const typeSeries = toSeries(countBy(people, (p) => p.employeeType || 'Unspecified'));

  const departmentPayroll = new Map();
  headOffice.forEach((p) => {
    if (!p.department) return;
    const current = departmentPayroll.get(p.department) || { label: p.department, value: 0, payroll: 0 };
    current.value += 1;
    current.payroll += Number(p.totalPay ?? p.salary ?? 0);
    departmentPayroll.set(p.department, current);
  });

  const locationPayroll = new Map();
  projects.forEach((p) => {
    if (!p.workLocation) return;
    const current = locationPayroll.get(p.workLocation)
      || { label: p.workLocation, value: 0, payroll: 0 };
    current.value += 1;
    current.payroll += Number(p.totalPay ?? p.salary ?? 0);
    locationPayroll.set(p.workLocation, current);
  });

  return {
    kpis: {
      total: people.length,
      headOffice: headOffice.length,
      project: projects.length,
      male,
      female,
      femalePct: people.length ? round2((female / people.length) * 100) : 0,
      permanent,
      contract,
      permanentPct: people.length ? round2((permanent / people.length) * 100) : 0,
      basePayroll: round2(basePayroll),
      grossPayroll: round2(grossPayroll),
      allowances: round2(allowances),
      avgSalary: withSalary.length ? round2(basePayroll / withSalary.length) : 0,
      departments: new Set(headOffice.map((p) => p.department).filter(Boolean)).size,
      locations: new Set(projects.map((p) => p.workLocation).filter(Boolean)).size,
    },
    workforceSeries: [
      { label: WORKFORCE_LABELS.head_office, value: headOffice.length },
      { label: WORKFORCE_LABELS.project, value: projects.length },
    ].filter((item) => item.value > 0),
    genderSeries,
    typeSeries,
    gradeSeries: toSeries(countBy(people, (p) => p.grade), { limit: 10 }),
    jobTitleSeries,
    salaryBands,
    departmentSeries: [...departmentPayroll.values()]
      .map((d) => ({ ...d, payroll: round2(d.payroll) }))
      .sort((a, b) => b.value - a.value),
    locationSeries: [...locationPayroll.values()]
      .map((d) => ({ ...d, payroll: round2(d.payroll) }))
      .sort((a, b) => b.value - a.value),
  };
}
