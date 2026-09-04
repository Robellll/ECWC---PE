/**
 * Import HR employee master data from the two ECWC payroll workbooks.
 *
 *   node scripts/import-hr-employees.mjs "<head office.xlsx>" "<project.xlsx>"
 *
 * Rows previously loaded from Excel are replaced; manually added employees
 * (source = 'manual') are left untouched.
 */
import { readFileSync } from 'fs';
import { inflateRawSync } from 'zlib';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Pool } from '@neondatabase/serverless';
import { config } from 'dotenv';
import {
  cleanText,
  titleCase,
  canonicalJobTitle,
  normalizeSex,
  normalizeEmployeeType,
  jobTitleKey,
  parseAmount,
} from '../lib/hr.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
config({ path: join(root, '.env') });

const DEFAULT_HEAD_OFFICE = 'c:/Users/user/OneDrive/Documents/ECWC/HR/P&E Head Office.xlsx';
const DEFAULT_PROJECT = 'c:/Users/user/OneDrive/Documents/ECWC/HR/P&E Project.xlsx';

/* ---------------------------------------------------------------- xlsx read */

function readZipEntries(buffer) {
  const eocdSig = 0x06054b50;
  let eocd = -1;
  for (let i = buffer.length - 22; i >= 0; i--) {
    if (buffer.readUInt32LE(i) === eocdSig) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Not a zip/xlsx file (no end-of-central-directory)');

  const count = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  const entries = new Map();

  for (let i = 0; i < count; i++) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) break;
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLen = buffer.readUInt16LE(offset + 28);
    const extraLen = buffer.readUInt16LE(offset + 30);
    const commentLen = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLen);
    entries.set(name, { method, compressedSize, localOffset });
    offset += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function readEntry(buffer, entries, name) {
  const entry = entries.get(name);
  if (!entry) throw new Error(`Missing ${name} inside workbook`);
  const local = entry.localOffset;
  const nameLen = buffer.readUInt16LE(local + 26);
  const extraLen = buffer.readUInt16LE(local + 28);
  const start = local + 30 + nameLen + extraLen;
  const data = buffer.subarray(start, start + entry.compressedSize);
  return entry.method === 0 ? data.toString('utf8') : inflateRawSync(data).toString('utf8');
}

function decodeXml(text) {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, '&');
}

function parseSharedStrings(xml) {
  const out = [];
  const siRe = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let si;
  while ((si = siRe.exec(xml))) {
    let text = '';
    const tRe = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
    let t;
    while ((t = tRe.exec(si[1]))) text += t[1];
    out.push(decodeXml(text));
  }
  return out;
}

