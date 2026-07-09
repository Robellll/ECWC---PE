'use client';

import { useMemo, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import SearchBar from '@/components/shared/SearchBar';
import { FormField } from '@/components/ui/AppModal';

export { default as ProductionModal } from '@/components/ui/AppModal';
export { FormField };

export function ProdBadge({ status, label }) {
  const cls = (status || '').replace(/ /g, '_').toLowerCase();
  return <span className={`prod-badge ${cls}`}>{label || status}</span>;
}

export function ProdProgress({ value }) {
  return (
    <div className="prod-progress" title={`${value}%`}>
      <div className="prod-progress-fill" style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

export function SimpleBarChart({ items, valueKey = 'total', labelKey = 'name' }) {
  const max = Math.max(...items.map((i) => Number(i[valueKey]) || 0), 1);
  return (
    <div>
      {items.map((item) => (
        <div key={item[labelKey]} className="production-bar-row">
          <span>{item[labelKey]}</span>
          <span>{Number(item[valueKey]).toLocaleString()}</span>
          <div className="production-bar-track">
            <div
              className="production-bar-fill"
              style={{ width: `${(Number(item[valueKey]) / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
      {items.length === 0 && <p className="production-empty">No data yet.</p>}
    </div>
  );
}

export default function ProductionDataTable({
  columns,
  rows,
  searchKeys = [],
  onEdit,
  onDelete,
  canEdit = false,
  emptyMessage = 'No records found.',
}) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = rows;
    if (q && searchKeys.length) {
      list = list.filter((row) => searchKeys.some((k) => String(row[k] ?? '').toLowerCase().includes(q)));
    }
    if (sortKey) {
      list = [...list].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return list;
  }, [rows, search, searchKeys, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  return (
    <>
      <div className="production-search-wrap">
        <SearchBar variant="modern" value={search} onChange={setSearch} placeholder="Search records…" />
      </div>
      <div className="production-table-wrap">
        <table className="production-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>
                  {col.sortable ? (
                    <button type="button" className="th-sort-btn" onClick={() => toggleSort(col.key)}>
                      {col.label}
                    </button>
                  ) : col.label}
                </th>
              ))}
              {canEdit && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={columns.length + (canEdit ? 1 : 0)} className="production-empty">{emptyMessage}</td></tr>
            ) : filtered.map((row) => (
              <tr key={row.id}>
                {columns.map((col) => (
                  <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
                ))}
                {canEdit && (
                  <td>
                    <button type="button" className="view-btn" onClick={() => onEdit?.(row)} title="Edit"><Pencil size={15} /></button>
                    <button type="button" className="delete-row-btn" onClick={() => onDelete?.(row)} title="Delete"><Trash2 size={15} /></button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function exportCsv(filename, rows, headers) {
  const keys = Object.keys(headers);
  const lines = [
    keys.map((k) => headers[k]).join(','),
    ...rows.map((r) => keys.map((k) => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function printReport(title, rows, headers) {
  const keys = Object.keys(headers);
  const html = `<html><head><title>${title}</title>
    <style>body{font-family:Inter,sans-serif;padding:24px}table{width:100%;border-collapse:collapse}
    th,td{border:1px solid #ddd;padding:8px;font-size:12px}th{background:#f3f4f6}</style></head>
    <body><h1>${title}</h1><table><thead><tr>${keys.map((k) => `<th>${headers[k]}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${keys.map((k) => `<td>${r[k] ?? ''}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;
  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  w.print();
}