function columnIndex(ref) {
  const letters = ref.replace(/\d+/g, '');
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function parseSheet(xml, shared) {
  const rows = [];
  const rowRe = /<row\b[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g;
  let row;
  while ((row = rowRe.exec(xml))) {
    const cells = [];
    const cellRe = /<c\b([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cell;
    while ((cell = cellRe.exec(row[2]))) {
      const attrs = cell[1] || '';
      const ref = /r="([A-Z]+\d+)"/.exec(attrs);
      if (!ref) continue;
      const type = /t="([^"]+)"/.exec(attrs)?.[1];
      const body = cell[2] || '';
      let value = '';
      if (type === 'inlineStr') {
        value = decodeXml(/<t\b[^>]*>([\s\S]*?)<\/t>/.exec(body)?.[1] || '');
      } else {
        const raw = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1] || '';
        value = type === 's' ? (shared[Number(raw)] ?? '') : decodeXml(raw);
      }
      cells[columnIndex(ref[1])] = value;
    }
    rows[Number(row[1]) - 1] = cells;
  }
  return rows;
}

function readWorkbookRows(path) {
  const buffer = readFileSync(path);
  const entries = readZipEntries(buffer);
  const sheetName = [...entries.keys()].find((n) => /^xl\/worksheets\/sheet1\.xml$/.test(n));
  if (!sheetName) throw new Error(`No sheet1 found in ${path}`);
  const shared = entries.has('xl/sharedStrings.xml')
    ? parseSharedStrings(readEntry(buffer, entries, 'xl/sharedStrings.xml'))
    : [];
  return parseSheet(readEntry(buffer, entries, sheetName), shared);
}

/* --------------------------------------------------------------- row mapping */

function isBlank(row) {
  return !row || !row.some((cell) => String(cell ?? '').trim() !== '');
}

function mapHeadOfficeRow(row, rowNumber) {
  const fullName = titleCase(row[2]);
  if (!fullName) return null;
  const salary = parseAmount(row[6]);
  const jobTitle = canonicalJobTitle(row[4]);
  return {
    workforce: 'head_office',
    employeeNo: cleanText(row[1]),
    fullName,
    sex: normalizeSex(row[3]),
    jobTitle,
    jobTitleKey: jobTitleKey(jobTitle),
    grade: cleanText(row[5]).toUpperCase(),
    salary,
    desertAllowance: null,
    foodAllowance: null,
    totalPay: salary,
    department: titleCase(row[7]),
    workLocation: 'Head Office',
    employeeType: normalizeEmployeeType(row[8]),
    sourceRow: rowNumber,
  };
}

function mapProjectRow(row, rowNumber) {
  const fullName = titleCase(row[1]);
  if (!fullName) return null;
  const salary = parseAmount(row[5]);
  const desert = parseAmount(row[6]);
  const food = parseAmount(row[7]);
  const total = parseAmount(row[8]);
  const jobTitle = canonicalJobTitle(row[3]);
  return {
    workforce: 'project',
    employeeNo: cleanText(row[0]),
    fullName,
    sex: normalizeSex(row[2]),
    jobTitle,
    jobTitleKey: jobTitleKey(jobTitle),
    grade: cleanText(row[4]).toUpperCase(),
    salary,
    desertAllowance: desert,
    foodAllowance: food,
    totalPay: total != null ? total : (salary || 0) + (desert || 0) + (food || 0),
    department: '',
    workLocation: titleCase(row[9]),
    employeeType: normalizeEmployeeType(row[10]),
    sourceRow: rowNumber,
  };
}

function collect(path, mapper) {
  const rows = readWorkbookRows(path);
  const people = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (isBlank(row)) continue;
    const person = mapper(row, i + 1);
    if (person) people.push(person);
  }
  return people;
}

/* -------------------------------------------------------------------- import */

async function insertBatch(pool, people) {
  const columns = [
    'workforce', 'employee_no', 'full_name', 'sex', 'job_title', 'job_title_key',
    'grade', 'salary', 'desert_allowance', 'food_allowance', 'total_pay',
    'department', 'work_location', 'employee_type', 'source', 'source_row',
  ];
  const size = 100;
  for (let start = 0; start < people.length; start += size) {
    const chunk = people.slice(start, start + size);
    const values = [];
    const placeholders = chunk.map((person, rowIdx) => {
      const cells = [
        person.workforce, person.employeeNo, person.fullName, person.sex,
        person.jobTitle, person.jobTitleKey, person.grade, person.salary,
        person.desertAllowance, person.foodAllowance, person.totalPay,
        person.department, person.workLocation, person.employeeType,
        'excel_import', person.sourceRow,
      ];
      values.push(...cells);
      const base = rowIdx * columns.length;
      return `(${cells.map((_, i) => `$${base + i + 1}`).join(', ')})`;
    });
    await pool.query(
      `INSERT INTO hr_employees (${columns.join(', ')}) VALUES ${placeholders.join(', ')}`,
      values,
    );
  }
}

async function main() {
  const headOfficePath = process.argv[2] || DEFAULT_HEAD_OFFICE;
  const projectPath = process.argv[3] || DEFAULT_PROJECT;

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set in .env');
    process.exit(1);
  }

  const headOffice = collect(headOfficePath, mapHeadOfficeRow);
  const projects = collect(projectPath, mapProjectRow);
  console.log(`Parsed ${headOffice.length} head office and ${projects.length} project employees`);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query("DELETE FROM hr_employees WHERE source = 'excel_import'");
    await insertBatch(pool, headOffice);
    await insertBatch(pool, projects);
    const { rows } = await pool.query(
      'SELECT workforce, COUNT(*)::int AS count FROM hr_employees GROUP BY workforce ORDER BY workforce',
    );
    rows.forEach((r) => console.log(`  ${r.workforce}: ${r.count}`));
    console.log('HR import complete');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
